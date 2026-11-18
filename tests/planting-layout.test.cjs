// Synthetic coordinates only. Node editor API + DOM/SVG fixture, not a browser.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {fixture,guestKey}=require('./zone-storage.test.cjs');
const grid={id:'grid',type:'plant',zone:'ChildrenGarden',name:'Ferns',species:'fern',count:4,spacing:1,points:[{x:500,y:500}],unknown:{keep:true}};
const hedge={id:'hedge',type:'hedge',zone:'ChildrenGarden',name:'Holly hedge',species:'holly',count:3,spacing:1,points:[{x:100,y:100},{x:100,y:400},{x:500,y:400}]};
const seed={features:[grid,hedge],conditions:{},allowances:{},unknown:{keep:true}};
const f=fixture(JSON.stringify(seed)),positions=feature=>JSON.parse(JSON.stringify(f.api.plantingPositions(feature)));
assert.deepEqual(positions(grid),[{x:450,y:450},{x:550,y:450},{x:450,y:550},{x:550,y:550}]);
assert.deepEqual(positions(hedge),[{x:100,y:100},{x:150,y:400},{x:500,y:400}]);
assert.deepEqual(positions({...grid,count:1}),[{x:500,y:500}]);
assert.deepEqual(positions({...hedge,points:[{x:100,y:100},{x:100,y:100},{x:100,y:400}]}),[{x:100,y:100},{x:100,y:250},{x:100,y:400}]);
assert.deepEqual(positions({...hedge,points:[{x:100,y:100},{x:100,y:100}]}),[{x:100,y:100},{x:100,y:100},{x:100,y:100}]);
assert.equal(positions({...grid,count:300}).length,200,'retain existing rendering limit');
for(const change of [{points:[]},{points:[{x:null,y:2}]},{spacing:0},{spacing:''},{count:2.5},{count:null},{type:'bed'}])assert.deepEqual(positions({...grid,...change}),[],'no fabricated coordinates for incomplete layouts');
assert.equal(f.values.get(guestKey),JSON.stringify(seed));assert.equal(f.writes,0);
// Render the unmodified plan-studio script against the real editor API.
const nodes=new Map(),callbacks=[],listeners=new Map();
class Element{
 constructor(tag='div'){this.tagName=tag;this.attributes={};this.children=[];this.style={};this.dataset={};this.classList={add(){},toggle(){return false;}};}
 setAttribute(k,v){this.attributes[k]=String(v);if(k==='id'){this.id=String(v);nodes.set(this.id,this);}}
 getAttribute(k){return this.attributes[k];}
 append(child){child.parent=this;this.children.push(child);if(child.id)nodes.set(child.id,child);}
 replaceChildren(){this.children=[];}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);if(this.id)nodes.delete(this.id);}
 set innerHTML(value){this.html=value;this.children=[];for(const m of value.matchAll(/id="([^"]+)"/g)){const n=new Element();n.id=m[1];this.append(n);}}
 get innerHTML(){return this.html||'';}
 querySelector(selector){if(selector.startsWith('#'))return nodes.get(selector.slice(1))||null;return selector.includes('ChildrenGarden')?polygon:null;}
 querySelectorAll(selector){return selector==='.map-polygon'?[polygon]:[];}
}
const body=new Element(),map=new Element('svg');map.id='garden-map';nodes.set(map.id,map);
const polygon=new Element('polygon');polygon.dataset.polygon='ChildrenGarden';polygon.isPointInFill=p=>p.x>=0&&p.x<=1000&&p.y>=0&&p.y<=1000;
const document={body,getElementById:id=>nodes.get(id)||null,createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),querySelector:()=>null};
const rows=[{x_cm:0,y_cm:7000},{x_cm:1000,y_cm:7000},{x_cm:1000,y_cm:6000},{x_cm:0,y_cm:6000}].map((r,i)=>({...r,point_order:i,polygon:'ChildrenGarden'}));
const saved=[{id:'existing',common_name:'Birch',plant_type:'Tree',species:'Betula pendula',x_cm:200,y_cm:6800,unknown:'keep'}];
const window={gardenDexZoneDesigner:f.api,gardenSurveyRows:rows,gardenPlanPlants:saved,addEventListener:(name,cb)=>listeners.set(name,cb)};
const originals=JSON.stringify({rows,saved});
vm.runInNewContext(fs.readFileSync(process.env.PLAN_SOURCE||path.join(__dirname,'..','plan-studio.js'),'utf8'),{window,document,DOMPoint:class{constructor(x,y){this.x=x;this.y=y;}},MutationObserver:class{observe(){}},requestAnimationFrame:cb=>callbacks.push(cb)});
function drain(){let limit=20;while(callbacks.length){assert(limit-->0,'refresh settles');callbacks.shift()();}}
function descendants(root){return root.children.flatMap(c=>[c,...descendants(c)]);}
function renderedPositions(){return new Map(nodes.get('ps-symbols').children.filter(c=>c.tagName==='circle').map(c=>[c.getAttribute('data-plant-id'),{x:Number(c.getAttribute('cx')),y:Number(c.getAttribute('cy'))}]));}
function verifyProjection(flat){const groups=descendants(nodes.get('ps-preview')).filter(c=>c.tagName==='g'&&c.getAttribute('data-plant-id'));assert.equal(groups.length,8);for(const g of groups){const p=flat.get(g.getAttribute('data-plant-id'));assert(p,'each projected plant has the same plan identity');const shadow=g.children.find(c=>c.tagName==='ellipse');assert.equal(Number(shadow.getAttribute('cx'))-35,p.x-p.y);assert(Math.abs(Number(shadow.getAttribute('cy'))-15-(p.x+p.y-1000)*.48)<1e-8,'same ground projection');}}
drain();window.openGarden3D('ChildrenGarden');drain();
let flat=renderedPositions();assert.equal(flat.size,8,'one existing + four grid plants + three hedge plants');
assert.deepEqual(flat.get('existing'),{x:200,y:200},'saved survey Y transform applied once');
assert.deepEqual(flat.get('grid:0'),{x:450,y:450});
assert.equal(nodes.get('ps-symbols').children.filter(c=>c.tagName==='text').length,3,'one label per group plus existing plant');
nodes.get('ps-3d').onclick();verifyProjection(flat);
assert.equal(descendants(nodes.get('ps-preview')).filter(c=>c.tagName==='text').length,3);
assert.match(descendants(nodes.get('ps-preview')).find(c=>c.tagName==='p').textContent,/heights and plant forms are illustrative/);
// A saved move must relocate all derived members consistently in both views.
f.api.update(d=>{d.features[0].points[0].x+=100;});listeners.get('gardendex:planchange')();drain();
flat=renderedPositions();assert.deepEqual(flat.get('grid:0'),{x:550,y:450});verifyProjection(flat);
assert.equal(JSON.parse(f.values.get(guestKey)).features[0].unknown.keep,true);
assert.equal(JSON.parse(f.values.get(guestKey)).unknown.keep,true);
assert.equal(JSON.stringify({rows,saved}),originals,'existing plants and survey rows unchanged');
console.log('Planting layout passed: grid/hedge geometry, invalid-data guards, matching 2D/projected positions, grouped labels, saved move and unchanged source data.');
