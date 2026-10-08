/* ============ SWAP ============ */
let swapT=null;
function openSwap(exId){ swapT=exId; const L=LIB[exId]||{alts:[]}, alt=swaps[exId]||null;
 document.getElementById('swapTitle').textContent=exName(exId);
 const list=document.getElementById('swapList'); list.innerHTML='';
 const hasData=curTop(ACTIVE,exId)!==null;
 if(hasData){ const w=document.createElement('p'); w.className='small';
  w.innerHTML='<b>You have weights logged for this exercise today.</b> They will be recorded under whichever option is selected when you finish the session — so pick the one you actually did.';
  list.appendChild(w); }
 /* At home the home stand-in is offered even when it isn't one of the alts
    (Dumbbell Leg Curl for Leg Curls), and each option says whether the home
    kit can do it. */
 const home=PLACE==='home', opts=[{n:exName(exId),v:null,f:'Planned'}].concat((L.alts||[]).map(a=>({n:a,v:a,f:''})));
 const ha=home?homeAuto(exId):null;
 if(ha&&!opts.some(o=>o.v===ha)) opts.push({n:ha,v:ha,f:''});
 if(home) opts.forEach(o=>{ if(!o.f||o.f==='Planned') o.f=(o.f?o.f+' · ':'')+(homeOk(o.n)?'home ✓':'gym only'); });
 if(home){ const w=document.createElement('p'); w.className='small';
  w.textContent='At home: your pick here only applies at home. Your gym swaps come back when you switch to Gym.';
  list.appendChild(w); }
 opts.forEach(o=>{
  const b=document.createElement('button'); b.className='opt'+(alt===o.v?' on':'')+(home&&!homeOk(o.n)?' dim':'');
  const bs=bestOf(hkey(exId,o.v));
  b.innerHTML='<span>'+o.n+(bs!==null?'<small>best '+bs+'kg logged</small>':'<small>no history yet</small>')+'</span><span class="flag">'+(alt===o.v?'Using':o.f)+'</span>';
  b.addEventListener('click',()=>chooseSwap(o.v)); list.appendChild(b); });
 if(alt&&!home){ const mk=document.createElement('button'); mk.className='dbtn'; mk.style.marginTop='6px';
  mk.textContent='Make '+alt+' the planned exercise';
  mk.addEventListener('click',async()=>{ await promoteSwap(exId); closeSwap(); render(); });
  const why=document.createElement('p'); why.className='small';
  why.textContent='Swaps stay on until you switch back. Making it planned puts it in the plan itself, keeps its logged history, and lists '+exName(exId)+' as its alternative instead.';
  list.appendChild(mk); list.appendChild(why); }
 applyAccent(); document.getElementById('swapbg').classList.add('show');
}
async function chooseSwap(v){ const id=swapT; if(!id)return;
 if(PLACE==='home'){ homePicks[id]=v===null?'':v; swaps=homeSwapMap(); await Store.set('gt4_homeswaps',homePicks); }
 else { if(v===null)delete swaps[id]; else swaps[id]=v; await Store.set('gt4_swaps',swaps); }
 mirrorHash(); closeSwap(); render(); }
function closeSwap(){ document.getElementById('swapbg').classList.remove('show'); }
document.getElementById('swapbg').addEventListener('click',e=>{ if(e.target.id==='swapbg')closeSwap(); });

/* Turn the current swap for exId into the plan's own exercise, on every day
   that has it. An alt that already names a library exercise just becomes that
   id; any other name becomes a custom exercise whose alts start with the old
   main, so swapping back stays one tap. Its history sits under the shared
   alt::slug key, and migrate() already folds an alt:: key into a library entry
   of the same name, so re-running it here moves the numbers across. Today's
   logged sets and the note follow too. A day that already has the target
   keeps its old item rather than holding the same exercise twice (cur/prev
   are keyed day -> exId). Returns the new id, or null if nothing to promote. */
async function promoteSwap(exId){
 const alt=swaps[exId]; if(!alt) return null;
 const L=LIB[exId]||{}, oldKey=hkey(exId,alt);
 let id=nameToId(alt);
 if(!id||id===exId){
  const alts=[exName(exId)].concat((L.alts||[]).filter(a=>a!==alt)).join(',');
  id=await addCustom(alt,L.g||'Other',alts); if(!id) return null;
 }
 hist=migrate(hist);
 if(oldKey!==id&&notes[oldKey]!==undefined){ if(!notes[id]) notes[id]=notes[oldKey]; delete notes[oldKey]; }
 if(oldKey!==id&&incs[oldKey]!==undefined){ if(incs[id]===undefined) incs[id]=incs[oldKey]; delete incs[oldKey]; }
 PLAN.days.forEach(d=>{
  if(d.items.some(it=>it.ex===id)) return;
  d.items.forEach(it=>{ if(it.ex===exId) it.ex=id; });
  if(cur[d.id]&&cur[d.id][exId]){ cur[d.id][id]=cur[d.id][exId]; delete cur[d.id][exId]; }
 });
 delete swaps[exId];
 await Promise.all([Store.set('gt4_hist',hist),Store.set('gt4_notes',notes),Store.set('gt4_incs',incs),Store.set('gt4_swaps',swaps),Store.set('gt4_cur',cur)]);
 savePlan();
 return id;
}
