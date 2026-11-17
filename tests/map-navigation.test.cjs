// Run: node tests/map-navigation.test.cjs
// Gesture/state regression tests with an SVG transform fixture; not a device test.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const listeners = new Map();
function target(name) {
 return {name, addEventListener(type, fn) {
  const key = name + ':' + type;
  listeners.set(key, [...(listeners.get(key) || []), fn]);
 }};
}
const window = target('window');
const document = target('document');
const nodes = new Map(['mn-in','mn-out','mn-fit','mn-dim','mn-info'].map(id=>[id,{setAttribute(){}}]));
let drawing = false, moving = false;
window.gardenDexZoneDesigner = {isPlacing:()=>drawing||moving};
let captured = new Set();
let designClicks = 0, moveClicks = 0;
const map = Object.assign(target('map'), {
 style: {}, viewBox: {baseVal: {x:0,y:0,width:1000,height:1000}},
 querySelector: () => null, querySelectorAll: () => [],
 setAttribute(name, value) {
  if(name === 'viewBox') {
   const [x,y,width,height] = value.split(' ').map(Number);
   this.viewBox.baseVal = {x,y,width,height};
  }
 },
 getScreenCTM() {
  const b = {...this.viewBox.baseVal}, scale = 400 / b.width;
  return {a:scale,d:scale,inverse:() => ({apply:p=>({x:(p.x-50)/scale+b.x,y:(p.y-100)/scale+b.y})})};
 },
 createSVGPoint: () => ({x:0,y:0,matrixTransform(inverse){return inverse.apply(this);}}),
 setPointerCapture(id) {captured.add(id);},
 hasPointerCapture(id) {return captured.has(id);},
 releasePointerCapture(id) {captured.delete(id);},
 contains: t => t === map || t?.name === 'plant'
});
document.body = {dataset:{gdView:'garden'},append(){}};
document.getElementById = id => id === 'garden-map' ? map : id === 'zd-finish' ? (drawing ? {} : null) : nodes.get(id);
document.createElement = () => ({setAttribute(){}});
// Mimic zone-designer registering its map capture listener before navigation.
map.addEventListener('click',()=>{if(drawing) designClicks++;if(moving) moveClicks++;});
const context = {window,document,performance,Map,Math,Array,String,setTimeout,clearTimeout,
 MutationObserver: class {observe(){}},placementMode:false};
const sourcePath = process.env.NAV_SOURCE || path.join(__dirname,'..','map-navigation.js');
vm.runInNewContext(fs.readFileSync(sourcePath,'utf8'), context);
function fire(type,id,x,y,t=map) {
 const e = {pointerId:id,button:0,clientX:x,clientY:y,target:t,
  preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};
 for(const name of ['window','map']) {
  for(const listener of listeners.get(name+':'+type)||[]) {listener(e);if(e.stopped) return e;}
 }
 return e;
}
const box = () => ({...map.viewBox.baseVal});
const near = (a,b,label) => assert(Math.abs(a-b)<.001,`${label}: ${a} vs ${b}`);
// Marker taps must retain their original target: no explicit map capture on down.
fire('pointerdown',1,250,300,{name:'plant',closest:()=>null});
assert(!captured.has(1),'tap must not capture to map');
fire('pointerup',1,250,300);
assert(!fire('click',0,250,300,{name:'plant',closest:()=>null}).stopped,'marker click remains available');
// Drag uses the original transform; multiple move events must not accelerate it.
let before=box();fire('pointerdown',2,200,300);fire('pointermove',2,220,300);fire('pointermove',2,240,300);
near(box().x,before.x-before.width*.1,'pan distance');
fire('lostpointercapture',2,240,300,{name:'plant',closest:()=>null});
fire('pointermove',2,260,300);near(box().x,before.x-before.width*.15,'capture transfer from marker');
fire('pointerup',2,240,300);assert(fire('click',0,240,300).stopped,'drag click suppressed');
// Two fingers translating at the same separation move the map with their centre.
before=box();fire('pointerdown',3,200,300);fire('pointerdown',4,300,300);
fire('pointermove',3,220,300);fire('pointermove',4,320,300);
near(box().width,before.width,'pinch translation scale');near(box().x,before.x-before.width*.05,'pinch translation');
// Lifting one finger rebases the gesture and permits continuous one-finger pan.
fire('pointerup',4,320,300);before=box();fire('pointermove',3,240,300);
near(box().x,before.x-before.width*.05,'pinch to pan');fire('pointerup',3,240,300);
// A pinch while drawing must not reach the earlier map click handler.
drawing=true;before=box();fire('pointerdown',5,200,300);fire('pointerdown',6,300,300);
fire('pointermove',6,400,300);near(box().width,before.width/2,'pinch zoom');
fire('pointerup',5,200,300);fire('pointerup',6,400,300);fire('click',0,300,300);
assert.equal(designClicks,0,'no accidental drawing point after pinch');
// The next deliberate tap must be accepted immediately, without waiting 500ms.
fire('pointerdown',7,250,300);fire('pointerup',7,250,300);fire('click',0,250,300);
assert.equal(designClicks,1,'deliberate drawing tap');
// Move mode has no zd-finish button. Its tap must reach the editor instead of
// being swallowed as navigation; a single-finger motion must not pan the map.
drawing=false; moving=true;before=box();
fire('pointerdown',20,250,300);fire('pointerup',20,250,300);
assert(!fire('click',0,250,300).stopped,'move placement tap reaches editor');
assert.equal(moveClicks,1,'move target accepted');
fire('pointerdown',21,200,300);fire('pointermove',21,240,300);
near(box().x,before.x,'single-finger movement cannot pan during placement');
fire('pointerup',21,240,300);
// Pinching stays available in move mode; its generated click cannot move a feature.
fire('pointerdown',22,200,300);fire('pointerdown',23,300,300);
fire('pointermove',23,400,300);near(box().width,before.width/2,'move mode pinch');
fire('pointerup',22,200,300);fire('pointerup',23,400,300);
assert(fire('click',0,300,300).stopped,'post-pinch move click blocked');
assert.equal(moveClicks,1,'pinch cannot relocate a feature');
fire('pointerdown',24,250,300);fire('pointerup',24,250,300);fire('click',0,250,300);
assert.equal(moveClicks,2,'fresh deliberate move tap accepted immediately');
// Completing or cancelling the move returns control to ordinary map navigation.
moving=false;before=box();
fire('pointerdown',25,200,300);fire('pointermove',25,240,300);
near(box().x,before.x-before.width*.1,'pan resumes after move mode');fire('pointerup',25,240,300);
// Cancelled and lost pointers cannot leave a stale pinch/drag in the next gesture.
fire('pointerdown',8,200,300);fire('pointercancel',8,200,300);
fire('pointerdown',9,200,300);fire('lostpointercapture',9,200,300);
drawing=false;before=box();fire('pointerdown',10,200,300);fire('pointermove',10,240,300);
near(box().x,before.x-before.width*.1,'pan after cancellation');fire('pointerup',10,240,300);
fire('pointerdown',11,200,300);fire('blur');before=box();fire('pointermove',11,400,300);
near(box().x,before.x,'blur resets gesture');
assert(Object.values(box()).every(Number.isFinite),'finite viewBox');
console.log('PASS: marker tap, stable pan, drag click suppression, pinch translation, pinch-to-pan, pinch zoom, drawing suppression and fresh tap, move taps/pinch/pan handoff, cancellation, lost capture, blur.');
