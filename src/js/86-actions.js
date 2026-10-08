/* ============ ACTIONS ============ */
function switchDay(id){ if(id===ACTIVE)return; flush(); ACTIVE=id; Store.set('gt4_active',id); render(); window.scrollTo({top:0}); }
function openSheet(){ applyAccent();
 const w=finishChecks(day(ACTIVE)), el=document.getElementById('finishWarn');
 el.innerHTML=w.length?'<b>Worth a look before saving:</b>'+w.map(x=>'<div>'+x+'</div>').join(''):'';
 el.style.display=w.length?'block':'none';
 finishPlace();
 document.getElementById('sheetbg').classList.add('show'); }
/* Things that usually mean a mis-log, listed on the finish sheet (never
   blocking): an exercise whose ticked sets match its last history entry set
   for set -- the 15/16 Sep duplicate, or last time's prefill ticked through --
   and working sets ticked without the reps being typed. */
function finishChecks(d){ const out=[]; let untyped=0;
 d.items.forEach(it=>{ if(it.skip) return;
  const a=(cur[d.id]&&cur[d.id][it.ex])||[], sets=doneSets(a), k=hkey(it.ex,swaps[it.ex]||null), nm=vName(it.ex,swaps[it.ex]||null);
  a.forEach(x=>{ if(repsUnconfirmed(x)) untyped++; });
  const h=hist[k], last=h&&h[h.length-1];
  const sig=ss=>JSON.stringify((ss||[]).map(s=>[s.w,s.r,s.t||'']));
  if(sets.length&&last&&last.date!==today()&&Array.isArray(last.sets)&&sig(last.sets)===sig(sets))
   out.push(escHTML(nm)+' is identical to last time ('+shortDate(last.date)+'), set for set.');
 });
 if(untyped) out.push(untyped+' set'+(untyped===1?'':'s')+' ticked without typing the reps — saved as the target or last time\'s number.');
 return out; }
/* Last chance to say where this was, since the place stays on whatever was
   picked last time. */
function finishPlace(){ const el=document.getElementById('finishPlace');
 el.innerHTML='<span class="lbl">Saving as a</span>'+Object.keys(PLACES).map(p=>
  '<button data-p="'+p+'"'+(p===PLACE?' class="on"':'')+'>'+PLACES[p]+'</button>').join('')+'<span class="lbl">session</span>';
 el.querySelectorAll('button').forEach(b=>b.addEventListener('click',async()=>{ await setPlace(b.dataset.p); finishPlace(); render(); })); }
function closeSheet(){ document.getElementById('sheetbg').classList.remove('show'); }
document.getElementById('sheetbg').addEventListener('click',e=>{ if(e.target.id==='sheetbg')closeSheet(); });
async function doNewSession(){
 const d=day(ACTIVE), td=today();
 const S=summarise(d);
 d.items.forEach(it=>{ if(it.skip) return; const e=topWithReps(d.id,it.ex);
  if(e){ const k=hkey(it.ex,swaps[it.ex]||null); if(!hist[k])hist[k]=[];
   const a=cur[d.id]&&cur[d.id][it.ex], vol=exVolume(a), sets=doneSets(a);
   const lastE=hist[k][hist[k].length-1];
   if(lastE&&lastE.date===td){ /* same-day re-finish: keep the better one, don't duplicate the point */
    if(e.top>lastE.top||(e.top===lastE.top&&(e.reps||0)>(lastE.reps||0))){ lastE.top=e.top; lastE.reps=e.reps; }
    lastE.vol=vol; lastE.sets=sets; lastE.at=PLACE;
   } else hist[k].push({date:td,top:e.top,reps:e.reps,vol,sets,at:PLACE}); } });
 if(cur[d.id]&&Object.keys(cur[d.id]).length){ prev[d.id]=JSON.parse(JSON.stringify(cur[d.id]));
  /* _date is read by lastSrc() to pick the most recent day when the same
     exercise has a prev on more than one. It sits beside the exercise ids
     (never a valid id itself); older prev blobs have none and lose ties. */
  prev[d.id]._date=td; prev[d.id]._at=PLACE;
  prev[d.id]._keys={}; d.items.forEach(it=>{ prev[d.id]._keys[it.ex]=hkey(it.ex,swaps[it.ex]||null); }); }
 endOfSession(d);
 cur[d.id]={}; delete warmDone[d.id]; delete sessionStart[d.id];
 await Promise.all([Store.set('gt4_hist',hist),Store.set('gt4_prev',prev),Store.set('gt4_cur',cur),Store.set('gt4_warm',warmDone),Store.set('gt4_start',sessionStart)]);
 DIRTY=false; mirrorHash(); closeSheet(); render(); window.scrollTo({top:0});
 showSummary(S);
 autoBackup().then(r=>{ const el=document.getElementById('sumBackup'); if(!el) return;
  el.innerHTML=r?'Backed up to the phone ✓ ('+r.file+')':(typeof fetch==='function'&&/^https?:$/.test(location.protocol)?'Auto-backup unavailable — export from the Data panel now and then.':''); });
}

