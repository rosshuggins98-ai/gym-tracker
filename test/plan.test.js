'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);

test('every preset item resolves to a library exercise with reps matching sets',async()=>{
 const {app}=await load();
 Object.keys(app.PRESETS).forEach(key=>{
  const P=app.PRESETS[key].make();
  assert.ok(P.days.length>=1,key);
  P.days.forEach(d=>{
   assert.ok(d.id&&d.name&&d.tag&&d.av,key+' day fields');
   const ids=d.items.map(i=>i.ex);
   assert.equal(new Set(ids).size,ids.length,key+' '+d.id+': cur/prev are keyed day->exId, so no exercise twice in a day');
   d.items.forEach(it=>{
    assert.ok(app.LIB[it.ex],key+': missing library id '+it.ex);
    assert.equal(it.reps.length,it.sets,key+' '+it.ex);
    if(it.rest!==undefined) assert.ok(it.rest>0);
   });
  });
 });
});

test('repsFor pads or trims to the set count',async()=>{
 const {app}=await load();
 deq(app.repsFor({ex:'bench',sets:3,reps:[12,10,8]}),[12,10,8]);
 deq(app.repsFor({ex:'bench',sets:4,reps:[12,10]}),[12,10,10,10]);
 deq(app.repsFor({ex:'bench',sets:2,reps:[12,10,8]}),[12,10]);
 deq(app.repsFor({ex:'bench',sets:2}),[10,10]);
});

test('restFor defaults to 60s for anything without a valid rest',async()=>{
 const {app}=await load();
 assert.equal(app.restFor({}),60);
 assert.equal(app.restFor({rest:150}),150);
 assert.equal(app.restFor({rest:'abc'}),60);
 assert.equal(app.restFor({rest:0}),60);
 assert.equal(app.fmtRest(150),'2:30'); assert.equal(app.fmtRest(45),'0:45');
});

test('loadPreset keeps the outgoing plan as a routine unless an identical one exists',async()=>{
 const {app,set,tick}=await load();
 set('routines',[]);
 assert.equal(app.PLAN.name,'Push / Pull / Legs');
 await app.loadPreset('fullbody'); await tick();
 assert.equal(app.PLAN.name,'3-Day Full Body');
 assert.equal(app.routines.length,1); assert.equal(app.routines[0].label,'Push / Pull / Legs');
 await app.loadPreset('ppl'); await tick();
 assert.equal(app.routines.length,2);
 await app.loadPreset('fullbody'); await tick();
 assert.equal(app.routines.length,2,'PPL was already saved, so no third copy');
});

test('custom exercises get a safe unique id and a cleaned name',async()=>{
 const {app,tick}=await load();
 const id=await app.addCustom('Pendlay <b>Row</b>','Back','T-Bar Row, Cable Row'); await tick();
 assert.equal(id,'c_pendlay-brow-b');   /* tags stripped before slugging, not escaped */
 assert.equal(app.LIB[id].n,'Pendlay bRow/b');
 deq(app.LIB[id].alts,['T-Bar Row','Cable Row']);
 const id2=await app.addCustom('Pendlay <b>Row</b>','Back',''); await tick();
 assert.equal(id2,'c_pendlay-brow-b-2');
});
