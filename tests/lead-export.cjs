const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const JSZip = require('../bourg-lead-capture/vendor/jszip-3.10.1.min.js');
const elements = new Map();
const el = id => {
  if (!elements.has(id)) elements.set(id, {value:'',textContent:'',disabled:false,appendChild(){},remove(){}});
  return elements.get(id);
};
let output;
const ctx = {Blob, URLSearchParams, Map, console, setTimeout(){}, navigator:{onLine:true},
  location:{search:''}, localStorage:{getItem(){return ''; }},window:{JSZip},
  URL:{createObjectURL(blob){output=blob;return 'blob:test';},revokeObjectURL(){}},
  document:{getElementById:el,createElement(){return {click(){},remove(){}};},body:{appendChild(){}}}};
vm.createContext(ctx);
const source = fs.readFileSync(require.resolve('../bourg-lead-capture/app.js'),'utf8');
vm.runInContext(source.replace('  boot();', '  globalThis.api = {exportCsv,exportZip,photoExtension,setRows(x){leads=x;},setClient(x){client=x;}};'),ctx);
const rows = [
  {id:'lead-one',badge_image_path:'private/one.jpg',customer_name:'A, "Name"',notes:'line1\nline2',priority:'Hot',captured_by:'Sean Edmonds',capture_location:'Canon booth'},
  {id:'lead-two',badge_image_path:'private/two.png',customer_name:'Other',priority:'Warm',captured_by:'Charles Bourg',capture_location:'Other'}
];
let paths=[];
ctx.api.setRows(rows);
ctx.api.setClient({storage:{from(bucket){assert.equal(bucket,'bourg-lead-badges');return {async download(path){paths.push(path);return {data:new Blob(['photo bytes'],{type:path.endsWith('.png')?'image/png':'image/jpeg'})};}};}}});
(async()=>{
  el('priorityFilter').value='Hot';
  el('personFilter').value='Sean Edmonds';
  el('locationFilter').value='Canon booth';
  el('searchBox').value='Name';
  ctx.api.exportCsv();
  const csv=await output.text();
  assert.ok(csv.startsWith('"Lead ID",'));
  assert.ok(csv.includes('"A, ""Name"""'));
  assert.ok(!csv.includes('lead-two'));
  output=null;
  await ctx.api.exportZip();
  const zip=await JSZip.loadAsync(await output.arrayBuffer(),{checkCRC32:true});
  assert.deepEqual(Object.keys(zip.files).sort(),['bourg-leads-printing-united-2026.csv','photos/','photos/lead-one.jpg']);
  assert.equal(await zip.file('bourg-leads-printing-united-2026.csv').async('string'),csv);
  assert.equal(await zip.file('photos/lead-one.jpg').async('string'),'photo bytes');
  assert.deepEqual(paths,['private/one.jpg']);
  for(const [mime,ext] of [['image/png','png'],['image/webp','webp'],['image/heic','heic'],['image/heif','heif'],['image/gif','gif']]) assert.equal(ctx.api.photoExtension({type:mime},'wrong.jpg'),ext);
  assert.equal(ctx.api.photoExtension({type:'application/octet-stream'},'file.HEIC'),'heic');
  output=null;el('searchBox').value='NO MATCH';await ctx.api.exportZip();assert.equal(output,null);
  el('searchBox').value='';ctx.navigator.onLine=false;await ctx.api.exportZip();assert.equal(output,null);assert.match(el('exportStatus').textContent,/Connect/);
  ctx.navigator.onLine=true;
  ctx.api.setClient({storage:{from(){return {async download(){return {error:new Error('denied')};}};}}});
  await ctx.api.exportZip();assert.equal(output,null);assert.match(el('exportStatus').textContent,/No ZIP downloaded/);assert.equal(el('exportZipBtn').disabled,false);
  console.log('PASS: filters, Lead ID, CSV escaping, ZIP CRC and contents, photo bytes/extensions, empty/offline/access failure, button recovery');
})().catch(err=>{console.error(err);process.exitCode=1;});
