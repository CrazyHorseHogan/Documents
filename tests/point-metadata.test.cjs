// Execute actual editor transformations with synthetic records; no browser/database.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(process.env.POINT_SOURCE||path.join(__dirname,'..','zone-designer.js'),'utf8');
const initial={unknown:{keep:true},features:[{id:'route',zone:'ChildrenGarden',type:'hedge',name:'Test hedge',count:3,spacing:1,unknown:{keep:true},points:[
 {x:200,y:300,id:'first',source:{survey:'fixture',confidence:'recorded'},extra:[1,2]},
 {x:400,y:500,id:'second',source:{survey:'fixture'},custom:false}
]}]};
const copy=x=>JSON.parse(JSON.stringify(x));
let stored=copy(initial),writes=0,click,allowed=true;
const map={addEventListener(_,cb){click=cb;},getScreenCTM(){return {inverse:()=>({})};},createSVGPoint(){return {x:0,y:0,matrixTransform(){return {x:this.x,y:this.y};}};}};
const context=vm.createContext({
 $:id=>id==='garden-map'?map:{querySelector:()=>null},
 zone:'ChildrenGarden',mode:'move',selectedId:'route',points:[],
 read:()=>copy(stored),save:d=>{stored=copy(d);writes++;return true;},
 inside:p=>allowed&&p.x>=0&&p.x<=1000&&p.y>=0&&p.y<=1000,
 draw(){},renderControls(){},message(){},crypto:{randomUUID:()=>`copy-${writes}`},
});
// Duplicate and mirror use the selected section's actual bounding box.
map.querySelector=()=>({getBBox:()=>({x:0,y:0,width:1000,height:1000})});
vm.runInContext(source.slice(source.indexOf('function duplicate(id)'),source.indexOf('function nativeIdeas()')),context);
function verifyMetadata(feature,expected){
 for(let i=0;i<feature.points.length;i++){
  const {x,y,...metadata}=feature.points[i],{x:oldX,y:oldY,...original}=initial.features[0].points[i];
  assert.deepEqual(metadata,original,'preserve unknown point fields');
  assert.deepEqual({x,y},expected[i],'retain the existing coordinate calculation');
 }
 assert.deepEqual(feature.unknown,{keep:true});assert.deepEqual(stored.unknown,{keep:true});
}
context.duplicate('route');
verifyMetadata(stored.features[1],[{x:320,y:300},{x:520,y:500}]);
assert.deepEqual(stored.features[0],initial.features[0],'copy leaves original unchanged');
context.mirror('route');
verifyMetadata(stored.features[2],[{x:800,y:300},{x:600,y:500}]);
assert.deepEqual(stored.features[0],initial.features[0],'mirror leaves original unchanged');
// Install the actual editor click handler and move the first point to (250,350).
const a=source.indexOf("$('garden-map')?.addEventListener('click'");
vm.runInContext(source.slice(a,source.indexOf('function finish()',a)),context);
click({clientX:250,clientY:350,preventDefault(){},stopImmediatePropagation(){}});
verifyMetadata(stored.features[0],[{x:250,y:350},{x:450,y:550}]);
assert.equal(writes,3);
const before=copy(stored);allowed=false;
context.duplicate('route');context.mirror('route');
context.mode='move';click({clientX:300,clientY:400,preventDefault(){},stopImmediatePropagation(){}});
assert.equal(writes,3,'outside-zone operations do not save');assert.deepEqual(stored,before);
console.log('Point metadata passed: actual copy/mirror/move calculations, retained nested/unknown fields, unchanged originals and rejected placements.');
