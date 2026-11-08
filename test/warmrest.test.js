'use strict';
/* Rest after a warm-up by how heavy it was (2026-11-08). */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load}=require('./harness');

test('warm-up rest: 45s light, 75s middle, two-thirds (90s+) heavy, capped at full rest',async()=>{
 const {app}=await load();
 const it={ex:'legpress',sets:3,reps:[10,10,10],rest:120,wu:2};
 const a=w1=>[{w:String(w1),r:'10',done:true,t:'warm'},{w:'140',r:'8',t:'warm'},{w:'170',r:''},{w:'170'},{w:'170'}];
 assert.equal(app.warmRest(it,a(80),0,120),45,'80/170 = 47%');
 assert.equal(app.warmRest(it,a(120),0,120),75,'71%');
 assert.equal(app.warmRest(it,a(150),0,120),90,'88%: two-thirds of 2:00 is 80, so 90');
 assert.equal(app.warmRest(it,a(150),0,180),120,'two-thirds of 3:00');
 assert.equal(app.warmRest(it,a(80),0,40),40,'never more than the full rest');
 assert.equal(app.warmRest(it,[{w:'',t:'warm'},{w:''},{w:''}],0,120),75,'nothing to compare: middle tier');
 assert.equal(app.isWarmSlot(it,a(80),1),true); assert.equal(app.isWarmSlot(it,a(80),2),false);
 const it2={ex:'dbbench',sets:3,reps:[10,10,10]};
 assert.equal(app.isWarmSlot(it2,[{w:'14',t:'warm'},{w:'26'}],0),true,'a planned row marked warm counts');
 assert.equal(app.warmRest(it2,[{w:'14',t:'warm'},{w:'26'},{w:'26'}],0,120),45,'14 of 26 is 54%');
});
