/* ============ UNSAVED WORKOUTS ============
   A workout is only saved when Finish is tapped. Until then its ticked sets
   wait in cur[dayId], with sessionStart[dayId] (ms of the first tick) and
   sessionAt[dayId] (where it was). Finishing dates the workout by that first
   tick, not by the day Finish is tapped, and files it under the swaps of the
   place it was trained. A workout still unsaved on a later day gets a card
   on the workout screen: save it as that day, or discard it. (Found
   2026-10-15: workouts closed without Finish were never saved, or were
   saved days later under the wrong date.) */
function tickedCount(dId){ return Object.values(cur[dId]||{}).reduce((n,a)=>n+(Array.isArray(a)?a.filter(x=>x&&x.done).length:0),0); }
function ticked(dId){ return tickedCount(dId)>0; }
function sessionDate(dId){ const t=sessionStart[dId], td=today();
 if(!t||!ticked(dId)) return td;
 const d=new Date(t).toISOString().slice(0,10); return d<td?d:td; }
/* Where a workout from another day was trained; a workout from today is
   wherever "Training at" says now, as it always was. */
function sessionPlace(dId){ return (sessionDate(dId)<today()&&PLACES[sessionAt[dId]])?sessionAt[dId]:PLACE; }
/* The swap map in force at a place, without switching to it -- so a home
   workout saved at the gym is filed under the home exercises. */
function swapsFor(p){ if(p===PLACE) return swaps;
 if(p==='gym') return gymSwapMap();
 const keep=gymSwaps; gymSwaps=gymSwapMap(); const m=homeSwapMap(); gymSwaps=keep; return m; }
/* On every tick. The first ticked set starts the clock; if it's the only
   ticked set (everything else was cleared), the clock restarts, so an
   abandoned start doesn't date a later workout. */
function noteTick(dId){ if(sessionStart[dId]&&tickedCount(dId)>1) return;
 sessionStart[dId]=Date.now(); sessionAt[dId]=PLACE;
 Store.set('gt4_start',sessionStart); Store.set('gt4_startat',sessionAt); }
function staleDays(){ return PLAN.days.filter(d=>sessionStart[d.id]&&ticked(d.id)&&sessionDate(d.id)<today()); }
function weekdayOf(iso){ return new Date(iso).toLocaleString('en-GB',{weekday:'short',timeZone:'UTC'}); }
/* Shown above the monthly and weekly cards. Discard takes a second tap. */
function staleCard(){ const ds=staleDays(); if(!ds.length) return null;
 const c=document.createElement('div'); c.className='checkin unsaved';
 c.innerHTML=ds.map(d=>{ const dt=sessionDate(d.id), n=tickedCount(d.id), at=sessionAt[d.id];
  return '<div class="uns" data-day="'+d.id+'"><div class="ck-head"><b>'+escHTML(d.name)+' from '+weekdayOf(dt)+' '+shortDate(dt)+' isn\'t saved</b></div>'+
   '<div class="ck-line">'+n+' set'+(n===1?'':'s')+' ticked'+(at==='home'?' at home':at==='gym'?' at the gym':'')+
   '. Save it as '+shortDate(dt)+', or discard it if it was a mistake.</div>'+
   '<div class="ck-btns"><button class="ck-ok ck-save">Save as '+shortDate(dt)+'</button><button class="ck-ok ck-discard">Discard</button></div></div>'; }).join('');
 c.querySelectorAll('.uns').forEach(el=>{ const id=el.dataset.day, x=el.querySelector('.ck-discard');
  el.querySelector('.ck-save').addEventListener('click',()=>doNewSession(id));
  x.addEventListener('click',()=>{ if(x.dataset.armed){ discardSession(id); return; }
   const n=tickedCount(id); x.dataset.armed='1'; x.classList.add('armed');
   x.textContent='Tap again to delete '+n+' set'+(n===1?'':'s'); }); });
 return c; }
/* The ticked sets, today-only extras and skips, the warm-up tick and the
   clock go; history is not touched. */
async function discardSession(dId){ const d=PLAN.days.find(x=>x.id===dId); if(!d) return;
 endOfSession(d); cur[dId]={}; delete warmDone[dId]; delete sessionStart[dId]; delete sessionAt[dId];
 await Promise.all([Store.set('gt4_cur',cur),Store.set('gt4_warm',warmDone),Store.set('gt4_start',sessionStart),Store.set('gt4_startat',sessionAt)]);
 mirrorHash(); render(); }
