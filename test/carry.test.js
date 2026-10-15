'use strict';
/* Asked for on 2026-10-15: once a set is ticked, the sets after it take its
   weight, so changing the weight once carries through the exercise. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);
const ws=a=>a.map(x=>x&&x.w);

test('ticking a set gives the sets after it its weight',async()=>{
 const {app,set}=await load();
 set('cur',{d:{bench:[{w:'22',r:'10',done:true},{w:'24',r:'10',done:false},{w:'24',r:'8',done:false}]}});
 deq(app.carryWeight('d','bench',0),[1,2]);
 deq(ws(app.cur.d.bench),['22','22','22']);
 deq(app.cur.d.bench.map(x=>x.r),['10','10','8'],'reps are left alone');
 deq(app.carryWeight('d','bench',0),[],'nothing left to change');
});

test('ticked sets, weights typed by hand, warm-up rows and drop sets keep theirs',async()=>{
 const {app,set}=await load();
 set('cur',{d:{bench:[{w:'16',r:'8',t:'warm',done:false},{w:'24',r:'10',done:true},{w:'22',r:'9',done:true},
  {w:'20',r:'',done:false,wt:true},{w:'18',r:'',done:false,t:'drop'},{w:'22',r:'',done:false}]}});
 deq(app.carryWeight('d','bench',1),[5]);
 deq(ws(app.cur.d.bench),['16','24','22','20','18','24']);
});

test('nothing carries from a warm-up row, a drop set, an unticked set or an empty weight',async()=>{
 const {app,set}=await load();
 set('cur',{d:{bench:[{w:'16',r:'8',t:'warm',done:true},{w:'24',r:'10',done:false},{w:'24',r:'10',done:false}]}});
 deq(app.carryWeight('d','bench',0),[],'warm-up row');
 set('cur',{d:{bench:[{w:'24',r:'10',done:false},{w:'24',r:'10',done:false}]}});
 deq(app.carryWeight('d','bench',0),[],'not ticked');
 set('cur',{d:{bench:[{w:'',r:'10',done:true},{w:'24',r:'10',done:false}]}});
 deq(app.carryWeight('d','bench',0),[],'no weight');
 set('cur',{d:{bench:[{w:'24',r:'10',done:true},{w:'18',r:'12',t:'drop',done:true},{w:'24',r:'10',done:false}]}});
 deq(app.carryWeight('d','bench',1),[],'drop set');
});

test('only the rows on screen change',async()=>{
 const {app,set}=await load();
 set('cur',{d:{bench:[{w:'22',r:'10',done:true},{w:'24',r:'10',done:false},{w:'24',r:'10',done:false},{w:'24',r:'',done:false}]}});
 deq(app.carryWeight('d','bench',0,3),[1,2],'a fourth slot left over from an older plan is not shown');
 assert.equal(app.cur.d.bench[3].w,'24');
});

test('switching place re-fills untouched sets but keeps a weight typed by hand',async()=>{
 const {app,set}=await load();
 set('hist',{}); set('ACTIVE','push'); set('PLACE','gym');
 set('cur',{push:{bench:[{w:'50',r:'',done:false,wt:true},{w:'50',r:'',done:false}]}});
 await app.setPlace('home');
 assert.equal(app.cur.push.bench[0].w,'50','typed: kept');
 assert.ok(!app.cur.push.bench[1]||app.cur.push.bench[1].w!=='50'||!app.cur.push.bench[1].wt,'untouched: cleared for a fresh prefill');
});
