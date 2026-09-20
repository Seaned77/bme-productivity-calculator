(() => {
  'use strict';

  const SUPABASE_URL = 'https://snvtthfqgjyyuligzyfr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_nIyLPHakhxXcfdKTUH_Dbw__MuHN-E1';
  const EVENT_ID = 'printing-united-2026';
  const LINK_KEY_STORAGE = 'cp-bourg-expo-link-key-v1';
  const PERSON_STORAGE = 'cp-bourg-expo-device-person-v1';
  const syncBtn = document.getElementById('syncBtn');
  const ops = window.BourgOps;

  if (!syncBtn || !ops || !window.supabase?.createClient) {
    if (syncBtn) syncBtn.textContent = 'Local';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const incomingKey = params.get('team');
  if (incomingKey) localStorage.setItem(LINK_KEY_STORAGE, incomingKey);
  const accessKey = incomingKey || localStorage.getItem(LINK_KEY_STORAGE) || '';

  const esc = (s='') => String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const toast = (message) => ops.showToast?.(message);

  function setStatus(label, mode='off') {
    syncBtn.innerHTML = `<span class="sync-dot"></span>${esc(label)}`;
    syncBtn.classList.remove('sync-live','sync-warn','sync-off');
    syncBtn.classList.add(mode === 'live' ? 'sync-live' : mode === 'warn' ? 'sync-warn' : 'sync-off');
  }

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

  if (!accessKey) {
    setStatus('Local','off');
    syncBtn.addEventListener('click', () => {
      const dlg = ensureDialog();
      dlg.querySelector('#syncDialogTitle').textContent = 'Team Link Required';
      dlg.querySelector('#syncDialogBody').innerHTML = `
        <div class="status-banner">This copy is running locally. Open the private C.P. Bourg team link to connect to shared updates.</div>
        <p class="auth-note">No login is required. The private link itself is the access key.</p>`;
      dlg.showModal();
    });
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'x-bourg-link-key': accessKey } }
  });

  let saveTimer = null;
  let pollTimer = null;
  let applyingRemote = false;
  let lastRemoteAt = '';

  function localPrefs() {
    const s = ops.getState();
    return {
      currentUserId: s.currentUserId,
      selectedView: s.selectedView,
      selectedDay: s.selectedDay,
      reminderMinutes: s.reminderMinutes
    };
  }

  function sharedState() {
    const s = ops.getState();
    const out = JSON.parse(JSON.stringify(s));
    delete out.currentUserId;
    delete out.selectedView;
    delete out.selectedDay;
    delete out.reminderMinutes;
    return out;
  }

  function applyRemoteState(remote) {
    if (!remote || typeof remote !== 'object') return;
    const prefs = localPrefs();
    applyingRemote = true;
    ops.replaceState({ ...remote, ...prefs });
    applyingRemote = false;
  }

  function currentPersonId() {
    const saved = localStorage.getItem(PERSON_STORAGE);
    const people = ops.getState().people || [];
    return people.some(p => p.id === saved) ? saved : '';
  }

  function applyDevicePerson(id) {
    if (!id) return;
    localStorage.setItem(PERSON_STORAGE, id);
    ops.setCurrentUserId(id);
  }

  function promptForPerson(force=false) {
    const existing = currentPersonId();
    if (existing && !force) {
      applyDevicePerson(existing);
      return;
    }
    const people = ops.getState().people || [];
    const dlg = ensureDialog();
    dlg.querySelector('#syncDialogTitle').textContent = 'Who is using this phone?';
    dlg.querySelector('#syncDialogBody').innerHTML = `
      <p class="modal-sub">Choose your name once. This stays on this device so your assignments and reminders are personal.</p>
      <div class="field">
        <label for="devicePerson">Team member</label>
        <select id="devicePerson" class="select">
          ${people.map(p => `<option value="${esc(p.id)}">${esc(p.name)} — ${esc(p.title || p.group || '')}</option>`).join('')}
        </select>
      </div>
      <div class="actions"><button type="button" class="primary-btn" id="saveDevicePerson">Use this person</button></div>`;
    const select = dlg.querySelector('#devicePerson');
    if (existing) select.value = existing;
    dlg.querySelector('#saveDevicePerson').onclick = () => {
      applyDevicePerson(select.value);
      dlg.close();
      toast('This phone is set for ' + (people.find(p => p.id === select.value)?.name || 'team member'));
    };
    dlg.showModal();
  }

  async function pullSnapshot(initial=false) {
    const { data, error } = await client
      .from('event_snapshots')
      .select('state,updated_at')
      .eq('event_id', EVENT_ID)
      .maybeSingle();

    if (error) throw error;

    if (data?.state && Object.keys(data.state).length) {
      if (initial || !lastRemoteAt || data.updated_at > lastRemoteAt) {
        applyRemoteState(data.state);
        lastRemoteAt = data.updated_at || lastRemoteAt;
        const deviceId = currentPersonId();
        if (deviceId) applyDevicePerson(deviceId);
      }
    } else if (initial) {
      await pushSnapshot(false);
    }
  }

  async function pushSnapshot(showErrors=false) {
    if (applyingRemote) return;
    const payload = {
      event_id: EVENT_ID,
      state: sharedState(),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await client
      .from('event_snapshots')
      .upsert(payload, { onConflict: 'event_id' })
      .select('updated_at')
      .maybeSingle();

    if (error) {
      setStatus('Sync error','warn');
      if (showErrors) toast(error.message);
      return false;
    }
    if (data?.updated_at) lastRemoteAt = data.updated_at;
    setStatus('Shared','live');
    return true;
  }

  function teamLink() {
    const u = new URL(window.location.href);
    u.searchParams.set('team', accessKey);
    return u.toString();
  }

  function openSyncMenu() {
    const dlg = ensureDialog();
    dlg.querySelector('#syncDialogTitle').textContent = 'Shared Team Link';
    const meId = currentPersonId();
    const me = (ops.getState().people || []).find(p => p.id === meId);
    dlg.querySelector('#syncDialogBody').innerHTML = `
      <div class="status-banner"><strong>Shared sync is on.</strong><br>No login required. Anyone with the private team link can view and edit the shared workspace.</div>
      <div class="actions">
        <button type="button" class="primary-btn" id="syncNowBtn">Sync now</button>
        <button type="button" class="ghost-btn" id="copyTeamLinkBtn">Copy team link</button>
        <button type="button" class="ghost-btn" id="changePersonBtn">Change person</button>
      </div>
      <p class="auth-note">This phone: <strong>${esc(me?.name || 'Not selected')}</strong>. Treat the team link like a password and don’t post it publicly.</p>`;
    dlg.querySelector('#syncNowBtn').onclick = async () => {
      const ok = await pushSnapshot(true);
      if (ok) toast('Team workspace synced');
    };
    dlg.querySelector('#copyTeamLinkBtn').onclick = async () => {
      try {
        await navigator.clipboard.writeText(teamLink());
        toast('Private team link copied');
      } catch {
        toast('Use your browser Share button to send this page');
      }
    };
    dlg.querySelector('#changePersonBtn').onclick = () => {
      dlg.close();
      promptForPerson(true);
    };
    dlg.showModal();
  }

  async function start() {
    setStatus('Connecting…','warn');
    try {
      await pullSnapshot(true);
      setStatus('Shared','live');
      promptForPerson(false);
      pollTimer = setInterval(async () => {
        try {
          await pullSnapshot(false);
          setStatus('Shared','live');
        } catch {
          setStatus('Reconnect','warn');
        }
      }, 5000);
    } catch (err) {
      setStatus('Sync error','warn');
      toast(err?.message || 'Unable to connect to shared workspace.');
    }
  }

  window.addEventListener('bourgops:save', () => {
    if (applyingRemote) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => pushSnapshot(false), 500);
  });

  syncBtn.addEventListener('click', openSyncMenu);
  start();
})();