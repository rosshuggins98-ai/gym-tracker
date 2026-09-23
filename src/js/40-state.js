/* ============ STATE ============ */
let PLAN=null, ACTIVE=null, THEME='dark', DIRTY=false;
let cur={}, prev={}, hist={}, swaps={}, warmDone={}, notes={};
let bodyweight=[];   /* [{date, kg}], one per day, sorted */
let sessionStart={}; /* dayId -> ms of the first ticked set, for the summary's duration */
let WEEKTARGET=3;   /* sessions/week; configurable via the weekgoal strip, default matches the plan */

function day(id){ return PLAN.days.filter(d=>d.id===id)[0]||PLAN.days[0]; }
function exName(exId){ return (LIB[exId]&&LIB[exId].n)||exId; }
function slug(t){ return String(t||'').toLowerCase().replace(/[^a-z0-9]+/g,'-'); }
/* Case-insensitive name -> library id, so a named alternate that IS another
   tracked exercise (e.g. Incline swapped to "Bench Press") merges into that
   exercise's own history instead of starting a new one. */
function nameToId(name){ const low=String(name||'').toLowerCase();
 for(const id in LIB){ if(LIB[id].n.toLowerCase()===low) return id; } return null; }
/* History key for a slot. An alternate that matches a real library exercise
   resolves to that exercise's own id (merged history); anything else gets a
   global key by name alone, shared no matter which slot it was swapped into
   — "Machine Chest Press" is the same machine whether it stood in for Bench,
   Incline or Push-ups, so its PB has to be the same number in all three. */
function hkey(exId,alt){ if(!alt) return exId;
 const m=nameToId(alt); if(m&&m!==exId) return m;
 return 'alt::'+slug(alt); }
function vName(exId,alt){ return alt||exName(exId); }
/* Per-exercise persistent notes (machine settings, bench angle, grip width).
   Keyed the same as history -- a swap-in gets its own note too, since "pin 4"
   on the lat pulldown means nothing on assisted pull-ups. */
function noteFor(k){ return notes[k]||''; }
/* Notes are free-typed user input rendered via innerHTML (the card preview),
   unlike exercise names which are pre-sanitized once at creation in
   cleanName() -- escape at render here instead, per CLAUDE.md's own rule for
   anything that skips that path. */
function escHTML(t){ return String(t||'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])); }
/* Rest between sets, per plan item. Older plans and saved routines have no
   .rest, so the historical hard-coded 60s stays the default -- a 5-rep deadlift
   and a lateral raise shouldn't share a timer, but nothing existing changes. */
const REST_DEFAULT=60;
function restFor(it){ const r=parseInt(it&&it.rest,10); return (r>0)?r:REST_DEFAULT; }
function fmtRest(sec){ return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0'); }
/* Supersets: it.super on a plan item pairs it with the NEXT item in the day
   (A1, B1, A2, B2 ...). Rest is taken after the second exercise's set only;
   after the first, the rest bar just points at the partner. A chain (A.super
   and B.super) is one long round: rest after the final exercise. The flag
   lives on the plan item, so routines and presets carry it; a trailing
   .super with nothing after it is ignored rather than cleaned up. */
function ssRole(d,idx){
 const it=d.items[idx]; if(!it) return null;
 if(it.super&&d.items[idx+1]) return 'first';
 const p=d.items[idx-1]; if(p&&p.super) return 'second';
 return null;
}
function ssPartner(d,idx){ const r=ssRole(d,idx); return r==='first'?d.items[idx+1]:r==='second'?d.items[idx-1]:null; }
function restAfter(d,idx){ return ssRole(d,idx)==='first'?0:restFor(d.items[idx]); }
function repsFor(it){ const r=(it.reps||[]).slice(0,it.sets); while(r.length<it.sets) r.push(r.length?r[r.length-1]:10); return r; }
function setCount(d){ return d.items.reduce((s,it)=>s+(it.skip?0:it.sets),0); }
function addSet(it){ const r=repsFor(it); r.push(r.length?r[r.length-1]:10); it.reps=r; it.sets=r.length; savePlan(); }
function lastSetUsed(dId,exId,n){ const a=cur[dId]&&cur[dId][exId]; const x=a&&a[n-1]; return !!(x&&(x.w||x.r||x.done)); }
function removeSet(it,dId){ if(it.sets<=1) return false;
 if(lastSetUsed(dId,it.ex,it.sets)) return false;
 const r=repsFor(it); r.pop(); it.reps=r; it.sets=r.length;
 const a=cur[dId]&&cur[dId][it.ex]; if(a) a.length=Math.min(a.length,r.length);
 savePlan(); return true; }
function slot(dId,exId,i){ if(!cur[dId])cur[dId]={}; if(!cur[dId][exId])cur[dId][exId]=[];
 if(!cur[dId][exId][i]){
  /* Pre-fill from last session's same set so a matched set is one tap on the
     tick and nothing else. Only happens once, at creation -- never overwrites
     something already typed, since the slot object is reused after this. */
  const lw=lastW(dId,exId,i), lr=lastR(dId,exId,i);
  cur[dId][exId][i]={w:lw!==null?String(lw):'',r:lr!==null?String(lr):'',done:false};
 }
 return cur[dId][exId][i]; }
/* Set type cycle, tapped via the set-number badge: work (default/undefined) ->
   warm-up -> failure/AMRAP -> drop -> back to work. */
function nextSetType(t){ return t==='drop'?undefined:t==='amrap'?'drop':t==='warm'?'amrap':'warm'; }
function typeLabel(t){ return t==='warm'?'warm-up':t==='amrap'?'failure':t==='drop'?'drop set':''; }
let custom={};       /* user-created exercises, merged into LIB at boot */
function cleanName(t){ return String(t||'').replace(/[<>&"'`]/g,'').replace(/\s+/g,' ').trim().slice(0,40); }
function newExId(name){
 let base='c_'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24);
 if(!base||base==='c_') base='c_exercise';
 let id=base,n=2; while(LIB[id]){ id=base+'-'+n; n++; }
 return id;
}
async function addCustom(name,group,alts){
 const nm=cleanName(name); if(!nm) return null;
 const id=newExId(nm);
 const rec={n:nm,g:group||'Other',
  alts:(alts||'').split(',').map(cleanName).filter(Boolean).slice(0,4),
  c:['Your own exercise — add weight only when form holds for every rep.'],custom:true};
 custom[id]=rec; LIB[id]=rec;
 await Store.set('gt4_custom',custom);
 return id;
}
async function deleteCustom(id){
 if(!custom[id]) return;
 PLAN.days.forEach(d=>{ d.items=d.items.filter(it=>it.ex!==id); });
 delete custom[id]; delete LIB[id];
 await Store.set('gt4_custom',custom); savePlan();
}

let legacyLast={};   /* exId -> [weights] recovered from older versions */
let legacyFound=0;
/* "Last time" for a set. prev is keyed by day id, so an exercise that has
   just moved to a different day (plan edit, preset switch) has no prev there
   even though the numbers exist. Fallback order:
     1. this day's last finished session (per set, weight + reps)
     2. the same exercise on any other day's last session (per set) -- most
        recent day wins, by the date stamped when the session was finished
     3. the top set from history (weight only: reps at the top weight aren't
        a sensible prefill for a 12-rep first set, so the tick still uses the
        plan's target reps)
     4. weights recovered from pre-v4 builds
   Weight and reps consult the same source so a set never mixes two sessions. */
function lastSrc(dId,exId){
 const p=prev[dId]&&prev[dId][exId]; if(Array.isArray(p)&&p.some(x=>x&&x.w)) return {sets:p};
 let best=null;
 Object.keys(prev).forEach(od=>{ if(od===dId) return; const a=prev[od]&&prev[od][exId], dt=(prev[od]&&prev[od]._date)||'';
  if(Array.isArray(a)&&a.some(x=>x&&x.w)&&(!best||dt>best.dt)) best={sets:a,dt}; });
 if(best) return {sets:best.sets};
 const h=hist[hkey(exId,swaps[exId]||null)];
 if(h&&h.length) return {top:h[h.length-1].top};
 return null;
}
function lastW(dId,exId,i){ const s=lastSrc(dId,exId);
 if(s&&s.sets) return (s.sets[i]&&s.sets[i].w)?s.sets[i].w:null;
 if(s&&s.top!==undefined) return s.top;
 const L=legacyLast[exId]; return (L&&L[i])?L[i]:null; }
function lastR(dId,exId,i){ const s=lastSrc(dId,exId);
 return (s&&s.sets&&s.sets[i]&&s.sets[i].r)?s.sets[i].r:null; }
/* Set types: undefined/'work' (default), 'warm', 'amrap', 'drop'. Warmups are
   real reps on the screen but must never count toward a top set, a PB, or (once
   volume is tracked) volume -- a light warmup logged in the weight box must not
   look like today's working weight. AMRAP/drop sets are working sets and count
   normally; a drop set is lighter by definition so it naturally never wins the
   max() below anyway. */
/* Only ticked sets are real. Unticked slots still hold last session's
   prefill (or a weight typed ahead), and counting them re-logged old numbers
   for exercises that were never done today. */
function topOf(a){ let m=null; if(a)a.forEach(s=>{ if(!s||!s.done||s.t==='warm')return;
 const v=parseFloat(s&&s.w); if(!isNaN(v)&&(m===null||v>m))m=v;}); return m; }
function bestOf(k){ let m=null; (hist[k]||[]).forEach(h=>{ if(m===null||h.top>m)m=h.top; }); return m; }
function topWithReps(dId,exId){
 const a=cur[dId]&&cur[dId][exId]; if(!a) return null;
 let best=null;
 a.forEach(x=>{ if(!x||!x.done||x.t==='warm')return; const w=parseFloat(x.w); if(isNaN(w)) return;
  const r=parseInt(x.r,10)||null;
  if(!best||w>best.top||(w===best.top&&(r||0)>(best.reps||0))) best={top:w,reps:r}; });
 return best;
}
/* The ticked sets as numbers, for history: {w, r} plus t for anything but a
   plain working set. Warm-ups are kept (it's a record of what was done) and
   every reader skips them. */
function doneSets(a){ const out=[];
 (a||[]).forEach(x=>{ if(!x||!x.done) return; const w=parseFloat(x.w), r=parseInt(x.r,10);
  if(isNaN(w)&&isNaN(r)) return;
  const s={w:isNaN(w)?0:w,r:isNaN(r)?null:r}; if(x.t) s.t=x.t; out.push(s); });
 return out; }
/* Full PB picture for a history key: heaviest weight, best reps at that weight, best reps ever */
function pbOf(k){
 const h=hist[k]||[]; if(!h.length) return null;
 let bw=null,brAtBw=null,br=null;
 h.forEach(e=>{ if(bw===null||e.top>bw){ bw=e.top; brAtBw=e.reps||null; }
  else if(e.top===bw&&e.reps&&(!brAtBw||e.reps>brAtBw)) brAtBw=e.reps;
  if(e.reps&&(br===null||e.reps>br)) br=e.reps; });
 return {w:bw,reps:brAtBw,bestReps:br,sessions:h.length};
}
/* Is today's effort a PB? Heavier, or same weight for more reps. */
function pbCheck(dId,exId,k){
 const t=topWithReps(dId,exId); if(!t) return null;
 const b=pbOf(k);
 if(!b) return {kind:'first'};
 if(t.top>b.w) return {kind:'weight'};
 if(t.top===b.w&&t.reps&&b.reps&&t.reps>b.reps) return {kind:'reps'};
 /* Lighter than the all-time best, but the heaviest yet for this many reps
    -- only once there's an earlier set at that rep count to beat. */
 const n=t.reps?REP_BUCKETS.filter(x=>x<=t.reps).pop():null, rr=n?repRecords(k)[n]:null;
 if(rr&&t.top>rr.w) return {kind:'range',n};
 return null;
}
/* Every variant of an exercise (itself + its alternates), keyed and named,
   so a swap can still show you what to beat. */
function variantMap(exId){
 const m={}; m[exId]=exName(exId);
 ((LIB[exId]&&LIB[exId].alts)||[]).forEach(a=>{ const k=hkey(exId,a);
  if(!(k in m)) m[k]=LIB[k]?LIB[k].n:a; });
 return m;
}
function curTop(dId,exId){ return topOf(cur[dId]&&cur[dId][exId]); }
function shortDate(iso){ const d=new Date(iso); return d.getDate()+' '+d.toLocaleString('en-GB',{month:'short'}); }
function today(){ return new Date().toISOString().slice(0,10); }
function weekNo(){ if(!PLAN.startedISO)return 1;
 const ms=new Date(today())-new Date(PLAN.startedISO); return Math.max(1,Math.floor(ms/6048e5)+1); }
function mondayISO(){ const d=new Date(); const dow=(d.getDay()+6)%7; d.setDate(d.getDate()-dow);
 return d.toISOString().slice(0,10); }
function workoutsThisWeek(){
 const mon=mondayISO(), ds={};
 Object.values(hist).forEach(a=>(a||[]).forEach(e=>{ if(e.date>=mon) ds[e.date]=1; }));
 /* count today's live session too once anything is logged */
 const d=day(ACTIVE);
 if(d&&cur[d.id]&&Object.values(cur[d.id]).some(a=>(a||[]).some(x=>x&&(x.w||x.done)))) ds[today()]=1;
 return Object.keys(ds).length;
}

function markSaved(){ const t=document.getElementById('savedTag'); t.classList.add('show');
 clearTimeout(markSaved._t); markSaved._t=setTimeout(()=>t.classList.remove('show'),1100); }
let st=null;
function queueSave(){ DIRTY=true; clearTimeout(st); st=setTimeout(async()=>{ if(await Store.set('gt4_cur',cur)){DIRTY=false;markSaved();} mirrorHash(); },300); }
function flush(){ if(DIRTY){ Store.set('gt4_cur',cur); DIRTY=false; } mirrorHash(); }
function stateBlob(){ return {v:4,a:ACTIVE,t:THEME,c:cur,p:prev,s:swaps,h:hist,w:warmDone,pl:PLAN}; }
function mirrorHash(){ if(Store.mode()!=='none')return;
 try{ const d='gt='+encodeURIComponent(JSON.stringify(stateBlob()));
  if(history&&history.replaceState)history.replaceState(null,'','#'+d); else location.hash=d; }catch(e){} }
function readHash(){ try{ const h=location.hash||'',i=h.indexOf('gt=');
 return i<0?null:JSON.parse(decodeURIComponent(h.slice(i+3))); }catch(e){ return null; } }
window.addEventListener('pagehide',flush); window.addEventListener('blur',flush);
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden')flush(); });
window.addEventListener('beforeunload',function(e){
 /* only block when the data would genuinely be lost: unsaved edits, or no working storage */
 if(!DIRTY&&Store.mode()!=='none') return;
 let live=false;
 Object.values(cur).forEach(d=>Object.values(d||{}).forEach(a=>(a||[]).forEach(s=>{ if(s&&(s.w||s.done))live=true; })));
 if(live){ flush(); e.preventDefault(); e.returnValue=''; return ''; } });

const I={tick:'<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>',
 chart:'<svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M8 15l3-4 3 3 4-6"/></svg>',
 swap:'<svg viewBox="0 0 24 24"><path d="M7 4L4 7l3 3M4 7h11a4 4 0 014 4M17 20l3-3-3-3M20 17H9a4 4 0 01-4-4"/></svg>',
 info:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></svg>',
 edit:'<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/></svg>',
 sun:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
 moon:'<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>',
 db:'<svg viewBox="0 0 24 24"><path d="M12 3v11M8 10l4 4 4-4M5 21h14"/></svg>',
 plate:'<svg viewBox="0 0 24 24"><path d="M2 12h20M5 7v10M8 9v6M16 9v6M19 7v10"/></svg>',
 up:'<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
 dn:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg>'};

