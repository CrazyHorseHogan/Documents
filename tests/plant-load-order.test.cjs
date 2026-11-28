// Execute the real loader with deferred read-only Supabase responses. No network.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(process.env.LOAD_SOURCE||path.join(__dirname,'..','app.js'),'utf8');
const declaration=source.indexOf('let plantLoadVersion =');
const start=declaration<0?source.indexOf('async function loadPlants()'):declaration;
const end=source.indexOf('\n/* =========================================\n   GARDENDEX PLANT ARTWORK LIBRARY',start);
function fixture(){
 const original=[{id:'original',x_cm:10,y_cm:20,unknown:{keep:true}}],pending=[],rendered=[];
 let clears=0,errors=0;
 const window={gardenPlanPlants:original};
 const c=vm.createContext({window,plantViewFilter:'all',
  document:{querySelectorAll(selector){assert.equal(selector,'.saved-plant-marker');clears++;rendered.length=0;return []; }},
  drawPlantMarker:p=>rendered.push(p),console:{error(){errors++;}},
  supabaseClient:{
   from(table){
    assert.equal(table,'plants');
    return {select(columns){
     assert.equal(columns,'*');
     return {order(){return new Promise(resolve=>pending.push(resolve));}};
    }};
   }
  }
 });
 vm.runInContext(source.slice(start,end),c);
 return {window,original,pending,rendered,load:()=>c.loadPlants(),get clears(){return clears;},get errors(){return errors;}};
}
(async()=>{
 const old=[{id:'old',status:'Existing',unknown:{keep:'old'}}],fresh=[{id:'fresh',status:'Planned',unknown:{keep:'fresh'}}];
 const originals=JSON.stringify({old,fresh});
 let f=fixture(),a=f.load(),b=f.load();
 f.pending[1]({data:fresh,error:null});await b;
 f.pending[0]({data:old,error:null});await a;
 assert.equal(f.window.gardenPlanPlants,fresh,'stale response cannot replace newer plant data');
 assert.deepEqual(f.rendered,fresh);assert.equal(f.clears,1,'stale response cannot clear fresh markers');
 // Latest empty result (e.g. removal) must not be repopulated by an old response.
 f=fixture();a=f.load();b=f.load();const empty=[];
 f.pending[1]({data:empty,error:null});await b;f.pending[0]({data:old,error:null});await a;
 assert.equal(f.window.gardenPlanPlants,empty);assert.equal(f.rendered.length,0);assert.equal(f.clears,1);
 // An older failure must not report over a successful latest reload.
 f=fixture();a=f.load();b=f.load();f.pending[1]({data:fresh,error:null});await b;
 f.pending[0]({data:null,error:{message:'old failure'}});await a;
 assert.equal(f.errors,0);assert.equal(f.window.gardenPlanPlants,fresh);
 // A failed/malformed latest result preserves the last displayed records.
 for(const response of [{data:null,error:{message:'offline'}},{data:null,error:null},{data:{unexpected:true},error:null}]){
  f=fixture();a=f.load();b=f.load();f.pending[1](response);await b;
  f.pending[0]({data:old,error:null});await a;
  assert.equal(f.window.gardenPlanPlants,f.original);assert.equal(f.clears,0);assert.equal(f.errors,1);
 }
 // Even when the first request resolves first, it must wait for the latest intent.
 f=fixture();a=f.load();b=f.load();f.pending[0]({data:old,error:null});await a;
 assert.equal(f.window.gardenPlanPlants,f.original);assert.equal(f.clears,0);
 f.pending[1]({data:fresh,error:null});await b;assert.equal(f.window.gardenPlanPlants,fresh);
 assert.equal(JSON.stringify({old,fresh}),originals,'responses and unknown fields stay untouched');
 console.log('Plant load ordering passed: newest response only, empty-result safety, stale errors ignored, failed/malformed responses preserve the display, unchanged records.');
})().catch(e=>{console.error(e);process.exitCode=1;});
