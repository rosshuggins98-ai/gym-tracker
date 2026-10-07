'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);

test('warm-up rows sit above set 1 and are never planned sets',async()=>{
 const {app,set}=await load();
 set('prev',{}); set('hist',{});
 const d=app.day('push'), it=d.items[0];   /* bench, 3 sets */
 set('cur',{push:{bench:[{w:'50',r:'12',done:true},{w:'50',r:'10',done:false}]}});
 const planned=app.setCount(d);
 assert.equal(app.addWarmup(d,it),true);
 assert.equal(app.wuOf(it),1); assert.equal(app.setCount(d),planned,'set count unchanged');
 deq(app.cur.push.bench[0],{w:'',r:'',done:false,t:'warm'},'inserted ahead of the logged sets');
 assert.equal(app.cur.push.bench[1].w,'50');
 app.addWarmup(d,it); app.addWarmup(d,it);
 assert.equal(app.addWarmup(d,it),false,'at most three'); assert.equal(app.wuOf(it),3);
 assert.equal(app.removeWarmup(d,it),true); assert.equal(app.wuOf(it),2);
 assert.equal(app.cur.push.bench.length,4);
});

test('warm-up rows: a ticked one stays, the coach pill fills only working sets, removeSet counts past them',async()=>{
 const {app,set}=await load();
 set('prev',{}); set('hist',{});
 const d=app.day('push'), it=Object.assign(d.items[0],{wu:1});
 set('cur',{push:{bench:[{w:'20',r:'10',done:true,t:'warm'},{w:'',r:''},{w:'',r:''},{w:'',r:''}]}});
 assert.equal(app.removeWarmup(d,it),false,'ticked: keep it');
 assert.equal(app.removeSet(it,'push'),true,'last working set (index 3) is empty');
 assert.equal(app.cur.push.bench.length,3);
 app.applyCoach(d,it,52.5);
 deq(app.cur.push.bench.map(x=>x.w),['20','52.5','52.5']);
 assert.equal(app.removeSet(it,'push'),false,'the coach weight is in it now');
 deq(app.doneSets(app.cur.push.bench),[{w:20,r:10,t:'warm'}]);
});

test('warm-up rows survive the end of a session and routines (they are plan, not today-only)',async()=>{
 const {app}=await load();
 const d=app.day('push'); d.items[0].wu=1;
 app.endOfSession(d); assert.equal(app.day('push').items[0].wu,1);
 assert.equal(app.cleanDays(app.PLAN.days)[0].items[0].wu,1);
});

test('reps ticked without typing are flagged; typed or stepped reps are not',async()=>{
 const {app}=await load();
 assert.equal(app.repsUnconfirmed({w:'50',r:'10',done:true}),true);
 assert.equal(app.repsUnconfirmed({w:'50',r:'10',done:true,rt:true}),false);
 assert.equal(app.repsUnconfirmed({w:'50',r:'10',done:false}),false);
 assert.equal(app.repsUnconfirmed({w:'20',r:'10',done:true,t:'warm'}),false);
});

test('finish checks: identical to last time, and untyped reps',async()=>{
 const {app,set}=await load();
 set('swaps',{});
 set('hist',{bench:[{date:'2026-09-27',top:50,reps:10,vol:1300,sets:[{w:50,r:10},{w:50,r:8},{w:50,r:8}]}]});
 set('cur',{push:{bench:[{w:'50',r:'10',done:true,rt:true},{w:'50',r:'8',done:true,rt:true},{w:'50',r:'8',done:true}],
  ohp:[{w:'30',r:'8',done:true,rt:true}]}});
 const w=app.finishChecks(app.day('push'));
 assert.equal(w.length,2);
 assert.match(w[0],/Bench Press is identical to last time/);
 assert.match(w[1],/^1 set ticked without typing/);
 set('cur',{push:{bench:[{w:'50',r:'11',done:true,rt:true}]}});
 deq(app.finishChecks(app.day('push')),[]);
});

test('dropDupeDays: a session saved twice a day apart goes; a real repeat or top-set-only match stays',async()=>{
 const {app}=await load();
 const h={dbbench:[{date:'2026-09-15',top:20.5,reps:12,vol:750},{date:'2026-09-16',top:20.5,reps:12,vol:750},
   {date:'2026-09-18',top:20.5,reps:12,vol:750}],
  incline:[{date:'2026-09-15',top:18,reps:11,vol:540},{date:'2026-09-16',top:18,reps:11,vol:540}],
  legcurl:[{date:'2026-08-14',top:60},{date:'2026-08-15',top:60}],
  pushdown:[{date:'2026-09-27',top:22.5,reps:15,vol:742.5,sets:[{w:22.5,r:15}]},{date:'2026-09-28',top:22.5,reps:15,vol:742.5,sets:[{w:22.5,r:14}]}]};
 assert.equal(app.dropDupeDays(h),2);
 deq(h.dbbench.map(e=>e.date),['2026-09-15','2026-09-18'],'two days later is a real session');
 assert.equal(h.incline.length,1); assert.equal(h.legcurl.length,2,'no volume recorded: left alone');
 assert.equal(h.pushdown.length,2,'sets differ');
});

test('boot runs the duplicate clean-up once',async()=>{
 const {app}=await load();
 assert.equal(await app.Store.get('gt4_dedupe1'),1);
});
