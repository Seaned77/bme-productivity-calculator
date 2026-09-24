(() => {
  'use strict';

  const SUPABASE_URL = 'https://snvtthfqgjyyuligzyfr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_nIyLPHakhxXcfdKTUH_Dbw__MuHN-E1';
  const WORKSPACE_ID = 'printing-united-2026-leads';
  const BUCKET = 'bourg-lead-badges';
  const ACCESS_STORE = 'bourg-lead-capture-key-v1';
  const PERSON_STORE = 'bourg-lead-capture-person-v1';
  const DB_NAME = 'bourg-lead-capture';
  const STORE_NAME = 'pending-leads';

  const TEAM = [
    'Sean',
    'Jim Tressler',
    'Charles Bourg',
    'Dan Attew',
    'Chuck Cartier',
    'Luis Fernandez',
    'Tim Thompson',
    'James Varao',
    'Shadrach Santiago'
  ];

  const PRODUCTS = ['BMe / BBM','BB3002','BBL','CMT-330','BPM','Other'];

  const $ = (id) => document.getElementById(id);
  const gate = $('gate');
  const app = $('app');
  const params = new URLSearchParams(location.search);
  const incomingKey = params.get('team');
  if (incomingKey) localStorage.setItem(ACCESS_STORE, incomingKey);
  const accessKey = incomingKey || localStorage.getItem(ACCESS_STORE) || '';

  let client = null;
  let badgeFile = null;
  let badgePreviewUrl = '';
  let leads = [];
  let signedUrls = new Map();
  let currentView = 'capture';

  function esc(s='') {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function toast(message, type='good') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = message;
    $('toastWrap').appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function setConnection(label, mode='offline') {
    $('syncLabel').textContent = label;
    $('syncStatus').classList.toggle('live', mode === 'live');
    $('syncStatus').classList.toggle('offline', mode !== 'live');
  }

  function setupChoices() {
    $('capturedBy').innerHTML = TEAM.map(n => '<option>' + esc(n) + '</option>').join('');
    $('personFilter').innerHTML = '<option value="">All team</option>' + TEAM.map(n => '<option>' + esc(n) + '</option>').join('');
    const savedPerson = localStorage.getItem(PERSON_STORE);
    if (savedPerson && TEAM.includes(savedPerson)) $('capturedBy').value = savedPerson;

    $('productChips').innerHTML = PRODUCTS.map((p, i) => {
      const id = 'prod' + i;
      return '<div class="chip"><input type="checkbox" id="' + id + '" value="' + esc(p) + '"><label for="' + id + '">' + esc(p) + '</label></div>';
    }).join('');
  }

  function initClient() {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { 'x-bourg-link-key': accessKey } }
    });
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function queuePut(item) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(item);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    await updateQueueBanner();
  }

  async function queueDelete(id) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    await updateQueueBanner();
  }

  async function queueAll() {
    const db = await openDb();
    const items = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return items;
  }

  async function updateQueueBanner() {
    const items = await queueAll().catch(() => []);
    const banner = $('queueBanner');
    if (!items.length) {
      banner.classList.add('hidden');
      banner.textContent = '';
      return;
    }
    banner.textContent = items.length + ' lead' + (items.length === 1 ? '' : 's') + ' saved on this device waiting to sync.';
    banner.classList.remove('hidden');
  }

  function extFor(file) {
    const type = (file?.type || '').toLowerCase();
    if (type.includes('png')) return 'png';
    if (type.includes('webp')) return 'webp';
    if (type.includes('heic')) return 'heic';
    if (type.includes('heif')) return 'heif';
    return 'jpg';
  }

  async function syncItem(item) {
    const upload = await client.storage.from(BUCKET).upload(item.path, item.file, {
      contentType: item.file.type || 'image/jpeg',
      cacheControl: '3600',
      upsert: true
    });
    if (upload.error) throw upload.error;

    const { error } = await client.from('sales_leads').upsert(item.record, { onConflict: 'id' });
    if (error) throw error;
  }

  async function flushQueue(silent=false) {
    if (!navigator.onLine || !client) {
      setConnection('Offline — saving locally', 'offline');
      return;
    }
    const items = await queueAll().catch(() => []);
    if (!items.length) {
      setConnection('Shared', 'live');
      return;
    }
    setConnection('Syncing ' + items.length, 'offline');
    let synced = 0;
    for (const item of items) {
      try {
        await syncItem(item);
        await queueDelete(item.id);
        synced++;
      } catch (err) {
        console.warn('Queued lead sync failed', err);
        break;
      }
    }
    if (synced && !silent) toast(synced + ' queued lead' + (synced === 1 ? '' : 's') + ' synced');
    setConnection(synced === items.length ? 'Shared' : 'Retrying later', synced === items.length ? 'live' : 'offline');
  }

  function showBadge(file) {
    badgeFile = file || null;
    if (badgePreviewUrl) URL.revokeObjectURL(badgePreviewUrl);
    badgePreviewUrl = '';
    if (!file) {
      $('badgePreview').classList.add('hidden');
      $('cameraPrompt').classList.remove('hidden');
      $('cameraActions').classList.add('hidden');
      $('badgeInput').value = '';
      return;
    }
    badgePreviewUrl = URL.createObjectURL(file);
    $('badgePreview').src = badgePreviewUrl;
    $('badgePreview').classList.remove('hidden');
    $('cameraPrompt').classList.add('hidden');
    $('cameraActions').classList.remove('hidden');
  }

  function selectedProducts() {
    return [...document.querySelectorAll('#productChips input:checked')].map(x => x.value);
  }

  function buildRecord(id, path) {
    const priority = document.querySelector('input[name="priority"]:checked')?.value || 'Warm';
    const person = $('capturedBy').value;
    localStorage.setItem(PERSON_STORE, person);
    return {
      id,
      workspace_id: WORKSPACE_ID,
      customer_name: $('customerName').value.trim() || null,
      company: $('company').value.trim() || null,
      job_title: $('jobTitle').value.trim() || null,
      email: $('email').value.trim() || null,
      phone: $('phone').value.trim() || null,
      badge_image_path: path,
      notes: $('notes').value.trim() || null,
      priority,
      product_interests: selectedProducts(),
      captured_by: person,
      capture_location: $('captureLocation').value,
      follow_up_date: $('followDate').value || null,
      follow_up_action: $('followAction').value.trim() || null,
      status: 'New',
      updated_at: new Date().toISOString()
    };
  }

  function resetForm() {
    $('leadForm').reset();
    const savedPerson = localStorage.getItem(PERSON_STORE);
    if (savedPerson && TEAM.includes(savedPerson)) $('capturedBy').value = savedPerson;
    $('captureLocation').value = 'C.P. Bourg booth';
    $('pWarm').checked = true;
    showBadge(null);
    $('notes').focus({preventScroll:true});
    scrollTo({top:0, behavior:'smooth'});
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!badgeFile) {
      toast('Take a badge photo first.', 'bad');
      return;
    }
    if (badgeFile.size > 10 * 1024 * 1024) {
      toast('Badge photo is larger than 10 MB. Retake it at a smaller size.', 'bad');
      return;
    }
    const btn = $('saveLeadBtn');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    const id = crypto.randomUUID();
    const path = WORKSPACE_ID + '/' + id + '.' + extFor(badgeFile);
    const item = { id, path, file: badgeFile, record: buildRecord(id, path), queued_at: Date.now() };

    try {
      if (!navigator.onLine) throw new Error('offline');
      await syncItem(item);
      toast('Lead saved to the team repository');
      setConnection('Shared', 'live');
    } catch (err) {
      try {
        await queuePut(item);
        toast('Connection is weak — lead saved safely on this phone.');
        setConnection('Saved locally', 'offline');
      } catch (queueErr) {
        console.error(queueErr);
        toast('Could not save this lead. Keep this screen open and try again.', 'bad');
        btn.disabled = false;
        btn.textContent = 'Save Lead';
        return;
      }
    }

    resetForm();
    btn.disabled = false;
    btn.textContent = 'Save Lead';
  }

  function switchView(view) {
    currentView = view;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    $('captureView').classList.toggle('hidden', view !== 'capture');
    $('leadsView').classList.toggle('hidden', view !== 'leads');
    if (view === 'leads') loadLeads();
  }

  async function loadLeads() {
    $('leadList').innerHTML = '<div class="empty">Loading leads…</div>';
    try {
      await flushQueue(true);
      const { data, error } = await client.from('sales_leads').select('*').order('created_at', { ascending:false }).limit(500);
      if (error) throw error;
      leads = data || [];
      signedUrls.clear();
      setConnection('Shared', 'live');
      renderLeads();
      warmSignedUrls();
    } catch (err) {
      $('leadList').innerHTML = '<div class="empty">Unable to reach the shared repository. Your unsynced captures are still safe on this device.</div>';
      setConnection('Offline', 'offline');
    }
  }

  async function signedUrl(path) {
    if (!path) return '';
    if (signedUrls.has(path)) return signedUrls.get(path);
    const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 900);
    if (error || !data?.signedUrl) return '';
    signedUrls.set(path, data.signedUrl);
    return data.signedUrl;
  }

  async function warmSignedUrls() {
    const visible = filteredLeads().slice(0, 40);
    for (const lead of visible) {
      const url = await signedUrl(lead.badge_image_path);
      if (url) {
        const img = document.querySelector('[data-badge-id="' + lead.id + '"]');
        if (img) img.src = url;
      }
    }
  }

  function filteredLeads() {
    const q = $('searchBox').value.trim().toLowerCase();
    const p = $('priorityFilter').value;
    const person = $('personFilter').value;
    const loc = $('locationFilter').value;
    return leads.filter(l => {
      if (p && l.priority !== p) return false;
      if (person && l.captured_by !== person) return false;
      if (loc && l.capture_location !== loc) return false;
      if (!q) return true;
      const hay = [
        l.customer_name,l.company,l.job_title,l.email,l.phone,l.notes,l.priority,l.captured_by,l.capture_location,l.follow_up_action,
        ...(l.product_interests || [])
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  function formatWhen(value) {
    if (!value) return '';
    const d = new Date(value);
    return d.toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  }

  function renderLeads() {
    const items = filteredLeads();
    const today = new Date().toDateString();
    $('statTotal').textContent = leads.length;
    $('statHot').textContent = leads.filter(l => l.priority === 'Hot').length;
    $('statToday').textContent = leads.filter(l => new Date(l.created_at).toDateString() === today).length;
    $('statFollow').textContent = leads.filter(l => l.priority === 'Follow-up' || l.follow_up_date).length;

    if (!items.length) {
      $('leadList').innerHTML = '<div class="card empty">No leads match these filters yet.</div>';
      return;
    }

    $('leadList').innerHTML = items.map(l => {
      const name = l.customer_name || 'Badge captured';
      const company = l.company || (l.product_interests?.length ? l.product_interests.join(' • ') : 'Open to review details');
      const cls = l.priority === 'Hot' ? 'hot' : l.priority === 'Warm' ? 'warm' : '';
      return '<button class="lead-card" type="button" data-lead-id="' + l.id + '">' +
        '<img class="badge-thumb" data-badge-id="' + l.id + '" alt="Badge photo" src="icon.svg">' +
        '<div class="lead-main"><div class="lead-name">' + esc(name) + '</div><div class="lead-company">' + esc(company) + '</div>' +
        '<div class="lead-meta"><span class="tag ' + cls + '">' + esc(l.priority) + '</span><span class="tag">' + esc(l.captured_by) + '</span><span class="tag">' + esc(l.capture_location) + '</span></div></div>' +
        '<div class="lead-time">' + esc(formatWhen(l.created_at)) + '</div></button>';
    }).join('');

    document.querySelectorAll('[data-lead-id]').forEach(btn => btn.addEventListener('click', () => openLead(btn.dataset.leadId)));
    warmSignedUrls();
  }

  async function openLead(id) {
    const lead = leads.find(x => x.id === id);
    if (!lead) return;
    const dlg = $('leadDialog');
    $('dialogTitle').textContent = lead.customer_name || lead.company || 'Captured lead';
    const url = await signedUrl(lead.badge_image_path);
    $('dialogBody').innerHTML =
      '<div class="modal-grid">' +
        '<div><img class="modal-img" src="' + esc(url || 'icon.svg') + '" alt="Customer badge photo"></div>' +
        '<div class="grid">' +
          fieldHtml('Name','editName',lead.customer_name) +
          fieldHtml('Company','editCompany',lead.company) +
          fieldHtml('Title','editTitle',lead.job_title) +
          fieldHtml('Email','editEmail',lead.email,'email') +
          fieldHtml('Phone','editPhone',lead.phone,'tel') +
        '</div>' +
      '</div>' +
      '<div class="divider"></div>' +
      '<div class="grid two">' +
        selectHtml('Priority','editPriority',['Hot','Warm','Follow-up','Info only'],lead.priority) +
        selectHtml('Status','editStatus',['New','Contacted','Qualified','Closed'],lead.status) +
        fieldHtml('Follow-up date','editFollowDate',lead.follow_up_date,'date') +
        fieldHtml('Follow-up action','editFollowAction',lead.follow_up_action) +
      '</div>' +
      '<div class="field" style="margin-top:12px"><label for="editNotes">Notes</label><textarea id="editNotes" class="textarea">' + esc(lead.notes || '') + '</textarea></div>' +
      '<p class="small">Products: ' + esc((lead.product_interests || []).join(', ') || 'Not specified') + ' · Captured by ' + esc(lead.captured_by) + ' at ' + esc(lead.capture_location) + '</p>' +
      '<button id="saveEditBtn" class="primary" type="button">Save changes</button>';
    $('saveEditBtn').onclick = () => saveLeadEdit(lead.id);
    dlg.showModal();
  }

  function fieldHtml(label,id,value,type='text') {
    return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><input id="' + id + '" class="input" type="' + type + '" value="' + esc(value || '') + '"></div>';
  }

  function selectHtml(label,id,options,value) {
    return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><select id="' + id + '" class="select">' +
      options.map(o => '<option' + (o === value ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></div>';
  }

  async function saveLeadEdit(id) {
    if (!navigator.onLine) {
      toast('Connect to the internet to edit an existing shared lead.', 'bad');
      return;
    }
    const patch = {
      customer_name: $('editName').value.trim() || null,
      company: $('editCompany').value.trim() || null,
      job_title: $('editTitle').value.trim() || null,
      email: $('editEmail').value.trim() || null,
      phone: $('editPhone').value.trim() || null,
      priority: $('editPriority').value,
      status: $('editStatus').value,
      follow_up_date: $('editFollowDate').value || null,
      follow_up_action: $('editFollowAction').value.trim() || null,
      notes: $('editNotes').value.trim() || null,
      updated_at: new Date().toISOString()
    };
    const btn = $('saveEditBtn');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    const { error } = await client.from('sales_leads').update(patch).eq('id', id);
    if (error) {
      toast(error.message || 'Could not update lead', 'bad');
      btn.disabled = false;
      btn.textContent = 'Save changes';
      return;
    }
    $('leadDialog').close();
    toast('Lead updated');
    await loadLeads();
  }

  function csvCell(v) {
    const s = Array.isArray(v) ? v.join('; ') : (v ?? '');
    return '"' + String(s).replace(/"/g,'""') + '"';
  }

  function exportCsv() {
    const rows = filteredLeads();
    if (!rows.length) {
      toast('There are no leads to export.', 'bad');
      return;
    }
    const cols = [
      ['Captured At','created_at'],['Name','customer_name'],['Company','company'],['Title','job_title'],['Email','email'],['Phone','phone'],
      ['Priority','priority'],['Products','product_interests'],['Captured By','captured_by'],['Location','capture_location'],['Notes','notes'],
      ['Follow-up Date','follow_up_date'],['Follow-up Action','follow_up_action'],['Status','status']
    ];
    const csv = [cols.map(c => csvCell(c[0])).join(',')]
      .concat(rows.map(r => cols.map(c => csvCell(r[c[1]])).join(','))).join('\r\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bourg-leads-printing-united-2026.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function testAccess() {
    try {
      const { error } = await client.from('sales_leads').select('id', { head:true, count:'exact' }).limit(1);
      if (error) throw error;
      setConnection(navigator.onLine ? 'Shared' : 'Offline', navigator.onLine ? 'live' : 'offline');
      return true;
    } catch (err) {
      console.error(err);
      setConnection('Access error', 'offline');
      toast('This private lead link is invalid or no longer active.', 'bad');
      return false;
    }
  }

  function wireEvents() {
    document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
    $('badgeInput').addEventListener('change', () => {
      const file = $('badgeInput').files?.[0];
      if (file) showBadge(file);
    });
    $('retakeBtn').addEventListener('click', e => {
      e.preventDefault();
      showBadge(null);
      $('badgeInput').click();
    });
    $('leadForm').addEventListener('submit', onSubmit);
    ['searchBox','priorityFilter','personFilter','locationFilter'].forEach(id => {
      $(id).addEventListener(id === 'searchBox' ? 'input' : 'change', renderLeads);
    });
    $('exportBtn').addEventListener('click', exportCsv);
    $('syncStatus').addEventListener('click', async () => {
      await flushQueue(false);
      if (currentView === 'leads') await loadLeads();
    });
    window.addEventListener('online', () => flushQueue(false));
    window.addEventListener('offline', () => setConnection('Offline — saving locally', 'offline'));
  }

  async function boot() {
    setupChoices();
    wireEvents();
    await updateQueueBanner();

    if (!accessKey || !window.supabase?.createClient) {
      gate.classList.remove('hidden');
      app.classList.add('hidden');
      return;
    }

    initClient();
    const ok = await testAccess();
    if (!ok) {
      gate.classList.remove('hidden');
      app.classList.add('hidden');
      return;
    }

    gate.classList.add('hidden');
    app.classList.remove('hidden');
    await flushQueue(true);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  boot();
})();