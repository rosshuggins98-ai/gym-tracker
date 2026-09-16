/* ============ SESSION SUMMARY ============
   Built by doNewSession() from the state *before* it writes history, so
   PBs and "vs last time" compare against what was there, not what was just
   saved. Pure data in; showSummary() only renders it. */
function summarise(d){
 const td=today(), c=cur[d.id]||{}, p=prev[d.id]||{};
 let setsDone=0, setsPlanned=setCount(d), vol=0, prevVol=0; const pbs=[], tops=[];
 d.items.forEach(it=>{
  const a=c[it.ex]||[], k=hkey(it.ex,swaps[it.ex]||null), nm=vName(it.ex,swaps[it.ex]||null);
  a.forEach(x=>{ if(x&&x.done) setsDone++; });
  vol+=exVolume(a); if(Array.isArray(p[it.ex])) prevVol+=exVolume(p[it.ex]);
  const e=topWithReps(d.id,it.ex);
  if(e){ tops.push({nm,top:e.top,reps:e.reps});
   const pb=pbCheck(d.id,it.ex,k); if(pb&&pb.kind!=='first') pbs.push({nm,kind:pb.kind,top:e.top,reps:e.reps}); }
 });
 const start=sessionStart[d.id]||null;
 return {day:d.name+' — '+d.tag,date:td,setsDone,setsPlanned,vol:Math.round(vol),prevVol:Math.round(prevVol),pbs,tops,
  mins:start?Math.max(1,Math.round((Date.now()-start)/60000)):null};
}
function showSummary(S){
 const body=document.getElementById('sumBody'); if(!body) return;
 document.getElementById('sumTitle').textContent=S.pbs.length?'Session done — '+S.pbs.length+' PB'+(S.pbs.length===1?'':'s')+' 🎉':'Session done';
 const dv=S.prevVol?Math.round((S.vol-S.prevVol)/S.prevVol*100):null;
 let h='<div class="note" style="margin-top:0">'+S.day+' · '+shortDate(S.date)+'</div>'+
  '<div class="bigstat"><div class="s"><b>'+S.setsDone+'<small style="font-size:13px;color:var(--muted)">/'+S.setsPlanned+'</small></b><span>Sets</span></div>'+
  '<div class="s"><b>'+S.vol+'</b><span>kg moved</span></div>'+
  '<div class="s"><b>'+(S.mins!==null?S.mins:'—')+'</b><span>Minutes</span></div></div>';
 if(dv!==null) h+='<div class="note">'+(dv>0?'+':'')+dv+'% volume vs last time on this day ('+S.prevVol+'kg).</div>';
 if(S.pbs.length) h+='<h5>Personal bests</h5>'+S.pbs.map(x=>'<div class="pbrow"><span class="tag">'+(x.kind==='weight'?'Weight':'Reps')+'</span>'+
  '<span class="nm">'+x.nm+'</span><span class="dt">'+x.top+'kg'+(x.reps?' × '+x.reps:'')+'</span></div>').join('');
 if(S.tops.length) h+='<h5>Top sets</h5>'+S.tops.map(x=>'<div class="goal"><span class="nm">'+x.nm+'</span><span class="tg">'+x.top+'kg'+(x.reps?' × '+x.reps:'')+'</span></div>').join('');
 else h+='<div class="empty">Nothing was logged this session.</div>';
 h+='<div class="hr"></div>'+bodyweightBlock()+
  '<div class="note" id="sumBackup">'+(typeof fetch==='function'&&/^https?:$/.test(location.protocol)?'Backing up…':'')+'</div>';
 body.innerHTML=h;
 wireBodyweight(()=>showSummary(S));
 applyAccent(); document.getElementById('sumbg').classList.add('show');
}
function closeSummary(){ document.getElementById('sumbg').classList.remove('show'); }
document.getElementById('sumbg').addEventListener('click',e=>{ if(e.target.id==='sumbg')closeSummary(); });

