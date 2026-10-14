'use strict';
/* The monthly report (backlog item 11, part 2). */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);
const S=(w,...rs)=>rs.map(r=>({w,r}));

test('monthBounds: first day, the next month\'s first day, length and name',async()=>{
 const {app}=await load();
 deq(app.monthBounds('2026-09'),{from:'2026-09-01',to:'2026-10-01',days:30,name:'September'});
 deq(app.monthBounds('2026-12'),{from:'2026-12-01',to:'2027-01-01',days:31,name:'December'});
});

test('pbEvents: weight, reps at the best weight, and rep-range; one per lift per session',async()=>{
 const {app,set}=await load();
 set('hist',{dbbench:[
  {date:'2026-09-01',top:20,reps:10,sets:[{w:20,r:10},{w:18,r:12}]}, /* baseline: no PB; 18kg for 12 is the 12+ record */
  {date:'2026-09-05',top:22,reps:8,sets:S(22,8,7)},                 /* heavier: weight */
  {date:'2026-09-09',top:22,reps:10,sets:S(22,10,8)},               /* same weight, more reps: reps */
  {date:'2026-09-13',top:20,reps:12,sets:S(20,12,11)},              /* lighter, but heaviest yet for 12+: range */
  {date:'2026-09-17',top:20,reps:10,sets:S(20,10,9)}]});            /* nothing beaten */
 deq(app.pbEvents().map(p=>[p.date,p.kind]),[['2026-09-05','weight'],['2026-09-09','reps'],['2026-09-13','range']]);
 /* without an earlier set at 12+ there is nothing to beat: not a PB (as pbCheck) */
 set('hist',{x:[{date:'2026-09-01',top:20,reps:10,sets:S(20,10)},{date:'2026-09-13',top:18,reps:12,sets:S(18,12)}]});
 deq(app.pbEvents(),[]);
});

test('monthReport: sessions vs target, PBs by kind, gains, lifts with no gain, bodyweight, milestones',async()=>{
 const {app,set}=await load();
 set('WEEKTARGET',3);
 set('hist',{
  dbbench:[{date:'2026-08-20',top:18,reps:10,sets:S(18,10)},{date:'2026-09-03',top:20,reps:10,sets:S(20,10)},{date:'2026-09-17',top:22,reps:9,sets:S(22,9)}],
  latpulldown:[{date:'2026-08-20',top:50,reps:10,sets:S(50,10)},{date:'2026-09-03',top:45,reps:10,sets:S(45,10)},{date:'2026-09-17',top:50,reps:8,sets:S(50,8)}],
  legpress:[{date:'2026-09-10',top:140,reps:12,sets:S(140,12)}],                     /* new this month */
  calf:[{date:'2026-10-02',top:60,reps:15}]});                                       /* next month */
 set('bodyweight',[{date:'2026-08-30',kg:83},{date:'2026-09-02',kg:82.4},{date:'2026-09-28',kg:81.6}]);
 const R=plain(app.monthReport('2026-09'));
 assert.equal(R.name,'September');
 assert.equal(R.sessions,3,'3, 10 and 17 Sep');
 assert.equal(R.target,13,'3 a week over 30 days');
 assert.equal(R.pbs,2); deq(R.kinds,{weight:2,reps:0,range:0},'dbbench 20 then 22');
 deq(R.gains.map(g=>g.k),['dbbench'],'only lifts that beat their best from before the month');
 deq(R.stuck.map(g=>g.k),['latpulldown'],'trained twice, never beat 50 x 10');
 assert.equal(R.bwd,-0.8,'first to last reading in the month');
 assert.equal(R.sessions+R.pbs>0,true);
 const body=app.monthBody(app.monthReport('2026-09'));
 for(const s of ['3 of about 13 sessions','2 personal bests','Dumbbell Bench','Lat Pulldown','81.6kg']) assert.ok(body.indexOf(s)>=0,s);
});

test('the month card: shown in a new month until dismissed, never for a month with no sessions',async()=>{
 const {app,set}=await load();
 const ym=app.lastMonthYM(), B=app.monthBounds(ym);
 set('hist',{dbbench:[{date:app.addDays(B.from,3),top:20,reps:10,sets:S(20,10)}]}); set('bodyweight',[]);
 set('monthSeen',null);
 assert.ok(app.monthCard(),'last month had a session: shown');
 set('monthSeen',ym); assert.equal(app.monthCard(),null,'dismissed for that month');
 set('monthSeen',null); set('hist',{dbbench:[{date:app.today(),top:20,reps:10}]});
 assert.equal(app.monthCard(),null,'nothing last month: no card');
 assert.ok(/^\d{4}-\d{2}$/.test(ym));
});
