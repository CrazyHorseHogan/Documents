// Actual editor cancellation with synthetic records; no browser or Supabase.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {fixture,guestKey}=require('./zone-storage.test.cjs');
const raw=JSON.stringify({features:[],conditions:{},allowances:{},unknown:{keep:true}});
const f=fixture(raw);
assert.equal(typeof f.api.cancel,'function','editor exposes explicit placement cancellation');
f.api.focus('ChildrenGarden');f.api.start('path');assert(f.nodes.has('zd-finish'));
f.api.cancel();assert(!f.nodes.has('zd-finish'));
assert.equal(f.writes,0);assert.equal(f.values.get(guestKey),raw);
// Exercise every transient mode, including move (which has no finish button).
const source=fs.readFileSync(path.join(__dirname,'..','zone-designer.js'),'utf8');
const start=source.indexOf('function cancelPlacement()');
for(const mode of ['path','plant','move','']){
 let redraws=0;
 const c=vm.createContext({mode,points:[{x:1,y:2}],selectedId:'saved-id',renderControls(){},draw(){redraws++;},message(){}});
 vm.runInContext(source.slice(start,source.indexOf('window.gardenDexZoneDesigner={',start)),c);
 c.cancelPlacement();assert.equal(c.mode,'');assert.equal(c.points.length,0);assert.equal(c.selectedId,null);assert.equal(redraws,1);
}
console.log('Edit cancellation passed: real API clears drawing/move state, removes temporary controls and never writes saved data.');
