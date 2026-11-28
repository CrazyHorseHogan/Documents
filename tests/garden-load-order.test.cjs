// Actual survey loader with deferred read-only query results; no network or browser.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(process.env.GARDEN_LOAD_SOURCE||path.join(__dirname,'..','app.js'),'utf8');
const declaration=source.indexOf('let gardenLoadVersion =');
const start=declaration<0?source.indexOf('async function loadGarden()'):declaration;
const end=source.indexOf('function drawGarden(rows)',start);
function fixture(){
 const initial=[{polygon:'Original',x_cm:1,y_cm:2,unknown:{keep:true}}],pending=[],status={textContent:''};
 let geometry=initial,draws=0,plantLoads=0,errors=0;
 const context=vm.createContext({connectionStatus:status,
  drawGarden:rows=>{geometry=rows;draws++;},loadPlants:async()=>{plantLoads++;},
  console:{log(){},error(){errors++;}},
  supabaseClient:{from(table){assert.equal(table,'Full_Zones');return {select(){return {order(){return new Promise(resolve=>pending.push(resolve));}};}};}}
 });
 vm.runInContext(source.slice(start,end),context);
 return {initial,pending,status,load:()=>context.loadGarden(),get geometry(){return geometry;},get draws(){return draws;},get plantLoads(){return plantLoads;},get errors(){return errors;}};
}
(async()=>{
 const old=[{polygon:'Old',x_cm:100,y_cm:200,unknown:{keep:true}}],fresh=[{polygon:'Fresh',x_cm:300,y_cm:400,unknown:{keep:true}}];
 const original=JSON.stringify({old,fresh});
 let f=fixture(),a=f.load(),b=f.load();
 f.pending[1]({data:fresh,error:null});await b;f.pending[0]({data:old,error:null});await a;
 assert.equal(f.geometry,fresh,'stale survey response cannot overwrite newer geometry');
 assert.equal(f.draws,1);assert.equal(f.plantLoads,1,'stale survey cannot trigger another plant reload');
 assert.equal(f.status.textContent,'1 map points loaded');
 f=fixture();a=f.load();b=f.load();f.pending[1]({data:fresh,error:null});await b;
 f.pending[0]({data:null,error:{message:'old failure'}});await a;
 assert.equal(f.errors,0);assert.equal(f.status.textContent,'1 map points loaded');
 // A current request failure preserves the existing geometry and status is explicit.
 for(const response of [{data:null,error:{message:'offline'}},{data:null,error:null},{data:{unexpected:true},error:null}]){
  f=fixture();a=f.load();b=f.load();f.pending[1](response);await b;
  f.pending[0]({data:old,error:null});await a;
  assert.equal(f.geometry,f.initial);assert.equal(f.draws,0);assert.equal(f.plantLoads,0);
  assert.equal(f.errors,1);assert.equal(f.status.textContent,'Connection error');
 }
 // A valid empty latest survey stays empty instead of restoring stale sections.
 f=fixture();a=f.load();b=f.load();const empty=[];
 f.pending[1]({data:empty,error:null});await b;f.pending[0]({data:old,error:null});await a;
 assert.equal(f.geometry,empty);assert.equal(f.status.textContent,'0 map points loaded');assert.equal(f.plantLoads,1);
 f=fixture();a=f.load();b=f.load();f.pending[0]({data:old,error:null});await a;
 assert.equal(f.geometry,f.initial);assert.equal(f.plantLoads,0);
 f.pending[1]({data:fresh,error:null});await b;assert.equal(f.geometry,fresh);
 assert.equal(JSON.stringify({old,fresh}),original,'survey records and unknown fields are not mutated');
 console.log('Garden load ordering passed: newest survey only, stale status/plant reloads blocked, failed/malformed responses preserve geometry, empty results and unchanged records.');
})().catch(e=>{console.error(e);process.exitCode=1;});
