/* ============ ACTIONS ============ */
function switchDay(id){ if(id===ACTIVE)return; flush(); ACTIVE=id; Store.set('gt4_active',id); render(); window.scrollTo({top:0}); }
function openSheet(){ applyAccent(); document.getElementById('sheetbg').classList.add('show'); }
function closeSheet(){ document.getElementById('sheetbg').classList.remove('show'); }
document.getElementById('sheetbg').addEventListener('click',e=>{ if(e.target.id==='sheetbg')closeSheet(); });
async function doNewSession(){
 const d=day(ACTIVE), td=today();
 const S=summarise(d);
 d.items.forEach(it=>{ if(it.skip) return; const e=topWithReps(d.id,it.ex);
  if(e){ const k=hkey(it.ex,swaps[it.ex]||null); if(!hist[k])hist[k]=[];
   const vol=exVolume(cur[d.id]&&cur[d.id][it.ex]);
   const lastE=hist[k][hist[k].length-1];
   if(lastE&&lastE.date===td){ /* same-day re-finish: keep the better one, don't duplicate the point */
    if(e.top>lastE.top||(e.top===lastE.top&&(e.reps||0)>(lastE.reps||0))){ lastE.top=e.top; lastE.reps=e.reps; }
    lastE.vol=vol;
   } else hist[k].push({date:td,top:e.top,reps:e.reps,vol}); } });
 if(cur[d.id]&&Object.keys(cur[d.id]).length){ prev[d.id]=JSON.parse(JSON.stringify(cur[d.id]));
  /* _date is read by lastSrc() to pick the most recent day when the same
     exercise has a prev on more than one. It sits beside the exercise ids
     (never a valid id itself); older prev blobs have none and lose ties. */
  prev[d.id]._date=td; }
 endOfSession(d);
 cur[d.id]={}; delete warmDone[d.id]; delete sessionStart[d.id];
 await Promise.all([Store.set('gt4_hist',hist),Store.set('gt4_prev',prev),Store.set('gt4_cur',cur),Store.set('gt4_warm',warmDone),Store.set('gt4_start',sessionStart)]);
 DIRTY=false; mirrorHash(); closeSheet(); render(); window.scrollTo({top:0});
 showSummary(S);
 autoBackup().then(r=>{ const el=document.getElementById('sumBackup'); if(!el) return;
  el.innerHTML=r?'Backed up to the phone ✓ ('+r.file+')':(typeof fetch==='function'&&/^https?:$/.test(location.protocol)?'Auto-backup unavailable — export from the Data panel now and then.':''); });
}

