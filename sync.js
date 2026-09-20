(() => {
  'use strict';

  const SUPABASE_URL = 'https://snvtthfqgjyyuligzyfr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_nIyLPHakhxXcfdKTUH_Dbw__MuHN-E1';
  const EVENT_ID = 'printing-united-2026';
  const syncBtn = document.getElementById('syncBtn');
  const ops = window.BourgOps;

  if (!syncBtn || !ops || !window.supabase?.createClient) {
    if (syncBtn) syncBtn.textContent = 'Local';
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  let session = null;
  let membership = null;
  let realtimeChannel = null;
  let saveTimer = null;
  let applyingRemote = false;

  const esc = (s='') => String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function setStatus(label, mode='off') {
    syncBtn.innerHTML = `<span class="sync-dot"></span>${esc(label)}`;
    syncBtn.classList.remove('sync-live','sync-warn','sync-off');
    syncBtn.classList.add(mode === 'live' ? 'sync-live' : mode === 'warn' ? 'sync-warn' : 'sync-off');
  }

  function toast(message) { ops.showToast?.(message); }

  function ensureDialog() {
    let dlg = document.getElementById('syncDialog');
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.id = 'syncDialog';
    dlg.className = 'modal';
    dlg.innerHTML = `<div class="modal-card"><div class="modal-head"><h2 id="syncDialogTitle">Team Sync</h2><button type="button" class="icon-btn" id="syncDialogClose" aria-label="Close">×</button></div><div id="syncDialogBody"></div></div>`;
    document.body.appendChild(dlg);
    dlg.querySelector('#syncDialogClose').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    return dlg;
  }

  function openLogin() {
    const dlg = ensureDialog();
    dlg.querySelector('#syncDialogTitle').textContent = 'Private Team Login';
    dlg.querySelector('#syncDialogBody').innerHTML = `
      <p class="modal-sub">Approved C.P. Bourg team members only. Use your email and a password to connect this device to the shared event workspace.</p>
      <div class="form-grid">
        <div class="field"><label for="authEmail">Email</label><input id="authEmail" class="input" type="email" autocomplete="email" placeholder="name@example.com"></div>
        <div class="field"><label for="authPassword">Password</label><input id="authPassword" class="input" type="password" autocomplete="current-password" minlength="8" placeholder="At least 8 characters"></div>
      </div>
      <div class="actions"><button type="button" class="primary-btn" id="signInBtn">Sign in</button><button type="button" class="ghost-btn" id="createAccountBtn">Create account</button></div>
      <div class="divider"></div>
      <button type="button" class="ghost-btn wide" id="magicLinkBtn">Email me a sign-in link</button>
      <p class="auth-note">Only emails on the C.P. Bourg Expo Ops allowlist can access shared team data. The app still works locally if you stay signed out.</p>
      <div id="authMessage" class="status-banner" style="display:none;margin-top:12px"></div>`;
    const email = dlg.querySelector('#authEmail');
    const pass = dlg.querySelector('#authPassword');
    const msg = dlg.querySelector('#authMessage');
    const show = text => { msg.style.display='block'; msg.textContent=text; };

    dlg.querySelector('#signInBtn').onclick = async () => {
      if (!email.value || !pass.value) return show('Enter your email and password.');
      show('Signing in…');
      const { error } = await client.auth.signInWithPassword({ email: email.value.trim(), password: pass.value });
      if (error) show(error.message); else { show('Signed in. Loading team workspace…'); setTimeout(()=>dlg.close(),500); }
    };

    dlg.querySelector('#createAccountBtn').onclick = async () => {
      if (!email.value || pass.value.length < 8) return show('Enter an approved email and a password of at least 8 characters.');
      show('Creating account…');
      const { data, error } = await client.auth.signUp({
        email: email.value.trim(),
        password: pass.value,
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) return show(error.message);
      if (data.session) show('Account created and signed in.');
      else show('Check your email to confirm the account, then return here and sign in.');
    };

    dlg.querySelector('#magicLinkBtn').onclick = async () => {
      if (!email.value) return show('Enter your approved email first.');
      show('Sending sign-in email…');
      const { error } = await client.auth.signInWithOtp({
        email: email.value.trim(),
        options: { emailRedirectTo: window.location.origin, shouldCreateUser: true }
      });
      show(error ? error.message : 'Check your email for the sign-in link.');
    };
    dlg.showModal();
  }

  async function openSyncMenu() {
    const dlg = ensureDialog();
    dlg.querySelector('#syncDialogTitle').textContent = 'Team Sync';
    const isAdmin = membership?.role === 'admin';
    dlg.querySelector('#syncDialogBody').innerHTML = `
      <div class="status-banner"><strong>Live sync is on.</strong><br>${esc(session?.user?.email || '')}</div>
      <div class="actions"><button type="button" class="primary-btn" id="syncNowBtn">Sync now</button>${isAdmin?'<button type="button" class="ghost-btn" id="manageAccessBtn">Manage access</button>':''}<button type="button" class="danger-btn" id="signOutBtn">Sign out</button></div>
      <p class="auth-note">Changes on approved team devices are shared through the private C.P. Bourg Expo Ops workspace.</p>`;
    dlg.querySelector('#syncNowBtn').onclick = async () => { await pushSnapshot(true); toast('Team workspace synced'); };
    if (isAdmin) dlg.querySelector('#manageAccessBtn').onclick = () => openAccessManager();
    dlg.querySelector('#signOutBtn').onclick = async () => { dlg.close(); await client.auth.signOut(); };
    dlg.showModal();
  }

  async function openAccessManager() {
    const dlg = ensureDialog();
    dlg.querySelector('#syncDialogTitle').textContent = 'Team Access';
    dlg.querySelector('#syncDialogBody').innerHTML = '<div class="status-banner">Loading approved logins…</div>';
    const [{data:members,error:memberErr},{data:roster,error:rosterErr}] = await Promise.all([
      client.from('app_members').select('id,email,role,active,person_id').order('created_at'),
      client.from('team_roster').select('id,name,title').eq('event_id',EVENT_ID).eq('active',true).order('sort_order')
    ]);
    if (memberErr || rosterErr) {
      dlg.querySelector('#syncDialogBody').innerHTML = `<div class="alert">${esc(memberErr?.message || rosterErr?.message || 'Unable to load access list.')}</div>`;
      return;
    }
    const options = (roster||[]).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    dlg.querySelector('#syncDialogBody').innerHTML = `
      <p class="modal-sub">Add an approved login and link it to the correct roster person.</p>
      <div class="form-grid">
        <div class="field"><label for="inviteEmail">Email</label><input id="inviteEmail" class="input" type="email" placeholder="team.member@company.com"></div>
        <div class="field"><label for="invitePerson">Roster person</label><select id="invitePerson" class="select"><option value="">Unlinked</option>${options}</select></div>
        <div class="field"><label for="inviteRole">Access level</label><select id="inviteRole" class="select"><option value="member">Member</option><option value="admin">Admin</option></select></div>
      </div>
      <div class="actions"><button type="button" class="primary-btn" id="addAccessBtn">Add approved login</button></div>
      <div class="divider"></div>
      <div class="label">Approved logins</div>
      <div class="access-list">${(members||[]).map(m=>{
        const rp=(roster||[]).find(p=>p.id===m.person_id);
        return `<div class="access-row"><div><div class="access-email">${esc(m.email||'Linked user')}</div><div class="access-meta">${esc(m.role)}${rp?' • '+esc(rp.name):''}${m.active?'':' • disabled'}</div></div><span class="pill ${m.active?'ready':'neutral'}">${m.active?'ACTIVE':'OFF'}</span></div>`;
      }).join('')}</div>
      <div id="accessMessage" class="status-banner" style="display:none;margin-top:12px"></div>`;
    dlg.querySelector('#addAccessBtn').onclick = async () => {
      const email = dlg.querySelector('#inviteEmail').value.trim().toLowerCase();
      const personId = dlg.querySelector('#invitePerson').value || null;
      const role = dlg.querySelector('#inviteRole').value;
      const out = dlg.querySelector('#accessMessage');
      out.style.display='block';
      if (!email) { out.textContent='Enter an email.'; return; }
      out.textContent='Adding…';
      const { error } = await client.from('app_members').upsert({email,person_id:personId,role,active:true},{onConflict:'email'});
      if (error) out.textContent=error.message;
      else { out.textContent='Approved login added.'; setTimeout(openAccessManager,350); }
    };
    if (!dlg.open) dlg.showModal();
  }

  async function checkMembership() {
    const { data, error } = await client.from('app_members').select('role,active,person_id').limit(1).maybeSingle();
    if (error || !data?.active) return null;
    return data;
  }

  async function loadSnapshot() {
    const { data, error } = await client.from('event_snapshots').select('state,updated_at').eq('event_id',EVENT_ID).maybeSingle();
    if (error) throw error;
    if (data?.state && Object.keys(data.state).length) {
      applyingRemote = true;
      ops.replaceState(data.state);
      applyingRemote = false;
    } else {
      await pushSnapshot(false);
    }
  }

  async function pushSnapshot(showErrors=false) {
    if (!session || !membership || applyingRemote) return;
    const payload = {
      event_id: EVENT_ID,
      state: ops.getState(),
      updated_by: session.user.id,
      updated_at: new Date().toISOString()
    };
    const { error } = await client.from('event_snapshots').upsert(payload, {onConflict:'event_id'});
    if (error) {
      setStatus('Sync error','warn');
      if (showErrors) toast(error.message);
    } else setStatus('Live','live');
  }

  function subscribeRealtime() {
    if (realtimeChannel) client.removeChannel(realtimeChannel);
    realtimeChannel = client.channel('bourg-expo-ops-live')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'event_snapshots', filter: `event_id=eq.${EVENT_ID}`
      }, payload => {
        const row = payload.new;
        if (!row?.state || row.updated_by === session?.user?.id) return;
        applyingRemote = true;
        ops.replaceState(row.state);
        applyingRemote = false;
        setStatus('Live','live');
        toast('Team update received');
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setStatus('Live','live');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setStatus('Reconnect','warn');
      });
  }

  async function activate(nextSession) {
    session = nextSession;
    if (!session) {
      membership = null;
      if (realtimeChannel) { client.removeChannel(realtimeChannel); realtimeChannel = null; }
      setStatus('Local','off');
      return;
    }
    setStatus('Checking…','warn');
    membership = await checkMembership();
    if (!membership) {
      toast('This login is not approved for C.P. Bourg Expo Ops.');
      await client.auth.signOut();
      return;
    }
    if (membership.person_id) ops.setCurrentUserId(membership.person_id);
    try {
      await loadSnapshot();
      subscribeRealtime();
      setStatus('Live','live');
    } catch (err) {
      setStatus('Sync error','warn');
      toast(err?.message || 'Unable to load shared workspace.');
    }
  }

  window.addEventListener('bourgops:save', () => {
    if (!session || !membership || applyingRemote) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => pushSnapshot(false), 450);
  });

  syncBtn.addEventListener('click', () => session && membership ? openSyncMenu() : openLogin());

  client.auth.onAuthStateChange((_event, nextSession) => {
    if (nextSession?.access_token === session?.access_token) return;
    activate(nextSession).catch(()=>setStatus('Sync error','warn'));
  });

  client.auth.getSession().then(({data}) => activate(data.session)).catch(()=>setStatus('Local','off'));
})();
