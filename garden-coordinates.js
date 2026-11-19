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
window.gardenDexCoordinates=Object.freeze({toDisplay});
})();
