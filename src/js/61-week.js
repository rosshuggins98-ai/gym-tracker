/* ============ WEEK: BALANCE AND CHECK-IN ============
   Working sets per muscle group against what the plan asks for in a week
   (every day done once), instead of kg moved -- kg mostly measures which
   machines are heavy (one leg press session outweighs a week of dumbbell
   bench), which hid that legs were the group being skipped. Drives the
   "Still to do this week" strip, the Monday check-in card on the workout
   screen, and the matching sections in Progress. */
function addDays(iso,n){ const d=new Date(iso); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
function weekday(iso){ return new Date(iso).toLocaleString('en-GB',{weekday:'short',timeZone:'UTC'}); }
/* {dayId: date} for the plan's days finished since Monday. prev[id]._date is
   stamped when a day is finished, so a day done twice shows the later one. */
function daysDoneThisWeek(){ const mon=mondayISO(), out={};
 PLAN.days.forEach(d=>{ const dt=prev[d.id]&&prev[d.id]._date; if(dt&&dt>=mon) out[d.id]=dt; });
 return out; }
/* Next in the rotation: of the days not done this week, the one finished
   longest ago (never finished counts as longest). null once all are done. */
function nextDay(){ const dn=daysDoneThisWeek(); let id=null, at=null;
 PLAN.days.forEach(d=>{ if(dn[d.id]) return; const dt=(prev[d.id]&&prev[d.id]._date)||'';
  if(id===null||dt<at){ id=d.id; at=dt; } });
 return id; }
/* A swap that resolves to a real exercise has its group; an alt:: name falls
   back to the slot's own exercise when there is one. */
function groupFor(k,exId){ return groupOf(k)||(exId&&LIB[exId]?LIB[exId].g:null); }
function plannedByGroup(){ const g={};
 PLAN.days.forEach(d=>d.items.forEach(it=>{ if(it.extra) return;
  const gr=groupFor(hkey(it.ex,swaps[it.ex]||null),it.ex); if(gr) g[gr]=(g[gr]||0)+it.sets; }));
 return g; }
/* Planned sets for a history key, as the fallback count for entries from
   before per-set history. */
function plannedSetsFor(k){ let n=0;
 PLAN.days.forEach(d=>d.items.forEach(it=>{ if(!n&&hkey(it.ex,swaps[it.ex]||null)===k) n=it.sets; }));
 return n||3; }
/* Working sets per group logged in [from, to), plus the live session(s) when
   live is set. */
function setsByGroup(from,to,live){ const g={};
 Object.keys(hist).forEach(k=>{ const gr=groupOf(k); if(!gr) return;
  (hist[k]||[]).forEach(e=>{ if(e.date<from||e.date>=to) return;
   const n=Array.isArray(e.sets)&&e.sets.length?e.sets.filter(s=>s.t!=='warm').length:plannedSetsFor(k);
   g[gr]=(g[gr]||0)+n; }); });
 if(live) liveDays().forEach(id=>Object.keys(cur[id]||{}).forEach(exId=>{
  const gr=groupFor(hkey(exId,swaps[exId]||null),exId); if(!gr) return;
  const n=(cur[id][exId]||[]).filter(x=>x&&x.done&&x.t!=='warm').length; if(n) g[gr]=(g[gr]||0)+n; }));
 return g; }
/* [{g, done, planned}] for every group the plan trains, least-covered first. */
function weekBalance(from,to,live){ const p=plannedByGroup(), s=setsByGroup(from,to,live);
 return Object.keys(p).map(g=>({g,done:s[g]||0,planned:p[g]}))
  .sort((a,b)=>a.done/a.planned-b.done/b.planned||b.planned-a.planned); }
/* Planned exercises not logged for minDays or more (or never), longest first. */
function neglected(minDays){ const out=[], seen={}, td=today();
 PLAN.days.forEach(d=>d.items.forEach(it=>{ if(it.extra) return;
  const k=hkey(it.ex,swaps[it.ex]||null); if(seen[k]) return; seen[k]=1;
  const h=hist[k]||[], last=h.length?h[h.length-1].date:null;
  const days=last?Math.floor((new Date(td)-new Date(last))/864e5):null;
  if(days===null||days>=minDays) out.push({k,nm:keyName(k),days}); }));
 return out.sort((a,b)=>(b.days===null?1e9:b.days)-(a.days===null?1e9:a.days)); }
/* The entry's best working set by the coach's score, as {w, r}. */
function bestSet(e){ let b=null, m=-1;
 workSets(e).forEach(s=>{ const v=s.w>0?e1RM(s.w,s.r):(s.r||0); if(v>m){ m=v; b=s; } }); return b; }
function setTxt(s){ return s?(s.w>0?s.w+'kg':'bodyweight')+(s.r?' × '+s.r:''):''; }
/* The lift that improved most in [from, to) over its best before then. */
function bestGain(from,to){ let top=null;
 Object.keys(hist).forEach(k=>{ const h=hist[k]||[];
  const inW=h.filter(e=>e.date>=from&&e.date<to), before=h.filter(e=>e.date<from);
  if(!inW.length||!before.length) return;
  const pick=a=>a.reduce((b,e)=>entryScore(e)>entryScore(b)?e:b);
  const now=pick(inW), was=pick(before), a=entryScore(was), b=entryScore(now);
  if(a>0&&b>a&&(!top||(b-a)/a>top.pct)) top={k,nm:keyName(k),pct:(b-a)/a,now:bestSet(now),was:bestSet(was)}; });
 return top; }
/* Planned exercises the coach currently calls stalled or too heavy. */
function stuckLifts(){ const out=[], seen={};
 PLAN.days.forEach(d=>d.items.forEach(it=>{ const k=hkey(it.ex,swaps[it.ex]||null); if(seen[k]) return; seen[k]=1;
  const c=coach(k,it); if(c&&(c.kind==='stall'||c.kind==='down')) out.push(keyName(k)); }));
 return out; }
/* Everything the check-in shows, for the week before this one. */
function checkin(){ const to=mondayISO(), from=addDays(to,-7);
 const sessions=allSessionDates().filter(x=>x>=from&&x<to).length;
 return {from,sessions,target:WEEKTARGET,balance:weekBalance(from,to,false),
  neglected:neglected(10),stuck:stuckLifts(),gain:bestGain(from,to)}; }
function balanceRows(rows){
 return rows.map(r=>{ const pct=Math.min(100,Math.round(r.done/r.planned*100));
  return '<div class="bal'+(r.done<r.planned/2?' low':'')+'"><span class="nm">'+r.g+'</span>'+
   '<span class="bar"><i style="width:'+pct+'%"></i></span><span class="n">'+r.done+' / '+r.planned+'</span></div>'; }).join(''); }
function checkinBody(C){
 let h='<div class="ck-sub">'+C.sessions+' of '+C.target+' sessions · working sets vs the plan</div>'+balanceRows(C.balance);
 if(C.neglected.length) h+='<div class="ck-line warn">Not done lately: '+C.neglected.slice(0,4).map(n=>n.nm+' ('+(n.days===null?'never':n.days+' days')+')').join(', ')+'</div>';
 if(C.stuck.length) h+='<div class="ck-line warn">Needs a reset: '+C.stuck.join(', ')+' — see its card.</div>';
 if(C.gain) h+='<div class="ck-line good">Best lift: '+C.gain.nm+' '+setTxt(C.gain.now)+' (was '+setTxt(C.gain.was)+', +'+Math.round(C.gain.pct*100)+'%)</div>';
 return h; }
/* Shown on the workout screen until dismissed, once per week. */
let checkinSeen=null;
function checkinCard(){
 const mon=mondayISO();
 if(checkinSeen===mon||!allSessionDates().some(x=>x<mon)) return null;
 const c=document.createElement('div'); c.className='checkin';
 c.innerHTML='<div class="ck-head"><b>Last week</b><button class="ck-ok">Got it</button></div>'+checkinBody(checkin());
 c.querySelector('.ck-ok').addEventListener('click',async()=>{ checkinSeen=mon; await Store.set('gt4_checkin',mon); render(); });
 return c; }
/* "Still to do this week": planned sets left per group, most left first, and
   a nudge when today's session has nothing for the group furthest behind. */
function todoStrip(d){
 if(!allSessionDates().length) return null;
 const mon=mondayISO(), rows=weekBalance(mon,addDays(mon,7),true).filter(r=>r.done<r.planned)
  .sort((a,b)=>(b.planned-b.done)-(a.planned-a.done));
 const c=document.createElement('div'); c.className='todo';
 if(!rows.length){ c.innerHTML='<span class="lbl">This week</span><span class="chip ok">Every planned set done ✓</span>'; return c; }
 const g=rows[0].g, hasG=d.items.some(it=>!it.skip&&groupFor(hkey(it.ex,swaps[it.ex]||null),it.ex)===g);
 c.innerHTML='<span class="lbl">Still to do this week</span>'+rows.map((r,i)=>'<span class="chip'+(i?'':' top')+'">'+r.g+' '+(r.planned-r.done)+'</span>').join('')+
  (hasG?'':'<span class="nudge">Nothing for '+g+' today — add one with + Add an exercise</span>');
 return c; }
