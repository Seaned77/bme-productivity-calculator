const CACHE='hid27-v2';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});

function enhanceCapture(html){
  if(html.includes('id="galleryPhoto"')) return html;
  html=html.replace('</style>',`.photoChoice{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.photoChoice label{display:flex;align-items:center;justify-content:center;gap:7px;min-height:48px;border-radius:14px;font-size:13px;font-weight:900;cursor:pointer}.photoChoice .cameraChoice{background:linear-gradient(135deg,#4d91b8,#6eb7d9);color:#fff}.photoChoice .galleryChoice{background:#fff;border:1px solid var(--line);color:#284f67}.photoChoice input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}@media(max-width:420px){.photoChoice{grid-template-columns:1fr}}\n</style>`);
  html=html.replace('<label for="cardPhoto"><div class="cam">📷</div><strong>Take badge / card photo</strong><div class="muted">Tap to use camera or choose a photo</div></label><input id="cardPhoto" type="file" accept="image/*" capture="environment">', '<div class="cam">📷</div><strong>Add badge / business card photo</strong><div class="muted">Take a new photo or select one already on your phone.</div><div class="photoChoice"><label class="cameraChoice" for="cardPhoto">📷 Take Photo</label><label class="galleryChoice" for="galleryPhoto">🖼️ Existing Photo</label><input id="cardPhoto" type="file" accept="image/*" capture="environment"><input id="galleryPhoto" type="file" accept="image/*"></div>');
  html=html.replace('</body>',`<script>(function(){const g=document.getElementById('galleryPhoto');if(!g)return;g.addEventListener('change',async function(e){const f=e.target.files&&e.target.files[0];if(!f)return;const im=document.getElementById('photoPreview');im.src=URL.createObjectURL(f);im.style.display='block';document.getElementById('scanBtn').style.display='inline-block';try{state.photo=await compress(f);document.getElementById('scanStatus').textContent='Existing photo attached. Tap Scan text from photo.';}catch(err){document.getElementById('scanStatus').textContent='Photo attached. Please enter details manually if scanning is unavailable.';}});})();</script></body>`);
  return html;
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  const isHidNav=e.request.mode==='navigate'&&u.pathname.startsWith('/hid27');
  if(isHidNav){
    e.respondWith(fetch(e.request).then(async r=>{
      const text=await r.text();
      const body=enhanceCapture(text);
      return new Response(body,{status:r.status,statusText:r.statusText,headers:new Headers(r.headers)});
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
    return;
  }
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});