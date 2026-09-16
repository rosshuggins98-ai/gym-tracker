'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);

test('logBodyweight: one reading per day, sorted, rounded to 0.1, junk rejected',async()=>{
 const {app,set}=await load(); set('bodyweight',[]);
 assert.equal(await app.logBodyweight('82.44','2026-09-10'),true);
 assert.equal(await app.logBodyweight('81.9','2026-09-01'),true);
 assert.equal(await app.logBodyweight('82.0','2026-09-10'),true);   /* same day replaces */
 assert.equal(await app.logBodyweight('abc'),false);
 assert.equal(await app.logBodyweight('0'),false);
 deq(app.bodyweight,[{date:'2026-09-01',kg:81.9},{date:'2026-09-10',kg:82}]);
 await app.deleteBodyweight('2026-09-10');
 deq(app.bodyweight,[{date:'2026-09-01',kg:81.9}]);
});

test('bodyweightTrend compares the latest reading with the earliest inside 30 days',async()=>{
 const {app,set}=await load();
 set('bodyweight',[{date:'2026-06-01',kg:90},{date:'2026-08-20',kg:84},{date:'2026-09-01',kg:83.2},{date:'2026-09-15',kg:82.4}]);
 const t=app.bodyweightTrend();
 assert.equal(t.from.date,'2026-08-20'); assert.equal(t.delta,-1.6); assert.equal(t.days,26);
 set('bodyweight',[{date:'2026-09-15',kg:82.4}]);
 assert.equal(app.bodyweightTrend(),null);
 set('bodyweight',[{date:'2026-01-01',kg:90},{date:'2026-09-15',kg:82.4}]);
 assert.equal(app.bodyweightTrend(),null,'only one reading inside the window');
});

test('body weight rides along in the backup, the import, and the CSV',async()=>{
 const {app,set,ctx,tick}=await load();
 set('bodyweight',[{date:'2026-09-10',kg:82}]); set('hist',{bench:[{date:'2026-09-11',top:50,reps:8}]});
 const b=app.backup(); deq(b.bodyweight,[{date:'2026-09-10',kg:82}]);
 set('bodyweight',[]);
 ctx.window.__imp=JSON.parse(JSON.stringify(b)); await app.applyImport(); await tick();
 deq(app.bodyweight,[{date:'2026-09-10',kg:82}]);
 set('notes',{bench:'pin "4"'});
 const lines=app.csvText().split('\r\n');
 assert.equal(lines[0],'"Date","Exercise","Top weight (kg)","Reps at top weight","Note"');
 assert.equal(lines[1],'"2026-09-10","Body weight","82","",""');
 assert.equal(lines[2],'"2026-09-11","Bench Press","50","8","pin ""4"""');
 set('hist',{}); set('bodyweight',[]);
 assert.equal(app.csvText(),null);
});

test('summarise: sets, volume, PBs against pre-save history, top sets, vs last time',async()=>{
 const {app,set}=await load();
 set('hist',{bench:[{date:'2026-09-01',top:50,reps:8}]}); set('swaps',{}); set('sessionStart',{});
 set('prev',{push:{bench:[{w:'50',r:'8',done:true},{w:'50',r:'8',done:true}]}});
 set('cur',{push:{bench:[{w:'20',r:'10',t:'warm',done:true},{w:'52.5',r:'6',done:true},{w:'52.5',r:'5',done:false}],ohp:[{w:'30',r:'8',done:true}],incline:[{w:'',r:''}]}});
 const d=app.PLAN.days[0];
 const S=app.summarise(d);
 assert.equal(S.setsDone,3); assert.equal(S.setsPlanned,app.setCount(d));
 assert.equal(S.vol,Math.round(52.5*6+52.5*5+30*8),'warm-up excluded, unticked working set still counts as logged volume');
 assert.equal(S.prevVol,800);
 deq(S.pbs,[{nm:'Bench Press',kind:'weight',top:52.5,reps:6}],'ohp is a first log, not a PB');
 deq(S.tops.map(t=>t.nm),['Bench Press','Barbell Shoulder Press']);
 assert.equal(S.mins,null);
 set('sessionStart',{push:Date.now()-31*60000});
 assert.equal(app.summarise(d).mins,31);
});

test('finishing a session clears its start time and the day, keeps the rest',async()=>{
 const {app,set,tick}=await load();
 set('hist',{}); set('sessionStart',{push:Date.now()-5*60000,pull:123});
 set('cur',{push:{bench:[{w:'50',r:'8',done:true}]}});
 await app.doNewSession(); await tick();
 deq(app.sessionStart,{pull:123});
});
