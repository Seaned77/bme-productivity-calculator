(() => {
  'use strict';

  const SUPABASE_URL = 'https://snvtthfqgjyyuligzyfr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_nIyLPHakhxXcfdKTUH_Dbw__MuHN-E1';
  const EVENT_ID = 'printing-united-2026';
  const LINK_KEY_STORAGE = 'cp-bourg-expo-link-key-v1';
  const PERSON_STORAGE = 'cp-bourg-expo-device-person-v1';
  const CHANNEL_STORAGE = 'cp-bourg-chat-channel-v1';
  const DM_STORAGE = 'cp-bourg-chat-dm-v1';
  const CUSTOM_STORAGE = 'cp-bourg-chat-custom-v1';
  const READ_PREFIX = 'cp-bourg-chat-read-v1:';
  const ops = window.BourgOps;
  const params = new URLSearchParams(window.location.search);
  const incomingKey = params.get('team');
  if (incomingKey) localStorage.setItem(LINK_KEY_STORAGE, incomingKey);
  const accessKey = incomingKey || localStorage.getItem(LINK_KEY_STORAGE) || '';

  if (!ops || !window.supabase?.createClient || !accessKey) return;

  let client = null;
  let clientPerson = '';
  let messages = [];
  let initialized = false;
  let latestSeenAt = '';
  let activeChannel = localStorage.getItem(CHANNEL_STORAGE) || 'team';
  let dmTarget = localStorage.getItem(DM_STORAGE) || '';
  let customTargets = (() => { try { const v=JSON.parse(localStorage.getItem(CUSTOM_STORAGE)||'[]'); return Array.isArray(v)?v:[]; } catch { return []; } })();
  let urgentCompose = false;
  let pollTimer = null;
  let refreshBusy = false;

  const esc = (s='') => String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const people = () => ops.getState().people || [];
  const personById = id => people().find(p => p.id === id);
  const meId = () => localStorage.getItem(PERSON_STORAGE) || '';
  const me = () => personById(meId());
  const readKey = () => READ_PREFIX + (meId() || 'unknown');
  const toast = msg => ops.showToast?.(msg);

  function getClient() {
    const id = meId();
    if (!id) return null;
    if (!client || clientPerson !== id) {
      clientPerson = id;
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: {
          headers: {
            'x-bourg-link-key': accessKey,
            'x-bourg-person-id': id
          }
        }
      });
    }
    return client;
  }

  function injectStyles() {
    if (document.getElementById('bourgChatStyles')) return;
    const style = document.createElement('style');
    style.id = 'bourgChatStyles';
    style.textContent = `
      .bottom-nav{grid-template-columns:repeat(6,1fr)}
      .nav-btn{position:relative}
      .chat-badge{position:absolute;top:2px;right:calc(50% - 22px);min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#ff5c66;color:#fff;font-size:9px;font-weight:950;display:none;place-items:center;border:2px solid #080c11;line-height:13px}
      .chat-badge.show{display:grid}.chat-badge.urgent{background:#ff3b30;box-shadow:0 0 0 5px rgba(255,59,48,.12)}
      .chat-shell{display:grid;gap:12px}.chat-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px}.chat-tabs{display:flex;gap:7px;overflow:auto;scrollbar-width:none;padding-bottom:2px}.chat-tabs::-webkit-scrollbar{display:none}
      .chat-tab{white-space:nowrap;border:1px solid #314052;background:#111923;color:#bfc9d5;border-radius:999px;padding:8px 11px;font-size:12px;font-weight:800}
      .chat-tab.active{background:#2a1a14;border-color:#7b3d26;color:#ffad88}
      .chat-messages{display:grid;gap:9px;min-height:260px;max-height:52vh;overflow:auto;padding:4px 2px 8px;scroll-behavior:smooth}
      .chat-msg{max-width:88%;border:1px solid #283646;background:#111923;border-radius:17px 17px 17px 5px;padding:10px 11px;justify-self:start}
      .chat-msg.mine{justify-self:end;background:#241710;border-color:#693924;border-radius:17px 17px 5px 17px}
      .chat-msg.urgent{border-color:#7a3539;background:#251215;box-shadow:0 0 0 1px rgba(255,92,102,.08) inset}
      .chat-meta{display:flex;align-items:center;gap:7px;color:#8e9aaa;font-size:10px;margin-bottom:5px}.chat-meta strong{color:#d9e0e8;font-size:11px}.chat-msg.mine .chat-meta{justify-content:flex-end}
      .chat-body{font-size:14px;line-height:1.35;overflow-wrap:anywhere;white-space:pre-wrap}.chat-mention{color:#ff9d75}.chat-urgent-label{color:#ff9ca3;font-weight:900;letter-spacing:.05em}
      .chat-empty{padding:42px 18px;text-align:center;color:#8f9cab;font-size:13px}
      .chat-composer{border:1px solid #2c3949;background:#0e151d;border-radius:19px;padding:10px}.chat-compose-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}
      .chat-input{min-height:48px;max-height:120px;resize:vertical;border:0;background:transparent;color:white;padding:9px;font-size:16px;outline:none;width:100%}
      .chat-send{width:48px;height:48px;border-radius:15px;border:0;background:linear-gradient(135deg,#ff5a1f,#df4610);color:white;font-size:20px;font-weight:900}
      .chat-tools{display:flex;gap:7px;align-items:center;flex-wrap:wrap;padding-top:7px;border-top:1px solid #202b38}
      .chat-urgent-toggle{border:1px solid #4d3940;background:#1b1114;color:#ffadb3;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:900}.chat-urgent-toggle.on{background:#4b171c;border-color:#8a3740;color:#fff}
      .chat-quick{border:1px solid #2d3a49;background:#151e28;color:#c7d0db;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:800}
      .chat-member-grid{display:flex;flex-wrap:wrap;gap:7px}.chat-member-pill{position:relative}.chat-member-pill input{position:absolute;opacity:0;pointer-events:none}.chat-member-pill span{display:block;border:1px solid #304052;background:#121b25;color:#bdc8d5;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:850}.chat-member-pill input:checked+span{background:#2c1b13;border-color:#8a462b;color:#ffb08c}.chat-direct-select{width:100%;min-height:44px;border:1px solid #354457;background:#0d141c;border-radius:13px;color:white;padding:8px 10px;font-size:14px}
      .chat-status{font-size:11px;color:#8f9cab}.chat-alert-btn{border:1px solid #344456;background:#141e28;color:#d7dee7;border-radius:12px;padding:7px 9px;font-size:11px;font-weight:800}
      @media(max-width:420px){.bottom-nav{gap:1px;padding-left:4px;padding-right:4px}.nav-btn{font-size:9px}.nav-icon svg{width:19px;height:19px}.chat-msg{max-width:92%}}
    `;
    document.head.appendChild(style);
  }

  function canUseChannel(channel) {
    const group = me()?.group;
    if (channel === 'sales') return group === 'Sales';
    return true;
  }

  function normalizeChannel() {
    if (!canUseChannel(activeChannel)) activeChannel = 'team';
    localStorage.setItem(CHANNEL_STORAGE, activeChannel);
  }

  function formatBody(body) {
    const names = ['Charles','Jim','Dan','Sean','Chuck','Tim','Jayme','Luis','Shadrach','Sales','NTS','Team'];
    const pattern = new RegExp('(@(?:' + names.join('|') + ')\\b)', 'gi');
    return esc(body).replace(pattern, '<strong class="chat-mention">$1</strong>');
  }

  function fmtTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
    } catch { return ''; }
  }

  function isMentioned(msg) {
    const p = me();
    if (!p) return false;
    const first = p.name.split(/\s+/)[0];
    return new RegExp('@' + first + '\\b', 'i').test(msg.body || '') ||
      (p.group === 'Sales' && /@Sales\b/i.test(msg.body || '')) ||
      (p.group === 'Technical' && /@NTS\b/i.test(msg.body || '')) ||
      /@Team\b/i.test(msg.body || '');
  }

  function customParticipants() {
    const id = meId();
    return [id, ...customTargets.filter(x => x && x !== id)].filter(Boolean).sort();
  }

  function sameParticipants(a,b) {
    const aa=(a||[]).slice().sort(), bb=(b||[]).slice().sort();
    return aa.length===bb.length && aa.every((x,i)=>x===bb[i]);
  }

  function recentCustomGroups() {
    const seen = new Map();
    messages.filter(m=>m.channel==='custom' && Array.isArray(m.participant_ids)).forEach(m=>{
      const ids=m.participant_ids.slice().sort();
      const key=ids.join('|');
      const prev=seen.get(key);
      if(!prev || m.created_at>prev.created_at) seen.set(key,{ids,created_at:m.created_at});
    });
    return [...seen.values()].sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,6);
  }

  function visibleMessages() {
    const id = meId();
    if (activeChannel === 'direct') {
      if (!dmTarget) return [];
      return messages.filter(m => m.channel === 'direct' &&
        ((m.sender_id === id && m.recipient_id === dmTarget) ||
         (m.sender_id === dmTarget && m.recipient_id === id)));
    }
    if (activeChannel === 'custom') {
      const group=customParticipants();
      if(group.length<2) return [];
      return messages.filter(m => m.channel === 'custom' && sameParticipants(m.participant_ids,group));
    }
    return messages.filter(m => m.channel === activeChannel);
  }

  function markRead() {
    const newest = messages[messages.length - 1]?.created_at || new Date().toISOString();
    localStorage.setItem(readKey(), newest);
    updateBadge();
  }

  function updateBadge() {
    const badge = document.getElementById('chatBadge');
    if (!badge || !meId()) return;
    let readAt = localStorage.getItem(readKey());
    if (!readAt) {
      readAt = new Date().toISOString();
      localStorage.setItem(readKey(), readAt);
    }
    const unread = messages.filter(m => m.sender_id !== meId() && m.created_at > readAt);
    badge.textContent = unread.length > 9 ? '9+' : String(unread.length);
    badge.classList.toggle('show', unread.length > 0);
    badge.classList.toggle('urgent', unread.some(m => m.urgent || isMentioned(m)));
  }

  function maybeNotify(newMessages) {
    const mine = meId();
    for (const msg of newMessages) {
      if (msg.sender_id === mine) continue;
      if (!msg.urgent && !isMentioned(msg)) continue;
      const sender = personById(msg.sender_id)?.name || 'Team';
      const title = msg.urgent ? 'Urgent C.P. Bourg message' : 'C.P. Bourg mention';
      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification(title, { body: sender + ': ' + msg.body }); } catch {}
      }
      try { navigator.vibrate?.([120,70,120]); } catch {}
      toast((msg.urgent ? 'Urgent: ' : '') + sender + ': ' + msg.body.slice(0,90));
    }
  }

  async function refreshMessages(renderAfter=true) {
    if (refreshBusy || !meId()) return;
    const api = getClient();
    if (!api) return;
    refreshBusy = true;
    try {
      const { data, error } = await api.from('team_messages')
        .select('id,event_id,channel,sender_id,recipient_id,participant_ids,body,urgent,created_at')
        .eq('event_id', EVENT_ID)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const next = (data || []).slice().reverse();
      const newest = next[next.length - 1]?.created_at || '';
      if (initialized && newest && newest > latestSeenAt) {
        const fresh = next.filter(m => m.created_at > latestSeenAt);
        maybeNotify(fresh);
      }
      messages = next;
      latestSeenAt = newest || latestSeenAt;
      initialized = true;
      updateBadge();
      if (renderAfter && ops.getState().selectedView === 'chat') {
        render(document.getElementById('mainContent'), false);
      }
    } catch (err) {
      if (ops.getState().selectedView === 'chat') toast(err?.message || 'Unable to refresh messages');
    } finally {
      refreshBusy = false;
    }
  }

  async function sendMessage() {
    const input = document.getElementById('chatInput');
    const body = input?.value.trim() || '';
    if (!body) return;
    const id = meId();
    if (!id) return toast('Choose who is using this phone first.');
    if (activeChannel === 'direct' && !dmTarget) return toast('Choose a teammate first.');
    if (activeChannel === 'custom' && customParticipants().length < 2) return toast('Choose at least one teammate for the custom group.');
    const api = getClient();
    const payload = {
      event_id: EVENT_ID,
      channel: activeChannel,
      sender_id: id,
      recipient_id: activeChannel === 'direct' ? dmTarget : null,
      participant_ids: activeChannel === 'custom' ? customParticipants() : null,
      body,
      urgent: urgentCompose
    };
    const sendBtn = document.getElementById('chatSend');
    if (sendBtn) sendBtn.disabled = true;
    const { error } = await api.from('team_messages').insert(payload);
    if (sendBtn) sendBtn.disabled = false;
    if (error) return toast(error.message);
    if (input) input.value = '';
    urgentCompose = false;
    await refreshMessages(true);
    setTimeout(() => {
      const box = document.getElementById('chatMessages');
      if (box) box.scrollTop = box.scrollHeight;
    }, 30);
  }

  function render(root, triggerRefresh=true) {
    injectStyles();
    normalizeChannel();
    const self = me();
    if (!self) {
      root.innerHTML = '<section class="section"><div class="card"><div class="big">Choose your name first</div><div class="muted small" style="margin-top:7px">Use the Shared button at the top, choose Change person, then return to Chat.</div></div></section>';
      return;
    }

    const channelTabs = [
      {id:'team', label:'Team'},
      ...(self.group === 'Sales' ? [{id:'sales', label:'Sales'}] : []),
      {id:'nts', label:'NTS'},
      {id:'direct', label:'Direct'},
      {id:'custom', label:'Custom'}
    ];
    const others = people().filter(p => p.id !== self.id);
    if (!dmTarget || !others.some(p => p.id === dmTarget)) {
      dmTarget = others[0]?.id || '';
      if (dmTarget) localStorage.setItem(DM_STORAGE, dmTarget);
    }

    const list = visibleMessages();
    const messageHtml = list.length ? list.map(msg => {
      const sender = personById(msg.sender_id)?.name || msg.sender_id;
      const mine = msg.sender_id === self.id;
      return `<div class="chat-msg ${mine?'mine':''} ${msg.urgent?'urgent':''}">
        <div class="chat-meta">${mine?'':`<strong>${esc(sender)}</strong>`}${msg.urgent?'<span class="chat-urgent-label">URGENT</span>':''}<span>${fmtTime(msg.created_at)}</span></div>
        <div class="chat-body">${formatBody(msg.body)}</div>
      </div>`;
    }).join('') : '<div class="chat-empty">No messages here yet. Start the conversation.</div>';

    const directPicker = activeChannel === 'direct' ? `
      <div class="field"><label>Conversation with</label><select class="chat-direct-select" id="chatDmTarget">
        ${others.map(p => `<option value="${esc(p.id)}" ${p.id===dmTarget?'selected':''}>${esc(p.name)} — ${esc(p.title||'')}</option>`).join('')}
      </select></div>` : '';

    const recentGroups = recentCustomGroups();
    const customPicker = activeChannel === 'custom' ? `
      <div class="card flat">
        <div class="label">Choose people for this group</div>
        <div class="chat-member-grid" style="margin-top:9px">
          ${others.map(p=>`<label class="chat-member-pill"><input type="checkbox" data-custom-person="${esc(p.id)}" ${customTargets.includes(p.id)?'checked':''}><span>${esc(p.name.split(' ')[0])}</span></label>`).join('')}
        </div>
        ${recentGroups.length?`<div class="label" style="margin-top:13px">Recent custom groups</div><div class="chat-tabs" style="margin-top:7px">${recentGroups.map((g,i)=>`<button type="button" class="chat-tab" data-custom-group="${i}">${g.ids.filter(id=>id!==self.id).map(id=>esc(personById(id)?.name.split(' ')[0]||id)).join(' + ')||'Group'}</button>`).join('')}</div>`:''}
      </div>` : '';

    const alertButton = ('Notification' in window && Notification.permission === 'default')
      ? '<button class="chat-alert-btn" id="chatEnableAlerts">Enable alerts</button>'
      : '';

    root.innerHTML = `<section class="section chat-shell">
      <div class="chat-head"><div><h1 style="margin:0">Team Chat</h1><p class="muted small" style="margin:4px 0 0">Show-floor messages for C.P. Bourg Expo Ops.</p></div>${alertButton}</div>
      <div class="chat-tabs">${channelTabs.map(c=>`<button class="chat-tab ${activeChannel===c.id?'active':''}" data-chat-channel="${c.id}">${c.label}</button>`).join('')}</div>
      ${directPicker}
      ${customPicker}
      <div id="chatMessages" class="chat-messages">${messageHtml}</div>
      <div class="chat-composer">
        <div class="chat-compose-row"><textarea id="chatInput" class="chat-input" rows="1" maxlength="1000" placeholder="${activeChannel==='direct'?'Message '+esc(personById(dmTarget)?.name||'teammate'):activeChannel==='custom'?'Message custom group…':'Message '+activeChannel+'…'}"></textarea><button id="chatSend" class="chat-send" type="button" aria-label="Send">➤</button></div>
        <div class="chat-tools"><button type="button" id="chatUrgent" class="chat-urgent-toggle ${urgentCompose?'on':''}">⚠ Urgent</button>
          ${['On my way','Got it','Need help','I can cover'].map(q=>`<button type="button" class="chat-quick" data-quick="${q}">${q}</button>`).join('')}
        </div>
      </div>
      <div class="chat-status">Signed in as <strong>${esc(self.name)}</strong> on this phone. Messages refresh automatically.</div>
    </section>`;

    root.querySelectorAll('[data-chat-channel]').forEach(btn => btn.onclick = () => {
      activeChannel = btn.dataset.chatChannel;
      localStorage.setItem(CHANNEL_STORAGE, activeChannel);
      render(root, false);
      markRead();
    });
    const picker = document.getElementById('chatDmTarget');
    if (picker) picker.onchange = () => {
      dmTarget = picker.value;
      localStorage.setItem(DM_STORAGE, dmTarget);
      render(root, false);
      markRead();
    };
    root.querySelectorAll('[data-custom-person]').forEach(box=>box.onchange=()=>{
      const id=box.dataset.customPerson;
      if(box.checked && !customTargets.includes(id)) customTargets.push(id);
      if(!box.checked) customTargets=customTargets.filter(x=>x!==id);
      customTargets=[...new Set(customTargets)].filter(x=>x!==self.id);
      localStorage.setItem(CUSTOM_STORAGE,JSON.stringify(customTargets));
      render(root,false);
      markRead();
    });
    root.querySelectorAll('[data-custom-group]').forEach(btn=>btn.onclick=()=>{
      const g=recentGroups[Number(btn.dataset.customGroup)];
      if(!g) return;
      customTargets=g.ids.filter(id=>id!==self.id);
      localStorage.setItem(CUSTOM_STORAGE,JSON.stringify(customTargets));
      render(root,false);
      markRead();
    });
    document.getElementById('chatSend').onclick = sendMessage;
    const input = document.getElementById('chatInput');
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    document.getElementById('chatUrgent').onclick = () => {
      urgentCompose = !urgentCompose;
      document.getElementById('chatUrgent').classList.toggle('on', urgentCompose);
    };
    root.querySelectorAll('[data-quick]').forEach(btn => btn.onclick = () => {
      input.value = btn.dataset.quick;
      input.focus();
    });
    const enable = document.getElementById('chatEnableAlerts');
    if (enable) enable.onclick = async () => {
      const result = await Notification.requestPermission();
      toast(result === 'granted' ? 'Urgent message alerts enabled' : 'Alerts were not enabled');
      render(root, false);
    };

    markRead();
    setTimeout(() => {
      const box = document.getElementById('chatMessages');
      if (box) box.scrollTop = box.scrollHeight;
    }, 20);
    if (triggerRefresh) refreshMessages(true);
  }

  function ensureNavBadge() {
    const chatBtn = document.querySelector('.nav-btn[data-view="chat"]');
    if (!chatBtn || document.getElementById('chatBadge')) return;
    const badge = document.createElement('span');
    badge.id = 'chatBadge';
    badge.className = 'chat-badge';
    chatBtn.appendChild(badge);
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (!document.hidden) refreshMessages(ops.getState().selectedView === 'chat');
    }, 5000);
  }

  injectStyles();
  ensureNavBadge();
  window.BourgChat = { render, refresh: refreshMessages };

  const waitForPerson = setInterval(() => {
    if (!meId()) return;
    clearInterval(waitForPerson);
    refreshMessages(false);
    startPolling();
    if (ops.getState().selectedView === 'chat') render(document.getElementById('mainContent'));
  }, 400);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && meId()) refreshMessages(ops.getState().selectedView === 'chat');
  });
})();