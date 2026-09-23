/* ============ COACH ============
   Double progression, the plan's own rule: stay at a weight until every
   planned set hits its target reps, then add one jump. Read from the last
   history entry for the slot's key, so it follows the exercise across days.
   Entries from before 2026-09-23 have no `sets`, only the top set, so for
   those "hit" means the top set reached the highest target. */

/* Weight jump per exercise. Dumbbells go up a pair at a time (2kg),
   pin-loaded machines a plate on the stack (5kg), barbells, cables and
   plate-loaded kit 2.5kg. 0 = bodyweight or assisted: reps-only coaching.
   Overridden per history key from the chart sheet, stored in gt4_incs. */
const INC_DB=['dbbench','incline','decline','dbfly','dbshoulder','lateral','frontraise','dbrow','pullover',
 'goblet','lunge','bulgarian','dbrdl','hammer','dbcurl','concentration','ohext'];
const INC_MACHINE=['mchest','pecdeck','mshoulder','latpulldown','cablerow','legpress','legcurl','legext','calf'];
const INC_NONE=['pushup','pullup','dips'];
let incs={};
function incDefault(k){
 const id=LIB[k]?k:null, nm=(id?LIB[id].n:String(k).replace(/^alt::/,'').replace(/-/g,' ')).toLowerCase();
 if(id&&INC_NONE.indexOf(id)>=0) return 0;
 if(id&&INC_DB.indexOf(id)>=0) return 2;
 if(id&&INC_MACHINE.indexOf(id)>=0) return 5;
 if(/push.?ups?|pull.?ups?|chin.?ups?|\bdips?\b|bodyweight/.test(nm)) return 0;
 if(/dumbbell|\bdb\b|goblet/.test(nm)) return 2;
 if(/machine|pec deck|leg press|hack squat/.test(nm)) return 5;
 return 2.5; }
function incFor(k){ const v=incs[k]; return (typeof v==='number'&&v>=0)?v:incDefault(k); }
async function setInc(k,v){ const n=parseFloat(v);
 if(isNaN(n)||n<0||n>50||n===incDefault(k)) delete incs[k]; else incs[k]=n;
 await Store.set('gt4_incs',incs); }

/* An entry's working sets: the full list when it has one, else its top set. */
function workSets(e){
 if(e&&Array.isArray(e.sets)&&e.sets.length) return e.sets.filter(s=>s.t!=='warm');
 return (e&&e.top!=null)?[{w:e.top,r:e.reps||null}]:[]; }
/* Best set of an entry for comparing sessions. Relative only (Epley is
   inflated at high reps, but consistently so for one exercise), and plain
   reps for bodyweight work. */
function entryScore(e){ let m=0;
 workSets(e).forEach(s=>{ const v=s.w>0?e1RM(s.w,s.r):(s.r||0); if(v>m) m=v; }); return m; }
/* No session in the last three beat the best before them. Needs four. */
function stalled(k){ const h=hist[k]||[]; if(h.length<4) return false;
 const sc=h.map(entryScore);
 return Math.max.apply(null,sc.slice(-3))<=Math.max.apply(null,sc.slice(0,-3)); }
const r25=w=>Math.round(w*4)/4;
/* What to do next time. it (the plan item) supplies the targets; without one
   the top set's reps are the only bar. Returns null when there's no history.
     up    - every target hit: add a jump
     stay  - same weight, beat last time's reps
     stall - three sessions without beating the old best: drop ~10% and
             build back up to the targets (a reset usually passes the old
             best within a few weeks)
     reps  - bodyweight: every target hit, so add a rep (no weight to add) */
function coach(k,it){
 const h=hist[k]||[]; if(!h.length) return null;
 const last=h[h.length-1], ws=workSets(last); if(!ws.length) return null;
 const inc=incFor(k), targets=it?repsFor(it):null;
 const top=Math.max.apply(null,ws.map(s=>s.w)), atTop=ws.filter(s=>s.w===top), reps=atTop.map(s=>s.r);
 const need=t=>typeof t==='number'?t:0;
 let hit;
 if(Array.isArray(last.sets)&&last.sets.length&&targets)
  hit=atTop.length>=targets.length&&targets.every((t,i)=>(atTop[i].r||0)>=need(t));
 else hit=last.reps!=null&&last.reps>=Math.max.apply(null,(targets||[last.reps]).map(need));
 const base={from:top,reps,targets};
 if(hit) return Object.assign(base,inc>0?{kind:'up',w:r25(top+inc)}:{kind:'reps',w:top});
 if(inc>0&&stalled(k)){
  let w=Math.floor(top*0.9/inc)*inc; if(w>=top) w=top-inc;
  if(w>0) return Object.assign(base,{kind:'stall',w:r25(w)});
 }
 return Object.assign(base,{kind:'stay',w:top});
}
function coachPill(c){
 if(!c) return '';
 const r=c.reps.map(x=>x==null?'?':x).join('·');
 if(c.kind==='up') return '▲ Go '+c.w+'kg';
 if(c.kind==='stall') return 'Stalled · reset to '+c.w+'kg';
 if(c.kind==='reps') return '▲ Add a rep per set';
 return (c.w>0?'Stay '+c.w+'kg · ':'')+'beat '+r;
}
function coachText(c){
 if(!c) return '';
 const last=(c.w>0||c.from>0?c.from+'kg × ':'')+c.reps.map(x=>x==null?'?':x).join(', ');
 const tg=c.targets?c.targets.map(t=>typeof t==='number'?t:'max').join(', '):null;
 if(c.kind==='up') return 'Last time: '+last+' — every target hit. Go up to <b>'+c.w+'kg</b>. Expect fewer reps at first; stay there until every set reaches its target again.';
 if(c.kind==='reps') return 'Last time: '+last+' — every target hit. Aim for one more rep on each set.';
 if(c.kind==='stall') return 'No progress in your last 3 sessions. Drop to <b>'+c.w+'kg</b> and build back up to '+(tg||'your target')+' — a reset like this usually passes the old best within a few weeks. Or swap to an alternative for a while.';
 return 'Last time: '+last+'. Stay at '+(c.w>0?c.w+'kg':'bodyweight')+' and beat those reps'+(tg?' — go up once every set hits '+tg:'')+'.';
}
/* Tap the coach pill: put its weight in every unticked working set. */
function applyCoach(d,it,w){
 repsFor(it).forEach((_,i)=>{ const y=slot(d.id,it.ex,i); if(!y.done&&y.t!=='warm') y.w=String(w); });
 queueSave(); flush(); render(); }

/* Rep records: the heaviest weight lifted for at least N reps, from every
   working set on record. More honest than an estimated 1RM at 12-20 reps,
   and each bucket is its own PB to chase. */
const REP_BUCKETS=[5,8,10,12,15,20];
function repRecords(k){ const best={};
 (hist[k]||[]).forEach(e=>workSets(e).forEach(s=>{ if(!s.r) return;
  REP_BUCKETS.forEach(n=>{ if(s.r>=n&&(!best[n]||s.w>best[n].w)) best[n]={w:s.w,date:e.date}; }); }));
 return best; }
/* Estimated 1RM is only shown from sets of 10 reps or fewer: past that
   Epley overestimates badly (20kg × 20 reads as a 33kg max). */
function e1RMShown(w,r){ return (r&&r<=10)?Math.round(e1RM(w,r)*10)/10:null; }
