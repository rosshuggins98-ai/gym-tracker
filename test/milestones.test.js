'use strict';
/* Milestones (backlog item 11): worked out from history, never stored. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);
const ids=ms=>plain(ms).map(m=>m.id);

test('sessions and week streaks, dated when they were reached',async()=>{
 const {app,set}=await load();
 /* 12 sessions, Tuesdays and Fridays for six straight weeks from 2026-08-11 */
 const dates=[]; for(let w=0;w<6;w++){ dates.push(app.addDays('2026-08-11',7*w)); dates.push(app.addDays('2026-08-14',7*w)); }
 set('hist',{lateral:dates.map(d=>({date:d,top:8,reps:12}))}); set('bodyweight',[]);
 const M=app.milestones(), by=id=>plain(M).find(m=>m.id===id);
 assert.equal(by('s10').date,dates[9],'the 10th session');
 assert.equal(by('s25'),undefined);
 assert.equal(by('w4').date,'2026-09-01','first session of the 4th straight week');
 assert.equal(by('w8'),undefined,'only six weeks');
 /* a week off resets the streak */
 const gap=dates.filter(d=>d<'2026-08-25'||d>='2026-09-01');
 set('hist',{lateral:gap.map(d=>({date:d,top:8,reps:12}))});
 assert.equal(plain(app.milestones()).find(m=>m.id==='w4'),undefined,'2 weeks, a gap, 3 weeks');
});

test('dumbbells count per dumbbell, barbells don\'t; bodyweight lifts need a bodyweight reading',async()=>{
 const {app,set}=await load();
 set('hist',{dbbench:[{date:'2026-08-20',top:9,reps:10},{date:'2026-09-01',top:10,reps:10},{date:'2026-09-20',top:16,reps:8}],
  bench:[{date:'2026-08-20',top:60,reps:5}],
  legpress:[{date:'2026-08-20',top:70,reps:12},{date:'2026-09-10',top:85,reps:12},{date:'2026-10-01',top:125,reps:12}]});
 set('bodyweight',[]);
 let M=plain(app.milestones());
 deq(M.filter(m=>m.id[0]==='d').map(m=>[m.id,m.date,m.what]),[['d10','2026-09-01','Dumbbell Bench'],['d15','2026-09-20','Dumbbell Bench']]);
 assert.ok(!M.some(m=>m.id[0]==='b'),'no bodyweight logged: no bodyweight milestones');
 set('bodyweight',[{date:'2026-08-01',kg:82},{date:'2026-09-25',kg:80}]);
 M=plain(app.milestones());
 deq(M.filter(m=>m.id[0]==='b').map(m=>[m.label,m.date]),
  [['Leg pressed your bodyweight','2026-09-10'],['Leg pressed 1.5× your bodyweight','2026-10-01']],
  'nearest reading: 85 >= 82, then 125 >= 1.5 x 80');
});

test('kg lifted and personal bests',async()=>{
 const {app,set}=await load();
 const e=(d,top,reps,vol)=>({date:d,top,reps,vol});
 set('hist',{legpress:[e('2026-09-01',100,10,4000),e('2026-09-05',105,10,4200),e('2026-09-09',110,10,4400)]});
 set('bodyweight',[]);
 const t=plain(app.milestones()).find(m=>m.id==='t10000');
 assert.equal(t.date,'2026-09-09','4000 + 4200 + 4400 crosses 10,000 on the third');
 assert.equal(t.label,'10,000kg lifted');
 const pbDates=Array.from({length:11},(_,i)=>app.addDays('2026-09-01',i));
 set('hist',{dbcurl:pbDates.map((d,i)=>e(d,10+i,10,100))});      /* every session heavier: 10 PBs after the first */
 assert.equal(plain(app.milestones()).find(m=>m.id==='p10').date,pbDates[10]);
});

test('next up: the nearest three, with what is left',async()=>{
 const {app,set}=await load();
 const td=app.today(), d=n=>app.addDays(td,-n);
 set('hist',{dbbench:[{date:d(9),top:18,reps:10,vol:500},{date:d(2),top:22,reps:8,vol:600},{date:td,top:22,reps:9,vol:600}]});
 set('bodyweight',[]);
 const N=plain(app.nextMilestones());
 assert.ok(N.length<=3);
 const s=N.find(n=>n.label==='10 sessions'); assert.equal(s.left,'7 to go');
 const db=N.find(n=>n.label==='25kg dumbbells'); assert.equal(db.left,'3kg to go');
 assert.ok(N[0].f>=N[N.length-1].f,'closest first');
 set('hist',{}); deq(plain(app.nextMilestones()),[]);
});

test('Progress lists them; the summary shows any reached that day',async()=>{
 const {app,set}=await load();
 const td=app.today(), dates=Array.from({length:10},(_,i)=>app.addDays(td,-3*(9-i)));
 set('hist',{lateral:dates.map(d=>({date:d,top:8,reps:12}))}); set('bodyweight',[]);
 const b=app.milestoneBlock();
 assert.ok(b.indexOf('10 sessions')>0&&b.indexOf('Next up')>0);
 deq(plain(app.milestonesOn(td)).map(m=>m.id),['s10'],'today was the 10th session');
 set('hist',{}); assert.equal(app.milestoneBlock(),'');
});
