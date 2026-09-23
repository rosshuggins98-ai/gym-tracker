'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);
const it3=(ex,r)=>({ex,sets:3,reps:[r,r,r]});
const S=(w,...rs)=>rs.map(r=>({w,r}));

test('coach: every target hit -> go up one jump; one short -> stay and beat the reps',async()=>{
 const {app,set}=await load();
 set('incs',{});
 set('hist',{dbbench:[{date:'2026-09-20',top:20,reps:10,sets:[{w:8,r:10,t:'warm'}].concat(S(20,10,10,10))}],
  legext:[{date:'2026-09-20',top:65,reps:10,sets:S(65,12,11,10)}]});
 const up=app.coach('dbbench',it3('dbbench',10));
 assert.equal(up.kind,'up'); assert.equal(up.w,22,'dumbbells jump 2kg; the warm-up is ignored');
 const stay=app.coach('legext',it3('legext',12));
 assert.equal(stay.kind,'stay'); assert.equal(stay.w,65); deq(stay.reps,[12,11,10]);
 assert.equal(app.coachPill(stay),'Stay 65kg · beat 12·11·10');
 assert.equal(app.coachPill(up),'▲ Go 22kg');
});

test('coach: fewer sets than planned is not a hit, and only sets at the top weight count',async()=>{
 const {app,set}=await load();
 set('hist',{dbbench:[{date:'2026-09-20',top:22,reps:10,sets:S(22,10).concat(S(20,10,10))}]});
 assert.equal(app.coach('dbbench',it3('dbbench',10)).kind,'stay');
});

test('coach: entries from before per-set history fall back to the top set',async()=>{
 const {app,set}=await load();
 set('hist',{legpress:[{date:'2026-09-01',top:100,reps:12}],legcurl:[{date:'2026-09-01',top:50,reps:11}]});
 assert.equal(app.coach('legpress',it3('legpress',12)).w,105,'machines jump 5kg');
 assert.equal(app.coach('legcurl',it3('legcurl',12)).kind,'stay');
 assert.equal(app.coach('nothing',null),null);
});

test('coach: three sessions without beating the old best -> reset about 10% lighter',async()=>{
 const {app,set}=await load();
 set('hist',{dbshoulder:[{date:'2026-09-01',top:14,reps:9,sets:S(14,9,8,8)},{date:'2026-09-03',top:14,reps:8,sets:S(14,8,8,7)},
  {date:'2026-09-05',top:14,reps:9,sets:S(14,9,8,7)},{date:'2026-09-08',top:14,reps:8,sets:S(14,8,8,8)}]});
 assert.equal(app.stalled('dbshoulder'),true);
 const c=app.coach('dbshoulder',it3('dbshoulder',10));
 assert.equal(c.kind,'stall'); assert.equal(c.w,12);
 const h=app.hist.dbshoulder; h.push({date:'2026-09-10',top:14,reps:10,sets:S(14,10,9,8)});
 assert.equal(app.stalled('dbshoulder'),false,'a better session ends the stall');
});

test('increments: kit defaults, per-exercise override, bodyweight coaches reps',async()=>{
 const {app,set}=await load();
 set('incs',{});
 assert.equal(app.incFor('dbbench'),2); assert.equal(app.incFor('pecdeck'),5);
 assert.equal(app.incFor('bench'),2.5); assert.equal(app.incFor('csrow'),2.5,'plate-loaded');
 assert.equal(app.incFor('pushup'),0); assert.equal(app.incFor('alt::landmine-press'),2.5);
 await app.setInc('pushdown',5); assert.equal(app.incFor('pushdown'),5);
 await app.setInc('pushdown',2.5); assert.equal(app.incs.pushdown,undefined,'back to the default stores nothing');
 set('hist',{pushup:[{date:'2026-09-01',top:0,reps:15,sets:S(0,15,15,15)}]});
 assert.equal(app.coach('pushup',it3('pushup',15)).kind,'reps');
});

test('rep records: heaviest weight for at least N reps, across every working set',async()=>{
 const {app,set}=await load();
 set('hist',{pushdown:[{date:'2026-09-01',top:25,reps:8,sets:[{w:30,r:3,t:'warm'}].concat(S(25,8),S(20,15))},
  {date:'2026-09-08',top:20,reps:20}]});
 const rr=app.repRecords('pushdown');
 assert.equal(rr[5].w,25); assert.equal(rr[8].w,25); assert.equal(rr[10].w,20); assert.equal(rr[20].w,20);
 assert.equal(rr[20].date,'2026-09-08');
});

test('pbCheck: heaviest yet for a rep count is a PB, once there is one to beat',async()=>{
 const {app,set}=await load();
 set('hist',{bench:[{date:'2026-09-01',top:50,reps:8,sets:S(50,8).concat(S(40,12))}]});
 set('cur',{push:{bench:[{w:'45',r:'12',done:true}]}});
 deq(app.pbCheck('push','bench','bench'),{kind:'range',n:12});
 set('cur',{push:{bench:[{w:'30',r:'15',done:true}]}});
 assert.equal(app.pbCheck('push','bench','bench'),null,'no earlier 15-rep set, so nothing to beat');
});

test('estimated 1RM is only shown up to 10 reps',async()=>{
 const {app}=await load();
 assert.equal(app.e1RMShown(100,10),133.3);
 assert.equal(app.e1RMShown(20,20),null);
 assert.equal(app.e1RMShown(20,null),null);
});

test('progress and chart sheets build with mixed old and new history',async()=>{
 const {app,set}=await load();
 set('hist',{bench:[{date:'2026-09-01',top:50,reps:8},{date:'2026-09-08',top:50,reps:8,sets:S(50,8,8,8)}],
  ohp:[{date:'2026-09-01',top:30,reps:12,sets:S(30,12,12,12)}]});
 const rows=app.nextTargets();
 deq(rows.map(r=>[r.nm,r.co.kind]),[['Bench Press','stay'],['Barbell Shoulder Press','up']]);
 app.openProgress(); app.openChart('bench','push'); app.openChart('ohp',null);
});

test('increments ride along in backups',async()=>{
 const {app,set}=await load();
 set('incs',{pushdown:5});
 deq(app.backup().incs,{pushdown:5});
});
