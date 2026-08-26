const CACHE='bourg-calc-v4.14';
const ASSETS=['./','./index.html','./manifest.json','./icon.svg','./equipment-visuals.js','./assets/inline-bbm-bme.webp','./offline-config.jpg','./assets/cp-bourg-logo-exact.png'];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req).catch(()=>caches.match('./').then(r=>r||caches.match('./index.html')))
    );
    return;
  }
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;
  event.respondWith(
    caches.match(req).then(cached=>cached||fetch(req).then(resp=>{
      if(resp&&resp.ok){
        const copy=resp.clone();
        caches.open(CACHE).then(cache=>cache.put(req,copy));
      }
      return resp;
    }))
  );
});
