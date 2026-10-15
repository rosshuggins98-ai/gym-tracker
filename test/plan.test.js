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

/* --- Full Body Beginner, legs last (agreed with Ross 2026-10-15) --- */
test('Beginner preset: two leg exercises a day, at the end, the heavy one last',async()=>{
 const {app}=await load();
 const P=app.BEGINNER_PLAN(), isLeg=it=>app.LIB[it.ex].g==='Legs';
 const last=P.days.map(d=>d.items[d.items.length-1].ex);
 deq(last,['goblet','dbrdl','gbridge'],'leg press (goblet slot), RDL (DB RDL slot), glute bridge');
 P.days.forEach(d=>{
  const legs=d.items.filter(isLeg);
  assert.equal(legs.length,2,d.name+': never three leg exercises in a session');
  deq(d.items.slice(-2).map(i=>i.ex),plain(legs.map(i=>i.ex)),d.name+': the leg work is the last two exercises');
  assert.equal(d.items[d.items.length-1].wu,1,d.name+': the heavy leg lift has a warm-up row');
 });
 deq(P.days.map(d=>app.setCount(d)),[18,17,18],'working sets per day');
 const byEx={}; P.days.forEach(d=>d.items.forEach(it=>(byEx[it.ex]=byEx[it.ex]||[]).push(it)));
 Object.keys(byEx).forEach(ex=>{ const a=byEx[ex]; if(a.length<2) return;
  a.forEach(it=>deq({sets:it.sets,reps:it.reps,lo:it.lo},plain({sets:a[0].sets,reps:a[0].reps,lo:a[0].lo}),
   ex+': the same sets and reps wherever it appears, so the coach makes one call')); });
 const it=(day,ex)=>P.days.find(d=>d.id===day).items.find(i=>i.ex===ex);
 deq([it('bgA','goblet').reps[0],app.loFor(it('bgA','goblet'))],[10,8],'leg press 8-10');
 assert.equal(it('bgB','dbrdl').reps[0],8,'RDL 3 x 8');
 deq([it('bgC','gbridge').reps[0],app.loFor(it('bgC','gbridge'))],[12,10],'glute bridge 10-12');
 deq([it('bgA','legcurl').reps[0],app.loFor(it('bgA','legcurl'))],[12,10],'machines 10-12');
});

test('Barbell Glute Bridge: glutes first, hamstrings helping, a dumbbell version at home',async()=>{
 const {app}=await load();
 deq(app.musclesFor('gbridge',null),{glutes:1,hamstrings:.5});
 assert.equal(app.exName('gbridge'),'Barbell Glute Bridge');
 assert.equal(app.homeOk('Barbell Glute Bridge'),false,'needs a barbell');
 assert.equal(app.homeAuto('gbridge'),'Dumbbell Glute Bridge');
 assert.equal(app.incFor('gbridge'),2.5);
});

test('switching plan rebuilds untouched prefills: a new warm-up row is a warm-up, not last plan\'s set 1',async()=>{
 const {app,set,tick}=await load();
 await app.loadPreset('beginner'); await tick();
 /* C before the 2026-10-15 revision: DB bench without a warm-up row, its three prefills waiting in cur */
 const old=app.BEGINNER_PLAN(); delete old.days[2].items[0].wu; set('PLAN',old);
 set('hist',{dbbench:[{date:'2026-10-09',top:24,reps:12,vol:720,sets:[{w:24,r:12},{w:24,r:10},{w:24,r:8}],at:'gym'}]});
 set('PLACE','gym'); set('swaps',{});
 set('cur',{bgC:{dbbench:[{w:'24',r:'12',done:false},{w:'24',r:'10',done:false},{w:'24',r:'8',done:false}]},
  bgA:{latpulldown:[{w:'60',r:'10',done:true},{w:'55',r:'',done:false,wt:true},{w:'60',r:'',done:false}]}});
 await app.loadPreset('beginner'); await tick();
 set('ACTIVE','bgC'); app.render();
 const b=app.cur.bgC.dbbench;
 assert.equal(b[0].t,'warm','row 0 is now a warm-up slot'); deq(b.slice(1).map(x=>x.w),['26','26','26']);
 assert.equal(app.cur.bgA.latpulldown[0].done,true,'a ticked set stays'); assert.equal(app.cur.bgA.latpulldown[1].w,'55','a typed weight stays');
 deq(app.cur.bgA.latpulldown[2],{w:'',r:'',done:false},'an untouched one is rebuilt (A is drawn on load; no lat pulldown history here)');
});
