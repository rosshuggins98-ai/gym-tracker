'use strict';
/* Finer muscle groups (backlog item 5): every library exercise says what it
   trains, custom exercises get a default from their coarse group, swap
   alternates count as the exercise they stand in for, and helpers count as
   half a set. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);

test('every library exercise has muscles: one or more main (1), helpers at .5, known ids',async()=>{
 const {app}=await load(), LIB=app.LIB, MUSCLES=app.MUSCLES;
 for(const id of Object.keys(LIB)){ if(LIB[id].custom) continue;
  const m=LIB[id].m; assert.ok(m&&Object.keys(m).length,id+' has m');
  for(const [mu,w] of Object.entries(m)){
   assert.ok(mu in MUSCLES,id+': '+mu+' is a known muscle');
   assert.ok(w===1||w===0.5,id+': '+mu+' weight is 1 or .5');
  }
  assert.ok(Object.values(m).includes(1),id+' has a main muscle');
 }
 assert.equal(Object.keys(LIB).filter(id=>!LIB[id].custom).length,51,'45, the glute bridge (2026-10-15), machine-2 pushdown and four core exercises (2026-10-26)');
});

test('the coarse groups still match: a Legs exercise trains leg muscles, and so on',async()=>{
 const {app}=await load(), LIB=app.LIB;
 const legs=['quads','hamstrings','glutes','calves'], arms=['biceps','triceps'];
 for(const id of Object.keys(LIB)){ const L=LIB[id]; if(L.custom) continue;
  const main=Object.keys(L.m).filter(k=>L.m[k]===1);
  const ok={Legs:legs,Arms:arms,Chest:['chest'],Back:['back'],Shoulders:['shoulders'],Core:['core']}[L.g];
  assert.ok(main.some(k=>ok.includes(k)),id+' ('+L.g+'): main muscle '+main+' is in its group');
 }
});

test('custom exercises get a default from their group; Other isn\'t counted',async()=>{
 const {app}=await load();
 const legs=await app.addCustom('Sissy Squat','Legs',''), arms=await app.addCustom('Rope Curl','Arms','');
 const oth=await app.addCustom('Farmer Carry','Other','');
 deq(app.musclesFor(legs,null),{quads:.5,hamstrings:.5,glutes:.5});
 deq(app.musclesFor(arms,null),{biceps:.5,triceps:.5});
 assert.equal(app.musclesFor(oth,null),null);
});

test('a swap alternate counts as the slot\'s exercise, else the one that lists it',async()=>{
 const {app}=await load();
 deq(app.musclesFor('alt::cable-fly',null),{chest:1},'Cable Fly is listed under Dumbbell Fly');
 deq(app.musclesFor('alt::cable-fly','legext'),{quads:1},'in a slot, the slot\'s exercise wins');
 assert.equal(app.musclesFor('alt::no-such-thing',null),null);
 deq(app.musclesFor('dbbench',null),{chest:1,triceps:.5,shoulders:.5});
});

test('the Beginner plan\'s rule shows: every day has quads and hamstrings',async()=>{
 const {app,set}=await load();
 set('PLAN',app.BEGINNER_PLAN()); set('swaps',{});
 for(const d of app.PLAN.days){ const g=app.plannedByGroup(d.id);
  assert.ok(g.quads>0,d.name+': quads'); assert.ok(g.hamstrings>0,d.name+': hamstrings'); }
 /* the week as a whole, worked out by hand from docs/TRAINING-PLAN.md */
 const w=app.plannedByGroup();
 assert.equal(w.chest,9,'DB bench 3 + incline 3 + DB bench 3');
 assert.equal(w.hamstrings,7.5,'leg curl 3 + DB RDL 3 + glute bridge 3 at half');
 assert.equal(w.quads,9,'goblet 3 + leg extension 3 + leg extension 3');
 assert.equal(w.glutes,6,'goblet and DB RDL at half, glute bridge 3');
});

test('the still-to-do strip shows four muscles and folds the rest into "+N more"',async()=>{
 const {app,set}=await load();
 set('PLAN',app.BEGINNER_PLAN()); set('swaps',{}); set('cur',{});
 set('hist',{dbbench:[{date:'2026-01-05',top:20,reps:10}]});   /* a session long ago, none this week */
 const html=app.todoStrip(app.PLAN.days[0]).innerHTML;
 const chips=[...html.matchAll(/class="chip( top)?">([^<]+)</g)].map(m=>m[2]);
 assert.equal(chips.length,app.TODO_MAX,'four muscles');
 assert.equal(chips[0],'Triceps 12','most sets left first');
 assert.ok(/class="chip more">\+4 more</.test(html),'8 owed, 4 shown');
});

/* --- Week by week (backlog item 10) --- */
test('muscleWeeks: sets per muscle per week, from the first week trained, this week live',async()=>{
 const {app,set}=await load();
 set('PLAN',{name:'T',days:[{id:'a',name:'A',tag:'',av:'--a1',items:[{ex:'dbbench',sets:3,reps:[10,10,10]},{ex:'legcurl',sets:3,reps:[12,12,12]}]}]});
 set('swaps',{}); set('ACTIVE','a');
 const mon=app.mondayISO(), wk=n=>app.addDays(mon,-7*n);
 set('hist',{dbbench:[{date:app.addDays(wk(3),1),top:20,reps:10,sets:[{w:20,r:10},{w:20,r:10}]},
                      {date:app.addDays(wk(1),2),top:22,reps:10,sets:[{w:10,r:10,t:'warm'},{w:22,r:10},{w:22,r:9},{w:22,r:8}]}],
             calf:[{date:app.addDays(wk(1),2),top:60,reps:15,sets:[{w:60,r:15}]}]});
 set('cur',{a:{dbbench:[{w:'22',r:'10',done:true}]}});
 const W=app.muscleWeeks(12);
 deq(W.weeks,[wk(3),wk(2),wk(1),mon],'starts at the first week trained, not 12 weeks back');
 const row=g=>W.rows.find(r=>r.g===g);
 deq(row('chest').sets,[2,0,3,1],'2 sets, a week off, 3 (warm-up not counted), 1 live today');
 deq(row('triceps').sets,[1,0,1.5,0.5],'helpers at half');
 assert.equal(row('chest').planned,3);
 deq(row('hamstrings').sets,[0,0,0,0],'planned but never trained: still a row');
 assert.equal(row('hamstrings').planned,3);
 deq(row('calves').sets,[0,0,1,0],'trained but not planned: a row, planned 0');
 deq(W.rows.map(r=>r.g),['chest','shoulders','triceps','hamstrings','calves'],'MUSCLES order');
 set('hist',{}); set('cur',{});
 deq(plain(app.muscleWeeks(12)).rows,[],'nothing logged: nothing to show');
});

test('the week-by-week block: a row per muscle, bars, the plan line, this week marked',async()=>{
 const {app,set}=await load();
 set('PLAN',{name:'T',days:[{id:'a',name:'A',tag:'',av:'--a1',items:[{ex:'dbbench',sets:3,reps:[10,10,10]}]}]});
 set('swaps',{}); set('ACTIVE','a'); set('cur',{});
 const mon=app.mondayISO();
 set('hist',{dbbench:[{date:app.addDays(mon,-6),top:20,reps:10,sets:[{w:20,r:10},{w:20,r:10},{w:20,r:10}]}]});
 const h=app.muscleTrendBlock();
 assert.ok(h.indexOf('>Chest<')>0&&h.indexOf('>Triceps<')>0);
 assert.equal((h.match(/class="mref"/g)||[]).length,3,'a plan line per planned muscle');
 assert.ok(/class="hit"/.test(h),'last week met the plan for chest: marked');
 assert.ok(/class="cur/.test(h),'this week marked');
 set('hist',{}); assert.equal(app.muscleTrendBlock(),'');
});

test('display: names, halves, and the still-to-do strip skips half-set remainders',async()=>{
 const {app}=await load();
 assert.equal(app.muscleName('quads'),'Quads');
 assert.equal(app.fmtSets(7.5),'7.5'); assert.equal(app.fmtSets(9),'9'); assert.equal(app.fmtSets(4.26),'4.5');
 const html=app.balanceRows([{g:'triceps',done:1.5,planned:4.5,flag:' <span>⚠</span>'}]);
 assert.ok(html.indexOf('Triceps <span>⚠</span>')>0,'name then flag');
 assert.ok(html.indexOf('1.5 / 4.5')>0);
 deq(app.todoRows([{g:'a',done:0,planned:3},{g:'b',done:1,planned:1.5},{g:'c',done:2,planned:3.5}]).map(r=>r.g),['a','c'],
  'half a set left is not a chip; most left first');
});
