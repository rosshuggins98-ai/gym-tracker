'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);
const S=(w,...rs)=>rs.map(r=>({w,r}));

function plan(set){
 set('PLAN',{name:'T',days:[{id:'a',name:'A',tag:'',av:'--a1',items:[{ex:'dbbench',sets:3,reps:[12,12,12],lo:8}]}]});
 set('ACTIVE','a'); set('swaps',{}); set('cur',{}); set('prev',{}); set('PLACE','gym');
}

test('effort: set, re-tap clears, rides in the backup and the import',async()=>{
 const {app,set,ctx,tick}=await load(); plan(set);
 await app.setEffort('2026-10-04','hard'); assert.equal(app.effortOf('2026-10-04'),'hard');
 await app.setEffort('2026-10-04','hard'); assert.equal(app.effortOf('2026-10-04'),null);
 await app.setEffort('2026-10-04','off');
 const b=app.backup(); deq(b.effort,{'2026-10-04':'off'});
 set('efforts',{});
 ctx.window.__imp=JSON.parse(JSON.stringify(b)); await app.applyImport(); await tick();
 assert.equal(app.effortOf('2026-10-04'),'off');
 assert.ok(app.effortRow('2026-10-04').indexOf('won\'t judge')>0);
});

test('coach leaves off days out: two bad sessions under the floor are not a "drop back"',async()=>{
 const {app,set}=await load(); plan(set);
 const it=app.PLAN.days[0].items[0];
 set('hist',{dbbench:[{date:'2026-09-20',top:20,reps:12,sets:S(20,12,12,12)},
  {date:'2026-09-27',top:22,reps:7,sets:S(22,7,6,6)},{date:'2026-10-04',top:22,reps:6,sets:S(22,6,6,5)}]});
 assert.equal(app.coach('dbbench',it).kind,'down','two sessions under the floor');
 set('efforts',{'2026-10-04':'off'});
 const c=app.coach('dbbench',it);
 assert.equal(c.kind,'stay'); assert.equal(c.w,22);
 assert.match(c.why,/off day/);
 set('efforts',{'2026-09-20':'off','2026-09-27':'off','2026-10-04':'off'});
 assert.equal(app.coach('dbbench',it).kind,'down','all off days: judged on them anyway');
});
