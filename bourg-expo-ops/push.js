(() => {
  'use strict';
  const PERSON = 'cp-bourg-expo-device-person-v1';
  const DEVICE = 'cp-bourg-push-device-v1';
  const API = 'https://snvtthfqgjyyuligzyfr.supabase.co/functions/v1/bourg-chat-push';
  let active = false;
  let busy = false;
  let publicKey = '';
  const person = () => localStorage.getItem(PERSON) || '';
  const supported = () => window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const needsInstall = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const toast = message => window.BourgOps?.showToast(message);
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function device() {
    const saved = localStorage.getItem(DEVICE);
    if (saved) return JSON.parse(saved);
    const value = { deviceId:crypto.randomUUID(), deviceToken:Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('') };
    localStorage.setItem(DEVICE,JSON.stringify(value));
    return value;
  }
  async function request(action, extra = {}) {
    const teamKey = new URLSearchParams(location.search).get('team') || localStorage.getItem('cp-bourg-expo-link-key-v1') || '';
    const response = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json','x-bourg-link-key':teamKey},
      body:JSON.stringify({action,personId:person(),...device(),...extra}), signal:AbortSignal.timeout(15000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to update alerts. Try again.');
    return result;
  }
  async function registration() {
    await navigator.serviceWorker.register('sw.js');
    return Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('The app is still updating. Refresh and try again.')),12000))]);
  }
  function saveRecipient(value) {
    return new Promise((resolve,reject)=>{
      const open=indexedDB.open('bourg-push',1);
      open.onupgradeneeded=()=>open.result.createObjectStore('settings');
      open.onerror=()=>reject(open.error);
      open.onsuccess=()=>{
        const db=open.result, tx=db.transaction('settings','readwrite');
        tx.objectStore('settings').put(value,'recipient');
        tx.oncomplete=()=>{db.close();resolve();};
        tx.onerror=()=>{db.close();reject(tx.error);};
      };
    });
  }
  function label() { return active ? 'Alerts on' : 'Enable alerts'; }
  function updateButton() {
    const button=document.getElementById('chatEnableAlerts');
    if(button) button.textContent=label();
  }
  async function enable() {
    if (!person()) throw new Error('Choose your name using the Shared button first.');
    // Permission must be requested directly from the user's tap, especially on iOS.
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in your device or browser settings, then try again.');
    const reg = await registration();
    if(!publicKey) publicKey=(await request('config')).publicKey;
    const bytes=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
    const subscription=await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
    try {
      await saveRecipient({personId:person(),enabled:true});
      await request('subscribe',{subscription:subscription.toJSON()});
      active=true;
    } catch(error) {
      await saveRecipient({enabled:false});
      throw error;
    }
    updateButton();
  }
  async function disable() {
    if(!supported()) return;
    const reg=await registration();
    const subscription=await reg.pushManager.getSubscription();
    // Stop displaying on this device immediately, even if the server is offline.
    await saveRecipient({enabled:false});
    active=false;
    updateButton();
    if(localStorage.getItem(DEVICE)) await request('unsubscribe');
    if(subscription) await subscription.unsubscribe();
    for(const notification of await reg.getNotifications()) notification.close();
  }
  function open() {
    let dlg=document.getElementById('pushDialog');
    if(!dlg){
      dlg=document.createElement('dialog'); dlg.id='pushDialog'; dlg.className='modal'; document.body.append(dlg);
    }
    const name=window.BourgOps?.getState().people.find(p=>p.id===person())?.name || 'your name';
    let body;
    if(needsInstall() && !standalone()) {
      body='<p>Add this app to your Home Screen first:</p><ol><li>Open your private team link in Safari.</li><li>Tap Share, then Add to Home Screen.</li><li>Open the new app icon, choose your name, then return to Chat → Enable alerts.</li></ol><p class="auth-note">Requires iOS or iPadOS 16.4 or later. Repeat on each iPhone or iPad.</p>';
    } else if(!supported()) {
      body='<p>This browser does not support background alerts. Open the app in an up-to-date Chrome, Edge, Firefox, or a supported Home Screen app.</p>';
    } else {
      body=`<p>Receive new chat messages for <strong>${esc(name)}</strong> on this device, including when the app is closed.</p><p class="auth-note">Enable this separately on each phone, tablet, or laptop. Notifications may show the sender and a message preview on your lock screen. Sound and delivery depend on your device settings and Focus / Do Not Disturb.</p><div class="actions">${active?'<button type="button" class="primary-btn" id="pushTest">Send test alert</button><button type="button" class="ghost-btn" id="pushOff">Turn off on this device</button>':'<button type="button" class="primary-btn" id="pushOn">Enable on this device</button>'}</div>`;
    }
    dlg.innerHTML=`<div class="modal-card"><div class="modal-head"><h2>Chat alerts</h2><button type="button" class="icon-btn" id="pushClose" aria-label="Close">×</button></div>${body}<p id="pushStatus" class="auth-note" role="status"></p></div>`;
    dlg.querySelector('#pushClose').onclick=()=>dlg.close();
    const run=fn=>async()=>{
      if(busy)return; busy=true;
      dlg.querySelectorAll('.actions button').forEach(b=>b.disabled=true);
      const status=dlg.querySelector('#pushStatus'); status.textContent='Please wait…';
      try{await fn();}catch(error){status.textContent=error.message;}finally{busy=false;dlg.querySelectorAll('.actions button').forEach(b=>b.disabled=false);}
    };
    const on=dlg.querySelector('#pushOn');
    if(on)on.onclick=run(async()=>{await enable();open();toast('Chat alerts enabled on this device');});
    const off=dlg.querySelector('#pushOff');
    if(off)off.onclick=run(async()=>{await disable();open();toast('Alerts turned off on this device');});
    const test=dlg.querySelector('#pushTest');
    if(test)test.onclick=run(async()=>{await request('test');dlg.querySelector('#pushStatus').textContent='Test accepted by the notification service. Look for the alert on this device.';});
    if(!dlg.open)dlg.showModal();
  }
  async function refresh() {
    if(!supported() || !person())return;
    try{
      const reg=await registration(), sub=await reg.pushManager.getSubscription();
      publicKey=(await request('config')).publicKey;
      active=!!sub && Notification.permission==='granted' && (await request('status')).enabled;
      await saveRecipient({personId:person(),enabled:active});
      updateButton();
    }catch{ /* Preserve working subscriptions when briefly offline. */ }
  }
  window.BourgPush={open,disable,label,isActive:()=>active};
  window.addEventListener('bourgops:person',refresh);
  window.addEventListener('online',refresh);
  window.addEventListener('storage',e=>{if(e.key===PERSON)refresh();});
  refresh();
})();
