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

/* Also asked for on 2026-10-15: by default a workout starts at the coach's
   target for the session, not last time's number. */
async function benchDay(){
 const r=await load(); const {app,set}=r;
 set('PLAN',app.BEGINNER_PLAN()); set('ACTIVE','bgA'); set('swaps',{}); set('PLACE','gym'); set('prev',{}); set('cur',{});
 set('sessionStart',{});
 set('hist',{dbbench:[{date:'2026-10-09',top:24,reps:12,vol:720,sets:[{w:24,r:12},{w:24,r:10},{w:24,r:8}],at:'gym'}]});
 return r;
}

test('before a workout starts, its working sets start at the coach\'s target',async()=>{
 const {app}=await benchDay();
 const d=app.day('bgA'), it=d.items.find(i=>i.ex==='dbbench');
 assert.equal(app.coach('dbbench',it).kind,'up'); assert.equal(app.coach('dbbench',it).w,26);
 app.applyTargets(d);
 deq(app.cur.bgA.dbbench.slice(1).map(x=>x.w),['26','26','26'],'all three working sets: 26kg');
 assert.ok(!app.cur.bgA.dbbench[0],'the warm-up row is left to its own prefill');
});

test('targets leave typed weights and drop sets alone, and stop once a set is ticked',async()=>{
 const {app,set}=await benchDay();
 const d=app.day('bgA');
 set('cur',{bgA:{dbbench:[null,{w:'24',r:'10',done:false},{w:'22',r:'',done:false,wt:true},{w:'18',r:'',done:false,t:'drop'}]}});
 app.applyTargets(d);
 deq(app.cur.bgA.dbbench.slice(1).map(x=>x.w),['26','22','18']);
 set('cur',{bgA:{dbbench:[null,{w:'24',r:'10',done:true},{w:'24',r:'',done:false},{w:'24',r:'',done:false}]}});
 app.applyTargets(d);
 deq(app.cur.bgA.dbbench.slice(1).map(x=>x.w),['24','24','24'],'started: the session is left alone, carryWeight takes over');
});

test('no history, no target: the prefill stays as it was',async()=>{
 const {app,set}=await benchDay();
 set('hist',{}); set('cur',{bgA:{dbbench:[null,{w:'24',r:'10',done:false},{w:'24',r:'9',done:false},{w:'24',r:'8',done:false}]}});
 assert.equal(app.applyTargets(app.day('bgA')),0);
 deq(app.cur.bgA.dbbench.slice(1).map(x=>x.w),['24','24','24']);
});

test('the workout screen shows the target when it is drawn',async()=>{
 const {app}=await benchDay();
 app.render();
 deq(app.cur.bgA.dbbench.slice(1).map(x=>x.w),['26','26','26']);
});

/* 2026-10-23: Ross warmed up at 14kg in a normal set row (no warm-up row on
   that press) and the working sets dropped to 14. A ticked set well under
   the weight the sets after it show is a warm-up: it carries nothing. */
test('a much lighter set ticked first is a warm-up: the working sets keep their weight',async()=>{
 const {app,set}=await load();
 set('cur',{d:{press:[{w:'14',r:'10',done:true},{w:'24',r:'10',done:false},{w:'24',r:'10',done:false}]}});
 deq(app.carryWeight('d','press',0),[]);
 deq(ws(app.cur.d.press),['14','24','24']);
 /* the first real working set then carries as normal */
 app.cur.d.press[1].w='22'; app.cur.d.press[1].done=true;
 deq(app.carryWeight('d','press',1),[2]); deq(ws(app.cur.d.press),['14','22','22']);
});

test('a working-weight change still carries: one or two jumps down, or any jump up',async()=>{
 const {app,set}=await load();
 for(const [w,carries] of [['24',true],['22',true],['21',true],['20',false],['28',true]]){
  set('cur',{d:{press:[{w,r:'10',done:true},{w:'26',r:'10',done:false}]}});
  assert.equal(app.carryWeight('d','press',0).length>0,carries,w+'kg against 26kg');
 }
 set('cur',{d:{press:[{w:'14',r:'10',done:true},{w:'',r:'',done:false}]}});
 deq(app.carryWeight('d','press',0),[1],'nothing to compare with: carries');
});
