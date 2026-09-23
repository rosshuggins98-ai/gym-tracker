'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);

test('setVol / exVolume: weight x reps for working sets, warm-ups and blanks are 0',async()=>{
 const {app}=await load();
 assert.equal(app.setVol({w:'50',r:'8',done:true}),400);
 assert.equal(app.setVol({w:'50',r:'8'}),0,'unticked');
 assert.equal(app.setVol({w:'50',r:'8',t:'warm',done:true}),0);
 assert.equal(app.setVol({w:'',r:'8',done:true}),0);
 assert.equal(app.setVol({w:'50',r:'',done:true}),0);
 assert.equal(app.setVol(null),0);
 assert.equal(app.exVolume([{w:'50',r:'8',done:true},{w:'50',r:'8',done:true},{w:'20',r:'10',t:'warm',done:true},{w:'50',r:'8'}]),800);
});

test('e1RM is Epley and tolerates missing reps',async()=>{
 const {app}=await load();
 assert.equal(app.e1RM(100,10),100*(1+10/30));
 assert.equal(app.e1RM(100,undefined),100);
});

test('trendFor: up / flat / down over the last 4 sessions by estimated 1RM',async()=>{
 const {app,set}=await load();
 set('hist',{
  up:[{date:'2026-09-01',top:50,reps:8},{date:'2026-09-08',top:52.5,reps:8}],
  reps:[{date:'2026-09-01',top:50,reps:6},{date:'2026-09-08',top:50,reps:10}],     /* same weight, more reps = up */
  flat:[{date:'2026-09-01',top:50,reps:8},{date:'2026-09-08',top:50,reps:8}],
  down:[{date:'2026-09-01',top:60,reps:8},{date:'2026-09-08',top:50,reps:8}],
  window:[{date:'2026-08-01',top:100,reps:1},{date:'2026-09-01',top:50,reps:8},{date:'2026-09-02',top:50,reps:8},{date:'2026-09-03',top:50,reps:8},{date:'2026-09-04',top:52.5,reps:8}],
  one:[{date:'2026-09-01',top:50,reps:8}]
 });
 assert.equal(app.trendFor('up'),'up');
 assert.equal(app.trendFor('reps'),'up');
 assert.equal(app.trendFor('flat'),'flat');
 assert.equal(app.trendFor('down'),'down');
 assert.equal(app.trendFor('window'),'up',   'only the last 4 sessions count');
 assert.equal(app.trendFor('one'),null);
 assert.equal(app.trendFor('none'),null);
});

test('volumeByGroup: history this week by library group plus the live session',async()=>{
 const {app,set}=await load();
 const mon=app.mondayISO();
 set('hist',{bench:[{date:mon,top:50,reps:8,vol:800},{date:'2020-01-06',top:50,reps:8,vol:9999}],
  'alt::machine-chest-press':[{date:mon,top:30,vol:300}],   /* no group of its own: excluded */
  squat:[{date:mon,top:60,vol:1200}]});
 set('cur',{push:{ohp:[{w:'30',r:'8',done:true},{w:'10',r:'10',t:'warm',done:true}]}});
 set('swaps',{});
 deq(app.volumeByGroup(),{Chest:800,Legs:1200,Shoulders:240});
});

test('weekVolume sums this week\'s history volume plus live sets, and ignores older entries',async()=>{
 const {app,set}=await load();
 const mon=app.mondayISO();
 set('hist',{bench:[{date:mon,top:50,vol:800},{date:'2020-01-06',top:50,vol:5000}]});
 set('cur',{push:{bench:[{w:'50',r:'2',done:true}]}});
 assert.equal(app.weekVolume(),900);
});

test('groupLastTrained comes from finished history only',async()=>{
 const {app,set}=await load();
 set('hist',{bench:[{date:'2026-09-01',top:50},{date:'2026-09-08',top:50}],'alt::pec-deck':[{date:'2026-09-15',top:50}]});
 set('cur',{legs:{squat:[{w:'60',r:'5'}]}});
 deq(app.groupLastTrained(),{Chest:'2026-09-08'});
});
