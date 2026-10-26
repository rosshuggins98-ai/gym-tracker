'use strict';
/* Agreed with Ross on 2026-10-26, from his last few weeks of data. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);
const S=(w,rs)=>rs.map(r=>({w,r}));
const PD={ex:'latpulldown',sets:3,reps:[10,10,10]};

/* 1. Progress since the last jump */
test('sinceJump: reps at the current weight, first session there against the latest',async()=>{
 const {app,set}=await load(); set('PLACE','gym');
 set('hist',{latpulldown:[{date:'2026-09-30',top:55,reps:10,sets:S(55,[10,10,10])},
  {date:'2026-10-06',top:60,reps:7,sets:S(60,[7,6,6])},{date:'2026-10-14',top:60,reps:10,sets:S(60,[10,8,7])},
  {date:'2026-10-25',top:60,reps:11,sets:[{w:40,r:10,t:'warm'}].concat(S(60,[11,8,7]))}]});
 deq(app.sinceJump('latpulldown'),{w:60,from:'2026-10-06',n:3,first:[7,11],total:[19,26]});
 const t=app.sinceJumpTxt('latpulldown');
 assert.ok(/At 60kg since 6 Oct \(3 sessions\): first set 7 → 11 reps, 19 → 26 in total/.test(t),t);
 app.hist.latpulldown.push({date:'2026-10-27',top:65,reps:8,sets:S(65,[8,7,7])});
 assert.equal(app.sinceJump('latpulldown'),null,'one session at a new weight: nothing to compare yet');
});

/* 2. Smaller steps when a machine's jump is big */
test('a default 5kg machine jump over 5% of the weight asks for 2 extra reps first',async()=>{
 const {app,set}=await load(); set('PLACE','gym'); set('incs',{});
 set('hist',{latpulldown:[{date:'2026-10-25',top:60,reps:10,sets:S(60,[10,8,8])}]});
 let c=app.coach('latpulldown',PD);
 assert.equal(c.kind,'stay'); assert.equal(c.w,60);
 assert.ok(/12/.test(c.why)&&/2\.5kg/.test(c.why),c.why);
 set('hist',{latpulldown:[{date:'2026-10-25',top:60,reps:12,sets:S(60,[12,9,8])}]});
 c=app.coach('latpulldown',PD); assert.equal(c.kind,'up'); assert.equal(c.w,65);
 set('hist',{latpulldown:[{date:'2026-10-25',top:60,reps:10,sets:S(60,[10,8,8])}]});
 set('incs',{latpulldown:2.5}); c=app.coach('latpulldown',PD); assert.equal(c.w,62.5,'a jump set on the chart page is used as is');
 set('incs',{latpulldown:5}); c=app.coach('latpulldown',PD); assert.equal(c.kind,'up','5kg confirmed by hand: no extra reps asked');
 set('incs',{});
 set('hist',{legpress:[{date:'2026-10-19',top:170,reps:10,sets:S(170,[10,10,10])}]});
 assert.equal(app.coach('legpress',{ex:'legpress',sets:3,reps:[10,10,10]}).kind,'up','5kg on 170kg is under 5%');
 set('hist',{dbbench:[{date:'2026-10-25',top:24,reps:10,sets:S(24,[10,10,8])}]});
 assert.equal(app.coach('dbbench',{ex:'dbbench',sets:3,reps:[10,10,10]}).w,26,'dumbbells: no smaller step exists');
});

/* 3. Set 1 past the target, and reps dropping */
test('setNudge: set 1 two past the top of its range, or a set 3 reps down on the one before',async()=>{
 const {app}=await load();
 const it={ex:'latpulldown',sets:3,reps:[10,10,10],wu:1};
 const a=[{w:'40',r:'10',done:true,t:'warm'},{w:'60',r:'12',done:true}];
 const n=app.setNudge(it,a,1); assert.ok(n&&n.extra===0&&/sets 2/.test(n.msg),JSON.stringify(n));
 assert.equal(app.setNudge(it,[a[0],{w:'60',r:'11',done:true}],1),null,'one over is fine');
 assert.equal(app.setNudge(it,a,0),null,'never for a warm-up row');
 const d=app.setNudge(it,[a[0],{w:'60',r:'11',done:true},{w:'60',r:'8',done:true}],2);
 assert.ok(d&&d.extra===30,JSON.stringify(d));
 assert.equal(app.setNudge(it,[a[0],{w:'60',r:'10',done:true},{w:'60',r:'8',done:true}],2),null,'2 down: normal');
});

/* 4. Suggested warm-up weights */
test('a warm-up row with no past warm-up suggests about 55% of the target, on a real step',async()=>{
 const {app,set}=await load(); set('PLACE','gym'); set('swaps',{}); set('cur',{}); set('prev',{});
 set('PLAN',{name:'T',days:[{id:'a',name:'A',tag:'',av:'--a1',items:[
  {ex:'legpress',sets:3,reps:[10,10,10],wu:1},{ex:'dbbench',sets:3,reps:[10,10,10],wu:1},{ex:'legcurl',sets:3,reps:[12,12,12],wu:1}]}]});
 set('hist',{legpress:[{date:'2026-10-19',top:170,reps:10,sets:S(170,[10,10,10])}],
             dbbench:[{date:'2026-10-25',top:26,reps:8,sets:S(26,[8,11,8])}]});
 const lp=app.slot('a','legpress',0,'warm'); deq([lp.w,lp.r,lp.t],['95','10','warm'],'leg press target 175: 55% on 5kg steps');
 const db=app.slot('a','dbbench',0,'warm'); deq([db.w,db.r],['14','10'],'bench stays at 26: 55% on 2kg steps');
 const lc=app.slot('a','legcurl',0,'warm'); deq([lc.w,lc.r],['',''],'no history, no target: empty');
});
