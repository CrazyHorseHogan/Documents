// Run: node tests/feature-move.test.cjs
// Real editor API in the shared minimal DOM/storage fixture; not a device test.
const assert=require('node:assert/strict');
const {fixture,guestKey}=require('./zone-storage.test.cjs');
const seed={features:[{id:'plant-group',type:'plant',zone:'ChildrenGarden',name:'Ferns',species:'fern',count:3,spacing:0.6,points:[{x:120,y:340}],price:null,labour:null,unknown:'retain'}],conditions:{},allowances:{},unknown:{retain:true}};
const raw=JSON.stringify(seed),f=fixture(raw);
assert.equal(f.api.isPlacing(),false,'browsing is not a placement gesture');
f.api.edit('plant-group');
assert.equal(f.api.isPlacing(),false,'opening feature details does not consume map taps');
f.nodes.get('zd-move-feature').onclick();
assert.equal(f.api.isPlacing(),true,'Move on map exposes placement state without a finish button');
assert(!f.nodes.has('zd-finish'),'move has no finish button');
f.api.focus('WholeGarden');
assert.equal(f.api.isPlacing(),false,'changing section cancels placement state');
assert.equal(f.writes,0,'entering and cancelling move mode never saves');
assert.equal(f.values.get(guestKey),raw,'all records and unknown fields remain unchanged');
console.log('Move-state bridge passed: details, move mode, section cancellation, no storage writes.');
