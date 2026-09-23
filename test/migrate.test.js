'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);

test('legacy ids are remapped onto library ids and merged',async()=>{
 const {app}=await load();
 const out=app.migrate({sq:[{date:'2026-08-01',top:60}],d2_squat:[{date:'2026-08-08',top:62.5}],squat:[{date:'2026-08-15',top:65}]});
 deq(out.squat.map(e=>e.top),[60,62.5,65]);
 assert.equal(out.sq,undefined); assert.equal(out.d2_squat,undefined);
});

test('entries come back sorted by date regardless of input order',async()=>{
 const {app}=await load();
 const out=app.migrate({bench:[{date:'2026-09-03',top:50},{date:'2026-09-01',top:40},{date:'2026-09-02',top:45}]});
 deq(out.bench.map(e=>e.date),['2026-09-01','2026-09-02','2026-09-03']);
});

test('unknown non-custom ids are kept, not dropped',async()=>{
 const {app}=await load();
 const out=app.migrate({mystery:[{date:'2026-09-01',top:10}]});
 deq(out.mystery.map(e=>e.top),[10]);
});

test('custom (c_) ids pass through untouched',async()=>{
 const {app}=await load();
 const out=app.migrate({'c_pendlay-row':[{date:'2026-09-01',top:40}]});
 deq(out['c_pendlay-row'].map(e=>e.top),[40]);
});

test('pre-2026-09-10 base::slug swap keys land on hkey()\'s key',async()=>{
 const {app}=await load();
 /* Incline swapped to "Bench Press" -> merges into bench; Bench swapped to
    "Landmine Press" (listed on both shoulder presses) -> shared alt:: key */
 const out=app.migrate({'incline::bench-press':[{date:'2026-09-01',top:40}],'ohp::landmine-press':[{date:'2026-09-02',top:30}],
  'dbshoulder::landmine-press':[{date:'2026-09-03',top:35}]});
 deq(out.bench.map(e=>e.top),[40]);
 deq(out['alt::landmine-press'].map(e=>e.top),[30,35]);
});

test('an unrecoverable base::slug key keeps its old key rather than vanishing',async()=>{
 const {app}=await load();
 const out=app.migrate({'bench::something-never-listed':[{date:'2026-09-01',top:1}]});
 deq(out['bench::something-never-listed'].map(e=>e.top),[1]);
});

test('alt:: history is promoted when the name becomes a library exercise',async()=>{
 const {app}=await load();
 const out=app.migrate({'alt::chest-supported-row':[{date:'2026-09-01',top:40}],csrow:[{date:'2026-09-12',top:45}],
  'bbrow::chest-supported-row':[{date:'2026-08-20',top:35}],'alt::machine-chest-press':[{date:'2026-09-02',top:30}],
  'alt::pec-deck':[{date:'2026-09-03',top:45}],'alt::landmine-press':[{date:'2026-09-04',top:20}]});
 deq(out.csrow.map(e=>e.top),[35,40,45]);
 assert.equal(out['alt::chest-supported-row'],undefined);
 deq(out.mchest.map(e=>e.top),[30],'promoted 2026-09-23');
 deq(out.pecdeck.map(e=>e.top),[45],'promoted 2026-09-23');
 deq(out['alt::landmine-press'].map(e=>e.top),[20],'still only a swap name');
});

test('migrate is idempotent',async()=>{
 const {app}=await load();
 const input={sq:[{date:'2026-08-01',top:60}],'incline::bench-press':[{date:'2026-09-01',top:40}],'alt::pec-deck':[{date:'2026-09-02',top:30}]};
 const once=app.migrate(input), twice=app.migrate(JSON.parse(JSON.stringify(once)));
 deq(twice,plain(once));
});

test('hkey: alt naming a real exercise merges, otherwise a shared alt:: key',async()=>{
 const {app}=await load();
 assert.equal(app.hkey('bench',null),'bench');
 assert.equal(app.hkey('incline','Bench Press'),'bench');
 assert.equal(app.hkey('incline','bench press'),'bench');          /* case-insensitive */
 assert.equal(app.hkey('pullup','Lat Pulldown'),'latpulldown');
 assert.equal(app.hkey('bbrow','Chest-Supported Row'),'csrow');
 assert.equal(app.hkey('ohp','Landmine Press'),'alt::landmine-press');
 assert.equal(app.hkey('dbshoulder','Landmine Press'),'alt::landmine-press'); /* same key from any slot */
});

test('no library alt resolves back to its own exercise',async()=>{
 const {app}=await load();
 const LIB=app.LIB;
 Object.keys(LIB).forEach(id=>LIB[id].alts.forEach(a=>assert.notEqual(app.hkey(id,a),id,id+' alt '+a)));
});
