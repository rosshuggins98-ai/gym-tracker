'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);

test('promoting a free-text alt makes it a library exercise that keeps its history',async()=>{
 const {app,set,tick}=await load();
 set('hist',{bench:[{date:'2026-09-01',top:40,reps:8}],'alt::dumbbell-bench':[{date:'2026-09-20',top:20,reps:13}]});
 set('swaps',{bench:'Dumbbell Bench'});
 set('notes',{'alt::dumbbell-bench':'flat bench by the window'});
 set('cur',{push:{bench:[{w:'22',r:'10',done:true}]}});
 const id=await app.promoteSwap('bench'); await tick();
 assert.equal(id,'c_dumbbell-bench');
 assert.equal(app.LIB[id].n,'Dumbbell Bench'); assert.equal(app.LIB[id].g,'Chest');
 deq(app.LIB[id].alts,['Bench Press','Machine Chest Press','Push-ups'],'the old main is first in line to swap back to');
 assert.equal(app.PLAN.days[0].items[0].ex,id);
 deq(app.hist[id],[{date:'2026-09-20',top:20,reps:13}]);
 assert.equal(app.hist['alt::dumbbell-bench'],undefined);
 deq(app.hist.bench,[{date:'2026-09-01',top:40,reps:8}],'the old main\'s history is untouched');
 assert.equal(app.notes[id],'flat bench by the window');
 assert.equal(app.cur.push[id][0].w,'22','today\'s sets follow the slot');
 assert.equal(app.cur.push.bench,undefined);
 assert.equal(app.swaps.bench,undefined);
 assert.equal(app.hkey('bench','Dumbbell Bench'),id,'later swaps to the same name land on the same history');
});

test('promoting an alt that is already a library exercise reuses its id, on every day',async()=>{
 const {app,set,tick}=await load();
 await app.loadPreset('fullbody'); await tick();
 set('hist',{legpress:[{date:'2026-09-10',top:100,reps:12}]});
 set('swaps',{squat:'Leg Press'});
 const id=await app.promoteSwap('squat'); await tick();
 assert.equal(id,'legpress');
 const A=app.PLAN.days.find(d=>d.id==='fbA'), B=app.PLAN.days.find(d=>d.id==='fbB');
 assert.equal(A.items[0].ex,'legpress');
 assert.ok(B.items.some(it=>it.ex==='legpress'),'B already had leg press');
 assert.equal(B.items.filter(it=>it.ex==='legpress').length,1,'never the same exercise twice in a day');
 deq(app.hist.legpress,[{date:'2026-09-10',top:100,reps:12}]);
 assert.equal(Object.keys(app.custom).length,0,'no custom entry for a real library exercise');
});

test('promote is a no-op without an active swap',async()=>{
 const {app,set}=await load();
 set('swaps',{});
 assert.equal(await app.promoteSwap('bench'),null);
 assert.equal(app.PLAN.days[0].items[0].ex,'bench');
});
