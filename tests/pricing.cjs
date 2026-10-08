const assert=require('node:assert/strict');
const {calculate,quantity}=require('../pricing/pricing-engine.js');
const ricoh={eva:1,bsfLR:1,bsfUI:1,plate:1,bbc:1,box:1,connex:1,'130':1,'130con':1,'130cool':1,'130stack':1,wagon:1};
let r=calculate(Object.keys(ricoh),ricoh);
assert.equal(r.equipment,311067.51);assert.equal(r.tariff,20228.58);assert.equal(r.installation,10550);assert.equal(r.total,341846.09);
const visual={bbm2:1,bpm:2,bleed:1,slot:1,bottomPerf:2,dock:1,unlimited:1,bse:1,trim:1};
const ids=[...Object.keys(visual),'bsf','ifb'];
r=calculate(ids,visual,{bsf:1,ifb:1});
assert.equal(r.equipment,275364.85);assert.equal(r.eligible,261079.14);assert.equal(r.tariff,26107.91);assert.equal(r.installation,10200);assert.equal(r.total,311672.76);
assert.equal(r.rows.find(x=>x.id==='bsf').retail,0);assert.equal(r.rows.find(x=>x.id==='bsf').tariff,0);
assert.equal(r.rows.find(x=>x.id==='bsf').installation,0);
assert.equal(calculate(ids,visual,{bsf:1,ifb:1},true).installation,10850);
// Accessory-only upgrade uses BPM standalone, never charges the owned base.
r=calculate(['bbm2','bpm','bleed','crease'],{bpm:1,bleed:1,crease:1},{bbm2:1});
assert.equal(r.installation,4950);assert.equal(r.rows[0].retail,0);assert.equal(r.anchor,'bpm');
// One standalone main component; additional units use their system rate.
r=calculate(['bpm','bleed'],{bpm:2,bleed:2});assert.equal(r.installation,6600);
r=calculate(['bse'],{bse:1});assert.equal(r.installation,3650);
r=calculate(['130','130con','130cool','130stack'],{'130':2,'130con':2,'130cool':2,'130stack':2});
assert.equal(r.tariff,0);assert.equal(r.installation,11200);
r=calculate(ids,{},{});assert.equal(r.total,0);
assert.equal(calculate(['bbm2'],{bbm2:1},{},false,0).installation,0);
for(const n of [-1,1.5,'',1000,Infinity])if(n!=='')assert.throws(()=>quantity(n));
assert.throws(()=>calculate(['bbm2'],{bbm2:1},{},false,-1));
const tariffSum=r=>r.rows.reduce((s,x)=>s+x.tariff,0)/100;
r=calculate(ids,visual);assert.equal(tariffSum(r),r.tariff);
console.log('Pricing checks passed: quote reconciliation, owned equipment, upgrades, multi-unit installation, CMT exemption, clear all, overrides and input limits.');
