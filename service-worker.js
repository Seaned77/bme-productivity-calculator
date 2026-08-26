self.addEventListener('install',event=>{
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.map(key=>caches.delete(key)));
    try{await self.registration.unregister();}catch(e){}
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients){
      try{client.postMessage({type:'BOURG_SW_REMOVED'});}catch(e){}
    }
  })());
});

self.addEventListener('fetch',()=>{
  // Intentionally do not intercept requests. The app is served directly by Vercel.
});
