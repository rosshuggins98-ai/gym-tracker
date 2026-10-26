'use strict';
/* Strength check (2026-10-26): strengths and focus, opposing-muscle
   balance, bench against FitnessVolt's standards, Strength Level links. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);
const S=(w,r,n)=>Array.from({length:n||3},()=>({w,r}));
const ent=(app,ago,w,r)=>({date:app.addDays(app.today(),-ago),top:w,reps:r,vol:w*r*3,sets:S(w,r)});

test('benchStd: table rows as they are, interpolated between, clamped at the ends',async()=>{
 const {app}=await load();
 deq(app.benchStd('male',81.6),[54.9,75.3,100.2,128.8,159.7]);
 deq(app.benchStd('male',79.35),[52.9,72.8,97.5,125.7,156.1],'halfway between 77.1 and 81.6');
 deq(app.benchStd('male',30),[24.0,38.1,56.7,78.5,102.5]);
 deq(app.benchStd('female',200),[36.7,54.9,77.6,104.3,133.8]);
 assert.equal(app.benchStd('male',0),null); assert.equal(app.benchStd('',80),null);
});

test('benchBest: dumbbell bench per hand converted to a barbell max; a barbell bench wins; only the last 8 weeks, 10 reps or fewer',async()=>{
 const {app,set}=await load();
 set('hist',{dbbench:[ent(app,70,30,10),ent(app,10,26,10),ent(app,5,24,15)]});
 const B=app.benchBest();
 assert.equal(B.from,'dbbench'); assert.equal(B.e1,86.8,'26 x 10 is 34.7 per hand, x2 / 0.8');
 set('hist',{dbbench:[ent(app,10,26,10)],bench:[ent(app,3,60,8)]});
 assert.equal(app.benchBest().from,'bench'); assert.equal(app.benchBest().e1,76);
 set('hist',{}); assert.equal(app.benchBest(),null);
});

test('benchLevel: highest level reached and kg to the next',async()=>{
 const {app}=await load(); const std=[54.9,75.3,100.2,128.8,159.7];
 deq(app.benchLevel(86.7,std),{level:1,std,next:13.5});
 assert.equal(app.benchLevel(40,std).level,-1); assert.equal(app.benchLevel(40,std).next,14.9);
 assert.equal(app.benchLevel(170,std).next,null);
});

test('strengths and focus: fastest gains over 4 weeks, and stalled or flat lifts',async()=>{
 const {app,set}=await load();
 set('PLAN',app.BEGINNER_PLAN()); set('swaps',{});
 set('hist',{latpulldown:[ent(app,35,50,10),ent(app,30,50,10),ent(app,10,60,10)],
  dbcurl:[ent(app,40,12,12),ent(app,30,12,12),ent(app,20,12,12),ent(app,10,12,12),ent(app,5,12,11)],
  legext:[ent(app,30,50,12),ent(app,8,50,12)], facepull:[ent(app,30,10,10),ent(app,5,20,10)]});
 const F=app.strengthsFocus();
 deq(F.moving.map(r=>r.k),['latpulldown']);
 deq(F.focus.map(f=>f.k),['dbcurl','legext'],'facepull is not in the plan');
 assert.match(F.focus[0].why,/last 3 sessions/); assert.match(F.focus[1].why,/level/);
});

test('pair balance: working sets over 4 weeks, flagged under 75%',async()=>{
 const {app,set}=await load();
 set('hist',{dbbench:[{date:app.addDays(app.today(),-3),top:26,reps:10,sets:S(26,10,6)}],
  latpulldown:[{date:app.addDays(app.today(),-3),top:60,reps:10,sets:S(60,10,3)}],
  legext:[{date:app.addDays(app.today(),-40),top:50,reps:10,sets:S(50,10,3)}]});
 const P=app.pairBalance(), pp=P.find(p=>p.a==='back');
 assert.equal(pp.na,3); assert.equal(pp.nb,6); assert.equal(pp.off,true); assert.equal(pp.low,'Pulling (back)');
 assert.ok(!P.some(p=>p.a==='hamstrings'),'leg extension 40 days ago is outside the window');
});

test('profile (sex) is in the backup and comes back on import',async()=>{
 const {app}=await load(); await app.setSex('male');
 const b=JSON.parse(JSON.stringify(app.backup())); deq(b.profile,{sex:'male'});
 const r2=await load(); r2.ctx.window.__imp=JSON.parse(JSON.stringify(b)); await r2.app.applyImport(); deq(r2.app.profile,{sex:'male'});
 const r3=await load(); delete b.profile; r3.ctx.window.__imp=b; await r3.app.applyImport(); deq(r3.app.profile,{});
});

test('Strength Level links only for lifts with a known page',async()=>{
 const {app}=await load();
 assert.equal(app.slUrl('dbbench'),'https://strengthlevel.com/strength-standards/dumbbell-bench-press/kg');
 assert.equal(app.slUrl('csrow'),null); assert.equal(app.slLink('alt::lat-pulldown-straps'),'');
});
