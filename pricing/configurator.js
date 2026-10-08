/* Shared UI for quantity-aware booklet and perfect-binding configurations. */
(function(){
'use strict';
const $=id=>document.getElementById(id), C=BourgCatalog, E=BourgPricing, money=E.money;
const binding=document.body.dataset.pricing==='binding';
const q={},owned={};let lastBase=binding?'eva':'bbm2', lastTrimmer='130';
const bookletOptions=['bsf','ifb','bsfUI','plate','bpm','bleed','crease','cut','fold','bottomPerf','topPerf','slot','slot2','gui','bpmCable','dock','unlimited','bse','trim','bmeBse','bmeTrim','box'];
const bindingOptions=['bsfLR','bsf','bsfUI','plate','ifb','bbl','bbc','box','bbr','upgrade','dust','connex','130','130con','130cool','130stack','330','330con','330cool','330stack','wagon','bins'];
const baseId=()=>$(binding?'binder':'maker').value;
const ids=()=>[baseId(),...(binding?bindingOptions:bookletOptions)];
const present=id=>(q[id]||0)+(owned[id]||0);
function active(){return ids().some(id=>present(id));}
function set(id,n){q[id]=n;}
function resetValues(){Object.keys(q).forEach(id=>delete q[id]);Object.keys(owned).forEach(id=>delete owned[id]);$('installation').value='';$('includeExisting').checked=false;}
function rowName(id){return C[id].name;}
function render(){
 const container=$(binding?'parts':'items');
 container.innerHTML=ids().map(id=>{
  const p=C[id], family=id==='bmeBse'||id==='bmeTrim'?'BM-e':id==='bse'||id==='trim'||id==='unlimited'?'BBM':'';
  return `<div class="item" data-row="${id}"><div class="quantity-field"><label for="qty-${id}">Buy qty</label><input id="qty-${id}" type="number" min="0" max="999" step="1" value="${q[id]||0}" data-qty="${id}" aria-label="Purchase quantity: ${p.name}"><label for="owned-${id}">Owned qty</label><input id="owned-${id}" type="number" min="0" max="999" step="1" value="${owned[id]||0}" data-owned="${id}" aria-label="Existing quantity: ${p.name}"></div><span><strong>${p.name}</strong><small>${p.code}${family?' · '+family+' only':''} · ${p.tariffable?'10% tariff':'Tariff exempt'}</small><small>Unit retail ${money(p.price)} · Install standalone ${p.standalone==null?'not listed':money(p.standalone)} / system ${p.system==null?'not listed':money(p.system)}</small></span><span class="price money" id="line-${id}"></span></div>`;
 }).join('');
 container.querySelectorAll('[data-qty],[data-owned]').forEach(input=>input.addEventListener('input',()=>{
  input.setCustomValidity('');
  if(!input.validity.valid||input.value===''){input.setCustomValidity('Enter a whole number from 0 to 999.');calc();return;}
  input.setCustomValidity('');const id=input.dataset.qty||input.dataset.owned;
  (input.dataset.qty?q:owned)[id]=Number(input.value);$('preset').value='custom';calc();
 }));
 calc();
}
function check(warnings){
 const requirePart=(parent,child)=>{if(present(parent)>0&&present(child)===0)warnings.push(`${rowName(parent)} requires ${rowName(child)}. Enter owned quantity if already installed, or add purchase quantity.`);};
 if(binding){
  const has=active(), source=$('source').value, model=$('trimmer').value;
  if(!has)return;
  if(source==='loader')requirePart(baseId(),'bbl');
  if(source==='printer'||source==='bsf'){
   if(!present('bbc'))warnings.push('BB3202 requires BBC. Add purchase quantity or confirm an owned compiler.');
   if(!present('box'))warnings.push('BB3202 requires Bourg Box. Add purchase quantity or confirm an owned communication box.');
   if(source==='bsf'&&!present('bsfLR')&&!present('bsf'))warnings.push('Sheet-fed BB3202 requires a BSF.');
  }
  if(source==='manual'&&(present('bbc')||present('bbl')))warnings.push('Manual BB3002 selected with automatic feeding components. Check the BB3102 / BB3202 configuration.');
  if(present('bbc')&&present('bbl'))warnings.push('Both BBC and BBL are listed. Confirm the feeding configuration.');
  if(source==='loader'&&present('bbc'))warnings.push('BB3102 uses BBL. BBC indicates a BB3202 configuration; confirm compatibility.');
  if(model==='none'){
   if(!present('bbr'))warnings.push('A binder without inline CMT requires BBR output. Add it or enter its owned quantity.');
   if(present('130')||present('330')||present('connex'))warnings.push('CMT hardware is listed with no inline CMT selected. Confirm a separate trimmer upgrade or change the output configuration.');
  }else{
   if(!present(model))warnings.push(`Inline CMT-${model}TC selected: add trimmer purchase quantity or confirm owned equipment.`);
   for(const id of [model+'con',model+'cool',model+'stack','connex','wagon']){
    if(!present(id))warnings.push(`Inline CMT requires ${rowName(id)}. Add it or confirm an owned component.`);
    else if(present(model)&&present(id)<present(model))warnings.push(`${rowName(id)} quantity is below the trimmer count. Confirm shared/existing equipment.`);
   }
   if(present('bbr'))warnings.push('BBR is listed with inline CMT output. Confirm a separate/manual output requirement.');
   const other=model==='130'?'330':'130';
   if([other,other+'con',other+'cool',other+'stack'].some(present))warnings.push('Both CMT model families are listed. Confirm model-specific conveyors, cooling elevators and stackers.');
   if(model==='330'&&present('bins')<2*present('330'))warnings.push('CMT-330TC master sheet lists two waste bins per machine. Confirm bins or enter owned quantities.');
  }
  if(present('bbl')||present('bbc'))warnings.push('For an existing BB3002, check serial number / TAG #71 before adding the BBL/BBC upgrade kit.');
  if(!present('dust'))warnings.push('BB3002 base excludes dust extraction. Confirm the customer’s extraction provision.');
 }else{
  ['bleed','crease','cut','fold','bottomPerf','topPerf','slot','slot2','gui','bpmCable'].forEach(id=>requirePart(id,'bpm'));
  ['ifb','bsfUI','plate'].forEach(id=>requirePart(id,'bsf'));
  const isBbm=baseId().startsWith('bbm');
  if(!isBbm&&['bse','trim','unlimited'].some(present))warnings.push('BBM accessories are listed with BM-e. Use the BM-e square-edge / face-trim items.');
  if(isBbm&&['bmeBse','bmeTrim'].some(present))warnings.push('BM-e accessories are listed with BBM. Check accessory compatibility.');
  if(!isBbm)warnings.push('BM-e is a legacy model. Confirm availability.');
  if(present('slot')&&present('slot2'))warnings.push('Both extra-slot variants are listed. Confirm the intended BPM slot configuration.');
  if(present('bpm')>1)warnings.push('Multiple BPM modules: confirm tool distribution, slots and inter-module connections.');
 }
 if(active()&&!present(baseId()))warnings.push('Base quantity is zero. Confirm customer-owned base equipment with the Owned qty field; it will not be purchased automatically.');
 if(ids().some(id=>owned[id])&&!$('includeExisting').checked)warnings.push('Owned equipment is shown at $0 purchase / tariff and excluded from installation. Select “Include owned equipment in installation scope” if reinstallation or system training is required.');
}
function flow(){
 const label=id=>present(id)?`${id.toUpperCase()}${q[id]?' ×'+q[id]:''}${owned[id]?' (owned ×'+owned[id]+')':''}`:null;
 let parts=[];
 if(binding){
  if($('source').value==='printer')parts.push('Printer');
  if(present('bsf')||present('bsfLR'))parts.push('BSF');
  if(present('bbc'))parts.push('BBC');if(present('bbl'))parts.push('BBL');
  const system={manual:'BB3002',loader:'BB3102',printer:'BB3202',bsf:'BB3202'}[$('source').value];
  parts.push(`${system} ${baseId().toUpperCase()}${q[baseId()]?' ×'+q[baseId()]:' (not purchased)'}`);
  if($('trimmer').value!=='none'){parts.push('Landscape conveyor','Cooling elevator / tower',`CMT-${$('trimmer').value}TC`,'Vertical stacker');}else parts.push('BBR output');
 }else{
  if($('mode').value==='inline')parts.push('Printer / Output Stacker');
  ['bsf','bpm'].forEach(id=>{if(present(id))parts.push(label(id));});
  parts.push(`${baseId().startsWith('bbm')?'BBM':'BM-e'}${q[baseId()]?' ×'+q[baseId()]:' (not purchased)'}`);
  ['bse','bmeBse','trim','bmeTrim'].forEach(id=>{if(present(id))parts.push(label(id));});
 }
 $('flowline').textContent=parts.join(' → ');return parts.join(' → ');
}
function calc(){
 const invalid=[...document.querySelectorAll('[data-qty],[data-owned],#installation')].some(i=>!i.validity.valid||((i.dataset.qty||i.dataset.owned)&&i.value===''));
 $('inputError').hidden=!invalid;$(binding?'copy':'copyBtn').disabled=invalid;
 if(invalid){$('inputError').textContent='Fix the highlighted quantity / installation field. The estimate below has not been updated.';return;}
 const override=$('installation').value===''?null:Number($('installation').value);
 const result=E.calculate(ids(),q,owned,$('includeExisting').checked,override), warnings=[...result.warnings];check(warnings);
 const cust=$('customer').value.trim(), path=flow();
 for(const r of result.rows){$('line-'+r.id).textContent=money(r.retail/100);}
 const values=binding?{equipment:result.equipment,taxbase:result.eligible,tariff:result.tariff,total:result.total}:{hardware:result.hardware,licenses:result.licenses,tariff:result.tariff,install:result.installation,grandTotal:result.total,total2:result.total};
 Object.entries(values).forEach(([id,v])=>$(id).textContent=money(v));
 $('autoInstall').textContent=`Master installation: ${money(result.automaticInstall)}${result.anchor?' · Main standalone charge: '+C[result.anchor].name:''}. One standalone charge; remaining units and options use system rates.`;
 if(!binding)$('customerLabel').textContent=cust||'Current configuration';
 const warning=$(binding?'status':'priceWarning');warning.hidden=warnings.length===0;warning.textContent=[...new Set(warnings)].join('\n');
 const reference=binding?'Ricoh quote: $341,846.08; same displayed line prices + rounded 10% tariff + $10,550 installation = $341,846.09 (one-cent rounding difference).':'Visual Edge quote: $311,672.76. Reference preset uses 2 BPM, 2 bottom perforation tools and owned BSF / IFB. Master installation $10,200; hardware, license and tariff reconcile exactly. Unlimited code differs: master CPB0001317 / quote CPB0001373.';
 $('reference').textContent=reference;
 const lines=[cust||'C.P. Bourg Configuration',`Flow: ${path}`,'','Item · Part · Unit retail · Buy qty · Owned qty · Extended retail · Tariff · Master install',...result.rows.filter(r=>r.qty||r.owned||r.id===baseId()).map(r=>`${r.name} · ${r.code} · ${money(r.price)} · ${r.qty} · ${r.owned} · ${money(r.retail/100)} · ${money(r.tariff/100)} · ${money(r.installation/100)}`),'',`Equipment: ${money(result.equipment)}`,`License / non-tariff items: ${money(result.licenses)}`,`Tariffable purchases: ${money(result.eligible)}`,`Tariff (10%, aggregate rounding): ${money(result.tariff)}`,`Installation & operator training${override!==null?' (override)':''}: ${money(result.installation)}`,`TOTAL: ${money(result.total)}`,'Before sales tax, shipping and rigging.',...(warnings.length?['','Configuration notes:',...new Set(warnings)]:[])];
 $(binding?'breakdown':'quoteText').textContent=lines.join('\n');
 window.pricingState={q:{...q},owned:{...owned},result};
}
function preset(value){
 if(value==='custom')return;resetValues();
 if(binding){
  $('binder').value='eva';lastBase='eva';$('trimmer').value=value==='ricoh'?'130':'none';lastTrimmer=$('trimmer').value;$('source').value=value==='ricoh'?'bsf':'manual';
  set('eva',1);if(value==='ricoh')['bsfLR','bsfUI','plate','bbc','box','connex','130','130con','130cool','130stack','wagon'].forEach(id=>set(id,1));else set('bbr',1);
 }else{
  $('maker').value='bbm2';lastBase='bbm2';set('bbm2',1);
  const presets={bbmBasic:[],bbmFinish:['bse','trim'],inlineFull:['bpm','bleed','slot','crease','dock','bse','trim','box'],offlineBSF:['bsf','ifb','bpm','bleed','slot','crease','bse','trim'],visualEdge:['bpm','bleed','slot','bottomPerf','dock','unlimited','bse','trim']};
  (presets[value]||[]).forEach(id=>set(id,1));
  if(value==='visualEdge'){q.bpm=2;q.bottomPerf=2;owned.bsf=1;owned.ifb=1;$('mode').value='offline';}
  if(value==='offlineBSF')$('mode').value='offline';if(value==='inlineFull')$('mode').value='inline';
 }render();
}
$(binding?'binder':'maker').addEventListener('change',()=>{const next=baseId();q[next]=q[lastBase]||0;owned[next]=owned[lastBase]||0;delete q[lastBase];delete owned[lastBase];lastBase=next;$('preset').value='custom';render();});
if(binding){
 $('source').addEventListener('change',()=>{$('preset').value='custom';calc();});
 $('trimmer').addEventListener('change',()=>{$('preset').value='custom';lastTrimmer=$('trimmer').value;calc();});
 $('required').addEventListener('click',()=>{
  const count=Math.max(1,present(baseId())), add=(id,n=count)=>{if(present(id)<n)q[id]=(q[id]||0)+n-present(id);};
  if($('source').value==='loader')add('bbl');
  if(['printer','bsf'].includes($('source').value)){add('bbc');add('box');if($('source').value==='bsf'&&!present('bsf'))add('bsfLR');}
  const model=$('trimmer').value;if(model==='none')add('bbr');else{[model,model+'con',model+'cool',model+'stack','connex','wagon'].forEach(id=>add(id));if(model==='330')add('bins',count*2);}
  render();
 });
}else $('mode').addEventListener('change',calc);
$('preset').addEventListener('change',e=>preset(e.target.value));
$('customer').addEventListener('input',calc);$('installation').addEventListener('input',calc);$('includeExisting').addEventListener('change',calc);
$('resetBtn').addEventListener('click',()=>{resetValues();$('preset').value='custom';render();});
$(binding?'copy':'copyBtn').addEventListener('click',async e=>{try{await navigator.clipboard.writeText($(binding?'breakdown':'quoteText').textContent);e.target.textContent='Copied!';setTimeout(()=>e.target.textContent=binding?'Copy breakdown':'Copy summary',1200);}catch{alert('Copy unavailable. Select the breakdown and copy it manually.');}});
preset(binding?'ricoh':'inlineFull');
})();
