/* ============ PROGRESS ============ */
function allSessionDates(){
 const d={}; Object.values(hist).forEach(a=>(a||[]).forEach(e=>{ if(e.date)d[e.date]=1; }));
 return Object.keys(d).sort();
}
function weekStrip(){
 const names=['M','T','W','T','F','S','S'], mon=new Date(mondayISO());
 const set={}; allSessionDates().forEach(x=>set[x]=1);
 const td=today(); let h='';
 for(let i=0;i<7;i++){ const dd=new Date(mon); dd.setDate(mon.getDate()+i);
  const iso=dd.toISOString().slice(0,10);
  h+='<div class="'+(set[iso]?'hit ':'')+(iso===td?'today':'')+'">'+names[i]+'</div>'; }
 return '<div class="wk">'+h+'</div>';
}
function weekStreak(){
 const ds=allSessionDates(); if(!ds.length) return 0;
 const weeks={}; ds.forEach(x=>{ const d=new Date(x); const dow=(d.getDay()+6)%7;
  d.setDate(d.getDate()-dow); weeks[d.toISOString().slice(0,10)]=1; });
 let n=0, cur=new Date(mondayISO());
 while(weeks[cur.toISOString().slice(0,10)]){ n++; cur.setDate(cur.getDate()-7); }
 return n;
}
/* --- Volume, 1RM estimate, trend --------------------------------------- */
function setVol(x){ if(!x||!x.done||x.t==='warm') return 0;
 const w=parseFloat(x.w), r=parseInt(x.r,10); return (!isNaN(w)&&!isNaN(r))?w*r:0; }
function exVolume(a){ return (a||[]).reduce((s,x)=>s+setVol(x),0); }
/* Volume from every in-progress (unfinished) session across all days -- not
   just the active tab, in case a day was switched away from mid-workout. */
function liveVolume(){
 return Object.values(cur).reduce((s,dayObj)=>
  s+Object.values(dayObj||{}).reduce((s2,a)=>s2+exVolume(a),0),0);
}
/* A key merged into a real library exercise (no swap, or swapped to a name
   that matched one) resolves to a muscle group; a synthetic alt:: key has no
   group of its own -- it was never a tracked exercise, just a name. */
function groupOf(k){ return (k.indexOf('::')<0&&LIB[k])?LIB[k].g:null; }
function weekVolume(){
 const mon=mondayISO(); let v=0;
 Object.values(hist).forEach(a=>(a||[]).forEach(e=>{ if(e.date>=mon) v+=(e.vol||0); }));
 return Math.round(v+liveVolume());
}
function volumeByGroup(){
 const mon=mondayISO(), byG={};
 Object.keys(hist).forEach(k=>{ const g=groupOf(k); if(!g) return;
  (hist[k]||[]).forEach(e=>{ if(e.date>=mon) byG[g]=(byG[g]||0)+(e.vol||0); }); });
 Object.keys(cur).forEach(dId=>Object.keys(cur[dId]||{}).forEach(exId=>{
  const alt=swaps[exId]||null, g=groupOf(hkey(exId,alt))||(LIB[exId]&&LIB[exId].g);
  if(g) byG[g]=(byG[g]||0)+exVolume(cur[dId][exId]);
 }));
 Object.keys(byG).forEach(g=>byG[g]=Math.round(byG[g]));
 return byG;
}
/* Most recent trained date per muscle group, from history only -- a group
   only entered live today doesn't count as "trained" until the session is
   finished, same as everywhere else PB/top-set logic works. */
function groupLastTrained(){
 const last={};
 Object.keys(hist).forEach(k=>{ const g=groupOf(k); if(!g) return;
  (hist[k]||[]).forEach(e=>{ if(!last[g]||e.date>last[g]) last[g]=e.date; }); });
 return last;
}
function allGroups(){
 const s={}; Object.values(LIB).forEach(x=>s[x.g]=1); return Object.keys(s).sort();
}
/* Epley estimated 1RM: w * (1 + reps/30). Falls back to the raw weight when
   reps weren't recorded (older/legacy entries), rather than showing nothing. */
function e1RM(top,reps){ return top*(1+((reps||0)/30)); }
/* Plain up/flat/down over the last up-to-4 sessions, using estimated 1RM so
   "same weight, more reps" reads as progress too, not just a heavier top set.
   +/-2% is treated as flat -- noise, not a trend. */
function trendFor(k){
 const h=(hist[k]||[]).slice().sort((a,b)=>a.date<b.date?-1:1);
 if(h.length<2) return null;
 const win=h.slice(-4), a=e1RM(win[0].top,win[0].reps), b=e1RM(win[win.length-1].top,win[win.length-1].reps);
 if(!a) return null;
 const pct=(b-a)/a;
 return pct>0.02?'up':pct<-0.02?'down':'flat';
}
function recentPBs(limit){
 const out=[];
 Object.keys(hist).forEach(k=>{
  const h=(hist[k]||[]).slice().sort((a,b)=>a.date<b.date?-1:1);
  let bw=null,br=null;
  h.forEach(e=>{
   if(bw===null){ bw=e.top; br=e.reps||null; return; }
   if(e.top>bw){ out.push({k,date:e.date,txt:e.top+'kg'+(e.reps?' × '+e.reps:''),kind:'Weight'}); bw=e.top; br=e.reps||null; }
   else if(e.top===bw&&e.reps&&br&&e.reps>br){ out.push({k,date:e.date,txt:e.top+'kg × '+e.reps,kind:'Reps'}); br=e.reps; }
  });
 });
 out.sort((a,b)=>a.date<b.date?1:-1);
 return out.slice(0,limit||6);
}
function keyName(k){ const p=k.split('::'); return p[1]?p[1].replace(/-/g,' '):exName(p[0]); }
/* One row per tracked exercise in the plan (an exercise on two days is one
   row), with the coach's call for next time. */
function nextTargets(){
 const rows=[], seen={};
 PLAN.days.forEach(d=>d.items.forEach(it=>{
  const k=hkey(it.ex,swaps[it.ex]||null), co=coach(k,it);
  if(!co||seen[k]) return; seen[k]=1;
  rows.push({nm:keyName(k),co,trend:trendFor(k)});
 }));
 return rows;
}
const TREND_ICON={up:'<span class="trend up">▲</span>',down:'<span class="trend down">▼</span>',flat:'<span class="trend flat">▬</span>'};
function openProgress(){
 applyAccent();
 const ds=allSessionDates(), wk=workoutsThisWeek(), streak=weekStreak();
 const totalPB=recentPBs(999).length;
 let h='<div class="bigstat"><div class="s"><b>'+wk+'</b><span>This week</span></div>'+
  '<div class="s"><b>'+streak+'</b><span>Week streak</span></div>'+
  '<div class="s"><b>'+ds.length+'</b><span>Sessions</span></div></div>'+weekStrip();
 if(!ds.length){
  h+='<div class="empty">Nothing logged yet. Finish a session and this fills up — attendance, PBs, and what to aim for next.</div>';
 } else {
  const gap=Math.floor((new Date(today())-new Date(ds[ds.length-1]))/864e5);
  h+='<div class="note" style="margin-top:10px">'+
   (gap===0?'Trained today. ':gap===1?'Last session was yesterday. ':'Last session was '+gap+' days ago. ')+
   (wk>=3?'Three this week — that is the target hit.':wk===2?'One more this week hits the target.':
    wk===1?'Two more this week hits the target.':'Nothing logged this week yet.')+'</div>'+
   '<div class="note">This week: <b>'+weekVolume()+'kg</b> total volume moved (working sets only).</div>';
  const pbs=recentPBs(6);
  if(pbs.length){
   h+='<h5>Recent personal bests</h5>'+pbs.map(p=>'<div class="pbrow"><span class="tag">'+p.kind+'</span>'+
    '<span class="nm">'+keyName(p.k)+'</span><span class="dt">'+p.txt+' · '+shortDate(p.date)+'</span></div>').join('');
   h+='<div class="note">'+totalPB+' personal best'+(totalPB===1?'':'s')+' since you started.</div>';
  }
  const tg=nextTargets();
  if(tg.length){
   const st=tg.filter(t=>t.co.kind==='stall').length;
   h+='<h5>What to beat next</h5>'+tg.map(t=>'<div class="goal"><span class="nm">'+t.nm+(t.trend?TREND_ICON[t.trend]:'')+'</span>'+
    '<span class="tg">'+coachPill(t.co)+'</span></div>').join('');
   h+='<div class="note">Stay at a weight until every set hits its target reps, then go up one jump.'+
    (st?' <b>'+st+' stalled</b> — no progress in 3 sessions, so a lighter reset is suggested.':'')+
    ' Arrow is the trend over your last 4 sessions.</div>';
  }
  const vbg=volumeByGroup(), glt=groupLastTrained(), groups=allGroups();
  if(groups.length){
   h+='<h5>This week by muscle group</h5>'+groups.map(g=>{
    const v=vbg[g]||0, last=glt[g];
    const daysSince=last?Math.floor((new Date(today())-new Date(last))/864e5):null;
    const flagged=(daysSince===null||daysSince>=7);
    const flag=flagged?' <span class="trend down">⚠ '+(daysSince===null?'never trained':daysSince+'d ago')+'</span>':'';
    return '<div class="goal"><span class="nm">'+g+flag+'</span><span class="tg">'+v+'kg</span></div>';
   }).join('');
   h+='<div class="note">Volume moved this week per muscle group, using each exercise\'s library category. Flagged if nothing in that group has been logged in 7+ days.</div>';
  }
 }
 h+='<div class="hr"></div>'+bodyweightBlock();
 document.getElementById('progBody').innerHTML=h;
 wireBodyweight(openProgress);
 document.getElementById('progbg').classList.add('show');
}
function closeProgress(){ document.getElementById('progbg').classList.remove('show'); }
document.getElementById('progbg').addEventListener('click',e=>{ if(e.target.id==='progbg')closeProgress(); });

