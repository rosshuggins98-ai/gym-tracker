'use strict';
/* Cutting phase (2026-11-04): every exercise drops to 2 sets without the
   plan changing; the coach judges 2 sets and holds instead of resetting. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);
const S=(w,rs)=>rs.map(r=>({w,r}));

async function beginner(){
 const r=await load(); const {app,set}=r;
 set('PLAN',app.BEGINNER_PLAN()); set('ACTIVE','bgA'); set('swaps',{}); set('hist',{}); set('prev',{}); set('cur',{}); set('phases',[]);
 return r;
}

test('a cut trims every exercise to 2 sets; the plan is untouched and comes back',async()=>{
 const {app}=await beginner(); const d=app.day('bgA'), it=d.items.find(i=>i.ex==='dbbench');
 const before=app.setCount(d), plan=JSON.stringify(app.PLAN);
 const p=await app.startCut(app.addDays(app.today(),-3),8);
 assert.equal(p.start,app.addDays(app.today(),-3)); assert.equal(p.end,app.addDays(p.start,55)); assert.equal(p.sets,2);
 assert.equal(it.sets,3,'plan unchanged'); assert.equal(app.setsOf(it),2); assert.equal(app.repsFor(it).length,2);
 assert.equal(app.planReps(it).length,3);
 assert.ok(app.setCount(d)<before); assert.equal(JSON.stringify(app.PLAN),plan);
 deq(app.cutWeek(p),{n:1,of:8});
 assert.equal(await app.startCut(app.today(),8),null,'only one cut at a time');
 await app.endCut(); assert.equal(app.activeCut(),null); assert.equal(app.phases[0].stopped,app.today());
 assert.equal(app.setsOf(it),3); assert.equal(app.setCount(d),before);
 assert.ok(app.cutOn(app.addDays(app.today(),-1)),'past dates still know they were in the cut');
});

test('a cut ended the day it started is removed; a future start is not allowed',async()=>{
 const {app}=await beginner();
 const p=await app.startCut(app.addDays(app.today(),5),4); assert.equal(p.start,app.today(),'future start becomes today');
 await app.endCut(); deq(app.phases,[]);
});

test('during a cut the coach judges 2 sets and moves up on them',async()=>{
 const {app,set}=await beginner(); const it=app.day('bgA').items.find(i=>i.ex==='latpulldown');
 set('hist',{latpulldown:[{date:app.addDays(app.today(),-2),top:60,reps:12,sets:S(60,[12,9])}]});
 assert.equal(app.coach('latpulldown',it).kind,'stay','without a cut, 2 of 3 sets is short');
 await app.startCut(app.addDays(app.today(),-3),8);
 assert.equal(app.coach('latpulldown',it).kind,'up');
});

test('during a cut a stall holds the weight instead of a reset',async()=>{
 const {app,set}=await beginner(); const it=app.day('bgA').items.find(i=>i.ex==='dbcurl');
 const e=(n,r)=>({date:app.addDays(app.today(),-n),top:12,reps:r,sets:S(12,[r,r,r])});
 set('hist',{dbcurl:[e(20,11),e(15,10),e(10,10),e(5,10)]});
 assert.equal(app.coach('dbcurl',it).kind,'stall');
 await app.startCut(app.addDays(app.today(),-1),8);
 const c=app.coach('dbcurl',it); assert.equal(c.kind,'stay'); assert.match(c.why,/during the cut/);
});

test('the week targets follow the cut',async()=>{
 const {app}=await beginner();
 const full=JSON.parse(JSON.stringify(app.plannedByGroup()));
 await app.startCut(app.today(),8);
 const cut=app.plannedByGroup();
 Object.keys(full).forEach(g=>assert.ok(cut[g]<=full[g],g));
 assert.equal(cut.chest,full.chest*2/3);
});

test('phases are in the backup and come back on import; older backups load with none',async()=>{
 const {app}=await beginner(); await app.startCut(app.addDays(app.today(),-10),8);
 const b=JSON.parse(JSON.stringify(app.backup())); assert.equal(b.phases.length,1);
 const r2=await load(); r2.ctx.window.__imp=JSON.parse(JSON.stringify(b)); await r2.app.applyImport(); deq(r2.app.phases,b.phases);
 assert.ok(r2.app.activeCut());
 const r3=await load(); delete b.phases; r3.ctx.window.__imp=b; await r3.app.applyImport(); deq(r3.app.phases,[]);
});

test('+ Set during a cut adds one for today; the next session is back at 2',async()=>{
 const {app,set,tick}=await beginner(); const d=app.day('bgA'), it=d.items.find(i=>i.ex==='dbbench');
 await app.startCut(app.addDays(app.today(),-3),8);
 assert.ok(app.cutAddSet(it)); assert.equal(app.setsOf(it),3); assert.equal(app.repsFor(it).length,3); assert.equal(it.sets,3,'plan unchanged');
 assert.ok(app.cutAddSet(it)); assert.equal(app.setsOf(it),4); assert.equal(app.repsFor(it).length,4,'past the plan\'s own 3');
 assert.ok(app.cleanDays(app.PLAN.days).every(x=>x.items.every(i=>i.cutAdd===undefined)),'not saved into routines');
 set('cur',{bgA:{dbbench:[{w:'26',r:'10',done:true},{w:'26',r:'9',done:true},{w:'26',r:'8',done:true},{w:'26',r:'8',done:true}]}});
 assert.equal(app.cutRemoveSet(it,'bgA'),false,'a ticked set stays');
 app.cur.bgA.dbbench[3]={w:'26',r:'8'};  /* prefilled from last time, not ticked */
 assert.ok(app.cutRemoveSet(it,'bgA')); assert.equal(app.setsOf(it),3);
 set('sessionStart',{bgA:Date.now()}); await app.doNewSession('bgA'); await tick();
 assert.equal(app.hist.dbbench[0].sets.length,3,'all three sets saved');
 assert.equal(it.cutAdd,undefined); assert.equal(app.setsOf(it),2,'next session back at 2');
 assert.equal(app.cutRemoveSet(it,'bgA'),false,'nothing added, nothing to take back');
});

test('+ Set with no cut still changes the plan, as before',async()=>{
 const {app}=await beginner(); const it=app.day('bgA').items.find(i=>i.ex==='dbbench');
 assert.equal(app.cutAddSet(it),false); app.addSet(it); assert.equal(it.sets,4); assert.equal(it.cutAdd,undefined);
});
