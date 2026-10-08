'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);
const S=(w,...rs)=>rs.map(r=>({w,r}));

function plan(app,set){
 set('PLAN',{name:'T',days:[{id:'a',name:'A',tag:'',av:'--a1',items:[{ex:'dbbench',sets:3,reps:[10,10,10]}]},
  {id:'b',name:'B',tag:'',av:'--a2',items:[{ex:'csrow',sets:3,reps:[10,10,10]}]},
  {id:'c',name:'C',tag:'',av:'--a3',items:[{ex:'legpress',sets:3,reps:[12,12,12]}]}]});
 set('ACTIVE','a'); set('swaps',{}); set('cur',{});
}

test('days done this week come from prev._date; next is the one done longest ago',async()=>{
 const {app,set}=await load(); plan(app,set);
 const mon=app.mondayISO();
 set('prev',{a:{_date:app.addDays(mon,-5)},b:{_date:app.addDays(mon,-3)},c:{_date:mon}});
 deq(app.daysDoneThisWeek(),{c:mon});
 assert.equal(app.nextDay(),'a');
 set('prev',{a:{_date:mon},b:{_date:app.addDays(mon,-3)}});
 assert.equal(app.nextDay(),'c','never finished counts as longest ago');
 set('prev',{a:{_date:mon},b:{_date:mon},c:{_date:mon}});
 assert.equal(app.nextDay(),null,'all done: no next');
 assert.equal(app.weekday('2026-10-05'),'Mon');
});

test('compare: best now vs best in the span before, rep-logged baselines first',async()=>{
 const {app,set}=await load(); plan(app,set);
 const td=app.today(), d=n=>app.addDays(td,-n);
 set('hist',{
  dbbench:[{date:d(40),top:16,reps:10,sets:S(16,10)},{date:d(30),top:18,reps:10,sets:S(18,10)},{date:d(5),top:20,reps:12,sets:S(20,12,10)}],
  csrow:[{date:d(50),top:80},{date:d(45),top:60,reps:10,sets:S(60,10)},{date:d(3),top:66,reps:10,sets:S(66,10)}],
  legpress:[{date:d(2),top:160,reps:12,sets:S(160,12)}],
  legcurl:[{date:d(60),top:40,reps:10}]});
 const R=app.liftRows('4w'), by=k=>R.find(r=>r.k===k);
 assert.equal(by('dbbench').was.top,18,'best in the 4 weeks before');
 assert.equal(by('csrow').was.top,60,'weight-only entries skipped while a rep-logged one exists');
 assert.ok(Math.abs(by('csrow').pct-0.1)<1e-9);
 assert.equal(by('legpress').pct,null,'one session ever: new');
 assert.equal(by('legcurl'),undefined,'not trained in the span: left out');
 deq(R.map(r=>r.k),['dbbench','csrow','legpress'],'biggest gain first, new last');
 const A=app.liftRows('all');
 assert.equal(A.find(r=>r.k==='dbbench').was.top,16,'all time: first session');
});

test('compare: weight-only baseline compares top weights; totals and render',async()=>{
 const {app,set}=await load(); plan(app,set);
 const td=app.today(), d=n=>app.addDays(td,-n);
 set('hist',{csrow:[{date:d(10),top:50},{date:d(2),top:60,reps:10,vol:1200,sets:S(60,10,10)}]});
 const r=app.liftRows('1w')[0];
 assert.ok(Math.abs(r.pct-0.2)<1e-9);
 const T=app.spanTotals(d(14),app.addDays(td,1));
 assert.equal(T.sessions,2); assert.equal(T.vol,50*10*3+1200,'old entry: top x 10 reps x planned sets');
 set('bodyweight',[{date:d(20),kg:80},{date:d(1),kg:81.5}]);
 for(const s of ['1w','4w','3m','all']){ set('cmpSpan',s); assert.ok(app.compareBlock().indexOf('cmp-row')>0,s); }
 set('cmpSpan','4w'); assert.ok(app.compareBlock().indexOf('Bodyweight +1.5kg')>0);
});
