// Run: node tests/zone-storage.test.cjs
// Executes the real editor in a minimal DOM/storage fixture, not a browser.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = fs.readFileSync(process.env.ZONE_SOURCE || path.join(__dirname, '..', 'zone-designer.js'), 'utf8');
const guestKey = 'gardendex.zone-design.v1.guest';
function fixture(raw) {
 const nodes = new Map(), values = new Map();
 if (raw !== undefined) values.set(guestKey, raw);
 let owner = 'guest', readFails = false, readFailures = 0, writeFails = false, writes = 0;
 const downloads = [];
 class Element {
  constructor() {this.children = []; this.style = {}; this.ids = []; this.value = '';}
  set innerHTML(html) {
   this.html = html;
   const remove=id=>{for(const child of nodes.get(id)?.ids||[])remove(child);nodes.delete(id);};
   this.ids.forEach(remove);
   this.ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
   this.ids.forEach(id => nodes.set(id, new Element()));
  }
  get innerHTML() {return this.html || '';}
  setAttribute() {}
  append(el) {if (el.id) nodes.set(el.id, el); this.children.push(el);}
  querySelectorAll() {return [];}
  querySelector() {return null;}
  addEventListener() {}
  click() {}
 }
 const body = new Element(); body.dataset = {gdView:'home'};
 const context = {
  document: {body,createElement:()=>new Element(),getElementById:id=>nodes.get(id),querySelector:()=>null},
  window: {dispatchEvent(){},gardenDexWorkspace:{summary:()=>({owner})}},
  localStorage: {
   getItem(key) {if (readFails || readFailures-- > 0) throw Error('Read unavailable'); return values.get(key) ?? null;},
   setItem(key, value) {if (writeFails) throw Error('Quota exceeded'); writes++; values.set(key,value);}
  },
  Blob, URL:{createObjectURL(blob){downloads.push(blob);return 'blob:test';},revokeObjectURL(){}},
  setTimeout:()=>1,clearTimeout(){},MutationObserver:class {observe(){}},
  Intl, Event, crypto:require('node:crypto').webcrypto
 };
 vm.runInNewContext(source,context);
 return {
  api:context.window.gardenDexZoneDesigner,values, nodes, downloads, get writes(){return writes;},
  owner(value){owner=value;}, failNextReads(count){readFailures=count;}, failRead(value){readFails=value;}, failWrite(value){writeFails=value;},
  open(){nodes.get('zd-budget-open').onclick();},
  save(delivery='12',contingency='5'){
   nodes.get('zd-delivery').value=delivery;
   nodes.get('zd-contingency').value=contingency;
   nodes.get('zd-allowances').onsubmit({preventDefault(){}});
  },
  message(){return nodes.get('zd-toast').textContent || '';}
 };
}
module.exports={fixture,guestKey};
if(require.main===module)(async()=>{
 const existing={features:[{id:'existing-plant',type:'plant',zone:'ChildrenGarden',name:'Test planting',points:[{x:120,y:140}],species:'fern',count:1,spacing:0.6,price:null,labour:null}],conditions:{ChildrenGarden:{light:'shade'}},allowances:{delivery:4,unknownAllowance:{source:'fixture',keep:true}},futureField:{keep:true}};
 // Valid plans round-trip without dropping site conditions or unknown fields.
 let f=fixture(JSON.stringify(existing)); f.open(); f.save();
 const saved=JSON.parse(f.values.get(guestKey));
 assert.deepEqual(saved.features,existing.features);
 assert.deepEqual(saved.conditions,existing.conditions);
 assert.deepEqual(saved.futureField,existing.futureField);
 assert.deepEqual(saved.allowances,{delivery:12,contingency:5,unknownAllowance:existing.allowances.unknownAllowance},'editing known values preserves unknown nested allowance fields');
 f.nodes.get('zd-export').onclick();
 assert.equal(JSON.parse(await f.downloads[0].text()).allowances.delivery,12);
 // Empty storage is a new plan; deliberately empty strings are damaged records.
 f=fixture();f.open();f.save();assert.equal(f.writes,1);
 for(const raw of ['', '{broken', 'null','[]','{"features":{}}','{"conditions":null}','{"allowances":[]}']){
  f=fixture(raw);
  assert(f.nodes.has('zd-storage-retry'),'persistent recovery notice');
  f.open();assert.equal(f.nodes.get('zd-budget').hidden,true,'do not show an empty budget');
  assert.match(f.message(),/could not be read/);
  assert.equal(f.writes,0);assert.equal(f.values.get(guestKey),raw);
  // Recovery is explicit and non-destructive when the record becomes readable.
  f.values.set(guestKey,JSON.stringify(existing));
  f.nodes.get('zd-storage-retry').onclick();
  assert(!f.nodes.has('zd-storage-retry'));
  f.open();f.save();assert.equal(f.writes,1);
 }
 // A read failure after opening the form must block the later write.
 f=fixture(JSON.stringify(existing));f.open();f.failRead(true);f.save();
 assert.equal(f.writes,0);assert.equal(f.values.get(guestKey),JSON.stringify(existing));
 assert.match(f.message(),/could not be read/);
 f.failRead(false);f.save();assert.equal(f.writes,1);
 // Even a one-off read failure must not overwrite the real plan with a fallback.
 f=fixture(JSON.stringify(existing));f.open();f.failNextReads(1);f.save();
 assert.equal(f.writes,0);assert.equal(f.values.get(guestKey),JSON.stringify(existing));
 f.save();assert.equal(f.writes,1);
 // Corruption while a budget is open cannot produce an empty backup or save.
 f=fixture(JSON.stringify(existing));f.open();f.values.set(guestKey,'{broken');
 f.nodes.get('zd-export').onclick();assert.equal(f.downloads.length,0);
 f.save();assert.equal(f.writes,0);assert.equal(f.values.get(guestKey),'{broken');
 // Failed writes preserve the saved plan; retry can succeed without reloading.
 f=fixture(JSON.stringify(existing));f.open();f.failWrite(true);f.save();
 assert.equal(f.values.get(guestKey),JSON.stringify(existing));assert.equal(f.writes,0);
 assert.match(f.message(),/previous saved plan is unchanged/);
 f.failWrite(false);f.save();assert.equal(f.writes,1);
 // A broken guest plan must not lock a different owner's plan or modify it.
 f=fixture('{broken');f.owner('signed-in-owner');f.open();f.save();
 assert.equal(f.values.get(guestKey),'{broken');
 assert.equal(JSON.parse(f.values.get('gardendex.zone-design.v1.signed-in-owner')).allowances.delivery,12);
 console.log('Zone storage regressions passed (DOM/storage fixture; no browser or Supabase).');
})().catch(error=>{console.error(error);process.exitCode=1;});
