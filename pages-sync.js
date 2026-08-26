(()=>{
  if(window.__bourgPageSyncV1)return;
  window.__bourgPageSyncV1=true;

  const PREFIXES=['compare','inline','offline'];
  const style=document.createElement('style');
  style.textContent=`
    .sheet-page-pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .page-note{font-size:11px;color:var(--muted);margin-top:5px;line-height:1.35}
    .page-note.warn{color:var(--warn);font-weight:750}
    .booklet-page-summary{margin:10px 0 0;padding:10px 12px;border:1px solid #d7e9f5;border-radius:12px;background:#f7fbfe;font-size:12px;line-height:1.45;color:var(--ink)}
    .booklet-page-summary b{color:var(--navy)}
    @media(max-width:520px){.sheet-page-pair{grid-template-columns:1fr 1fr;gap:6px}}
  `;
  document.head.appendChild(style);

  function clampSheets(v){return Math.max(1,Math.min(60,Math.round(Number(v)||1)))}
  function snapPages(v){
    const n=Math.max(4,Math.min(240,Number(v)||4));
    return Math.max(4,Math.round(n/4)*4);
  }
  function summaryHtml(prefix){
    const sheets=clampSheets(document.getElementById(prefix+'BodySheets')?.value||4);
    const bodyPages=sheets*4;
    const hasCover=!!document.getElementById(prefix+'Cover')?.checked;
    const totalSheets=sheets+(hasCover?1:0);
    const totalPages=bodyPages+(hasCover?4:0);
    return `<b>Booklet makeup:</b> Body: ${sheets} sheet${sheets===1?'':'s'} / ${bodyPages} pages`+
      (hasCover?` • Cover: 1 sheet / 4 pages • <b>Total: ${totalSheets} sheets / ${totalPages} pages</b>`:` • <b>Total: ${totalSheets} sheet${totalSheets===1?'':'s'} / ${totalPages} pages</b>`);
  }
  function updateSummary(prefix){
    const el=document.getElementById(prefix+'PageSummary');
    if(el)el.innerHTML=summaryHtml(prefix);
  }
  function syncFromSheets(prefix){
    const s=document.getElementById(prefix+'BodySheets');
    const p=document.getElementById(prefix+'BodyPages');
    if(!s||!p)return;
    const sheets=clampSheets(s.value);
    if(String(s.value)!==String(sheets))s.value=sheets;
    p.value=sheets*4;
    const note=document.getElementById(prefix+'PageNote');
    if(note){note.classList.remove('warn');note.textContent='4 finished body pages per body sheet.'}
    updateSummary(prefix);
  }
  function syncFromPages(prefix,finalize=false){
    const s=document.getElementById(prefix+'BodySheets');
    const p=document.getElementById(prefix+'BodyPages');
    if(!s||!p)return;
    const raw=Number(p.value);
    const note=document.getElementById(prefix+'PageNote');
    if(!Number.isFinite(raw))return;
    if(raw%4!==0&&!finalize){
      if(note){note.classList.add('warn');note.textContent='Body page count must be a multiple of 4 for saddle stitching.'}
      return;
    }
    const pages=snapPages(raw);
    p.value=pages;
    s.value=pages/4;
    if(note){note.classList.remove('warn');note.textContent='4 finished body pages per body sheet.'}
    s.dispatchEvent(new Event('input',{bubbles:true}));
    updateSummary(prefix);
  }
  function enhancePrefix(prefix){
    const sheets=document.getElementById(prefix+'BodySheets');
    if(!sheets||document.getElementById(prefix+'BodyPages'))return false;
    const field=sheets.closest('.field');
    if(!field)return false;

    const label=field.querySelector('label');
    if(label)label.textContent='Body sheets';
    const originalInput=sheets.cloneNode(true);
    originalInput.id=prefix+'BodySheets';
    originalInput.setAttribute('aria-label','Body sheets excluding cover');
    const pages=document.createElement('input');
    pages.id=prefix+'BodyPages';
    pages.type='number';
    pages.min='4';pages.max='240';pages.step='4';pages.value=clampSheets(sheets.value)*4;
    pages.setAttribute('aria-label','Body pages excluding cover');

    field.innerHTML=`<label>Body booklet makeup <span style="font-weight:600">(excluding cover)</span></label><div class="sheet-page-pair"><div><div class="finish-tag">Sheets</div></div><div><div class="finish-tag">Pages</div></div></div><div id="${prefix}PageNote" class="page-note">4 finished body pages per body sheet.</div>`;
    const pair=field.querySelector('.sheet-page-pair');
    pair.children[0].appendChild(originalInput);
    pair.children[1].appendChild(pages);

    const summary=document.createElement('div');
    summary.id=prefix+'PageSummary';
    summary.className='booklet-page-summary';
    const inputs=document.getElementById(prefix+'Inputs');
    inputs?.appendChild(summary);

    originalInput.addEventListener('input',()=>syncFromSheets(prefix));
    pages.addEventListener('input',()=>syncFromPages(prefix,false));
    pages.addEventListener('change',()=>syncFromPages(prefix,true));
    const cover=document.getElementById(prefix+'Cover');
    cover?.addEventListener('change',()=>updateSummary(prefix));
    cover?.addEventListener('input',()=>updateSummary(prefix));
    const coverLabel=cover?.closest('.checkrow')?.querySelector('label');
    if(coverLabel)coverLabel.textContent='Add 1 cover sheet / 4 cover pages';

    syncFromSheets(prefix);
    return true;
  }
  function enhanceAll(){
    let complete=true;
    PREFIXES.forEach(p=>{if(!document.getElementById(p+'BodyPages'))complete=enhancePrefix(p)&&complete; else updateSummary(p)});
    if(!complete)setTimeout(enhanceAll,80);
  }

  // Existing app builds its input controls later in the same page load.
  setTimeout(enhanceAll,0);
})();
