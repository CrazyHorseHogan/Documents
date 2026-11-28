// Supplied survey records only: synthetic fixtures, no database/browser access.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const window={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','garden-coordinates.js'),'utf8'),{window});
const square=name=>[{x_cm:0,y_cm:0},{x_cm:'100',y_cm:0},{x_cm:100,y_cm:100},{x_cm:0,y_cm:100}].map((p,i)=>({...p,polygon:name,point_order:i,geogebra_point:String(i),unknown:{keep:true}}));
const clone=value=>JSON.parse(JSON.stringify(value));
const rows=square('ChildrenGarden').reverse(),original=JSON.stringify(rows);
let result=window.gardenDexCoordinates.survey(rows);
assert.deepEqual(clone(result.sections.ChildrenGarden).map(p=>[p.x,p.y,p.order]),[[0,0,0],[100,0,1],[100,100,2],[0,100,3]]);
assert.equal(JSON.stringify(rows),original,'sorting does not mutate raw rows or unknown fields');
const invalidVariants=[
 points=>{points[1].x_cm=null;},points=>{points[1].y_cm=' ';},
 points=>{points[1].point_order=null;},points=>{points[1].point_order=0;},
 points=>{points[1].x_cm=Infinity;},
 points=>{points.splice(2);},points=>{points.forEach(p=>{p.y_cm=0;});}
];
// Execute the actual drawGarden function; stub only drawing side effects.
const app=fs.readFileSync(process.env.SURVEY_APP_SOURCE||path.join(__dirname,'..','app.js'),'utf8');
const source=app.slice(app.indexOf('function drawGarden(rows)'),app.indexOf('\nfunction createMapLayers()'));
let drawn=[];
const context=vm.createContext({window,connectionStatus:{},gardenMap:{innerHTML:''},
 addGardenMaterials(){},createMapLayers(){},drawRoad(){},drawStoneWallBoundary(){},drawGardenStructures(){},refreshGardenAtlas(){},drawObservedGardenLamps(){},
 drawPolygon(name,points){drawn.push({name,points});}});
vm.runInContext(source,context);
for(const change of invalidVariants){
 const bad=square('ChildrenGarden');change(bad);
 const input=[...bad,...square('BigGarden')];const before=clone(input);
 result=window.gardenDexCoordinates.survey(input);
 assert.deepEqual(clone(result.invalidSections),['ChildrenGarden']);
 assert(!result.sections.ChildrenGarden,'never join remaining vertices into a different outline');
 assert(result.sections.BigGarden,'unaffected sections remain available');
 drawn=[];context.drawGarden(input);
 assert.deepEqual(drawn.map(p=>p.name),['BigGarden'],'actual 2D renderer omits the whole invalid section');
 assert.equal(window.gardenSurveyRows,input,'retain all original rows including invalid ones');
 assert.deepEqual(clone(input),before);
}
drawn=[];context.drawGarden(rows);assert.deepEqual(drawn.map(p=>p.name),['ChildrenGarden']);
assert.equal(drawn[0].points[0].x,0,'actual zero is a valid survey coordinate');
assert.deepEqual(clone(window.gardenDexCoordinates.survey([]).invalidSections),[]);
assert.equal(window.gardenDexCoordinates.survey([{x_cm:1,y_cm:2}]).unassignedRows,1);
const fractional=square('Fractional').map((p,i)=>({...p,point_order:(i-1)/2}));
assert(window.gardenDexCoordinates.survey(fractional).sections.Fractional,'finite distinct order values need no guessed integer convention');
const closed=[...square('Closed'),{...square('Closed')[0],point_order:4}];
assert(window.gardenDexCoordinates.survey(closed).sections.Closed,'explicit closing vertex remains supported');
assert(window.gardenDexCoordinates.survey(square('__proto__')).sections.__proto__,'section names cannot collide with object prototypes');
console.log('Survey outline checks passed: whole-section rejection, valid-section isolation, genuine zero, order/coordinate guards, raw data preservation and actual 2D drawGarden.');
