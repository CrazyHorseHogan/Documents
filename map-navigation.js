/* Stable map navigation and dimensions from the loaded Supabase survey geometry. */
(()=>{'use strict';const map=document.getElementById('garden-map');if(!map)return;const ns='http://www.w3.org/2000/svg';let dimensions=false,drag=null,moved=false;const pointers=new Map();let pinch=null,suppressUntil=0;
const bar=document.createElement('div');bar.id='gd-map-navigation';bar.hidden=true;bar.innerHTML='<button id="mn-out" aria-label="Zoom out">−</button><button id="mn-fit">Fit zone</button><button id="mn-in" aria-label="Zoom in">+</button><button id="mn-dim" aria-pressed="false">Dimensions</button><span id="mn-info" role="status"></span>';document.body.append(bar);
const box=()=>map.viewBox.baseVal;const current=()=>document.getElementById('zd-zone')?.value||'WholeGarden';
function selected(){const id=current();return [...map.querySelectorAll('.map-polygon')].filter(p=>id==='WholeGarden'||p.dataset.polygon===id);}
function bounds(){const list=selected();if(!list.length)return null;const bs=list.map(p=>p.getBBox()).filter(b=>b.width&&b.height);if(!bs.length)return null;const x=Math.min(...bs.map(b=>b.x)),y=Math.min(...bs.map(b=>b.y));return {x,y,width:Math.max(...bs.map(b=>b.x+b.width))-x,height:Math.max(...bs.map(b=>b.y+b.height))-y};}
function fit(){const b=bounds();if(!b)return;const p=Math.max(b.width,b.height)*.07;map.setAttribute('viewBox',`${b.x-p} ${b.y-p} ${b.width+2*p} ${b.height+2*p}`);}
function zoom(factor,cx,cy){const b=box();if(!b.width)return;const base=bounds(),min=50,max=Math.max(base?.width||7000,base?.height||7000)*4,w=Math.min(max,Math.max(min,b.width*factor)),f=w/b.width;map.setAttribute('viewBox',`${cx-(cx-b.x)*f} ${cy-(cy-b.y)*f} ${w} ${b.height*f}`);}
function point(x,y){const m=map.getScreenCTM();if(!m)return null;const p=map.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(m.inverse());}
function zoomCentre(f){const b=box();zoom(f,b.x+b.width/2,b.y+b.height/2);}
document.getElementById('mn-in').onclick=()=>zoomCentre(.8);document.getElementById('mn-out').onclick=()=>zoomCentre(1.25);document.getElementById('mn-fit').onclick=fit;document.getElementById('mn-dim').onclick=e=>{dimensions=!dimensions;e.currentTarget.setAttribute('aria-pressed',String(dimensions));measure();};
function measure(){map.querySelector('#mn-dimensions')?.remove();const info=document.getElementById('mn-info'),ps=selected(),b=bounds();if(!b){info.textContent='Survey dimensions appear after your garden loads.';return;}const id=current();let text=`${(b.width/100).toFixed(1)} × ${(b.height/100).toFixed(1)} m extents`;const poly=id==='WholeGarden'?null:ps[0];if(poly?.points?.numberOfItems){const p=[...Array(poly.points.numberOfItems)].map((_,i)=>poly.points.getItem(i));const area=Math.abs(p.reduce((sum,a,i)=>{const c=p[(i+1)%p.length];return sum+a.x*c.y-c.x*a.y;},0))/20000;const perimeter=p.reduce((sum,a,i)=>{const c=p[(i+1)%p.length];return sum+Math.hypot(c.x-a.x,c.y-a.y)/100;},0);text+=` · ${area.toFixed(1)} m² · ${perimeter.toFixed(1)} m boundary`;if(dimensions){const g=document.createElementNS(ns,'g');g.id='mn-dimensions';g.setAttribute('pointer-events','none');for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length],len=Math.hypot(c.x-a.x,c.y-a.y)/100;if(len<.5)continue;const t=document.createElementNS(ns,'text');t.setAttribute('x',(a.x+c.x)/2);t.setAttribute('y',(a.y+c.y)/2);t.setAttribute('text-anchor','middle');t.setAttribute('font-size',Math.max(b.width,b.height)/48);t.setAttribute('fill','#183f30');t.setAttribute('stroke','#fffbe8');t.setAttribute('stroke-width',Math.max(b.width,b.height)/500);t.setAttribute('paint-order','stroke');t.textContent=len.toFixed(1)+' m';g.append(t);}map.append(g);}}info.textContent=dimensions?text+' · recorded survey geometry':'';}
map.addEventListener('wheel',e=>{if(document.body.dataset.gdView!=='garden')return;e.preventDefault();e.stopImmediatePropagation();const p=point(e.clientX,e.clientY);if(p)zoom(Math.exp(Math.max(-.2,Math.min(.2,e.deltaY*.001))),p.x,p.y);},{passive:false,capture:true});
const drawing=()=>!!document.getElementById('zd-finish');
// Freeze the coordinate transform at gesture start so panning cannot feed back
// into its own calculations. Delay capture until a drag to preserve marker taps.
function snapshot(){const m=map.getScreenCTM();if(!m)return null;const b=box();return {inverse:m.inverse(),v:{x:b.x,y:b.y,w:b.width,h:b.height}};}
function project(p,inverse){const q=map.createSVGPoint();q.x=p.x;q.y=p.y;return q.matrixTransform(inverse);}
function beginDrag(id,p){const state=snapshot();drag=state?{id,start:p,...state}:null;}
function beginPinch(){const [a,b]=[...pointers.values()],state=snapshot();if(!state)return;const distance=Math.hypot(a.x-b.x,a.y-b.y);pinch={...state,distance,anchor:project({x:(a.x+b.x)/2,y:(a.y+b.y)/2},state.inverse)};drag=null;moved=true;}
function capture(id){try{map.setPointerCapture(id);}catch{/* Synthetic or already-ended pointer. */}}
function release(id){try{if(map.hasPointerCapture(id))map.releasePointerCapture(id);}catch{/* Pointer may already be released by the browser. */}}
function resetGesture(){const ids=[...pointers.keys()];pointers.clear();drag=null;pinch=null;ids.forEach(release);}
map.style.touchAction='none';
map.addEventListener('pointerdown',e=>{
 if(document.body.dataset.gdView!=='garden'||e.button!==0)return;
 if(!pointers.size){moved=false;suppressUntil=0;}
 const p={x:e.clientX,y:e.clientY};pointers.set(e.pointerId,p);
 if(pointers.size===2){beginPinch();pointers.forEach((_,id)=>capture(id));return;}
 if(pointers.size>2){pinch=null;drag=null;return;}
 if(drawing())return;
 beginDrag(e.pointerId,p);
},true);
window.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId))return;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pinch&&pointers.size===2){
  const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);
  if(distance<=0||pinch.distance<=0)return;
  const mid=project({x:(a.x+b.x)/2,y:(a.y+b.y)/2},pinch.inverse),base=bounds();
  const max=Math.max(base?.width||7000,base?.height||7000)*4;
  const width=Math.min(max,Math.max(50,pinch.v.w*pinch.distance/distance)),scale=width/pinch.v.w;
  map.setAttribute('viewBox',`${pinch.anchor.x-(mid.x-pinch.v.x)*scale} ${pinch.anchor.y-(mid.y-pinch.v.y)*scale} ${width} ${pinch.v.h*scale}`);
  e.preventDefault();return;
 }
 if(!drag||drag.id!==e.pointerId)return;
 if(Math.hypot(e.clientX-drag.start.x,e.clientY-drag.start.y)<6&&!moved)return;
 moved=true;capture(e.pointerId);
 const start=project(drag.start,drag.inverse),now=project({x:e.clientX,y:e.clientY},drag.inverse);
 map.setAttribute('viewBox',`${drag.v.x-(now.x-start.x)} ${drag.v.y-(now.y-start.y)} ${drag.v.w} ${drag.v.h}`);
 e.preventDefault();
},{capture:true,passive:false});
function end(e){
 if(!pointers.has(e.pointerId))return;
 pointers.delete(e.pointerId);drag=null;pinch=null;
 if(moved)suppressUntil=performance.now()+500;
 release(e.pointerId);
 if(pointers.size===2)beginPinch();
 else if(pointers.size===1&&!drawing()){const [id,p]=[...pointers.entries()][0];beginDrag(id,p);}
}
window.addEventListener('pointerup',end,true);
window.addEventListener('pointercancel',end,true);
map.addEventListener('lostpointercapture',e=>{if(e.target===map)end(e);},true);
window.addEventListener('blur',resetGesture);
// Capture above the map: zone-designer's earlier capture listener must not
// interpret the click generated after a pinch as a new path or planting point.
window.addEventListener('click',e=>{
 if(!map.contains(e.target))return;
 if(moved&&performance.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();return;}
 if(!drawing()&&!(typeof placementMode!=='undefined'&&placementMode)&&(e.target===map||e.target.closest('.map-polygon'))){e.preventDefault();e.stopImmediatePropagation();}
},true);
let timer,last='';new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{const signature=current()+':'+map.querySelectorAll('.map-polygon').length;if(signature!==last){last=signature;fit();measure();}},120);}).observe(map,{childList:true,subtree:true});
document.addEventListener('change',e=>{if(e.target.id==='zd-zone')setTimeout(()=>{fit();measure();},0);});new MutationObserver(()=>{bar.hidden=document.body.dataset.gdView!=='garden';if(bar.hidden)resetGesture();if(!bar.hidden){fit();measure();}}).observe(document.body,{attributes:true,attributeFilter:['data-gd-view']});bar.hidden=document.body.dataset.gdView!=='garden';
})();
