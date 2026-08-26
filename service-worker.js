const CACHE='bourg-calc-v4.10';
const ASSETS=['./','./index.html','./manifest.json','./icon.svg','./equipment-visuals.js','./assets/inline-bbm-bme.webp','./offline-config.jpg','./assets/cp-bourg-logo-transparent.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
function withVisualLayer(html){if(html.includes('equipment-visuals.js'))return html;return html.replace('</body>','<script src="./equipment-visuals.js?v=4.10"></script></body>')}
self.addEventListener('fetch',e=>{
 if(e.request.mode==='navigate'){
  e.respondWith(fetch(e.request).then(async r=>{
   const html=withVisualLayer(await r.text());
   const resp=new Response(html,{status:r.status,statusText:r.statusText,headers:{'Content-Type':'text/html; charset=utf-8'}});
   const copy=resp.clone();caches.open(CACHE).then(c=>c.put('./',copy));return resp;
  }).catch(async()=>{
   const cached=await caches.match('./');if(!cached)return new Response('Offline',{status:503});
   const html=withVisualLayer(await cached.text());return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}})
  }));return
 }
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp})))
});
