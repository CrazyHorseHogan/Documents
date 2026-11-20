/* Shared read-only conversion for saved plant positions. No missing value becomes zero. */
(()=>{'use strict';
function coordinate(value){
 if(typeof value!=='number'&&(typeof value!=='string'||value.trim()===''))return null;
 const number=Number(value);
 return Number.isFinite(number)?number:null;
}
function toDisplay(record){
 const x=coordinate(record?.x_cm),y=coordinate(record?.y_cm);
 if(x===null||y===null)return null;
 // Retain the established SVG Y-origin conversion, not a new garden measurement.
 return {x,y:7000-y};
}
// Validate complete supplied sections; never repair a boundary by dropping vertices.
function survey(rows){
 const grouped=new Map(),sections=Object.create(null),invalidSections=[];
 let unassignedRows=0;
 for(const row of Array.isArray(rows)?rows:[]){
  if(typeof row?.polygon!=='string'||!row.polygon.trim()){unassignedRows++;continue;}
  if(!grouped.has(row.polygon))grouped.set(row.polygon,[]);
  grouped.get(row.polygon).push(row);
 }
 for(const [name,source] of grouped){
  const points=source.map(row=>({x:coordinate(row.x_cm),y:coordinate(row.y_cm),order:coordinate(row.point_order),pointName:row.geogebra_point}));
  const bad=points.length<3||points.some(p=>p.x===null||p.y===null||p.order===null)||
   new Set(points.map(p=>p.order)).size!==points.length||new Set(points.map(p=>`${p.x},${p.y}`)).size<3;
  if(bad){invalidSections.push(name);continue;}
  points.sort((a,b)=>a.order-b.order);
  const area=points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0);
  if(!Number.isFinite(area)||area===0){invalidSections.push(name);continue;}
  sections[name]=points;
 }
 return {sections,invalidSections,unassignedRows};
}
window.gardenDexCoordinates=Object.freeze({toDisplay,survey});
})();
