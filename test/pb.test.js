'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);

test('pbOf: heaviest weight, best reps at that weight, best reps ever',async()=>{
 const {app,set}=await load();
 set('hist',{bench:[{date:'2026-09-01',top:50,reps:8},{date:'2026-09-03',top:55,reps:5},{date:'2026-09-05',top:55,reps:7},{date:'2026-09-07',top:50,reps:12}]});
 deq(app.pbOf('bench'),{w:55,reps:7,bestReps:12,sessions:4});
 assert.equal(app.pbOf('nothing'),null);
});

test('pbCheck: heavier is a weight PB, same weight more reps is a reps PB, otherwise nothing',async()=>{
 const {app,set}=await load();
 set('hist',{bench:[{date:'2026-09-01',top:50,reps:8}]});
 set('cur',{push:{bench:[{w:'52.5',r:'5',done:true}]}});
 deq(app.pbCheck('push','bench','bench'),{kind:'weight'});
 set('cur',{push:{bench:[{w:'50',r:'9',done:true}]}});
 deq(app.pbCheck('push','bench','bench'),{kind:'reps'});
 set('cur',{push:{bench:[{w:'50',r:'8',done:true}]}});
 assert.equal(app.pbCheck('push','bench','bench'),null);
 set('cur',{push:{bench:[{w:'47.5',r:'12',done:true}]}});
 assert.equal(app.pbCheck('push','bench','bench'),null);
});

test('pbCheck: first ever log is reported as first, and empty input is null',async()=>{
 const {app,set}=await load();
 set('hist',{});
 set('cur',{push:{bench:[{w:'40',r:'8'}]}});
 deq(app.pbCheck('push','bench','bench'),{kind:'first'});
 set('cur',{push:{bench:[{w:'',r:''}]}});
 assert.equal(app.pbCheck('push','bench','bench'),null);
});

test('warm-up sets never count toward the top set or a PB',async()=>{
 const {app,set}=await load();
 set('hist',{bench:[{date:'2026-09-01',top:50,reps:8}]});
 set('cur',{push:{bench:[{w:'60',r:'5',t:'warm'},{w:'50',r:'8'}]}});
 assert.equal(app.topOf(app.cur.push.bench),50);
 assert.equal(app.pbCheck('push','bench','bench'),null);
 deq(app.topWithReps('push','bench'),{top:50,reps:8});
});

test('drop and AMRAP sets are working sets',async()=>{
 const {app,set}=await load();
 set('cur',{push:{bench:[{w:'50',r:'8'},{w:'40',r:'12',t:'drop'},{w:'55',r:'3',t:'amrap'}]}});
 assert.equal(app.topOf(app.cur.push.bench),55);
});

test('recentPBs walks history in date order and reports both kinds',async()=>{
 const {app,set}=await load();
 set('hist',{squat:[{date:'2026-09-05',top:60,reps:8},{date:'2026-09-01',top:60,reps:6},{date:'2026-09-09',top:62.5,reps:5}]});
 const pbs=app.recentPBs(10);
 deq(pbs.map(p=>[p.date,p.kind]),[['2026-09-09','Weight'],['2026-09-05','Reps']]);
});
