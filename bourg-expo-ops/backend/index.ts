import webpush from 'npm:web-push@3.6.7';
import { APP_ORIGIN, EVENT_ID, validSubscription, notificationPayload } from './push-policy.mjs';

const base = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
  JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default;
const allowedOrigins = new Set([APP_ORIGIN]);
const cors = {
  'Access-Control-Allow-Origin': APP_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type,apikey,x-bourg-link-key',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Cache-Control': 'no-store', 'Vary': 'Origin'
};

async function admin(action: string, args = {}) {
  const response = await fetch(`${base}/rest/v1/rpc/bourg_push_admin`, {
    method: 'POST', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, args }), signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error('Push storage unavailable');
  return response.json();
}

async function config() {
  // Generated only on the server; PostgreSQL serializes first-time initialization.
  // Vault encrypts the private VAPID key and dispatcher token at rest.
  const keys = webpush.generateVAPIDKeys();
  return admin('config', { ...keys, dispatchSecret: crypto.randomUUID() + crypto.randomUUID(),
    dispatchUrl: `${base}/functions/v1/bourg-chat-push` });
}

async function digest(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(bytes, b=>b.toString(16).padStart(2,'0')).join('');
}

async function send(subscription: any, payload: any, cfg: any) {
  if (!validSubscription(subscription)) return 'gone';
  const request = webpush.generateRequestDetails(subscription, JSON.stringify(payload), {
    TTL: 3600, urgency: 'high', contentEncoding: 'aes128gcm',
    vapidDetails: { subject: APP_ORIGIN, publicKey: cfg.publicKey, privateKey: cfg.privateKey }
  });
  const response = await fetch(request.endpoint, {
    method: 'POST', headers: request.headers, body: new Uint8Array(request.body),
    redirect: 'error', signal: AbortSignal.timeout(10000)
  });
  await response.body?.cancel();
  return response.ok ? 'sent' : [404,410].includes(response.status) ? 'gone' : `provider-${response.status}`;
}

Deno.serve(async req => {
  const origin = req.headers.get('origin');
  const reply = (body: any, status = 200) => Response.json(body, { status, headers: cors });
  if (origin && !allowedOrigins.has(origin)) return reply({error:'Origin not allowed'},403);
  if (req.method === 'OPTIONS') return new Response(null, { status:204, headers:cors });
  if (req.method !== 'POST') return reply({error:'Use POST'},405);
  try {
    if (Number(req.headers.get('content-length')) > 12000) return reply({error:'Request too large'},413);
    const text = await req.text();
    if (text.length > 12000) return reply({error:'Request too large'},413);
    const body = JSON.parse(text);
    if (body.action === 'dispatch') {
      const provided = req.headers.get('x-bourg-dispatch');
      if (!provided || provided.length > 100) return reply({error:'Unauthorized'},401);
      const cfg = await config();
      if (await digest(provided) !== await digest(cfg.dispatchSecret)) return reply({error:'Unauthorized'},401);
      const jobs = await admin('claim');
      let accepted = 0;
      // Small batches plus leases keep parallel triggers from duplicating deliveries.
      for (let offset = 0; offset < jobs.length; offset += 10) {
        await Promise.all(jobs.slice(offset,offset+10).map(async (job: any) => {
          let result = 'retry';
          try { result = await send(job.subscription, notificationPayload(job.message,job.personId), cfg); }
          catch { /* Retry without logging message content, endpoints or keys. */ }
          if (result === 'sent') accepted++;
          await admin('finish',{jobId:job.jobId,result});
        }));
      }
      return reply({processed:jobs.length,accepted});
    }
    if (!['config','subscribe','unsubscribe','status','test'].includes(body.action)) return reply({error:'Unknown action'},400);
    const teamKey = req.headers.get('x-bourg-link-key') || '';
    if (!teamKey || teamKey.length>200 || typeof body.personId !== 'string' || body.personId.length>80)
      return reply({error:'Open your private team link and choose your name first.'},401);
    const access = await admin('authorize',{teamKey,eventId:EVENT_ID,personId:body.personId});
    if (!access.allowed) return reply({error:'Open your private team link and choose your name first.'},403);
    if (body.action === 'config') return reply({publicKey:(await config()).publicKey});
    if (!/^[0-9a-f-]{36}$/i.test(body.deviceId || '') || !/^[0-9a-f]{64}$/i.test(body.deviceToken || ''))
      return reply({error:'Invalid device'},400);
    const args = {eventId:EVENT_ID,personId:body.personId,deviceId:body.deviceId,
      tokenHash:await digest(body.deviceToken)};
    if (body.action === 'subscribe') {
      if (!validSubscription(body.subscription)) return reply({error:'This push subscription is not supported.'},400);
      return reply(await admin('subscribe',{...args,subscription:body.subscription}));
    }
    if (body.action === 'test') {
      const subscription = await admin('test',args);
      const result = await send(subscription,{
        title:'C.P. Bourg alerts are ready',body:'This device can receive chat alerts. You can now close the app.',
        tag:'bourg-push-test',personId:body.personId,url:'/bourg-expo-ops/?open=chat'
      },await config());
      if(result==='gone') await admin('unsubscribe',args);
      return reply(result==='sent' ? {accepted:true} : {error:'Test was not accepted. Try enabling alerts again.'},result==='sent'?200:502);
    }
    return reply(await admin(body.action,args));
  } catch {
    return reply({error:'Alerts could not be updated. Check your connection and try again. Wait 30 seconds between test alerts.'},503);
  }
});
