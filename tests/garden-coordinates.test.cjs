// Synthetic saved records; no live garden or database access.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const window={};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','garden-coordinates.js'),'utf8'),{window});
const point=p=>{const value=window.gardenDexCoordinates.toDisplay(p);return value?{...value}:null;};
assert.deepEqual(point({x_cm:0,y_cm:0}),{x:0,y:7000},'real zero stays valid');
assert.deepEqual(point({x_cm:' 0 ',y_cm:'7000'}),{x:0,y:0});
assert.deepEqual(point({x_cm:'-12.5',y_cm:'6800.25'}),{x:-12.5,y:199.75},'decimal coordinates keep precision');
const bad=[null,undefined,'','  ',false,true,[],{},NaN,Infinity,-Infinity,'Infinity','not a coordinate'];
for(const value of bad){assert.equal(point({x_cm:value,y_cm:6800}),null);assert.equal(point({x_cm:200,y_cm:value}),null);}
assert.equal(point(null),null);
// Execute the actual app marker function without starting auth/network loading.
const app=fs.readFileSync(process.env.APP_SOURCE||path.join(__dirname,'..','app.js'),'utf8');
const markerSource=app.slice(app.indexOf('function drawPlantMarker(plant)'),app.indexOf('\nfunction getPlantIcon('));
const markers=[];
const document={createElementNS(){return {attributes:{},setAttribute(k,v){this.attributes[k]=String(v);},appendChild(){},addEventListener(){}};}};
const context=vm.createContext({window,document,getPlantArtwork:()=>null,getPlantIcon:()=>'',getConditionColour:()=>'#648d72',gardenMap:{appendChild:marker=>markers.push(marker)}});
vm.runInContext(markerSource,context);
for(const value of bad)context.drawPlantMarker({id:'missing',x_cm:value,y_cm:6800});
assert.equal(markers.length,0,'invisible interactive markers cannot remain at a guessed origin');
const valid={id:'zero',x_cm:0,y_cm:7000,unknown:{retain:true}};
const copy=JSON.stringify(valid);context.drawPlantMarker(valid);
assert.equal(markers.length,1);assert.equal(markers[0].attributes.transform,'translate(0 0)');
assert.equal(JSON.stringify(valid),copy,'marker rendering preserves records and unknown fields');
console.log('Saved coordinate checks passed: missing/blank/non-finite values skipped, real zero and decimals preserved, actual app marker guard, unchanged records.');
