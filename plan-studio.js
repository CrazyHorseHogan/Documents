/* A single measured plan and a section illustration, sharing the saved geometry. */
(()=>{'use strict';
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg',esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=()=>window.gardenDexZoneDesigner, map=$('garden-map');let section='WholeGarden',view='plan',pending=false,planSnapshot=null;
const names={WholeGarden:'Whole garden',ChildrenGarden:'Children’s garden',BigGarden:'Main garden',PineTrees:'Woodland',Bark:'Bark borders',Driveway:'Driveway',House:'House'};
const colours=['#648d72','#a590b7','#bd8c98','#8fa85b','#c6a45e','#6b96a0','#8e9baf'];
const colour=name=>{let n=0;for(const c of String(name))n=(n*31+c.charCodeAt(0))>>>0;return colours[n%colours.length];};
const header=document.createElement('header');header.id='ps-header';header.innerHTML='<strong>GardenDex</strong><button id="ps-key" aria-expanded="false">Plant key</button>';document.body.append(header);
const toolbar=document.createElement('nav');toolbar.id='ps-toolbar';toolbar.setAttribute('aria-label','Garden views');toolbar.innerHTML=`<select id="ps-section" aria-label="Garden section">${Object.entries(names).map(([id,n])=>`<option value="${id}">${n}</option>`).join('')}</select><div><button id="ps-2d" aria-pressed="true">2D plan</button><button id="ps-3d" aria-pressed="false">3D view</button></div>`;document.body.append(toolbar);
const key=document.createElement('aside');key.id='ps-legend';key.hidden=true;document.body.append(key);
const preview=document.createElement('section');preview.id='ps-preview';preview.hidden=true;preview.setAttribute('aria-label','Section three-dimensional illustration');document.body.append(preview);
const notice=document.createElement('p');notice.id='ps-notice';document.body.append(notice);
const storageWarning=document.createElement('aside');storageWarning.id='ps-storage-warning';storageWarning.hidden=true;storageWarning.setAttribute('role','alert');storageWarning.innerHTML='<span>Proposed design could not be fully loaded. This view may be incomplete; saved data has not been changed. Open Edit plan for recovery details.</span><button id="ps-retry-plan">Retry loading</button>';document.body.append(storageWarning);
$('ps-retry-plan').onclick=queue;
const add=document.createElement('button');add.id='ps-add';add.textContent='+ Edit plan';add.onclick=()=>{if(document.body.classList.contains('ps-editing'))closeEditing();else{document.body.classList.add('ps-editing');add.textContent='Done editing';}};document.body.append(add);
// Read once per render so a transient failure cannot become an empty success mid-frame.
function readPlan(){try{planSnapshot=api().snapshot();storageWarning.hidden=true;}catch{planSnapshot=null;storageWarning.hidden=false;}}
function plan(){return planSnapshot;}
function closeEditing(){api().cancel();document.body.classList.remove('ps-editing');add.textContent='+ Edit plan';}
function savedPlants(){return (window.gardenPlanPlants||[]).filter(p=>(p.status||'Existing').toLowerCase()!=='removed');}
function missingLocations(){return savedPlants().filter(p=>!window.gardenDexCoordinates.toDisplay(p)).length;}
function locationNotice(){const count=missingLocations();return count?` · ${count} saved plant record${count===1?' needs':'s need'} coordinates and ${count===1?'is':'are'} not shown.`:'';}
function entries(){const saved=savedPlants().flatMap(p=>{const position=window.gardenDexCoordinates.toDisplay(p);return position?[{id:String(p.id),name:p.common_name||p.species||'Plant',species:p.species||p.common_name||'Plant',x:position.x,y:position.y,type:p.plant_type||'Plant',zone:p.zone,existing:true}]:[];});const proposed=(plan()?.features||[]).filter(f=>f.type==='plant'||f.type==='hedge').flatMap(f=>{const plant=api().plants.find(p=>p.id===f.species);return api().plantingPositions(f).map((point,index)=>({id:f.id+':'+index,groupId:f.id,name:plant?.name||f.name,species:plant?.species||f.name,x:point.x,y:point.y,type:'Plant group',zone:f.zone,count:f.count}));});return [...saved,...proposed].filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));}
function inSection(p){if(section==='WholeGarden')return true;const poly=map.querySelector(`.map-polygon[data-polygon="${section}"]`);return window.gardenDexCoordinates.containsPoint(poly,p);}
function el(tag,attrs,parent){const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;}
function flatten(){
 map.querySelector('#ps-symbols')?.remove();const g=el('g',{id:'ps-symbols','pointer-events':'none'},map),list=entries().filter(inSection);
 const labelled=new Set();
 for(const p of list){const c=colour(p.species),r=/tree|conifer/i.test(p.type)?75:34;el('circle',{cx:p.x,cy:p.y,r,fill:c,stroke:'#fff','stroke-width':5,'data-plant-id':p.id},g);if(p.groupId&&labelled.has(p.groupId))continue;labelled.add(p.groupId||p.id);const t=el('text',{x:p.x+r+12,y:p.y+12,'font-size':36,fill:'#304d49','paint-order':'stroke',stroke:'#fff','stroke-width':5,'stroke-linejoin':'round'},g);t.textContent=p.name+(p.count?' × '+p.count:'');}
 const unique=[...new Map(list.map(p=>[p.species,p])).values()];key.innerHTML='<button id="ps-close-key">Close ×</button><h2>Plant key</h2>'+unique.map(p=>`<p><i style="background:${colour(p.species)}"></i><span>${esc(p.name)}<small>${esc(p.species)}</small></span></p>`).join('')+(unique.length?'':'<p>Saved plants will appear here when your garden loads.</p>');$('ps-close-key').onclick=toggleKey;
 if(!window.gardenSurveyRows?.length)notice.textContent='Sign in to load your established garden dimensions. No example measurements are used.';else {const survey=window.gardenDexCoordinates.survey(window.gardenSurveyRows),count=survey.invalidSections.length;notice.textContent='Measured ground plan · plant symbols are not mature canopy sizes'+(count?` · ${count} section outline${count===1?' is':'s are'} unavailable: incomplete survey data.`:'')+(survey.unassignedRows?' · Some survey rows have no section.':'')+locationNotice();}
}
function draw3D(){preview.replaceChildren();if(section==='WholeGarden'){preview.innerHTML='<div class="ps-empty"><h2>Choose a section</h2><p>Each section has its own 3D view.</p></div>';return;}const survey=window.gardenDexCoordinates.survey(window.gardenSurveyRows),points=survey.sections[section];if(!points){const incomplete=survey.invalidSections.includes(section);preview.innerHTML=`<div class="ps-empty"><h2>${incomplete?'Survey incomplete':'Survey not loaded'}</h2><p>${incomplete?'This section needs complete coordinates and vertex order. Its outline is not shown; no dimensions have been guessed.':'Sign in and load this section’s measured plan first.'}</p></div>`;return;}
 const pts=points.map(p=>({x:p.x,y:7000-p.y})),cx=pts.reduce((a,p)=>a+p.x,0)/pts.length,cy=pts.reduce((a,p)=>a+p.y,0)/pts.length;
 const project=(p,h=0)=>({x:(p.x-cx)-(p.y-cy),y:((p.x-cx)+(p.y-cy))*.48-h});
 const all=pts.map(p=>project(p)),minX=Math.min(...all.map(p=>p.x)),maxX=Math.max(...all.map(p=>p.x)),minY=Math.min(...all.map(p=>p.y))-700,maxY=Math.max(...all.map(p=>p.y));
 const svg=el('svg',{viewBox:`${minX-250} ${minY-150} ${maxX-minX+500} ${maxY-minY+450}`,role:'img','aria-label':names[section]+' projected three-dimensional illustration'},preview);
 const ground=pts.map(p=>project(p));el('polygon',{points:ground.map(p=>`${p.x},${p.y+60}`).join(' '),fill:'#d2cebc'},svg);el('polygon',{points:ground.map(p=>`${p.x},${p.y}`).join(' '),fill:section==='Driveway'?'#d8d8d2':section==='Bark'?'#c4af92':'#dbe4cb',stroke:'#9baf95','stroke-width':8},svg);
 for(const f of plan()?.features||[]){if(f.zone!==section||!['bed','path'].includes(f.type))continue;const ps=f.points.map(p=>project(p,f.type==='bed'?40:0));el(f.type==='bed'?'polygon':'polyline',{points:ps.map(p=>`${p.x},${p.y}`).join(' '),fill:f.type==='bed'?'#b89b77':'none',stroke:f.type==='bed'?'#8d765a':'#c7bfa8','stroke-width':f.type==='path'?f.width*100:12,'stroke-linejoin':'round'},svg);}
 const labelled=new Set();
 for(const p of entries().filter(inSection).sort((a,b)=>project(a).y-project(b).y)){const tree=/tree|conifer/i.test(p.type),h=tree?420:85,at=project(p),c=colour(p.species);const plantGroup=el('g',{'data-plant-id':p.id},svg);el('ellipse',{cx:at.x+35,cy:at.y+15,rx:tree?130:45,ry:tree?55:20,fill:'#536d4020'},plantGroup);if(tree)el('line',{x1:at.x,y1:at.y,x2:at.x,y2:at.y-h,stroke:'#8c7c65','stroke-width':20},plantGroup);if(tree){
 const conifer=/conifer/i.test(p.type);
 if(conifer){for(let k=0;k<3;k++){const y=at.y-150-k*110,w=150-k*28;el('polygon',{points:`${at.x-w},${y} ${at.x},${y-240} ${at.x+w},${y}`,fill:c,stroke:'#47634d','stroke-width':3},plantGroup);}}
 else{el('ellipse',{cx:at.x+12,cy:at.y-h+35,rx:155,ry:135,fill:'#47634d',opacity:'.8'},plantGroup);for(let k=0;k<5;k++){const a=k*Math.PI*2/5;el('ellipse',{cx:at.x+Math.cos(a)*65,cy:at.y-h+Math.sin(a)*55,rx:92,ry:100,fill:c,stroke:'#ffffff45','stroke-width':4},plantGroup);}el('ellipse',{cx:at.x-40,cy:at.y-h-45,rx:75,ry:65,fill:'#ffffff',opacity:'.13'},plantGroup);}}
 else{el('ellipse',{cx:at.x,cy:at.y-h,rx:55,ry:43,fill:c,stroke:'#ffffff90','stroke-width':4},plantGroup);for(let k=0;k<3;k++)el('ellipse',{cx:at.x-25+k*25,cy:at.y-h-15,rx:25,ry:30,fill:c,stroke:'#ffffff55','stroke-width':2},plantGroup);}
if(p.groupId&&labelled.has(p.groupId))continue;labelled.add(p.groupId||p.id);
const t=el('text',{x:at.x,y:at.y+65,'text-anchor':'middle','font-size':38,fill:'#36534d'},plantGroup);t.textContent=p.name+(p.count?' × '+p.count:'');}
 const note=document.createElement('p');note.className='ps-preview-note';note.textContent='3D illustration · measured ground outline and saved positions; heights and plant forms are illustrative. Not a finished photorealistic render.'+locationNotice();preview.append(note);
}
function refresh(){pending=false;readPlan();const poly=map.querySelector(`.map-polygon[data-polygon="${section}"]`);if(view==='plan'&&poly&&$('zd-zone')?.value!==section)focusPlan();flatten();if(view==='3d')draw3D();}
function queue(){if(pending)return;pending=true;requestAnimationFrame(refresh);}
// Only survey/plant/editor changes trigger refresh; the symbol layer itself is ignored.
new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('#ps-symbols')&&[...r.addedNodes,...r.removedNodes].some(n=>n.id!=='ps-symbols')))queue();}).observe(map,{childList:true,subtree:true});
function focusPlan(){api().focus(section);map.style.clipPath='none';map.querySelectorAll('.map-polygon').forEach(p=>{p.style.visibility='visible';});}
function select(id){section=id;view='plan';$('ps-section').value=id;setView('plan');queue();}
function setView(next){view=next;preview.hidden=next!=='3d';document.body.classList.toggle('ps-show-3d',next==='3d');$('ps-2d').setAttribute('aria-pressed',String(next==='plan'));$('ps-3d').setAttribute('aria-pressed',String(next==='3d'));add.hidden=next==='3d';if(next==='3d'){closeEditing();readPlan();flatten();draw3D();}else requestAnimationFrame(()=>{readPlan();focusPlan();flatten();});}
function toggleKey(){key.hidden=!key.hidden;$('ps-key').setAttribute('aria-expanded',String(!key.hidden));}
$('ps-key').onclick=toggleKey;$('ps-section').onchange=e=>select(e.target.value);$('ps-2d').onclick=()=>setView('plan');$('ps-3d').onclick=()=>setView('3d');window.openGarden3D=id=>select(id);window.addEventListener('gardendex:planchange',queue);
const guest=document.createElement('button');guest.id='ps-guest';guest.textContent='Open plan without signing in';guest.onclick=()=>{$('login-screen').classList.add('hidden');refresh();};document.querySelector('.login-card')?.append(guest);
document.body.dataset.gdView='garden';document.body.classList.add('ps-active');select('WholeGarden');
})();
