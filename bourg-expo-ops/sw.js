const CACHE='cp-bourg-expo-ops-v16';
const ASSETS=['./','index.html','sync.js?v=6','chat.js?v=5','push.js?v=1','manifest.webmanifest','icon.svg','las-vegas-sign-transparent.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cp-bourg-expo-ops-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return res;}).catch(()=>caches.match(e.request).then(cached=>cached||(e.request.mode==='navigate'?caches.match('index.html'):Response.error()))));});

function pushRecipient() {
  return new Promise(resolve=>{
    const open=indexedDB.open('bourg-push',1);
    open.onupgradeneeded=()=>open.result.createObjectStore('settings');
    open.onerror=()=>resolve(null);
    open.onsuccess=()=>{
      const db=open.result, request=db.transaction('settings').objectStore('settings').get('recipient');
      request.onsuccess=()=>{db.close();resolve(request.result);};
      request.onerror=()=>{db.close();resolve(null);};
    };
  });
}
function chatUrl(value) {
  const url=new URL('/bourg-expo-ops/?open=chat',self.location.origin);
  try {
    const id=new URL(value,self.location.origin).searchParams.get('message');
    if(/^[0-9a-f-]{36}$/i.test(id || ''))url.searchParams.set('message',id);
  } catch {}
  return url.href;
}
self.addEventListener('push',event=>event.waitUntil((async()=>{
  let payload;
  try { payload=event.data.json(); } catch { return; }
  const recipient=await pushRecipient();
  if(!recipient?.enabled || recipient.personId!==payload.personId)return;
  await self.registration.showNotification(payload.title || 'C.P. Bourg Chat',{
    body:payload.body || 'You have a new message.',icon:'icon.svg',badge:'icon.svg',
    tag:payload.tag || 'bourg-chat',data:{url:chatUrl(payload.url)}
  });
})()));
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const url=chatUrl(event.notification.data?.url);
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if(new URL(client.url).pathname.startsWith('/bourg-expo-ops/')){
        await client.navigate(url); await client.focus(); return;
      }
    }
    await self.clients.openWindow(url);
  })());
});