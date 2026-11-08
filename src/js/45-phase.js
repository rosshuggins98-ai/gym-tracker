/* ============ TRAINING PHASE: CUTTING ============
   Ross asked on 2026-11-04. He's dieting in two 8-week blocks with a break
   around Christmas, and keeping intensity while dropping volume: every
   exercise goes to 2 working sets. A cut is a date range in `phases`
   (gt4_phases, in backups): {kind:'cut', start, end, sets, stopped?}.
     start    first day of the cut (may be back-dated, never in the future)
     end      planned last day (start + weeks), only used for "week 2 of 8"
              and the reminder when it's passed
     stopped  the real last day, set by "End cut"; a cut without it is on
     sets     working sets per exercise during it (2)
   The plan itself is never edited. setsOf(it) caps each item's sets while a
   cut is on, and repsFor() goes through it, so the cards, the coach, the
   weekly targets and the finish count all follow; turning the cut off
   brings the full plan back. During a cut the coach doesn't suggest a
   stall reset (holding a weight is the goal), and Progress and the monthly
   review say so instead of listing held lifts as stuck. */
const CUT_SETS=2, CUT_WEEKS=8;
let phases=[];
/* The cut in force today, or null. */
function activeCut(){ const td=today(); return phases.find(p=>p.kind==='cut'&&!p.stopped&&p.start<=td)||null; }
/* The cut a date fell in, ended or not. */
function cutOn(date){ return phases.find(p=>p.kind==='cut'&&p.start<=date&&(!p.stopped||date<=p.stopped))||null; }
/* Any cut overlapping [from, to). */
function cutIn(from,to){ return phases.find(p=>p.kind==='cut'&&p.start<to&&(!p.stopped||p.stopped>=from))||null; }
function setsOf(it){ const p=activeCut(); return p?Math.max(1,Math.min(it.sets,p.sets||CUT_SETS)+(it.cutAdd||0)):it.sets; }
/* + Set during a cut (Ross asked, 2026-11-08): one more set for today only.
   it.cutAdd is a today-only flag like it.skip, cleared by endOfSession and
   cleanDays, so the next session starts at the cut's 2 again. The plan's
   own set count is never touched. − Set takes back only what was added. */
const CUT_MAX=6;
function cutAddSet(it){ if(!activeCut()||setsOf(it)>=CUT_MAX) return false; it.cutAdd=(it.cutAdd||0)+1; savePlan(); return true; }
/* An added set arrives prefilled from last time, so only a ticked set, or
   one typed into, keeps it from being taken back. */
function cutLastTouched(dId,it){ const a=cur[dId]&&cur[dId][it.ex], x=a&&a[wuOf(it)+setsOf(it)-1]; return !!(x&&(x.done||x.wt||x.rt)); }
function cutRemoveSet(it,dId){ if(!activeCut()||!(it.cutAdd>0)) return false;
 const wu=wuOf(it), n=setsOf(it); if(cutLastTouched(dId,it)) return false;
 it.cutAdd--; if(!it.cutAdd) delete it.cutAdd;
 const a=cur[dId]&&cur[dId][it.ex]; if(a) a.length=Math.min(a.length,wu+n-1);
 savePlan(); return true; }
async function startCut(start,weeks){ const td=today();
 const s=/^\d{4}-\d{2}-\d{2}$/.test(String(start||''))&&start<=td?start:td, w=Math.max(1,Math.min(26,parseInt(weeks,10)||CUT_WEEKS));
 if(activeCut()) return null;
 const p={kind:'cut',start:s,end:addDays(s,w*7-1),sets:CUT_SETS};
 phases.push(p); phases.sort((a,b)=>a.start<b.start?-1:1);
 await Store.set('gt4_phases',phases); return p; }
/* Ends the cut today. One ended the day it started was a mistake, so it goes. */
async function endCut(){ const p=activeCut(); if(!p) return false; const td=today();
 if(p.start===td) phases=phases.filter(x=>x!==p); else p.stopped=td;
 await Store.set('gt4_phases',phases); return true; }
/* {n, of}: week n of a planned `of`. */
function cutWeek(p,date){ const d=Math.floor((Date.parse(date||today())-Date.parse(p.start))/864e5);
 return {n:Math.floor(d/7)+1,of:Math.round((Date.parse(p.end)-Date.parse(p.start))/864e5/7)}; }

/* The line under "Training at" on the workout screen while a cut is on. */
function cutBar(){ const p=activeCut(); if(!p) return null; const W=cutWeek(p), over=today()>p.end;
 const c=document.createElement('div'); c.className='cutbar'+(over?' over':'');
 c.innerHTML='<b>Cutting</b> · '+(over?'planned to end '+shortDate(p.end):'week '+W.n+' of '+W.of)+' · '+(p.sets||CUT_SETS)+' sets per exercise'+
  (over?'<button class="ck-ok">End cut</button>':'');
 const b=c.querySelector('button'); if(b) b.addEventListener('click',async()=>{ await endCut(); render(); });
 return c; }

/* The block at the top of the plan editor. */
function cutEditBlock(){ const p=activeCut(), box=document.createElement('div'); box.className='cutedit';
 if(p){ const W=cutWeek(p);
  box.innerHTML='<b>Cutting since '+shortDate(p.start)+'</b><small>Week '+W.n+' of '+W.of+', planned to end '+shortDate(p.end)+
   '. Every exercise is '+(p.sets||CUT_SETS)+' sets. Your plan below is unchanged and comes back when the cut ends.</small>'+
   '<button class="dbtn" id="cutEnd">End cut today</button>';
  box.querySelector('#cutEnd').addEventListener('click',async()=>{ await endCut(); drawEdit(); });
 } else {
  box.innerHTML='<b>Dieting?</b><small>A cut drops every exercise to '+CUT_SETS+' sets without changing your plan. Holding your weights counts as a win while it\'s on.</small>'+
   '<div class="cutrow"><label>From<input type="date" id="cutStart" value="'+today()+'" max="'+today()+'"></label>'+
   '<label>Weeks<input inputmode="numeric" id="cutWeeks" value="'+CUT_WEEKS+'"></label></div>'+
   '<button class="dbtn" id="cutGo">Start a cut</button>';
  box.querySelector('#cutGo').addEventListener('click',async()=>{
   await startCut(box.querySelector('#cutStart').value,box.querySelector('#cutWeeks').value); drawEdit(); });
 }
 return box; }
