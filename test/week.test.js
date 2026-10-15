'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);
const S=(w,...rs)=>rs.map(r=>({w,r}));

/* A small two-day plan so the planned numbers are easy to read. */
function plan(app,set){
 set('PLAN',{name:'T',days:[{id:'a',name:'A',tag:'',av:'--a1',items:[{ex:'dbbench',sets:3,reps:[10,10,10]},{ex:'legpress',sets:3,reps:[12,12,12]}]},
  {id:'b',name:'B',tag:'',av:'--a2',items:[{ex:'csrow',sets:3,reps:[10,10,10]},{ex:'legcurl',sets:3,reps:[12,12,12]},{ex:'cablecurl',sets:2,reps:[12,12],extra:true}]}]});
 set('ACTIVE','a'); set('swaps',{});
}

/* Expected numbers, worked out from the library's muscle weights:
   dbbench 3 sets = chest 3, triceps 1.5, shoulders 1.5; legpress 3 = quads 3,
   glutes 1.5; csrow 3 = back 3, biceps 1.5; legcurl 3 = hamstrings 3. */
test('planned sets per muscle come from the plan, helpers at half, extras excluded',async()=>{
 const {app,set}=await load(); plan(app,set);
 deq(app.plannedByGroup(),{chest:3,triceps:1.5,shoulders:1.5,quads:3,glutes:1.5,back:3,biceps:1.5,hamstrings:3});
});

test('plan editor: sets per muscle per week, with the edited day\'s share',async()=>{
 const {app,set}=await load(); plan(app,set);
 deq(app.plannedByGroup('a'),{chest:3,triceps:1.5,shoulders:1.5,quads:3,glutes:1.5},'one day only');
 deq(app.plannedWeekRows('b').map(r=>[r.g,r.n,r.day]),[['back',3,3],['chest',3,0],['hamstrings',3,3],['quads',3,0],
  ['biceps',1.5,1.5],['glutes',1.5,0],['shoulders',1.5,0],['triceps',1.5,0]],'most sets first, ties by name');
 const html=app.weekVolBlock(app.day('a'));
 for(const g of ['Quads','Back','Chest','Triceps']) assert.ok(html.indexOf('>'+g+'<')>0,g+' row, by display name');
 assert.ok(html.indexOf('>1.5<')>0,'half sets shown as halves');
 assert.ok(html.indexOf('10–20 sets a week')>0,'the guidance band is explained');
 assert.ok(html.indexOf('half for')>0,'half credit for helpers is explained');
 /* an edit on one day shows up in the week at once */
 app.day('a').items[0].sets=5;
 deq(app.plannedWeekRows('a').find(r=>r.g==='chest'),{g:'chest',n:5,day:5});
 deq(app.plannedWeekRows('a').find(r=>r.g==='triceps'),{g:'triceps',n:2.5,day:2.5});
 set('PLAN',{name:'E',days:[{id:'a',name:'A',tag:'',av:'--a1',items:[]}]});
 assert.equal(app.weekVolBlock(app.day('a')),'','empty plan: nothing drawn');
});

test('sets per group: working sets only, older entries fall back to planned sets, live session optional',async()=>{
 const {app,set}=await load(); plan(app,set);
 const mon=app.mondayISO(), next=app.addDays(mon,7);
 set('hist',{dbbench:[{date:mon,top:22,reps:10,sets:[{w:10,r:10,t:'warm'}].concat(S(22,10,9,8))},{date:app.addDays(mon,-3),top:22,reps:10,sets:S(22,10)}],
  legcurl:[{date:mon,top:50,reps:11}]});
 set('cur',{a:{legpress:[{w:'160',r:'12',done:true},{w:'160',r:'12',done:false}]},push:{bench:[{w:'50',r:'10',done:true}]}});
 /* dbbench this week: 3 working sets (the warm-up doesn't count); legcurl has
    no per-set data, so it falls back to its 3 planned sets */
 deq(app.setsByGroup(mon,next,false),{chest:3,triceps:1.5,shoulders:1.5,hamstrings:3});
 deq(app.setsByGroup(mon,next,true),{chest:3,triceps:1.5,shoulders:1.5,hamstrings:3,quads:1,glutes:0.5},
  'live leg press counts (1 set: quads 1, glutes .5); the stale push day does not');
 deq(app.weekBalance(mon,next,true).map(r=>[r.g,r.done,r.planned]),[['back',0,3],['biceps',0,1.5],['quads',1,3],['glutes',0.5,1.5],
  ['chest',3,3],['hamstrings',3,3],['triceps',1.5,1.5],['shoulders',1.5,1.5]],'least covered first, then most planned');
});

test('neglected: planned lifts not logged for N days, never-logged first',async()=>{
 const {app,set}=await load(); plan(app,set);
 const td=app.today();
 set('hist',{dbbench:[{date:td,top:22}],legpress:[{date:app.addDays(td,-16),top:160}],csrow:[{date:app.addDays(td,-3),top:75}]});
 deq(app.neglected(10).map(n=>[n.k,n.days]),[['legcurl',null],['legpress',16]]);
});

test('best gain: biggest improvement in the window over the best before it',async()=>{
 const {app,set}=await load(); plan(app,set);
 const mon=app.mondayISO(), from=app.addDays(mon,-7);
 set('hist',{csrow:[{date:app.addDays(from,-5),top:70,reps:10,sets:S(70,10)},{date:app.addDays(from,2),top:75,reps:11,sets:S(75,11,8)}],
  dbbench:[{date:app.addDays(from,-5),top:22,reps:12,sets:S(22,12)},{date:app.addDays(from,2),top:22,reps:13,sets:S(22,13)}]});
 const g=app.bestGain(from,mon);
 assert.equal(g.k,'csrow'); deq(g.now,{w:75,r:11}); deq(g.was,{w:70,r:10});
 assert.equal(app.setTxt(g.now),'75kg × 11');
});

test('check-in covers last week and is dismissed for the week',async()=>{
 const {app,set}=await load(); plan(app,set);
 const mon=app.mondayISO(), from=app.addDays(mon,-7);
 set('hist',{dbbench:[{date:app.addDays(from,1),top:22,reps:10,sets:S(22,10,10,10)}]});
 const C=app.checkin();
 assert.equal(C.from,from); assert.equal(C.sessions,1);
 assert.equal(C.balance.find(r=>r.g==='chest').done,3);
 assert.ok(app.checkinCard(),'shown while not dismissed');
 set('checkinSeen',mon); assert.equal(app.checkinCard(),null);
 set('checkinSeen',null); set('hist',{dbbench:[{date:mon,top:22,reps:10}]});
 assert.equal(app.checkinCard(),null,'nothing before this week: no check-in');
});

test('the workout screen and Progress render with the weekly pieces',async()=>{
 const {app,set}=await load(); plan(app,set);
 const mon=app.mondayISO();
 set('hist',{dbbench:[{date:app.addDays(mon,-5),top:22,reps:10,sets:S(22,10,10,10)},{date:mon,top:22,reps:10,sets:S(22,10)}]});
 assert.ok(app.todoStrip(app.day('a')));
 app.render(); app.openProgress();
});
