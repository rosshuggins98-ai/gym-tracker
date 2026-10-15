'use strict';
/* Unsaved workouts (2026-10-15). A workout is saved only when Finish is
   tapped. It is dated by its first ticked set, not by the day Finish is
   tapped, and a workout still unsaved on a later day gets a card: save it
   as that day, or discard it. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);
const DAY=864e5;
const isoAgo=(app,n)=>app.addDays(app.today(),-n);

async function beginner(){
 const r=await load(); const {app,set}=r;
 set('PLAN',app.BEGINNER_PLAN()); set('ACTIVE','bgA'); set('swaps',{}); set('hist',{}); set('prev',{});
 set('cur',{}); set('sessionStart',{}); set('sessionAt',{}); set('PLACE','gym');
 return r;
}

test('sessionDate: the day of the first ticked set, else today',async()=>{
 const {app,set}=await beginner();
 assert.equal(app.sessionDate('bgA'),app.today(),'nothing ticked');
 set('sessionStart',{bgA:Date.now()-3*DAY});
 assert.equal(app.sessionDate('bgA'),app.today(),'a start time with nothing ticked is ignored');
 set('cur',{bgA:{dbbench:[{w:'24',r:'10',done:true}]}});
 assert.equal(app.sessionDate('bgA'),isoAgo(app,3));
 set('sessionStart',{bgA:Date.now()+2*DAY});
 assert.equal(app.sessionDate('bgA'),app.today(),'never in the future');
});

test('noteTick: the first tick starts the clock and records the place; clearing every tick restarts it',async()=>{
 const {app,set}=await beginner();
 set('PLACE','home'); set('cur',{bgA:{dbbench:[{w:'24',r:'10',done:true}]}});
 app.noteTick('bgA');
 const t=app.sessionStart.bgA; assert.ok(Math.abs(t-Date.now())<5000); assert.equal(app.sessionAt.bgA,'home');
 app.cur.bgA.dbbench.push({w:'24',r:'9',done:true}); app.sessionStart.bgA=t-60000; app.noteTick('bgA');
 assert.equal(app.sessionStart.bgA,t-60000,'a second tick keeps the start');
 /* abandoned: every tick cleared, then one ticked again days later */
 app.sessionStart.bgA=Date.now()-4*DAY; app.cur.bgA.dbbench=[{w:'24',r:'10',done:true}]; app.noteTick('bgA');
 assert.equal(app.sessionDate('bgA'),app.today(),'the only ticked set restarts the clock');
});

test('a workout finished days later is dated, placed and ordered as when it was trained',async()=>{
 const {app,set,tick}=await beginner();
 const then=isoAgo(app,2), later=isoAgo(app,1);
 set('hist',{dbbench:[{date:isoAgo(app,9),top:22,reps:10,vol:660,sets:[{w:22,r:10},{w:22,r:10},{w:22,r:10}]},
                      {date:later,top:24,reps:12,vol:720,sets:[{w:24,r:12},{w:24,r:10},{w:24,r:8}]}]});
 set('ACTIVE','bgC'); set('PLACE','gym');
 set('cur',{bgA:{dbbench:[{w:'24',r:'10',done:true},{w:'24',r:'9',done:true}]}});
 set('sessionStart',{bgA:Date.now()-2*DAY}); set('sessionAt',{bgA:'home'});
 const S=app.summarise(app.day('bgA'));
 assert.equal(S.date,then); assert.equal(S.mins,null,'no duration for a workout from another day'); assert.ok(/at home/.test(S.day));
 await app.doNewSession('bgA'); await tick();
 deq(app.hist.dbbench.map(e=>e.date),[isoAgo(app,9),then,later],'slotted in by date, so "last" stays the latest');
 deq(app.hist.dbbench[1],{date:then,top:24,reps:10,vol:24*19,sets:[{w:24,r:10},{w:24,r:9}],at:'home'});
 assert.equal(app.prev.bgA._date,then); assert.equal(app.prev.bgA._at,'home');
 assert.equal(app.ACTIVE,'bgC','saving another day leaves you where you were');
 assert.equal(app.sessionStart.bgA,undefined); assert.equal(app.sessionAt.bgA,undefined);
 assert.ok(!app.cur.bgA||Object.values(app.cur.bgA).every(a=>a.every(x=>!x||!x.done)),'nothing left ticked');
});

test('a same-day finish is unchanged: today, at the place picked now',async()=>{
 const {app,set,tick}=await beginner();
 set('PLACE','home'); set('cur',{bgA:{dbbench:[{w:'24',r:'10',done:true}]}});
 set('sessionStart',{bgA:Date.now()-3600e3}); set('sessionAt',{bgA:'gym'});
 assert.equal(app.summarise(app.day('bgA')).mins,60);
 await app.doNewSession(); await tick();
 deq(app.hist.dbbench,[{date:app.today(),top:24,reps:10,vol:240,sets:[{w:24,r:10}],at:'home'}]);
});

test('two finishes on one date keep both sets of sets; top, reps and volume are worked out again',async()=>{
 const {app,set,tick}=await beginner();
 const td=app.today();
 set('hist',{pushdown:[{date:td,top:25,reps:10,vol:500,sets:[{w:25,r:10},{w:25,r:10}],at:'gym'}]});
 set('ACTIVE','bgC'); set('cur',{bgC:{pushdown:[{w:'27.5',r:'8',done:true}]}});
 await app.doNewSession(); await tick();
 deq(app.hist.pushdown,[{date:td,top:27.5,reps:8,vol:500+220,sets:[{w:25,r:10},{w:25,r:10},{w:27.5,r:8}],at:'gym'}]);
});

test('staleDays: plan days with ticked sets started before today',async()=>{
 const {app,set}=await beginner();
 set('cur',{bgA:{dbbench:[{w:'24',r:'10',done:true}]},bgB:{incline:[{w:'20',r:'10',done:true}]},
  bgC:{dbbench:[{w:'24',r:'10',done:false}]},push:{bench:[{w:'50',r:'10',done:true}]}});
 set('sessionStart',{bgA:Date.now()-3*DAY,bgB:Date.now(),bgC:Date.now()-5*DAY,push:Date.now()-30*DAY});
 deq(app.staleDays().map(d=>d.id),['bgA'],'B is today, C has nothing ticked, push is not in the plan');
});

test('the card: one line per unsaved workout, Save as its date, Discard',async()=>{
 const {app,set}=await beginner();
 assert.equal(app.staleCard(),null);
 set('cur',{bgA:{dbbench:[{w:'24',r:'10',done:true},{w:'24',r:'9',done:true}]}});
 set('sessionStart',{bgA:Date.now()-2*DAY}); set('sessionAt',{bgA:'home'});
 const h=app.staleCard().innerHTML, dt=app.shortDate(isoAgo(app,2));
 assert.ok(h.includes('Workout A from'),h); assert.ok(h.includes('2 sets ticked at home'),h);
 assert.ok(h.includes('Save as '+dt),h); assert.ok(h.includes('Discard'),h);
});

test('discard: the ticked sets, extras and clock go; history stays',async()=>{
 const {app,set,tick}=await beginner();
 set('hist',{dbbench:[{date:'2026-10-01',top:22,reps:10}]});
 app.addExtra(app.day('bgA'),'lateral');
 set('cur',{bgA:{dbbench:[{w:'24',r:'10',done:true}],lateral:[{w:'6',r:'15',done:true}]}});
 set('sessionStart',{bgA:Date.now()-2*DAY}); set('sessionAt',{bgA:'home'}); set('warmDone',{bgA:isoAgo(app,2)});
 await app.discardSession('bgA'); await tick();
 assert.ok(!app.day('bgA').items.some(i=>i.extra),'today-only extras dropped');
 assert.ok(!app.cur.bgA||Object.values(app.cur.bgA).every(a=>a.every(x=>!x||!x.done)));
 assert.equal(app.sessionStart.bgA,undefined); assert.equal(app.sessionAt.bgA,undefined); assert.equal(app.warmDone.bgA,undefined);
 deq(app.hist,{dbbench:[{date:'2026-10-01',top:22,reps:10}]});
 deq(app.staleDays(),[]);
});

test('changing place mid-workout moves that workout, not one left from another day',async()=>{
 const {app,set}=await beginner();
 set('cur',{bgA:{dbbench:[{w:'24',r:'10',done:true}]},bgB:{incline:[{w:'20',r:'10',done:true}]}});
 set('sessionStart',{bgA:Date.now()-2*DAY,bgB:Date.now()}); set('sessionAt',{bgA:'home',bgB:'gym'});
 set('ACTIVE','bgB'); await app.setPlace('home');
 assert.equal(app.sessionAt.bgB,'home'); assert.equal(app.sessionAt.bgA,'home','unchanged');
 await app.setPlace('gym');
 assert.equal(app.sessionAt.bgB,'gym'); assert.equal(app.sessionAt.bgA,'home','still where it was trained');
});

test('a home workout saved at the gym is filed under the home exercises, not the gym swaps',async()=>{
 const {app,set,tick}=await beginner();
 set('swaps',{goblet:'Leg Press',dbcurl:'Cable Curl'}); set('PLACE','gym');
 set('cur',{bgA:{goblet:[{w:'24',r:'12',done:true}],dbcurl:[{w:'10',r:'12',done:true}]}});
 set('sessionStart',{bgA:Date.now()-2*DAY}); set('sessionAt',{bgA:'home'});
 await app.doNewSession('bgA'); await tick();
 assert.equal(app.hist.legpress,undefined,'24kg goblet squats are not leg press'); assert.equal(app.hist.cablecurl,undefined);
 assert.equal(app.hist.goblet[0].top,24); assert.equal(app.hist.dbcurl[0].top,10);
 assert.equal(app.prev.bgA._keys.goblet,'goblet');
 deq(app.swaps,{goblet:'Leg Press',dbcurl:'Cable Curl'},'the gym map is untouched');
});
