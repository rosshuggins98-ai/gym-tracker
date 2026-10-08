/* ============ COACH ============
   Double progression over a rep range (it.reps = top, loFor(it) = bottom),
   "top set + floor" variant, agreed 2026-10-07 because the user's reps fall
   off across sets (13, 10, 5): stay at a weight until the first set at it
   reaches the top of the range AND no set drops below the bottom, then add
   one jump. Read from the last history entry for the slot's key, so it
   follows the exercise across days. Entries from before 2026-09-23 have no
   `sets`, only the top set, so for those "hit" means the top set reached the
   top of the range. Every call carries a `why` for anything but a hit, so
   "stay" is never a mystery. */

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
/* No session in the last three beat the best before them. Needs four. Not a
   stall while the weight is climbing back by at least a jump across those
   three -- that's a reset already under way (lat pulldown: 55 -> 40, 45, 50). */
function stalled(k,hh){ const h=hh||hist[k]||[]; if(h.length<4) return false;
 const win=h.slice(-3), inc=incFor(k);
 if(inc>0&&win[2].top-win[0].top>=inc) return false;
 const sc=h.map(entryScore);
 return Math.max.apply(null,sc.slice(-3))<=Math.max.apply(null,sc.slice(0,-3)); }
const r25=w=>Math.round(w*4)/4;
/* The sets the coach judges in a per-set entry. Leading sets more than 10%
   lighter than the top weight are a ramp-up -- warm-ups whether or not they
   were marked (leg press 100, then 160 x 2). warm counts flagged + ramp.
   null for an entry that only has its top set. */
function judged(e){
 if(!(e&&Array.isArray(e.sets)&&e.sets.length)) return null;
 const flagged=e.sets.filter(s=>s.t==='warm').length, ws=e.sets.filter(s=>s.t!=='warm');
 if(!ws.length) return null;
 const top=Math.max.apply(null,ws.map(s=>s.w));
 let ramp=0; while(top>0&&ramp<ws.length-1&&ws[ramp].w<top*0.9) ramp++;
 return {top,sets:ws.slice(ramp),warm:flagged+ramp,logged:e.sets.length};
}
/* Working sets to expect at the top weight. A warm-up logged in one of the
   planned rows (set 1 marked warm-up) uses up a planned set; one logged in an
   extra row (a warm-up row, wu, or "+ Set" then marked) doesn't. */
function setsNeeded(P,J,wu){ const W=Math.max(0,J.warm-wu), L=Math.max(0,J.logged-wu);
 return Math.max(1,P-Math.max(0,W-Math.max(0,L-P))); }
/* First set at the entry's top weight: {top, r}. */
function firstAtTop(e){ const J=judged(e);
 if(J){ const s=J.sets.filter(x=>x.w===J.top)[0]; return {top:J.top,r:s?(s.r||0):0}; }
 return (e&&e.top!=null)?{top:e.top,r:e.reps||0}:null; }
/* What to do next time. it (the plan item) supplies the range; without one
   (an exercise that isn't planned) there's nothing to judge, so "stay".
   Returns null when there's no history.
     up    - top of the range reached, floor held: add a jump
     stay  - same weight; why says what's missing
     down  - two sessions running below the floor at this weight: go back
             to the weight before (one session under is normal after a jump)
     stall - three sessions without beating the old best: drop ~10% and
             build back up (a reset usually passes the old best within weeks)
     reps  - bodyweight: range topped out, so add a rep (no weight to add) */
/* Reads the sessions at the current place (gym 22 and home 22.5 are
   different dumbbells, not progress), or every session when the lift has
   never been done here -- then the weight is moved onto the nearest one
   this place's rack is known to have, for dumbbell lifts. */
function coach(k,it){
 const all=hist[k]||[]; if(!all.length) return null;
 const here=all.filter(e=>placeOf(e)===PLACE), c=coachOn(k,it,here.length?here:all);
 if(!c||here.length||incDefault(k)!==2||!(c.w>0)) return c;
 const w=snapW(rackAt(PLACE),c.w,c.kind==='up'?1:c.kind==='stay'?0:-1,c.from);
 if(w===c.w) return c;
 return Object.assign(c,{w,why:(c.why?c.why+' ':'')+'First time at '+PLACES[PLACE].toLowerCase()+' — '+w+'kg is the nearest weight you\'ve used there.'}); }
function coachOn(k,it,h){
 const last=h[h.length-1], ws=workSets(last); if(!ws.length) return null;
 const inc=incFor(k), targets=it?repsFor(it):null;
 const J=judged(last), top=J?J.top:Math.max.apply(null,ws.map(s=>s.w));
 const atTop=(J?J.sets:ws).filter(s=>s.w===top), reps=atTop.map(s=>s.r);
 const base={from:top,reps,targets};
 const stay=why=>Object.assign(base,{kind:'stay',w:top,why});
 if(!targets) return stay('');
 const hi=topRep(it), lo=loFor(it);
 if(!hi) return stay('');   /* all sets "max": beat last time */
 base.lo=lo; base.hi=hi;
 let hit=false, why='';
 if(J){
  const need=Math.min(targets.length,setsNeeded(targets.length,J,wuOf(it))), use=atTop.slice(0,need);
  const first=use.length?(use[0].r||0):0, low=use.filter(s=>(s.r||0)<lo);
  if(use.length<need){
   const lighter=J.sets.filter(s=>s.w<top)[0];
   why='Only '+use.length+' of '+need+' sets at '+top+'kg'+(lighter?' (one was '+lighter.w+'kg)':'')+' — '+(need===2?'both':'all '+need)+' need to be at '+top+'kg.';
   if(J.sets[0].w<top) why+=' If that lighter set was a warm-up, tap its number to mark it.';
  }
  else if(first<hi) why='First set: '+first+' reps. Go up when it reaches '+hi+(low.length?', with every set at '+lo+'+':'')+'.';
  else if(low.length) why='A set dropped to '+low[0].r+' — every set needs '+lo+'+ before going up.';
  else hit=true;
 } else {
  const r=last.reps||0;
  if(r>=hi) hit=true; else why='Top set: '+(r||'?')+' reps. Go up when it reaches '+hi+'.';
 }
 if(hit) return Object.assign(base,inc>0?{kind:'up',w:r25(top+inc)}:{kind:'reps',w:top});
 if(inc>0){
  const f=firstAtTop(last);
  if(f&&f.r<lo){
   const p=h.length>1?firstAtTop(h[h.length-2]):null;
   if(p&&p.top===top&&p.r<lo){
    /* back to the weight before this one, else one jump down */
    const before=h.slice(0,-1).map(e=>e.top).filter(w=>w<top).pop();
    const w=before!=null?before:r25(top-inc);
    if(w>0) return Object.assign(base,{kind:'down',w,why:'Under '+lo+' reps at '+top+'kg two sessions running — go back to '+w+'kg and build up to '+hi+'.'});
   }
   why='Under the '+lo+'-rep floor — normal straight after a jump. Stay and build up; if it\'s still under '+lo+' next time, drop back.';
  }
  if(stalled(k,h)){
   let w=Math.floor(top*0.9/inc)*inc; if(w>=top) w=top-inc;
   if(w>0) return Object.assign(base,{kind:'stall',w:r25(w),why:'No progress in your last 3 sessions.'});
  }
 }
 return stay(why);
}
function coachPill(c){
 if(!c) return '';
 const r=c.reps.map(x=>x==null?'?':x).join('·');
 if(c.kind==='up') return '▲ Go '+c.w+'kg';
 if(c.kind==='down') return '▼ Back to '+c.w+'kg';
 if(c.kind==='stall') return 'Stalled · reset to '+c.w+'kg';
 if(c.kind==='reps') return '▲ Add a rep per set';
 return (c.w>0?'Stay '+c.w+'kg · ':'')+'beat '+r;
}
function coachText(c){
 if(!c) return '';
 const last=(c.w>0||c.from>0?c.from+'kg × ':'')+c.reps.map(x=>x==null?'?':x).join(', ');
 const rg=c.hi?(c.lo&&c.lo<c.hi?c.lo+'–'+c.hi:String(c.hi)):null;
 if(c.kind==='up') return 'Last time: '+last+' — top of the range reached. Go up to <b>'+c.w+'kg</b>. Expect fewer reps at first; that\'s the bottom of the range, and you build back up from there.';
 if(c.kind==='reps') return 'Last time: '+last+' — top of the range reached. Aim for one more rep on each set.';
 if(c.kind==='down') return 'Last time: '+last+'. '+c.why;
 if(c.kind==='stall') return 'No progress in your last 3 sessions. Drop to <b>'+c.w+'kg</b> and build back up'+(rg?' through '+rg+' reps':'')+' — a reset like this usually passes the old best within a few weeks. Or swap to an alternative for a while.';
 return 'Last time: '+last+'. Stay at '+(c.w>0?c.w+'kg':'bodyweight')+(c.why?'. '+c.why:' and beat those reps.');
}
/* Tap the coach pill: put its weight in every unticked working set. */
function applyCoach(d,it,w){ const wu=wuOf(it);
 repsFor(it).forEach((_,i)=>{ const y=slot(d.id,it.ex,wu+i); if(!y.done&&y.t!=='warm') y.w=String(w); });
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
