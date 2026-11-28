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
 constructor(tag='div'){this.tagName=tag;this.attributes={};this.children=[];this.style={};this.dataset={};const classes=new Set();this.classList={add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name),toggle(name,force){const add=force??!classes.has(name);if(add)classes.add(name);else classes.delete(name);return add;}};}
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
const polygon=new Element('polygon');polygon.dataset.polygon='ChildrenGarden';polygon.points={numberOfItems:4,getItem:i=>[{x:0,y:0},{x:1000,y:0},{x:1000,y:1000},{x:0,y:1000}][i]};polygon.isPointInFill=p=>p.x>=0&&p.x<=1000&&p.y>=0&&p.y<=1000;
const document={body,getElementById:id=>nodes.get(id)||null,createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),querySelector:()=>null};
const rows=[{x_cm:0,y_cm:7000},{x_cm:1000,y_cm:7000},{x_cm:1000,y_cm:6000},{x_cm:0,y_cm:6000}].map((r,i)=>({...r,point_order:i,polygon:'ChildrenGarden'}));
const saved=[{id:'existing',common_name:'Birch',plant_type:'Tree',species:'Betula pendula',x_cm:200,y_cm:6800,unknown:'keep'}];
const window={gardenDexZoneDesigner:f.api,gardenSurveyRows:rows,gardenPlanPlants:saved,addEventListener:(name,cb)=>listeners.set(name,cb)};
const originals=JSON.stringify({rows,saved});
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','garden-coordinates.js'),'utf8'),{window});
vm.runInNewContext(fs.readFileSync(process.env.PLAN_SOURCE||path.join(__dirname,'..','plan-studio.js'),'utf8'),{window,document,DOMPoint:class{constructor(x,y){this.x=x;this.y=y;}},MutationObserver:class{observe(){}},requestAnimationFrame:cb=>callbacks.push(cb)});
function drain(){let limit=20;while(callbacks.length){assert(limit-->0,'refresh settles');callbacks.shift()();}}
function descendants(root){return root.children.flatMap(c=>[c,...descendants(c)]);}
function renderedPositions(){return new Map(nodes.get('ps-symbols').children.filter(c=>c.tagName==='circle').map(c=>[c.getAttribute('data-plant-id'),{x:Number(c.getAttribute('cx')),y:Number(c.getAttribute('cy'))}]));}
function verifyProjection(flat){const groups=descendants(nodes.get('ps-preview')).filter(c=>c.tagName==='g'&&c.getAttribute('data-plant-id'));assert.equal(groups.length,8);for(const g of groups){const p=flat.get(g.getAttribute('data-plant-id'));assert(p,'each projected plant has the same plan identity');const shadow=g.children.find(c=>c.tagName==='ellipse');assert.equal(Number(shadow.getAttribute('cx'))-35,p.x-p.y);assert(Math.abs(Number(shadow.getAttribute('cy'))-15-(p.x+p.y-1000)*.48)<1e-8,'same ground projection');}}
drain();window.openGarden3D('ChildrenGarden');drain();
let flat=renderedPositions();assert.equal(flat.size,8,'one existing + four grid plants + three hedge plants');
// Section membership follows displayed geometry when native SVG hit-testing throws,
// even if an old zone label is missing or disagrees with the saved position.
polygon.isPointInFill=()=>{throw Error('unsupported');};
saved[0].zone='WrongSection';saved.push({id:'outside-section',x_cm:1500,y_cm:6800,zone:'ChildrenGarden'});
listeners.get('gardendex:planchange')();drain();
assert(renderedPositions().has('existing'),'inside saved plant does not need a matching zone label');
assert(!renderedPositions().has('outside-section'),'matching zone label cannot include an outside position');
delete saved[0].zone;saved.pop();listeners.get('gardendex:planchange')();drain();flat=renderedPositions();

assert.deepEqual(flat.get('existing'),{x:200,y:200},'saved survey Y transform applied once');
assert.deepEqual(flat.get('grid:0'),{x:450,y:450});
assert.equal(nodes.get('ps-symbols').children.filter(c=>c.tagName==='text').length,3,'one label per group plus existing plant');
nodes.get('ps-3d').onclick();verifyProjection(flat);
assert.equal(descendants(nodes.get('ps-preview')).filter(c=>c.tagName==='text').length,3);
assert.match(descendants(nodes.get('ps-preview')).find(c=>c.tagName==='p').textContent,/heights and plant forms are illustrative/);
// Missing/blank coordinates must never create a false marker in either view.
saved.push({id:'missing-x',x_cm:null,y_cm:6800,unknown:'retain'},
 {id:'blank-y',x_cm:200,y_cm:' '},
 {id:'removed-bad',x_cm:null,y_cm:null,status:'Removed'});
listeners.get('gardendex:planchange')();drain();
assert.equal(renderedPositions().size,8,'invalid locations are omitted without changing valid plants');
verifyProjection(renderedPositions());
assert.match(nodes.get('ps-notice').textContent,/2 saved plant records need coordinates/);
assert.match(descendants(nodes.get('ps-preview')).find(c=>c.tagName==='p').textContent,/2 saved plant records need coordinates/);
assert.equal(saved[1].unknown,'retain');
saved.splice(1);listeners.get('gardendex:planchange')();drain();
assert(!nodes.get('ps-notice').textContent.includes('need coordinates'),'notice clears when data is corrected');
// A saved move must relocate all derived members consistently in both views.
f.api.update(d=>{d.features[0].points[0].x+=100;});listeners.get('gardendex:planchange')();drain();
flat=renderedPositions();assert.deepEqual(flat.get('grid:0'),{x:550,y:450});verifyProjection(flat);
assert.equal(JSON.parse(f.values.get(guestKey)).features[0].unknown.keep,true);
assert.equal(JSON.parse(f.values.get(guestKey)).unknown.keep,true);
// Never project a changed boundary after a supplied vertex becomes incomplete.
rows[1].x_cm=null;listeners.get('gardendex:planchange')();drain();
assert.equal(descendants(nodes.get('ps-preview')).filter(c=>c.tagName==='svg').length,0,'incomplete section has no projected outline');
assert.match(nodes.get('ps-preview').innerHTML,/Survey incomplete/);
assert.match(nodes.get('ps-notice').textContent,/1 section outline is unavailable/);
rows[1].x_cm=1000;listeners.get('gardendex:planchange')();drain();verifyProjection(renderedPositions());
assert(!nodes.get('ps-notice').textContent.includes('unavailable'),'valid survey reload restores the normal notice');
// Failed proposed-plan reads must stay visible instead of looking like an empty design.
assert(nodes.has('ps-storage-warning'),'storage failure warning exists');
const recoveredPlan=f.values.get(guestKey),writesBefore=f.writes;
f.values.set(guestKey,'{broken');listeners.get('gardendex:planchange')();drain();
assert.equal(nodes.get('ps-storage-warning').hidden,false,'storage failure stays visible in the section view');
assert.equal(renderedPositions().size,1,'existing plants remain available, proposed features are unavailable');
assert.equal(f.values.get(guestKey),'{broken');assert.equal(f.writes,writesBefore);
nodes.get('ps-2d').onclick();drain();
assert.equal(nodes.get('ps-storage-warning').hidden,false,'2D view also shows the warning');
assert.equal(nodes.get('ps-storage-warning').getAttribute('role'),'alert');
f.values.set(guestKey,recoveredPlan);nodes.get('ps-retry-plan').onclick();drain();
assert.equal(nodes.get('ps-storage-warning').hidden,true,'successful explicit retry clears warning');
assert.equal(renderedPositions().size,8,'retry restores all proposed members');
// A one-off denied read must not be hidden by a second snapshot in the same render.
f.failNextReads(1);listeners.get('gardendex:planchange')();drain();
assert.equal(nodes.get('ps-storage-warning').hidden,false,'transient failure remains explicit for this render');
assert.equal(renderedPositions().size,1);
nodes.get('ps-retry-plan').onclick();drain();
assert.equal(nodes.get('ps-storage-warning').hidden,true);assert.equal(renderedPositions().size,8);
nodes.get('ps-3d').onclick();verifyProjection(renderedPositions());
assert.equal(nodes.get('ps-storage-warning').hidden,true,'recovered section view stays complete');
assert.equal(f.writes,writesBefore,'retries only read storage');
assert.equal(f.values.get(guestKey),recoveredPlan,'all saved fields retained during retry');
// Closing tools or switching views ends temporary placement without saving it.
nodes.get('ps-2d').onclick();drain();
const beforeClose=f.values.get(guestKey),beforeCloseWrites=f.writes;
nodes.get('ps-add').onclick();assert(body.classList.contains('ps-editing'));
f.api.start('path');assert(f.nodes.has('zd-finish'));
nodes.get('ps-add').onclick();drain();
assert(!body.classList.contains('ps-editing'));assert(!f.nodes.has('zd-finish'),'closing drawer ends drawing mode');
assert.equal(nodes.get('ps-add').textContent,'+ Edit plan');
nodes.get('ps-add').onclick();f.api.start('path');
nodes.get('ps-3d').onclick();drain();
assert(!body.classList.contains('ps-editing'));assert(!f.nodes.has('zd-finish'),'3D switch also ends drawing mode');
nodes.get('ps-2d').onclick();drain();assert.equal(nodes.get('ps-add').textContent,'+ Edit plan');
assert.equal(f.writes,beforeCloseWrites);assert.equal(f.values.get(guestKey),beforeClose);
assert.equal(JSON.stringify({rows,saved}),originals,'existing plants and survey rows unchanged');
console.log('Planting layout passed: grid/hedge geometry, invalid-data guards, matching 2D/projected positions, grouped labels, saved move, persistent storage-failure warnings, read-only recovery and unchanged source data.');
