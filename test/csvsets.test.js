'use strict';
/* The per-set CSV (backlog item 7): one row per logged set, older sessions
   as their top set, and the original per-session CSV unchanged. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load}=require('./harness');

/* Minimal CSV parse for these tests: every cell is quoted, no embedded commas
   or newlines in the fixture. */
const parse=t=>t.split('\r\n').map(l=>l.slice(1,-1).split('","'));

async function fixture(){
 const ctx=await load();
 ctx.set('hist',{
  dbbench:[{date:'2026-09-01',top:16,reps:10},
   {date:'2026-10-06',top:22,reps:12,vol:0,at:'home',sets:[{w:12,r:10,t:'warm'},{w:22,r:12},{w:22,r:null},{w:18,r:12,t:'drop'}]}],
  'alt::landmine-press':[{date:'2026-10-03',top:30,reps:10,sets:[{w:30,r:10},{w:30,r:9,t:'amrap'}]}]});
 ctx.set('bodyweight',[{date:'2026-10-01',kg:82}]);
 return ctx;
}

test('every set is a row; older sessions are their top set; sorted by date, exercise, set',async()=>{
 const {app}=await fixture();
 const R=parse(app.csvSetsText());
 assert.deepEqual(R[0],['Date','Exercise','Set','Weight (kg)','Reps','Type','Place']);
 assert.equal(R.length-1,1+4+2,'1 top-set-only + 4 + 2 sets; bodyweight is not a set');
 assert.deepEqual(R[1],['2026-09-01','Dumbbell Bench','1','16','10','top set only','Gym']);
 assert.deepEqual(R[2],['2026-10-03','landmine press','1','30','10','working','Gym']);
 assert.deepEqual(R[3],['2026-10-03','landmine press','2','30','9','failure','Gym']);
 assert.deepEqual(R.slice(4).map(r=>[r[2],r[3],r[4],r[5],r[6]]),
  [['1','12','10','warm-up','Home'],['2','22','12','working','Home'],['3','22','','working','Home'],['4','18','12','drop set','Home']]);
});

test('the per-session CSV is unchanged: one row per session plus body weight',async()=>{
 const {app}=await fixture();
 const R=parse(app.csvText());
 assert.deepEqual(R[0],['Date','Exercise','Top weight (kg)','Reps at top weight','Place','Note']);
 assert.equal(R.length-1,3+1);
});

test('no history: nothing to export',async()=>{
 const {app,set}=await load();
 set('hist',{});
 assert.equal(app.csvSetsText(),null);
 app.exportSetsCSV();                                       /* says so instead of downloading */
});
