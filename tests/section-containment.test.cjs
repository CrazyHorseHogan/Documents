// Synthetic SVG vertices, including browsers without native SVG hit-testing.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const window={};
const context=vm.createContext({window});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','garden-coordinates.js'),'utf8'),context);
const polygon=points=>({points:{numberOfItems:points.length,getItem:i=>points[i]}});
const square=polygon([{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]);
const hit=window.gardenDexCoordinates.containsPoint;
for(const p of [{x:50,y:50},{x:0,y:0},{x:100,y:50}])assert.equal(hit(square,p),true);
for(const p of [{x:101,y:50},{x:-1,y:0},{x:50,y:101},{x:null,y:50}])assert.equal(hit(square,p),false);
const concave=polygon([{x:0,y:0},{x:100,y:0},{x:100,y:40},{x:40,y:40},{x:40,y:100},{x:0,y:100}]);
assert(hit(concave,{x:20,y:80}));assert(!hit(concave,{x:80,y:80}),'do not substitute bounding boxes for the outline');
assert(hit(polygon([...Array.from({length:4},(_,i)=>square.points.getItem(i)).reverse()]),{x:50,y:50}),'clockwise/counterclockwise both work');
for(const poly of [null,{},polygon([]),polygon([{x:0,y:0},{x:50,y:0},{x:100,y:0}]),polygon([{x:0,y:0},{x:null,y:50},{x:50,y:0}])])assert.equal(hit(poly,{x:10,y:10}),false);
// A missing DOMPoint, a missing method or an actual native exception all use vertices.
context.DOMPoint=class{constructor(x,y){this.x=x;this.y=y;}};
const throwing={...square,isPointInFill(){throw Error('unsupported');}};
assert(hit(throwing,{x:50,y:50}));assert(!hit(throwing,{x:150,y:50}));
let calls=0;assert(hit({...square,isPointInFill(p){calls++;return p.x===50;}},{x:50,y:50}));assert.equal(calls,1);
// Execute the real editor guard: the old catch-all accepted this outside point.
const source=fs.readFileSync(process.env.BOUNDS_SOURCE||path.join(__dirname,'..','zone-designer.js'),'utf8');
context.zone='ChildrenGarden';context.$=()=>({querySelector:()=>throwing});
vm.runInContext(source.slice(source.indexOf('function inside(p)'),source.indexOf("$('garden-map')?.addEventListener('click'")),context);
assert.equal(context.inside({x:150,y:50}),false,'editor rejects outside point after native exception');
assert.equal(context.inside({x:50,y:50}),true);
// The real move handler must not save an outside target when native SVG fails.
let click,writes=0;
const map={querySelector:()=>throwing,addEventListener:(_,cb)=>{click=cb;},getScreenCTM:()=>({inverse:()=>({})}),createSVGPoint:()=>({x:0,y:0,matrixTransform(){return {x:this.x,y:this.y};}})};
context.$=()=>map;context.mode='move';context.selectedId='test';context.points=[];
context.read=()=>({features:[{id:'test',points:[{x:50,y:50},{x:60,y:60}]}]});
context.save=()=>{writes++;return true;};context.message=()=>{};context.draw=()=>{};context.renderControls=()=>{};
const listenerStart=source.indexOf("$('garden-map')?.addEventListener('click'");
vm.runInContext(source.slice(listenerStart,source.indexOf('function finish()',listenerStart)),context);
const event=(x,y)=>({clientX:x,clientY:y,preventDefault(){},stopImmediatePropagation(){}});
click(event(150,50));assert.equal(writes,0,'outside move cannot write');
click(event(70,80));assert.equal(writes,1,'inside move remains available without native SVG support');
console.log('Section containment passed: native/missing/throwing SVG APIs, concave outlines, edge points, unavailable geometry and real editor guard.');
