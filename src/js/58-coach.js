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
const INC_DB=['dbbench','dblegcurl','incline','decline','dbfly','dbshoulder','lateral','frontraise','dbrow','pullover',
 'goblet','lunge','bulgarian','dbrdl','hammer','dbcurl','concentration','ohext'];
const INC_MACHINE=['mchest','pecdeck','mshoulder','latpulldown','cablerow','legpress','legcurl','legext','calf'];
const INC_NONE=['pushup','pullup','dips'];
let incs={};
function incDefault(k){
 const id=LIB[k]?k:null, nm=(id?LIB[id].n:String(k).replace(/^alt::/,'').replace(/-/g,' ')).toLowerCase();
 if(id&&INC_NONE.indexOf(id)>=0) return 0;
 if(id&&INC_DB.indexOf(id)>=0) return 2;
 if(id&&INC_MACHINE.indexOf(id)>=0) return 5;
 if(id==='pushdown2') return 2.5;   /* a cable stack like the usual pushdown; "machine" in its name is only a label */
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
/* Sessions rated an off day (59-effort) are left out too, unless that
   leaves nothing. */
function coach(k,it){
 const raw=hist[k]||[]; if(!raw.length) return null;
 const on=raw.filter(e=>!offDay(e)), all=on.length?on:raw;
 const here=all.filter(e=>placeOf(e)===PLACE), c=coachOn(k,it,here.length?here:all);
 if(!c) return c;
 const why=t=>{ c.why=(c.why?c.why+' ':'')+t; };
 if(!here.length&&incDefault(k)===2&&c.w>0){
  const w=snapW(rackAt(PLACE),c.w,c.kind==='up'?1:c.kind==='stay'?0:-1,c.from);
  if(w!==c.w){ c.w=w; why('First time at '+PLACES[PLACE].toLowerCase()+' — '+w+'kg is the nearest weight you\'ve used there.'); } }
 const last=raw[raw.length-1];
 if(on.length&&offDay(last)) why('Last time ('+shortDate(last.date)+') was an off day, so this goes on the session before.');
 return c; }
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
 /* A default 5kg machine jump that's over 5% of the weight (60 -> 65 on a
    pulldown is 8%) is a big step on a light stack: build two reps past the
    top of the range first (2026-10-26). A jump set by hand on the chart page
    (incs) is taken as is -- that's where a 2.5kg add-on gets recorded. */
 if(hit&&J&&inc>0&&incs[k]===undefined&&incDefault(k)>=5&&inc/top>0.05){
  const first=(atTop[0]&&atTop[0].r)||0;
  if(first<hi+2) return stay('Going up '+inc+'kg from '+top+'kg is a '+Math.round(inc/top*100)+'% jump, so build to '+(hi+2)+
   ' reps on the first set first. If the machine has a 2.5kg add-on, set the jump to 2.5kg on this lift\'s chart page.'); }
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
/* Before a workout starts (nothing ticked on the day), every working set
   starts at the coach's target for this session -- "Go 26kg", "Stay 24kg" --
   rather than last time's number (asked for 2026-10-15). Called by render().
   Weights typed by hand (wt), warm-up rows and drop sets keep theirs; once a
   set is ticked the day is left alone and carryWeight takes over. Returns
   how many sets changed. */
function applyTargets(d){ if(ticked(d.id)) return 0; let n=0;
 d.items.forEach(it=>{ if(it.skip) return;
  const co=coach(hkey(it.ex,swaps[it.ex]||null),it); if(!co||co.w==null||isNaN(+co.w)) return;
  const wu=wuOf(it), w=String(co.w);
  repsFor(it).forEach((_,i)=>{ const y=slot(d.id,it.ex,wu+i);
   if(y.done||y.wt||y.t==='warm'||y.t==='drop'||y.w===w) return; y.w=w; n++; }); });
 return n; }
/* Progress since the last jump (2026-10-26): after a weight goes up the
   top-weight chart goes flat while the reps climb. The sessions in a row at
   the current working weight (this place's entries, like the coach), first
   against latest: the first set's reps and the total reps at that weight.
   Null until there are two sessions there. */
function sinceJump(k){ const raw=hist[k]||[], here=raw.filter(e=>placeOf(e)===PLACE), h=here.length?here:raw;
 const at=e=>{ const J=judged(e), ws=J?J.sets:workSets(e); if(!ws.length) return null;
  const top=J?J.top:Math.max.apply(null,ws.map(s=>s.w)), t=ws.filter(s=>s.w===top);
  return {top,first:t[0].r||0,total:t.reduce((n,s)=>n+(s.r||0),0)}; };
 const L=h.length?at(h[h.length-1]):null; if(!L) return null;
 let i=h.length-1; while(i>0){ const p=at(h[i-1]); if(!p||p.top!==L.top) break; i--; }
 if(h.length-i<2) return null; const F=at(h[i]);
 return {w:L.top,from:h[i].date,n:h.length-i,first:[F.first,L.first],total:[F.total,L.total]}; }
function sinceJumpTxt(k){ const s=sinceJump(k); if(!s) return '';
 return 'At '+s.w+'kg since '+shortDate(s.from)+' ('+s.n+' sessions): first set '+s.first[0]+' → '+s.first[1]+' reps, '+
  s.total[0]+' → '+s.total[1]+' in total.'; }
/* After a ticked working set (2026-10-26), a word on the rest bar: a first
   set 2+ reps past the top of its range ("save it for sets 2-3" -- the coach
   moves on the first set reaching the top with every set at the floor, so
   extra reps there don't help and cost the later sets), or 30s more rest when
   a set is 3+ reps down on the one before. */
function setNudge(it,a,ri){ const wu=wuOf(it), x=a&&a[ri]; if(!x||!x.done||x.t==='warm'||ri<wu) return null;
 const r=parseInt(x.r,10); if(isNaN(r)) return null; const hi=topRep(it);
 if(ri===wu&&hi&&r>=hi+2) return {extra:0,msg:'Save some for sets 2 and 3'};
 for(let j=ri-1;j>=wu;j--){ const p=a[j]; if(!p||!p.done||p.t==='warm') continue;
  const pr=parseInt(p.r,10); if(!isNaN(pr)&&pr-r>=3) return {extra:30,msg:'Reps dropped: 30s more rest'}; break; }
 return null; }
/* A warm-up row with no past warm-up (2026-10-26): about 55% of this
   session's target (75%, 85% for further rows), on the lift's own step,
   for 10 reps. Empty when there's no target or last weight to go on. */
function warmSuggest(dId,exId,i){ const d=PLAN.days.find(x=>x.id===dId), it=d&&d.items.find(x=>x.ex===exId); if(!it) return null;
 const k=hkey(exId,swaps[exId]||null), co=coach(k,it);
 const tw=(co&&co.w>0)?co.w:parseFloat(lastW(dId,exId,wuOf(it))); if(!(tw>0)) return null;
 const step=incFor(k)||2.5, share=[0.55,0.75,0.85][i]||0.85, w=Math.max(step,Math.round(tw*share/step)*step);
 return {w:Math.round(w*100)/100,r:10}; }
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
