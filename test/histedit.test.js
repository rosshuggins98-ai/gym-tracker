'use strict';
/* Editing individual past sets (backlog item 6). History entries carry every
   ticked set from 2026-09-23 on; top / reps / vol must always be what those
   sets say, whether the entry came from finishing a session or from an edit.
   Written before the code. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);

/* One exercise with a full per-set entry and an old top-set-only entry. */
async function withHist(){
 const ctx=await load();
 ctx.set('hist',{dbbench:[
  {date:'2026-09-01',top:16,reps:10},                                           /* before per-set history */
  {date:'2026-10-06',top:22,reps:12,vol:22*12+22*10+20*9,at:'gym',
   sets:[{w:12,r:10,t:'warm'},{w:22,r:12},{w:22,r:10},{w:20,r:9}]}]});
 return ctx;
}
const E=app=>app.hist.dbbench[1];

test('entryFromSets: working sets only, ties go to more reps, volume is kg x reps',async()=>{
 const {app}=await load();
 deq(app.entryFromSets([{w:20,r:10,t:'warm'},{w:50,r:8},{w:52.5,r:6},{w:52.5,r:7}]),
  {top:52.5,reps:7,vol:50*8+52.5*6+52.5*7});
 deq(app.entryFromSets([{w:40,r:12,t:'drop'},{w:30,r:15,t:'amrap'}]),{top:40,reps:12,vol:40*12+30*15},'AMRAP and drop sets are working sets');
 deq(app.entryFromSets([{w:50,r:null},{w:45,r:10}]),{top:50,reps:null,vol:450},'a set without reps adds no volume');
 deq(app.entryFromSets([{w:0,r:8},{w:0,r:6}]),{top:0,reps:8,vol:0},'bodyweight');
 assert.equal(app.entryFromSets([{w:20,r:10,t:'warm'}]),null,'warm-ups only: no entry');
 assert.equal(app.entryFromSets([]),null);
 assert.equal(app.entryFromSets(undefined),null);
});

test('finishing a session writes exactly what entryFromSets gives for its sets',async()=>{
 const {app,set,tick}=await load();
 set('hist',{});
 set('cur',{push:{bench:[{w:'20',r:'10',t:'warm',done:true},{w:'50',r:'8',done:true},{w:'52.5',r:'6',done:true},{w:'55',r:'',done:false}],
  lateral:[{w:'8',r:'15',done:true},{w:'8',r:'12',done:true,t:'drop'}]}});
 await app.doNewSession(); await tick();
 for(const k of ['bench','lateral']){ const e=app.hist[k][0], f=app.entryFromSets(e.sets);
  deq({top:e.top,reps:e.reps,vol:e.vol},plain(f),k); }
});

test('histEditSet: a changed set rebuilds top, reps and volume; bad input changes nothing',async()=>{
 const {app}=await withHist();
 assert.equal(app.histEditSet('dbbench',1,3,'24','8'),true,'20 x 9 becomes 24 x 8');
 deq(E(app).sets[3],{w:24,r:8});
 assert.equal(E(app).top,24); assert.equal(E(app).reps,8);
 assert.equal(E(app).vol,22*12+22*10+24*8);
 const before=JSON.stringify(plain(E(app)));
 for(const [w,r] of [['abc','8'],['-2','8'],['22','x'],['','8'],['22','-1'],['5000','8']])
  assert.equal(app.histEditSet('dbbench',1,1,w,r),false,'rejected: '+w+' x '+r);
 assert.equal(JSON.stringify(plain(E(app))),before,'nothing changed');
 assert.equal(app.histEditSet('dbbench',1,2,'22',''),true,'blank reps are allowed (not counted)');
 assert.equal(E(app).sets[2].r,null);
 assert.equal(app.histEditSet('dbbench',1,0,'14','10'),true,'editing a warm-up');
 assert.equal(E(app).top,24,'a warm-up never becomes the top set');
 assert.equal(app.histEditSet('dbbench',9,0,'14','10'),false,'no such entry');
 assert.equal(app.histEditSet('dbbench',1,9,'14','10'),false,'no such set');
});

test('histToggleWarm: the top set can become a warm-up; the last working set cannot',async()=>{
 const {app}=await withHist();
 assert.equal(app.histToggleWarm('dbbench',1,1),true);
 assert.equal(E(app).sets[1].t,'warm');
 assert.equal(E(app).top,22); assert.equal(E(app).reps,10,'22 x 12 was a warm-up: 22 x 10 is the top set now');
 assert.equal(E(app).vol,22*10+20*9);
 assert.equal(app.histToggleWarm('dbbench',1,1),true,'and back');
 assert.equal(E(app).sets[1].t,undefined); assert.equal(E(app).reps,12);
 /* make two of the three working sets warm-ups; the third must stay */
 app.histToggleWarm('dbbench',1,2); app.histToggleWarm('dbbench',1,3);
 assert.equal(app.histToggleWarm('dbbench',1,1),false,'last working set');
 assert.equal(E(app).sets[1].t,undefined);
 const s={w:30,r:8,t:'drop'}; E(app).sets.push(s);
 assert.equal(app.histToggleWarm('dbbench',1,4),true,'a drop set can be marked a warm-up');
 assert.equal(E(app).sets[4].t,'warm');
});

test('histDeleteSet: a set rebuilds the entry; the only set deletes the session',async()=>{
 const {app,set}=await withHist();
 assert.equal(app.histDeleteSet('dbbench',1,1),'set','delete 22 x 12');
 assert.equal(E(app).sets.length,3); assert.equal(E(app).reps,10); assert.equal(E(app).vol,22*10+20*9);
 assert.equal(app.histDeleteSet('dbbench',1,0),'set','a warm-up can go');
 app.histDeleteSet('dbbench',1,1);                       /* leaves 22 x 10 alone */
 assert.equal(E(app).sets.length,1);
 assert.equal(app.histDeleteSet('dbbench',1,0),'entry','the only set: the session goes');
 assert.equal(app.hist.dbbench.length,1,'the old entry is untouched');
 /* a session with a warm-up and one working set: the working set can't go alone */
 set('hist',{x:[{date:'2026-10-06',top:20,reps:10,vol:200,sets:[{w:10,r:10,t:'warm'},{w:20,r:10}]}]});
 assert.equal(app.histDeleteSet('x',0,1),false,'last working set with a warm-up left');
 assert.equal(app.hist.x[0].sets.length,2);
 set('hist',{y:[{date:'2026-10-06',top:20,reps:10,vol:200,sets:[{w:20,r:10}]}]});
 assert.equal(app.histDeleteSet('y',0,0),'entry');
 assert.equal(app.hist.y,undefined,'no entries left: the key goes too');
});

test('older entries keep top/reps editing; per-set edits leave them alone',async()=>{
 const {app}=await withHist();
 const old=()=>app.hist.dbbench[0];
 assert.equal(app.histEditSet('dbbench',0,0,'18','10'),false,'no sets to edit');
 assert.equal(app.histToggleWarm('dbbench',0,0),false);
 assert.equal(app.histDeleteSet('dbbench',0,0),false);
 assert.equal(app.histEditTop('dbbench',0,'17','11'),true);
 deq(old(),{date:'2026-09-01',top:17,reps:11});
 assert.equal(app.histEditTop('dbbench',0,'abc','11'),false);
 assert.equal(app.histEditTop('dbbench',0,'17',''),true,'reps can be cleared');
 assert.equal(old().reps,null);
 assert.equal(app.histEditTop('dbbench',1,'30','5'),false,'an entry with sets is edited set by set, not by its top');
 assert.equal(E(app).top,22);
});

test('the session list: per-set sessions open into their sets, older ones keep their inputs',async()=>{
 const {app,set}=await withHist();
 const shut=app.histRows(app.hist.dbbench,'dbbench');
 assert.ok(/class="htop">22kg × 12<small>3 sets ▾/.test(shut),'per-set session: its top set and set count, closed');
 assert.ok(/class="hw"[^>]*value="16"/.test(shut),'older session: top-set inputs');
 assert.ok(shut.indexOf('class="hsets"')<0,'nothing open yet');
 set('histOpen','dbbench|2026-10-06');
 const open=app.histRows(app.hist.dbbench,'dbbench');
 const labels=[...open.matchAll(/class="hsn">([^<]+)</g)].map(m=>m[1]);
 assert.deepEqual(labels,['W','1','2','3'],'warm-up marked W, working sets numbered');
 assert.ok(/class="mini hwu on">Warm-up/.test(open),'the warm-up toggle shows on');
 set('histMsg','A session needs at least one working set.');
 assert.ok(app.histRows(app.hist.dbbench,'dbbench').indexOf('needs at least one working set')>0,'a refusal is explained');
 set('histMsg','');
 app.openChart('dbbench');                                   /* renders with a session open */
 set('hist',{x:[{date:'2026-10-06',top:0,reps:8,vol:0,sets:[{w:0,r:8}]}]});
 assert.ok(app.histRows(app.hist.x,'x').indexOf('bodyweight × 8')>0,'bodyweight sessions read as such');
});

test('an edited history survives a backup and import unchanged',async()=>{
 const {app,ctx,tick}=await withHist();
 app.histEditSet('dbbench',1,3,'24','8'); app.histToggleWarm('dbbench',1,2);
 const want=plain(app.hist);
 const b=app.backup();
 ctx.window.__imp=JSON.parse(JSON.stringify(b)); await app.applyImport(); await tick();
 deq(app.hist,want);
});
