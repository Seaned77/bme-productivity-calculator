(function(root){
'use strict';
const catalog=typeof module!=='undefined'?require('./catalog.js'):root.BourgCatalog;
const cents=n=>Math.round(n*100), money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
function quantity(value){const n=Number(value);if(!Number.isSafeInteger(n)||n<0||n>999)throw new Error('Quantity must be a whole number from 0 to 999.');return n;}
function calculate(ids, quantities={}, existing={}, includeExisting=false, installOverride=null){
 const warnings=[], rows=ids.map(id=>{
  const p=catalog[id], qty=quantity(quantities[id]??0), owned=quantity(existing[id]??0);
  const serviceQty=qty+(includeExisting?owned:0);
  return {...p,qty,owned,serviceQty,retail:cents(p.price)*qty,tariff:0,installation:0};
 });
 const priority=['eva','pur','bbm2','bbm4','bme2','bme4','bpm','130','330','bsf','bsfLR','bbl','bbc'];
 const service=rows.filter(r=>r.serviceQty>0&&Number(r.standalone)>0);
 const anchor=priority.map(id=>service.find(r=>r.id===id)).find(Boolean)||service.sort((a,b)=>b.price-a.price)[0];
 for(const r of rows){
  if(r.serviceQty){
   if(r.system==null){warnings.push(`${r.name}: system installation not listed; confirm service charge.`);}
   r.installation=cents(r.system??0)*r.serviceQty;
   if(r===anchor)r.installation+=cents(r.standalone)-cents(r.system??0);
  }
  if((r.qty||r.owned)&&r.note)warnings.push(r.note);
 }
 const hardware=rows.filter(r=>r.kind==='hardware').reduce((a,r)=>a+r.retail,0);
 const licenses=rows.filter(r=>r.kind==='license').reduce((a,r)=>a+r.retail,0);
 const eligible=rows.filter(r=>r.tariffable).reduce((a,r)=>a+r.retail,0);
 const tariff=Math.round(eligible/10);
 // Allocate aggregate rounding to the final eligible row so line tariffs reconcile.
 let assigned=0;const charged=rows.filter(r=>r.tariffable&&r.qty);
 charged.forEach((r,i)=>{r.tariff=i===charged.length-1?tariff-assigned:Math.round(r.retail/10);assigned+=r.tariff;});
 const automaticInstall=rows.reduce((a,r)=>a+r.installation,0);
 let installation=automaticInstall;
 if(installOverride!==null){if(!Number.isFinite(installOverride)||installOverride<0)throw new Error('Installation must be a nonnegative amount.');installation=cents(installOverride);warnings.push(`Installation override ${money(installation/100)} replaces master calculation ${money(automaticInstall/100)}.`);}
 return {rows,hardware:hardware/100,licenses:licenses/100,equipment:(hardware+licenses)/100,eligible:eligible/100,tariff:tariff/100,installation:installation/100,automaticInstall:automaticInstall/100,total:(hardware+licenses+tariff+installation)/100,anchor:anchor?.id,warnings:[...new Set(warnings)]};
}
const api={calculate,quantity,money};if(typeof module!=='undefined')module.exports=api;else root.BourgPricing=api;
})(globalThis);
