'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);
const S=(w,...rs)=>rs.map(r=>({w,r}));

function plan(set){
 set('PLAN',{name:'T',days:[{id:'a',name:'A',tag:'',av:'--a1',items:[{ex:'dbbench',sets:3,reps:[12,12,12],lo:8}]}]});
 set('ACTIVE','a'); set('swaps',{}); set('cur',{}); set('prev',{});
}

test('finishing stamps the place on history and prev; untagged entries count as gym',async()=>{
 const {app,set,tick}=await load(); plan(set);
 assert.equal(app.placeOf({}),'gym');
 await app.setPlace('home');
 set('hist',{}); set('cur',{a:{dbbench:[{w:'22.5',r:'12',done:true}]}});
 await app.doNewSession(); await tick();
 assert.equal(app.hist.dbbench[0].at,'home'); assert.equal(app.prev.a._at,'home');
 const b=app.backup(); assert.equal(b.place,'home');
});

test('coach reads only sessions at the current place',async()=>{
 const {app,set}=await load(); plan(set);
 set('hist',{dbbench:[{date:'2026-09-20',top:22,reps:13,sets:S(22,13,12,12),at:'gym'},
  {date:'2026-10-04',top:22.5,reps:9,sets:S(22.5,9,8,8),at:'home'}]});
 const it=app.PLAN.days[0].items[0];
 set('PLACE','gym'); const g=app.coach('dbbench',it);
 assert.equal(g.kind,'up'); assert.equal(g.w,24,'gym: 22 x 13,12,12 hits the range, so 24');
 set('PLACE','home'); const h=app.coach('dbbench',it);
 assert.equal(h.kind,'stay'); assert.equal(h.w,22.5,'home: judged on the home session alone');
});

test('first time at a place: the weight snaps onto that place\'s known dumbbells',async()=>{
 const {app,set}=await load(); plan(set);
 set('hist',{dbbench:[{date:'2026-09-20',top:22,reps:13,sets:S(22,13,12,12)}],
  incline:[{date:'2026-10-04',top:20.5,reps:8,sets:S(20.5,8),at:'home'},{date:'2026-10-05',top:22.5,reps:6,sets:S(22.5,6),at:'home'}]});
 deq(app.rackAt('home'),[20.5,22.5]);
 set('PLACE','home'); const c=app.coach('dbbench',app.PLAN.days[0].items[0]);
 assert.equal(c.kind,'up'); assert.equal(c.w,22.5,'gym says 24; home has 22.5 above 22');
 assert.match(c.why,/First time at home/);
 assert.equal(app.snapW([20.5,22.5],22,0,22),22.5,'nearest');
 assert.equal(app.snapW([20.5,22.5],22,-1,22),20.5,'at or below');
 assert.equal(app.snapW([],22,1,22),22,'empty rack: unchanged');
});

test('prefill skips a prev from the other place once this place has history',async()=>{
 const {app,set}=await load(); plan(set);
 set('prev',{a:{_date:'2026-10-04',_at:'home',dbbench:[{w:'22.5',r:'9'}]}});
 set('hist',{dbbench:[{date:'2026-09-20',top:22,reps:13,at:'gym'},{date:'2026-10-04',top:22.5,reps:9,at:'home'}]});
 set('PLACE','gym'); assert.equal(app.lastW('a','dbbench',0),22,'gym: last gym top set');
 set('PLACE','home'); assert.equal(app.lastW('a','dbbench',0),'22.5','home: the home prev');
 set('cur',{a:{dbbench:[{w:'22.5',r:'',done:false},{w:'22.5',r:'9',done:true,rt:true}]}});
 await app.setPlace('gym');
 assert.equal(app.cur.a.dbbench[0],null,'untouched set re-prefilled');
 assert.equal(app.cur.a.dbbench[1].w,'22.5','ticked set kept');
});

test('tagging a date moves every lift that day',async()=>{
 const {app,set}=await load(); plan(set);
 set('hist',{dbbench:[{date:'2026-10-04',top:22.5,reps:9}],lateral:[{date:'2026-10-04',top:6.5,reps:12},{date:'2026-10-01',top:6,reps:12}]});
 await app.tagDate('2026-10-04','home');
 deq([app.hist.dbbench[0].at,app.hist.lateral[0].at,app.hist.lateral[1].at],['home','home',null]);
});

test('sessions list for tagging: one row per date, newest first, home if any lift was',async()=>{
 const {app,set}=await load(); plan(set);
 set('hist',{dbbench:[{date:'2026-10-01',top:22},{date:'2026-10-04',top:22.5,at:'home'}],legpress:[{date:'2026-10-01',top:160}]});
 const ss=app.sessionsByDate();
 deq(ss.map(s=>[s.date,s.at]),[['2026-10-04','home'],['2026-10-01','gym']]);
 assert.equal(ss[1].lifts[0],'Dumbbell Bench 22','dumbbell lifts listed first');
 assert.ok(app.placeBlock().indexOf('data-date="2026-10-04"')>0);
});
