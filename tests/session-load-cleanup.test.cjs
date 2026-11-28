// Actual auth handler/loaders, synthetic sessions and deferred read-only queries.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(process.env.SESSION_SOURCE||path.join(__dirname,'..','app.js'),'utf8');
function fixture(){
 const rows=[{polygon:'A',x_cm:1,y_cm:2,unknown:{keep:true}}],plants=[{id:'A',unknown:{keep:true}}];
 const window={gardenSurveyRows:rows,gardenPlanPlants:plants,gardenDexZoneDesigner:{cancel(){cancels++;}},dispatchEvent:e=>events.push(e.type)};
 const pending=[],timers=[],events=[];let handler,sessionResolve,clears=0,draws=0,cancels=0;
 const classes=()=>{const set=new Set(['hidden']);return {add:name=>set.add(name),remove:name=>set.delete(name),contains:name=>set.has(name),toggle(name,on){if(on)set.add(name);else set.delete(name);}};};
 const loginScreen={classList:classes()},plantPanel={classList:classes()},connectionStatus={textContent:''};
 const c=vm.createContext({window,loginScreen,plantPanel,connectionStatus,Event,plantViewFilter:'all',
  setTimeout:cb=>timers.push(cb),cancelPlantPlacement(){cancels++;},console:{log(){},error(){}},
  gardenMap:{replaceChildren(){clears++;}},
  document:{querySelectorAll:()=>[]},drawPlantMarker(){},drawGarden(data){draws++;window.gardenSurveyRows=data;},
  supabaseClient:{
   auth:{onAuthStateChange(cb){handler=cb;},getSession:()=>new Promise(resolve=>{sessionResolve=resolve;})},
   from(table){return {select(){return {order(){return new Promise(resolve=>pending.push({table,resolve}));}};}};}
  }
 });
 const gardenStart=source.indexOf('let gardenLoadVersion =');
 vm.runInContext(source.slice(gardenStart,source.indexOf('function drawGarden(rows)',gardenStart)),c);
 const plantStart=source.indexOf('let plantLoadVersion =');
 vm.runInContext(source.slice(plantStart,source.indexOf('\n/* =========================================\n   GARDENDEX PLANT ARTWORK LIBRARY',plantStart)),c);
 const sessionStart=source.indexOf('let gardenSessionOwner;');
 assert(sessionStart>=0,'app registers session cleanup');
 vm.runInContext(source.slice(sessionStart,source.indexOf('checkLogin();',sessionStart)),c);
 const loginStart=source.indexOf('async function checkLogin()');
 vm.runInContext(source.slice(loginStart,source.indexOf('loginForm.addEventListener(',loginStart)),c);
 return {c,window,rows,plants,pending,timers,events,loginScreen,plantPanel,connectionStatus,change:(id,event='SIGNED_IN')=>handler(event,id?{user:{id}}:null),resolveSession:value=>sessionResolve(value),get clears(){return clears;},get draws(){return draws;},get cancels(){return cancels;}};
}
(async()=>{
 let f=fixture();const original=JSON.stringify({rows:f.rows,plants:f.plants});
 f.change('A','INITIAL_SESSION');assert.equal(f.clears,0);
 const a=f.c.loadGarden(),b=f.c.loadPlants();
 f.change(null,'SIGNED_OUT');
 assert.equal(f.clears,1);assert.equal(f.window.gardenSurveyRows.length,0);assert.equal(f.window.gardenPlanPlants.length,0);
 assert(!f.loginScreen.classList.contains('hidden'));assert(f.plantPanel.classList.contains('hidden'));
 assert.equal(f.connectionStatus.textContent,'Sign in required');assert.equal(f.cancels,2);
 f.pending[0].resolve({data:f.rows,error:null});f.pending[1].resolve({data:f.plants,error:null});await Promise.all([a,b]);
 assert.equal(f.draws,0,'old session survey cannot reappear');assert.equal(f.window.gardenPlanPlants.length,0,'old session plants cannot reappear');
 assert.equal(f.pending.length,2,'old survey cannot trigger another query');
 assert.equal(JSON.stringify({rows:f.rows,plants:f.plants}),original,'persistent-source records and unknown fields untouched');
 // A token refresh for the same account must not clear or reload the garden.
 f=fixture();f.change('A','INITIAL_SESSION');f.change('A','TOKEN_REFRESHED');assert.equal(f.clears,0);assert.equal(f.pending.length,0);
 // Direct account changes clear immediately and defer new reads outside auth callbacks.
 f.change('B');assert.equal(f.clears,1);assert.equal(f.pending.length,0);assert.equal(f.timers.length,1);
 const loading=f.timers.shift()();assert.equal(f.pending[0].table,'Full_Zones');
 const newRows=[{polygon:'B',x_cm:10,y_cm:20}],newPlants=[{id:'B',unknown:{keep:true}}];
 f.pending[0].resolve({data:newRows,error:null});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.pending[1].table,'plants');f.pending[1].resolve({data:newPlants,error:null});await loading;
 assert.equal(f.window.gardenSurveyRows,newRows);assert.equal(f.window.gardenPlanPlants,newPlants);
 // Signing out before a deferred reload executes cancels that work too.
 f=fixture();f.change('A','INITIAL_SESSION');f.change('B');f.change(null,'SIGNED_OUT');
 await f.timers.shift()();assert.equal(f.pending.length,0);
 // A stale startup getSession snapshot must not launch a new read after sign-out.
 f=fixture();f.change('A','INITIAL_SESSION');const checking=f.c.checkLogin();f.change(null,'SIGNED_OUT');
 f.resolveSession({data:{session:{user:{id:'A'}}}});await checking;
 assert.equal(f.pending.length,0);assert(!f.loginScreen.classList.contains('hidden'));
 console.log('Session cleanup passed: pending-read invalidation, transient view clearing, same-account refresh, deferred account reload, sign-out cancellation and stale startup-session rejection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
