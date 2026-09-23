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
 deq(app.hist.bench,[{date:td,top:52.5,reps:6,vol:50*8+52.5*6,
  sets:[{w:20,r:10,t:'warm'},{w:50,r:8},{w:52.5,r:6}]}],'every ticked set is kept, warm-up flagged');
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
 deq(app.hist.bench,[{date:td,top:50,reps:8,vol:300,sets:[{w:50,r:6}]}],'lower reps: top/reps kept, volume and sets refreshed');
 set('cur',{push:{bench:[{w:'50',r:'9',done:true}]}});
 await app.doNewSession(); await tick();
 deq(app.hist.bench,[{date:td,top:50,reps:9,vol:450,sets:[{w:50,r:9}]}]);
});

test('a swapped exercise is recorded under its swap key',async()=>{
 const {app,set,tick}=await load();
 set('hist',{}); set('swaps',{ohp:'Landmine Press',incline:'Bench Press'});
 set('cur',{push:{ohp:[{w:'30',r:'10',done:true}],incline:[{w:'45',r:'8',done:true}]}});
 await app.doNewSession(); await tick();
 assert.equal(app.hist['alt::landmine-press'][0].top,30);
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

test('last-time hints fall back: this day -> other day (most recent) -> history top -> nothing',async()=>{
 const {app,set}=await load();
 set('hist',{squat:[{date:'2026-09-01',top:60,reps:8},{date:'2026-09-08',top:62.5,reps:6}]});
 set('swaps',{}); set('legacyLast',{});
 /* 1. this day */
 set('prev',{fbA:{squat:[{w:'65',r:'8'},{w:'65',r:'7'}]}});
 assert.equal(app.lastW('fbA','squat',1),'65'); assert.equal(app.lastR('fbA','squat',1),'7');
 /* 2. other day, most recent finish wins */
 set('prev',{legs:{squat:[{w:'55',r:'8'}],_date:'2026-09-01'},push:{squat:[{w:'57.5',r:'8'}],_date:'2026-09-08'}});
 assert.equal(app.lastW('fbA','squat',0),'57.5'); assert.equal(app.lastR('fbA','squat',0),'8');
 assert.equal(app.lastW('fbA','squat',1),null,'per-set: no second set last time');
 /* 3. history: weight only, reps left to the plan target */
 set('prev',{legs:{squat:[{w:'',r:''}]}});
 assert.equal(app.lastW('fbA','squat',0),62.5); assert.equal(app.lastW('fbA','squat',2),62.5);
 assert.equal(app.lastR('fbA','squat',0),null);
 /* swapped: history is looked up under the swap key */
 set('swaps',{squat:'Goblet Squat'});
 assert.equal(app.lastW('fbA','squat',0),null);
 set('hist',{goblet:[{date:'2026-09-08',top:20,reps:12}]});   /* Goblet Squat is a real entry, so the swap merges into it */
 assert.equal(app.lastW('fbA','squat',0),20);
 /* 4. nothing anywhere */
 set('hist',{}); set('swaps',{});
 assert.equal(app.lastW('fbA','squat',0),null);
});

test('finishing stamps prev with the date so the other-day fallback can rank it',async()=>{
 const {app,set,tick}=await load();
 set('hist',{}); set('prev',{});
 set('cur',{push:{bench:[{w:'50',r:'8',done:true}]}});
 await app.doNewSession(); await tick();
 assert.equal(app.prev.push._date,app.today());
 assert.equal(app.lastW('fbA','bench',0),'50','a brand-new day sees bench from the PPL push day');
});
