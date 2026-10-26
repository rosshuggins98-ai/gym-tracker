/* ============ ACTIONS ============ */
function switchDay(id){ if(id===ACTIVE)return; flush(); ACTIVE=id; Store.set('gt4_active',id); render(); window.scrollTo({top:0}); }
/* The finish sheet, for the active day or (from the unsaved-workout card)
   one left from an earlier day. A workout only saves once how it felt is
   picked (Ross asked, 2026-10-26), so every session has a rating. */
let FIN_DAY=null;
function openSheet(dId){ applyAccent();
 FIN_DAY=(typeof dId==='string'&&PLAN.days.some(x=>x.id===dId))?dId:ACTIVE;
 const d=day(FIN_DAY), stale=sessionDate(FIN_DAY)<today();
 const w=finishChecks(d), el=document.getElementById('finishWarn');
 el.innerHTML=w.length?'<b>Worth a look before saving:</b>'+w.map(x=>'<div>'+x+'</div>').join(''):'';
 el.style.display=w.length?'block':'none';
 const pl=document.getElementById('finishPlace');
 if(stale){ pl.style.display='none'; } else { pl.style.display=''; finishPlace(); }
 const date=sessionDate(FIN_DAY), ef=document.getElementById('finishEffort');
 ef.innerHTML=effortRow(date); wireEffort(date,'finishEffort',finishReady);
 finishReady();
 document.getElementById('sheetbg').classList.add('show'); }
function canSave(dId){ return !!effortOf(sessionDate(dId)); }
function finishReady(){ const b=document.getElementById('finishSave'), ok=canSave(FIN_DAY||ACTIVE);
 b.disabled=!ok; b.textContent=ok?'Save & clear':'Pick how it felt to save'; }
async function finishSave(){ const id=FIN_DAY||ACTIVE; if(!canSave(id)){ finishReady(); return; }
 FIN_DAY=null; await doNewSession(id); }
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
/* One entry per lift per date, in date order. A second finish on the same
   date (a forgotten exercise, or two workouts sharing a lift) adds its sets
   to that day's entry and entryFromSets works out top/reps/vol again; an
   older entry with no per-set record keeps the better top set. A workout
   saved days later slots in by date, so the last entry stays the latest. */
function addHistEntry(k,ne){ const h=hist[k]||(hist[k]=[]), same=h.find(e=>e.date===ne.date);
 if(same){
  if(Array.isArray(same.sets)&&same.sets.length){ same.sets=same.sets.concat(ne.sets);
   const r=entryFromSets(same.sets); if(r){ same.top=r.top; same.reps=r.reps; same.vol=r.vol; } }
  else { if(ne.top>same.top||(ne.top===same.top&&(ne.reps||0)>(same.reps||0))){ same.top=ne.top; same.reps=ne.reps; }
   same.vol=ne.vol; same.sets=ne.sets; }
  same.at=ne.at; return same; }
 let i=h.length; while(i>0&&h[i-1].date>ne.date) i--; h.splice(i,0,ne); return ne; }
/* Finish a day's workout: the active day (the Finish sheet), or another day
   left unsaved (the card in 85-unsaved). Dated by its first ticked set and
   filed under the swaps of the place it was trained. */
async function doNewSession(dId){
 const d=day((typeof dId==='string'&&PLAN.days.some(x=>x.id===dId))?dId:ACTIVE);
 const td=sessionDate(d.id), at=sessionPlace(d.id), sw=swapsFor(at);
 const S=summarise(d);
 d.items.forEach(it=>{ if(it.skip) return;
  /* An exercise is recorded when a working set with a weight was ticked
     (topWithReps); its top / reps / vol come from entryFromSets, the same
     function that rebuilds an entry after a past set is edited. */
  const a=cur[d.id]&&cur[d.id][it.ex], sets=doneSets(a), e=topWithReps(d.id,it.ex)?entryFromSets(sets):null;
  if(e) addHistEntry(hkey(it.ex,sw[it.ex]||null),{date:td,top:e.top,reps:e.reps,vol:e.vol,sets,at}); });
 if(cur[d.id]&&Object.keys(cur[d.id]).length){ prev[d.id]=JSON.parse(JSON.stringify(cur[d.id]));
  /* _date is read by lastSrc() to pick the most recent day when the same
     exercise has a prev on more than one. It sits beside the exercise ids
     (never a valid id itself); older prev blobs have none and lose ties. */
  prev[d.id]._date=td; prev[d.id]._at=at;
  prev[d.id]._keys={}; d.items.forEach(it=>{ prev[d.id]._keys[it.ex]=hkey(it.ex,sw[it.ex]||null); }); }
 endOfSession(d);
 cur[d.id]={}; delete warmDone[d.id]; delete sessionStart[d.id]; delete sessionAt[d.id];
 await Promise.all([Store.set('gt4_hist',hist),Store.set('gt4_prev',prev),Store.set('gt4_cur',cur),Store.set('gt4_warm',warmDone),
  Store.set('gt4_start',sessionStart),Store.set('gt4_startat',sessionAt)]);
 DIRTY=false; mirrorHash(); closeSheet(); render(); window.scrollTo({top:0});
 showSummary(S);
 autoBackup().then(async r=>{ const el=document.getElementById('sumBackup'); if(!el) return;
  el.innerHTML=r?sumBackupLine(r.file,null):(canAskServer()?'Auto-backup unavailable — export from the Data panel now and then.':'');
  if(!r) return;
  const o=await offsiteAfterSave(); if(o&&o.enabled) el.innerHTML=sumBackupLine(r.file,o); });
}

