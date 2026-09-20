import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { validSubscription, notificationPayload } from './push-policy.mjs';

const keys={p256dh:Buffer.alloc(65,4).toString('base64url'),auth:Buffer.alloc(16,1).toString('base64url')};
for(const host of ['fcm.googleapis.com','web.push.apple.com','updates.push.services.mozilla.com','wns2-sg2p.notify.windows.com'])
  assert.equal(validSubscription({endpoint:`https://${host}/test`,keys}),true,host);
for(const endpoint of ['http://fcm.googleapis.com/test','https://fcm.googleapis.com.evil.test/x','https://127.0.0.1/x','https://web.push.apple.com:444/x','https://user:password@fcm.googleapis.com/x'])
  assert.equal(validSubscription({endpoint,keys}),false,endpoint);
assert.equal(validSubscription({endpoint:'https://fcm.googleapis.com/x',keys:{}}),false);
const payload=notificationPayload({id:'one',sender:'Test Sender',body:'Hello',urgent:false},'sean');
assert.equal(payload.personId,'sean');
assert.equal(payload.tag,'bourg-chat-one');
assert.equal(payload.url.includes('team='),false);

// Execute the actual service worker with mocked platform APIs.
const handlers={},shown=[],navigated=[];
let recipient={personId:'sean',enabled:true};
const context={URL,Response,Promise,indexedDB:{open(){
  const open={}; queueMicrotask(()=>{
    open.result={close(){},transaction(){return {objectStore(){return {get(){
      const request={};queueMicrotask(()=>{request.result=recipient;request.onsuccess();});return request;
    }}}}}};open.onsuccess();
  });return open;
}},self:{location:{origin:'https://bme-productivity-calculator.vercel.app'},
  addEventListener:(name,handler)=>handlers[name]=handler,
  registration:{showNotification:async(title,options)=>shown.push({title,...options})},
  clients:{matchAll:async()=>[],openWindow:async url=>navigated.push(url)}}};
vm.runInNewContext(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),context);
async function push(value){let promise;handlers.push({data:{json:()=>value},waitUntil:p=>promise=p});await promise;}
await push(payload);assert.equal(shown.length,1);assert.equal(shown[0].body,'Test Sender: Hello');
await push({...payload,personId:'jim'});assert.equal(shown.length,1,'wrong-person content suppressed');
recipient={enabled:false};await push(payload);assert.equal(shown.length,1,'disabled device suppressed');
let clicked;handlers.notificationclick({notification:{close(){}},waitUntil:p=>clicked=p});await clicked;
assert.equal(navigated[0],'https://bme-productivity-calculator.vercel.app/bourg-expo-ops/?open=chat');
console.log('PASS: push endpoint restrictions, notification payload, service worker delivery, identity protection, disable, click routing');

// Exercise the actual opt-in UI, including a failed server save. Permission alone
// must never produce an "Alerts on" state.
const elements=new Map(),storage=new Map(),apiCalls=[];
let rejectSave=true, browserSubscription=null, savedRecipient;
function element(){
  return {open:false,children:new Map(),textContent:'',disabled:false,
    set innerHTML(html){this.children.clear();for(const [,id] of html.matchAll(/id="([^"]+)"/g)){const child=element();this.children.set(id,child);elements.set(id,child);}},
    querySelector(selector){return this.children.get(selector.slice(1));},
    querySelectorAll(){return [];},showModal(){this.open=true;},close(){this.open=false;}};
}
const reg={pushManager:{getSubscription:async()=>browserSubscription,subscribe:async()=>{
  browserSubscription={toJSON:()=>({endpoint:'https://fcm.googleapis.com/test',keys}),unsubscribe:async()=>{browserSubscription=null;return true;}};
  return browserSubscription;
}},getNotifications:async()=>[]};
const ui={URLSearchParams,Uint8Array,Promise,AbortSignal,atob,crypto:globalThis.crypto,
  setTimeout:()=>0,location:{search:''},isSecureContext:true,PushManager:function(){},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  matchMedia:()=>({matches:false}),addEventListener(){},
  Notification:{permission:'granted',requestPermission:async()=> 'granted'},
  navigator:{userAgent:'test',serviceWorker:{register:async()=>reg,ready:Promise.resolve(reg)}},
  BourgOps:{showToast(){},getState:()=>({people:[{id:'sean',name:'Sean'}]})},
  document:{getElementById:id=>elements.get(id),createElement:element,body:{append:el=>elements.set(el.id,el)}},
  indexedDB:{open(){const open={};queueMicrotask(()=>{
    open.result={close(){},transaction(){const tx={objectStore:()=>({put(value){savedRecipient=value;queueMicrotask(()=>tx.oncomplete());}})};return tx;}};
    open.onsuccess();});return open;}},
  fetch:async(url,options)=>{
    const body=JSON.parse(options.body);apiCalls.push(body.action);
    if(body.action==='subscribe' && rejectSave)return {ok:false,json:async()=>({error:'Storage unavailable'})};
    return {ok:true,json:async()=>body.action==='config'?{publicKey:Buffer.alloc(65,4).toString('base64url')}:{enabled:true}};
  }
};
ui.window=ui;
vm.runInNewContext(readFileSync(new URL('../push.js',import.meta.url),'utf8'),ui);
storage.set('cp-bourg-expo-device-person-v1','sean');
ui.BourgPush.open();await elements.get('pushOn').onclick();
assert.equal(ui.BourgPush.isActive(),false,'server failure must not report success');
assert.equal(savedRecipient.enabled,false,'failed save must suppress notifications');
rejectSave=false;
ui.BourgPush.open();await elements.get('pushOn').onclick();
assert.equal(ui.BourgPush.isActive(),true);assert.equal(savedRecipient.personId,'sean');
assert.ok(elements.get('pushTest'));assert.ok(elements.get('pushOff'));
await ui.BourgPush.disable();
assert.equal(ui.BourgPush.isActive(),false);assert.equal(browserSubscription,null);
assert.equal(savedRecipient.enabled,false);assert.ok(apiCalls.includes('unsubscribe'));
console.log('PASS: opt-in server failure, successful registration, test/off controls, complete device opt-out');
