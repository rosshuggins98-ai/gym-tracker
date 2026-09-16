'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);

test('finishing a session writes top set + volume to history and clears the day',async()=>{
 const {app,set,tick}=await load();
 const td=app.today();
 set('hist',{});
 set('cur',{push:{bench:[{w:'20',r:'10',t:'warm',done:true},{w:'50',r:'8',done:true},{w:'52.5',r:'6',done:true}],
  ohp:[{w:'',r:''}]}});
 await app.doNewSession(); await tick();
 deq(app.hist.bench,[{date:td,top:52.5,reps:6,vol:50*8+52.5*6}]);
 assert.equal(app.hist.ohp,undefined,'an exercise with nothing logged leaves no entry');
 assert.equal(app.prev.push.bench[1].w,'50','prev keeps the full session for next time\'s prefill');
 /* the day is cleared, then re-rendered: every slot is back to not-done and
    pre-filled from what was just finished */
 assert.ok(app.cur.push.bench.every(s=>s.done===false));
 assert.equal(app.cur.push.bench[1].w,'50');
});

test('finishing twice on the same day keeps the better top set, never a duplicate point',async()=>{
 const {app,set,tick}=await load();
 const td=app.today();
 set('hist',{bench:[{date:td,top:50,reps:8,vol:400}]});
 set('cur',{push:{bench:[{w:'50',r:'6',done:true}]}});
 await app.doNewSession(); await tick();
 deq(app.hist.bench,[{date:td,top:50,reps:8,vol:300}],'lower reps: top/reps kept, volume refreshed');
 set('cur',{push:{bench:[{w:'50',r:'9',done:true}]}});
 await app.doNewSession(); await tick();
 deq(app.hist.bench,[{date:td,top:50,reps:9,vol:450}]);
});

test('a swapped exercise is recorded under its swap key',async()=>{
 const {app,set,tick}=await load();
 set('hist',{}); set('swaps',{bench:'Machine Chest Press',incline:'Bench Press'});
 set('cur',{push:{bench:[{w:'30',r:'10',done:true}],incline:[{w:'45',r:'8',done:true}]}});
 await app.doNewSession(); await tick();
 assert.equal(app.hist['alt::machine-chest-press'][0].top,30);
 assert.equal(app.hist.bench[0].top,45,'Incline swapped to Bench Press lands in bench\'s history');
});

test('slot() prefills weight and reps from last session, and only once',async()=>{
 const {app,set}=await load();
 set('cur',{}); set('prev',{push:{bench:[{w:'50',r:'8',done:true}]}});
 const s=app.slot('push','bench',0);
 deq(s,{w:'50',r:'8',done:false});
 s.w='55';
 assert.equal(app.slot('push','bench',0).w,'55');
 deq(app.slot('push','bench',1),{w:'',r:'',done:false});
});

test('removeSet refuses to drop a set that has data in it',async()=>{
 const {app,set}=await load();
 const it={ex:'bench',sets:3,reps:[10,8,8]};
 set('cur',{push:{bench:[{w:'50',r:'8'},{w:'50',r:'8'},{w:'50',r:'8',done:true}]}});
 assert.equal(app.removeSet(it,'push'),false);
 app.cur.push.bench[2]={w:'',r:'',done:false};
 assert.equal(app.removeSet(it,'push'),true);
 assert.equal(it.sets,2); deq(it.reps,[10,8]);
 assert.equal(app.cur.push.bench.length,2);
});

test('backup round-trips through applyImport with migration applied',async()=>{
 const {app,set,ctx,tick}=await load();
 set('hist',{sq:[{date:'2026-08-01',top:60}]}); set('notes',{squat:'belt on'});
 const b=app.backup();
 assert.equal(b.app,'gym-tracker');
 set('hist',{}); set('notes',{});
 ctx.window.__imp=JSON.parse(JSON.stringify(b));
 await app.applyImport(); await tick();
 deq(app.hist.squat.map(e=>e.top),[60]);
 assert.equal(app.notes.squat,'belt on');
});
