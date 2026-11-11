/* GardenDex landscaping workspace. Existing map and Supabase records remain authoritative. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => new Date().toLocaleDateString('en-CA');
const money = n => new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'}).format(n);
let owner = 'guest', state = {jobs:[],projects:[],notes:[]}, selected = null, tab = 'overview', forecast = null;
const key = () => 'gardendex.landscaping.v1.' + owner;
function read() { try { const raw = JSON.parse(localStorage.getItem(key()) || '{}'); state = {jobs:Array.isArray(raw.jobs)?raw.jobs:[],projects:Array.isArray(raw.projects)?raw.projects:[],notes:Array.isArray(raw.notes)?raw.notes:[]}; } catch { state = {jobs:[],projects:[],notes:[]}; } seedCurrentJobs(); }
function save() { try { localStorage.setItem(key(),JSON.stringify(state)); queueMicrotask(()=>{if(typeof refreshSeasonMap==='function')refreshSeasonMap();}); return true; } catch { alert('Your browser could not save this change. Export a backup before closing.'); return false; } }
function gardenSeason(date=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Dublin',year:'numeric',month:'numeric'}).formatToParts(date);
 const month=Number(parts.find(p=>p.type==='month').value),year=Number(parts.find(p=>p.type==='year').value);
 return {name:month>=3&&month<=5?'Spring':month>=6&&month<=8?'Summer':month>=9&&month<=11?'Autumn':'Winter',year};
}
function seedCurrentJobs(){
 const {name,year}=gardenSeason();if(name!=='Autumn')return;
 const jobs=[
 ['drive-leaves','Clear fallen leaves from driveway','Driveway','High'],
 ['drive-moss','Check and remove moss from tarmac driveway','Driveway','High'],
 ['bark-sticks','Collect sticks and fallen branches','Bark borders','Normal'],
 ['bark-weeds','Check and control weeds in bark borders','Bark borders','Normal'],
 ['lawn-long','Check overgrown grass and cut when ground conditions permit','Main garden / lawn','High'],
 ['lawn-weeds','Check and control lawn weeds, including nettles and thistles','Main garden / lawn','Normal']
 ];let changed=false;
 for(const [id,title,zone,priority] of jobs){
  const taskId='autumn-'+year+'-'+id;
  if(state.jobs.some(j=>j.id===taskId))continue;
  const legacy=year===2026?state.jobs.find(j=>j.id==='reported-'+id):null;
  if(legacy){Object.assign(legacy,{id:taskId,season:'Autumn',seasonYear:year,recurring:true});}
  else state.jobs.push({id:taskId,title,zone,priority,date:'',plantId:null,done:false,season:'Autumn',seasonYear:year,recurring:true,source:'Annual autumn checklist; check actual conditions before work'});
  changed=true;
 }if(changed)save();
}
function currentJobs(){const season=gardenSeason();return state.jobs.filter(j=>!j.done&&(!j.recurring||(j.season===season.name&&j.seasonYear===season.year)));}
const style = document.createElement('style');
style.textContent = `
#plant-panel:not(.hidden),#add-plant-panel:not(.hidden){animation:ld-panel-in 260ms cubic-bezier(.22,.61,.36,1)}
@keyframes ld-panel-in{from{opacity:0;translate:20px 0}to{opacity:1;translate:0 0}}
@media(max-width:768px){@keyframes ld-panel-in{from{opacity:0;translate:0 20px}to{opacity:1;translate:0 0}}}
@media(prefers-reduced-motion:reduce){#plant-panel:not(.hidden),#add-plant-panel:not(.hidden){animation:none}}
#ld button,#landscape-launch{transition:background-color 160ms ease,box-shadow 160ms ease}
@media(prefers-reduced-motion:reduce){#ld button,#landscape-launch{transition:none}}
#landscape-launch{position:fixed;bottom:22px;left:18px;z-index:60;background:#173f32;color:#fff;border:1px solid #e1e8d9;border-radius:30px;padding:14px 20px;font-weight:700;box-shadow:0 5px 20px #173f3230;cursor:pointer}
#ld{position:fixed;inset:0;z-index:1300;background:#f5f4ec;color:#193e30;overflow:auto;font:15px/1.5 Arial,sans-serif}#ld[hidden]{display:none}#ld *{box-sizing:border-box}#ld header{background:#183f31;color:white;padding:24px max(22px,calc((100% - 1120px)/2));display:flex;align-items:center;justify-content:space-between;gap:20px}#ld header small{letter-spacing:3px;color:#c7d6b9}#ld h1{font:34px Georgia,serif;margin:4px 0}#ld h2{font:28px Georgia,serif;margin:0 0 14px}#ld h3{font-size:16px;margin:0 0 10px}#ld p{margin:8px 0 16px}#ld nav{display:flex;gap:8px;overflow:auto;padding:18px 0;border-bottom:1px solid #d8dfd0;margin-bottom:24px}#ld button{font:inherit;cursor:pointer;border:1px solid #c9d4c2;background:#fff;color:#193e30;border-radius:10px;padding:10px 14px;min-height:44px}#ld button.primary,#ld nav button[aria-selected=true]{background:#214f3a;color:white;border-color:#214f3a}#ld button:hover{filter:brightness(.94)}#ld button:focus-visible,#ld input:focus-visible,#ld select:focus-visible,#ld textarea:focus-visible{outline:3px solid #a8732b;outline-offset:2px}#ld .ld-wrap{max-width:1164px;margin:auto;padding:0 22px 40px}#ld .ld-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}#ld .ld-card{background:#fff;border:1px solid #dce2d5;border-radius:18px;padding:24px;margin-bottom:18px}#ld .ld-muted{color:#637467;font-size:13px}#ld .ld-tag{display:inline-block;border-radius:20px;background:#edf1e7;padding:4px 10px;font-size:12px;margin:0 5px 6px 0}#ld .ld-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid #edf0e9}#ld .ld-row:last-child{border:0}#ld label{display:block;margin:12px 0 5px;font-size:13px;font-weight:700}#ld input,#ld select,#ld textarea{width:100%;padding:12px;border:1px solid #bdcbb7;border-radius:8px;font:16px Arial;background:#fff;color:#193e30;min-height:44px}#ld form button{margin-top:16px}#ld .ld-big{font:36px Georgia,serif}#ld .ld-actions{display:flex;gap:8px;flex-wrap:wrap}#ld .ld-done{text-decoration:line-through;opacity:.65}#ld .ld-check{width:24px;min-height:24px;flex:0 0 24px}#ld .ld-alert{padding:12px;background:#f7edd7;border-radius:10px;margin:10px 0}#ld .ld-weather{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}#ld .ld-weather div{padding:12px;background:#edf2e8;border-radius:12px}#ld .ld-result{background:#edf2e8;border-radius:12px;padding:18px;margin:16px 0}#ld a{color:#214f3a}#ld .ld-empty{padding:20px 0;color:#637467}#ld footer{border-top:1px solid #d8dfd0;margin-top:24px;padding-top:15px}#ld .ld-section{margin-top:20px}@media(max-width:680px){#ld header{padding:20px}#ld h1{font-size:27px}#ld .ld-grid{grid-template-columns:1fr}#ld .ld-card{padding:18px}#ld .ld-wrap{padding:0 15px 30px}#ld nav button{white-space:nowrap}#landscape-launch{bottom:18px;left:12px;padding:12px 16px}#ld .ld-weather{grid-template-columns:1fr}#ld .ld-row{align-items:flex-start}}
`;
document.head.append(style);
const launch = document.createElement('button'); launch.id='landscape-launch';launch.textContent='🌿 Landscaping assistant';document.body.append(launch);
const root=document.createElement('section');root.id='ld';root.hidden=true;root.setAttribute('aria-label','GardenDex landscaping assistant');document.body.append(root);
const loginLink=document.createElement('button');loginLink.type='button';loginLink.textContent='Open landscaping workspace';loginLink.style.cssText='margin-top:14px;width:100%;min-height:44px;background:#e6eddf;color:#173f32;border:0;border-radius:8px;cursor:pointer';document.querySelector('.login-card')?.append(loginLink);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let screenAnimation = null, closing = false, returnFocus = launch, previousTab = 'overview';
function motion(element, frames, duration=240) {
 if (reducedMotion.matches || !element.animate) return null;
 return element.animate(frames,{duration,easing:'cubic-bezier(.22,.61,.36,1)'});
}
function open(next='overview') {
 if (closing) return;
 returnFocus = document.activeElement;
 tab=next; previousTab=next; root.hidden=false; render();
 screenAnimation?.cancel();
 screenAnimation=motion(root,[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}]);
 root.querySelector('h1').focus({preventScroll:true});
}
async function closeWorkspace() {
 if (closing) return;
 closing=true; screenAnimation?.cancel();
 screenAnimation=motion(root,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(14px)'}],200);
 try { await screenAnimation?.finished; } catch {}
 root.hidden=true; closing=false;
 (returnFocus?.isConnected ? returnFocus : launch).focus({preventScroll:true});
}
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)screenAnimation?.cancel();});
launch.onclick=()=>open();loginLink.onclick=()=>open();
function render(){
const openJobs=currentJobs(), planned=state.projects.reduce((n,p)=>n+Number(p.budget||0),0), spent=state.projects.reduce((n,p)=>n+Number(p.spent||0),0);
root.innerHTML=`<header><div><small>GARDENDEX / HOGAN GARDEN</small><h1 tabindex="-1">Your landscaping companion</h1><span style="color:#cfdbc5">Plan the space. Care for what grows.</span></div><button id="ld-close">Back to garden</button></header><div class="ld-wrap"><nav aria-label="Landscaping workspace">${[['overview','Today'],['jobs','Jobs & care'],['projects','Projects'],['materials','Materials'],['backup','Backup']].map(([id,name])=>`<button data-tab="${id}" aria-selected="${tab===id}">${name}</button>`).join('')}</nav><div id="ld-content"></div><footer class="ld-muted">${owner==='guest'?'Guest workspace':'Signed-in workspace'} · Jobs, budgets and notes save in this browser only. Plant records stay in your existing garden database. Export a backup to move this workspace to another device.</footer></div>`;
$('ld-close').onclick=closeWorkspace;root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render();});
const content=$('ld-content');
const order=['overview','jobs','projects','materials','backup'];
const direction=order.indexOf(tab)<order.indexOf(previousTab)?-1:1;
if(tab!==previousTab) {
 motion(content,[{opacity:0,transform:`translateX(${direction*12}px)`},{opacity:1,transform:'translateX(0)'}]);
}
previousTab=tab;
if(tab==='overview'){
content.innerHTML=`<div class="ld-grid"><div><div class="ld-card"><span class="ld-tag">YOUR NEXT STEPS</span><h2>A garden with a plan.</h2><p>Keep the big garden, driveway, children’s garden and planting areas moving forward, one job at a time.</p><div class="ld-actions"><button class="primary" data-go="jobs">+ Plan a job</button><button data-go="projects">Create a project</button></div></div><div class="ld-card"><h3>Current garden work · ${gardenSeason().name} ${gardenSeason().year}</h3><div class="ld-big">${openJobs.length} open jobs</div><p class="ld-muted">${state.jobs.filter(j=>j.done).length} completed · ${openJobs.filter(j=>j.date && j.date<today()).length} overdue</p>${openJobs.length?[...new Set(openJobs.map(j=>j.zone))].map(zone=>`<h3 class="ld-section">${esc(zone)}</h3>${openJobs.filter(j=>j.zone===zone).map(j=>`<div class="ld-row"><input class="ld-check" type="checkbox" data-current-job="${esc(j.id)}" aria-label="Complete ${esc(j.title)}"><div style="flex:1"><strong>${esc(j.title)}</strong><br><small>${esc(j.priority)} priority · ${esc(j.date||'Not scheduled')}</small></div></div>`).join('')}`).join(''):'<p>No open jobs. Add a new job when something needs attention.</p>'}<p class="ld-muted">Autumn jobs return as a fresh checklist each year when you open GardenDex. Earlier completion records stay in Jobs & care. Grass, weeds and moss can also need attention in other seasons.</p></div></div><div><div class="ld-card"><h3>Galway weather & work window</h3><div id="ld-forecast" aria-live="polite">${forecast?weatherHTML():'Load the forecast to check rain, frost and wind before outdoor work.'}</div><button id="ld-weather-refresh">${forecast?'Refresh':'Load forecast'}</button><p class="ld-muted">Galway city forecast; your garden’s conditions may differ. <a href="https://open-meteo.com/" target="_blank" rel="noopener">Weather by Open-Meteo</a></p></div><div class="ld-card"><h3>Project budget</h3><div class="ld-big">${money(planned)}</div><p>${money(spent)} recorded spend · ${money(planned-spent)} remaining</p><button data-go="materials">Calculate bark, soil or gravel →</button></div></div></div>`;
$('ld-weather-refresh').onclick=loadWeather;
}
if(tab==='jobs'){
content.innerHTML=`<div class="ld-grid"><div class="ld-card"><h2>Jobs & plant care</h2><p class="ld-muted">${selected?'Linked to '+esc(selected.common_name)+'. Select another plant on the map to change this.':'Add a garden job, or open a plant on the map to link care to it.'}</p><form id="ld-job-form"><label for="ld-title">Job</label><input id="ld-title" maxlength="180" required placeholder="e.g. Mulch around the climbing roses"><label for="ld-zone">Zone or plant</label><input id="ld-zone" maxlength="180" value="${esc(selected?.common_name||'Big Garden')}" required><label for="ld-date">Due date</label><input id="ld-date" type="date" value="${today()}"><label for="ld-priority">Priority</label><select id="ld-priority"><option>Normal</option><option>High</option><option>Low</option></select><button class="primary">Save job</button></form></div><div class="ld-card"><h3>Your job list</h3>${state.jobs.length?state.jobs.slice().sort((a,b)=>Number(a.done)-Number(b.done)||(a.date||'9999').localeCompare(b.date||'9999')).map(j=>`<div class="ld-row"><input class="ld-check" type="checkbox" data-job="${esc(j.id)}" ${j.done?'checked':''} aria-label="Complete ${esc(j.title)}"><div style="flex:1" class="${j.done?'ld-done':''}"><strong>${esc(j.title)}</strong><br><small>${esc(j.zone)} · ${esc(j.date||'No date')} · ${esc(j.priority)}${!j.done&&j.date&&j.date<today()?' · Overdue':''}</small></div><button data-delete-job="${esc(j.id)}" aria-label="Delete ${esc(j.title)}">×</button></div>`).join(''):'<p class="ld-empty">Your next garden job belongs here.</p>'}</div></div>`;
$('ld-job-form').onsubmit=e=>{e.preventDefault();state.jobs.push({id:crypto.randomUUID(),title:$('ld-title').value.trim(),zone:$('ld-zone').value.trim(),date:$('ld-date').value,priority:$('ld-priority').value,plantId:selected?String(selected.id):null,done:false});save();render();};
root.querySelectorAll('[data-job]').forEach(el=>el.onchange=()=>{state.jobs.find(j=>j.id===el.dataset.job).done=el.checked;save();});
root.querySelectorAll('[data-delete-job]').forEach(el=>el.onclick=()=>{if(confirm('Delete this job?')){state.jobs=state.jobs.filter(j=>j.id!==el.dataset.deleteJob);save();render();}});
}
if(tab==='projects'){
content.innerHTML=`<div class="ld-grid"><div class="ld-card"><h2>Shape your next project</h2><p class="ld-muted">Track a planting border, driveway, bark area or a larger garden transformation.</p><form id="ld-project-form"><label for="ld-project-name">Project name</label><input id="ld-project-name" maxlength="180" required placeholder="e.g. Rose archway"><label for="ld-project-zone">Garden area</label><input id="ld-project-zone" maxlength="180" required placeholder="e.g. Children’s garden"><div class="ld-grid"><div><label for="ld-budget">Budget (€)</label><input id="ld-budget" type="number" min="0" step=".01" required></div><div><label for="ld-spent">Spent (€)</label><input id="ld-spent" type="number" min="0" step=".01" value="0" required></div></div><label for="ld-brief">Project brief</label><textarea id="ld-brief" maxlength="3000" rows="3" placeholder="Dimensions, materials, planting ideas and next steps"></textarea><button class="primary">Save project</button></form></div><div><h2>Project board</h2>${state.projects.map(p=>`<div class="ld-card"><span class="ld-tag">${esc(p.zone)}</span><h3>${esc(p.title)}</h3><p style="white-space:pre-wrap">${esc(p.brief)}</p><p>${money(p.spent)} / ${money(p.budget)}${p.spent>p.budget?' · Over budget':''}</p><label for="spend-${esc(p.id)}">Update spend (€)</label><input id="spend-${esc(p.id)}" type="number" min="0" step=".01" value="${Number(p.spent)}"><label for="status-${esc(p.id)}">Stage</label><select id="status-${esc(p.id)}">${['Idea','Planning','In progress','Complete'].map(s=>`<option ${p.status===s?'selected':''}>${s}</option>`).join('')}</select><div class="ld-actions"><button data-save-project="${esc(p.id)}">Save changes</button><button data-delete-project="${esc(p.id)}">Delete</button></div></div>`).join('')||'<p class="ld-empty">No projects yet. Start with an area you want to transform.</p>'}</div></div>`;
$('ld-project-form').onsubmit=e=>{e.preventDefault();state.projects.push({id:crypto.randomUUID(),title:$('ld-project-name').value.trim(),zone:$('ld-project-zone').value.trim(),budget:Number($('ld-budget').value),spent:Number($('ld-spent').value),brief:$('ld-brief').value.trim(),status:'Idea'});save();render();};
root.querySelectorAll('[data-save-project]').forEach(b=>b.onclick=()=>{const id=b.dataset.saveProject,input=$('spend-'+id);if(!input.reportValidity())return;const p=state.projects.find(p=>p.id===id);p.spent=Number(input.value);p.status=$('status-'+id).value;save();render();});
root.querySelectorAll('[data-delete-project]').forEach(b=>b.onclick=()=>{if(confirm('Delete this project?')){state.projects=state.projects.filter(p=>p.id!==b.dataset.deleteProject);save();render();}});
}
if(tab==='materials'){
content.innerHTML=`<div class="ld-grid"><div class="ld-card"><span class="ld-tag">QUANTITY PLANNER</span><h2>Measure once. Order well.</h2><form id="ld-calc"><label for="ld-material">Material</label><select id="ld-material"><option>Bark mulch</option><option>Compost</option><option>Topsoil</option><option>Decorative gravel</option></select><div class="ld-grid"><div><label for="ld-length">Length (m)</label><input id="ld-length" type="number" min=".01" max="10000" step="any" value="9" required></div><div><label for="ld-width">Width (m)</label><input id="ld-width" type="number" min=".01" max="10000" step="any" value="3" required></div></div><label for="ld-depth">Depth (cm)</label><input id="ld-depth" type="number" min=".1" max="500" step="any" value="5" required><label for="ld-extra">Extra allowance (%)</label><input id="ld-extra" type="number" min="0" max="100" step="any" value="10" required><div class="ld-grid"><div><label for="ld-bag">Bag volume (litres)</label><input id="ld-bag" type="number" min=".1" step="any" value="40" required></div><div><label for="ld-price">Price per bag (€), optional</label><input id="ld-price" type="number" min="0" step=".01"></div></div><button class="primary">Calculate quantities</button></form></div><div class="ld-card"><h3>Your material estimate</h3><div id="ld-calculation" aria-live="polite"><p>Enter your dimensions to calculate area, volume, bags and estimated material cost.</p></div><p class="ld-muted">Rectangular area estimate. Depth and allowance are your inputs. Bag volumes vary by supplier; gravel sold by weight needs the supplier’s bulk density. Delivery and labour are excluded.</p></div></div>`;
$('ld-calc').onsubmit=e=>{e.preventDefault();const area=Number($('ld-length').value)*Number($('ld-width').value),base=area*Number($('ld-depth').value)/100,volume=base*(1+Number($('ld-extra').value)/100),bags=Math.ceil(volume*1000/Number($('ld-bag').value)),price=$('ld-price').value;$('ld-calculation').innerHTML=`<span class="ld-tag">${esc($('ld-material').value)}</span><div class="ld-result"><div class="ld-big">${volume.toLocaleString('en-IE',{maximumFractionDigits:3})} m³</div><p>${area.toLocaleString('en-IE')} m² · ${(volume*1000).toLocaleString('en-IE',{maximumFractionDigits:1})} litres including allowance</p><strong>${bags.toLocaleString('en-IE')} × ${Number($('ld-bag').value)} L bags</strong>${price!==''?`<p>Estimated material cost: ${money(bags*Number(price))}</p>`:''}</div>`;};
}
if(tab==='backup'){
content.innerHTML=`<div class="ld-card"><h2>Keep your plans safe</h2><p>Download jobs, projects and plant notes from this browser. Importing replaces the current workspace after confirmation. Existing Supabase plant records are separate.</p><div class="ld-actions"><button id="ld-export" class="primary">Export workspace</button><button id="ld-import-button">Import backup</button><input id="ld-import" type="file" accept="application/json,.json" hidden></div><p id="ld-import-message" aria-live="polite"></p></div>`;
$('ld-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({app:'GardenDex',version:1,...state},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='GardenDex-workspace-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('ld-import-button').onclick=()=>$('ld-import').click();$('ld-import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>5e6)throw Error('Backup is too large.');const data=JSON.parse(await file.text());if(data.app!=='GardenDex'||data.version!==1||!['jobs','projects','notes'].every(k=>Array.isArray(data[k]))||!data.jobs.every(j=>typeof j.id==='string'&&typeof j.title==='string'&&typeof j.zone==='string'&&typeof j.done==='boolean')||!data.projects.every(p=>typeof p.id==='string'&&typeof p.title==='string'&&typeof p.zone==='string'&&Number.isFinite(p.budget)&&p.budget>=0&&Number.isFinite(p.spent)&&p.spent>=0)||!data.notes.every(n=>typeof n.plantId==='string'&&typeof n.text==='string'&&typeof n.date==='string'))throw Error('This is not a valid GardenDex workspace backup.');if(!confirm('Replace this browser’s jobs, projects and notes with this backup?'))return;state={jobs:data.jobs,projects:data.projects,notes:data.notes};save();$('ld-import-message').textContent='Backup imported.';}catch(err){$('ld-import-message').textContent=err.message;}};
}
root.querySelectorAll('[data-current-job]').forEach(el=>el.onchange=()=>{state.jobs.find(j=>j.id===el.dataset.currentJob).done=el.checked;save();render();refreshSeasonMap();});
root.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{tab=b.dataset.go;render();});
}
function weatherHTML(){const d=forecast.daily;return `<div class="ld-weather">${d.time.slice(0,3).map((date,i)=>`<div><strong>${new Date(date+'T12:00:00').toLocaleDateString('en-IE',{weekday:'short',day:'numeric'})}</strong><br>${d.temperature_2m_min[i]}–${d.temperature_2m_max[i]}°C<br>${d.precipitation_sum[i]} mm rain<br>Gusts ${d.wind_gusts_10m_max[i]} km/h</div>`).join('')}</div><div class="ld-alert">${d.temperature_2m_min[0]<=2?'Possible frost: check tender plants and avoid working frozen ground. ':''}${d.wind_gusts_10m_max[0]>=50?'Strong gusts: secure loose materials and postpone exposed work. ':''}${d.precipitation_sum[0]>=5?'Rain expected: check soil before watering; avoid compacting saturated ground. ':'Lower rainfall forecast: check soil moisture around new planting before watering.'}</div><p class="ld-muted">Loaded ${esc(forecast.loaded)} · Guidance uses simple forecast thresholds.</p>`;}
async function loadWeather(){const el=$('ld-forecast'),button=$('ld-weather-refresh');el.textContent='Loading forecast…';button.disabled=true;try{const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude=53.2707&longitude=-9.0568&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max&timezone=Europe%2FDublin&forecast_days=3',{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();const data=await r.json();if(!data.daily||!['time','temperature_2m_min','temperature_2m_max','precipitation_sum','wind_gusts_10m_max'].every(k=>Array.isArray(data.daily[k])&&data.daily[k].length===3))throw Error();forecast={...data,loaded:new Date().toLocaleString('en-IE')};el.innerHTML=weatherHTML();}catch{el.textContent='Forecast unavailable. Check your connection and retry. No weather advice has been generated.';}finally{button.disabled=false;}}
// Link the original map’s plant panel to local care records.
if(typeof openPlantProfile==='function'){const original=openPlantProfile;openPlantProfile=function(plant){original(plant);selected=plant;updatePlantNotes();};}
function updatePlantNotes(){if(!selected)return;const id=String(selected.id);$('plant-notes').replaceChildren();state.notes.filter(n=>n.plantId===id).slice().reverse().forEach(n=>{const p=document.createElement('p');p.textContent=n.date+' — '+n.text;$('plant-notes').append(p);});if(!$('plant-notes').children.length)$('plant-notes').textContent='No notes yet in this browser.';$('plant-jobs').replaceChildren();state.jobs.filter(j=>j.plantId===id&&!j.done).forEach(j=>{const p=document.createElement('p');p.textContent=j.title+' · '+(j.date||'No due date');$('plant-jobs').append(p);});if(!$('plant-jobs').children.length)$('plant-jobs').textContent='No open jobs in this browser.';}
$('add-job').onclick=()=>open('jobs');$('add-note').onclick=()=>{if(!selected)return;const note=prompt('Add a note for '+selected.common_name+' (saved in this browser):');if(note?.trim()){state.notes.push({plantId:String(selected.id),text:note.trim(),date:today()});save();updatePlantNotes();}};
$('log-work').onclick=()=>{if(!selected)return;const note=prompt('What work did you complete?');if(note?.trim()){state.notes.push({plantId:String(selected.id),text:'Work completed: '+note.trim(),date:today()});save();updatePlantNotes();}};
root.addEventListener('keydown',e=>{if(e.key==='Escape'){$('ld-close').click();}});
read();
if(typeof supabaseClient!=='undefined')supabaseClient.auth.onAuthStateChange((_event,session)=>{const next=session?.user?.id||'guest';if(next!==owner){owner=next;selected=null;read();if(!root.hidden)render();}});

// Seasonal context belongs to the Current map, with recorded jobs as area markers.
const seasonStyle=document.createElement('style');seasonStyle.textContent=`#garden-season{position:fixed;right:20px;top:163px;z-index:22;padding:11px 15px;background:#fff9eced;border:1px solid #d7c3a2;border-radius:14px;color:#6d4926;font:12px/1.5 Arial;box-shadow:0 4px 16px #71482412}#garden-season strong{display:block;font:20px Georgia,serif}body.garden-autumn .top-bar{background:#fbf3e6}body.garden-autumn #map-container{background-color:#c4b58d}body.garden-autumn .plant-filter-button.active{background:#885937}@media(max-width:700px){#garden-season{top:199px;right:auto;left:12px;padding:8px 12px;font-size:10px}#garden-season strong{font-size:16px}}`;
document.head.append(seasonStyle);
const seasonBadge=document.createElement('div');seasonBadge.id='garden-season';document.body.append(seasonBadge);
function refreshSeasonMap(){
 const season=gardenSeason(),isCurrent=plantViewFilter==='current';
 seasonBadge.hidden=!isCurrent;document.body.classList.toggle('garden-autumn',isCurrent&&season.name==='Autumn');
 seasonBadge.replaceChildren();const heading=document.createElement('strong');heading.textContent=season.name+' '+season.year;seasonBadge.append(heading,document.createTextNode(new Date().toLocaleDateString('en-IE',{timeZone:'Europe/Dublin',weekday:'short',day:'numeric',month:'long'})));
 gardenMap.querySelector('#current-season-jobs')?.remove();if(!isCurrent)return;
 const layer=gardenMap.querySelector('#overlay-layer');if(!layer)return;
 const ns='http://www.w3.org/2000/svg',group=document.createElementNS(ns,'g');group.id='current-season-jobs';layer.append(group);
 const make=(tag,attrs,parent=group)=>{const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;};
 if(season.name==='Autumn')make('rect',{x:-350,y:0,width:6700,height:7250,fill:'#dd8a33',opacity:.065,'pointer-events':'none'});
 const positions={'Driveway':[2250,3800],'Bark borders':[550,3300],'Main garden / lawn':[3950,2200]};
 for(const [zone,[x,y]]of Object.entries(positions)){
  const jobs=currentJobs().filter(j=>j.zone===zone);if(!jobs.length)continue;
  const marker=make('g',{transform:`translate(${x} ${7000-y})`,role:'button',tabindex:0,'aria-label':zone+': '+jobs.length+' open jobs',style:'cursor:pointer'});
  const title=make('title',{},marker);title.textContent=zone+': '+jobs.map(j=>j.title).join('; ');
  make('circle',{r:82,fill:'#a15e30',stroke:'#fff5dc','stroke-width':12},marker);
  const count=make('text',{'text-anchor':'middle','dominant-baseline':'central','font-family':'Arial','font-size':83,fill:'#fff8e4','pointer-events':'none'},marker);count.textContent=jobs.length;
  const label=make('text',{y:145,'text-anchor':'middle','font-family':'Arial','font-size':60,fill:'#5e3b22','paint-order':'stroke',stroke:'#fff6df','stroke-width':8,'pointer-events':'none'},marker);label.textContent=zone;
  const show=e=>{e.preventDefault();e.stopPropagation();selected=null;open('jobs');};marker.addEventListener('click',show);marker.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')show(e);});
 }
}
// Watch only map rebuilds; updates inside the seasonal overlay do not recurse.
const seasonObserver=new MutationObserver(records=>{if(records.some(r=>r.target===gardenMap||r.target.id==='overlay-layer')&&!gardenMap.querySelector('#current-season-jobs'))refreshSeasonMap();});
seasonObserver.observe(gardenMap,{childList:true,subtree:true});
document.querySelectorAll('.plant-filter-button').forEach(b=>b.addEventListener('click',()=>queueMicrotask(refreshSeasonMap)));
refreshSeasonMap();
document.addEventListener('visibilitychange',()=>{if(!document.hidden){seedCurrentJobs();refreshSeasonMap();if(!root.hidden)render();}});
})();
