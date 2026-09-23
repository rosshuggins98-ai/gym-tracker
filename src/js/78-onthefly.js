/* ============ ON-THE-FLY: EXTRAS AND SKIPS ============
   Changing today's session without editing the plan. Both are flags on the
   plan item itself, so they persist, back up and restore with the plan and
   need no storage key of their own:
     it.extra -- added from the workout screen for today only. Logged like any
                 item; doNewSession() drops it from the day once its history is
                 written. "Keep in plan" just deletes the flag.
     it.skip  -- planned but not today: hidden, out of the set count, and back
                 next session. Only offered while no set is ticked; it clears the
                 item's prefilled slots so nothing stale rides into prev.
   cleanDays() strips both, for anything that snapshots a plan (routines). */
function anyDone(dId,exId){ return ((cur[dId]&&cur[dId][exId])||[]).some(x=>x&&x.done); }
function skipToday(d,it){
 if(anyDone(d.id,it.ex)||ssRole(d,d.items.indexOf(it))) return false;
 it.skip=true; if(cur[d.id]) delete cur[d.id][it.ex];
 queueSave(); savePlan(); return true; }
function unskip(it){ delete it.skip; savePlan(); }
/* A new extra copies sets/reps/rest from wherever the exercise is already
   planned, so "last time" lines up set for set; otherwise 3 × 12. */
function addExtra(d,exId){
 if(!LIB[exId]||d.items.some(it=>it.ex===exId)) return false;
 let src=null; PLAN.days.forEach(od=>od.items.forEach(it=>{ if(!src&&it.ex===exId&&!it.extra) src=it; }));
 const it={ex:exId,sets:src?src.sets:3,reps:src?repsFor(src).slice():[12,12,12],extra:true};
 if(src&&src.rest) it.rest=src.rest;
 d.items.push(it); savePlan(); return true; }
function keepExtra(it){ delete it.extra; savePlan(); }
function removeExtra(d,it){
 if(!it.extra||anyDone(d.id,it.ex)) return false;
 d.items=d.items.filter(x=>x!==it); if(cur[d.id]) delete cur[d.id][it.ex];
 queueSave(); savePlan(); return true; }
function endOfSession(d){ d.items=d.items.filter(it=>!it.extra); d.items.forEach(it=>{ delete it.skip; }); savePlan(); }
function cleanDays(days){ const c=JSON.parse(JSON.stringify(days));
 c.forEach(d=>{ d.items=d.items.filter(it=>!it.extra); d.items.forEach(it=>{ delete it.skip; }); }); return c; }
/* Exercises logged in the last 30 days that aren't in today's session, most
   recent first -- after one pec deck finisher, it's at the top next time. */
function recentIds(d){
 const cut=new Date(Date.now()-30*864e5).toISOString().slice(0,10), seen={};
 Object.keys(hist).forEach(k=>{ if(!LIB[k]||d.items.some(it=>it.ex===k)) return;
  const h=hist[k], last=h.length&&h[h.length-1].date; if(last&&last>=cut) seen[k]=last; });
 return Object.keys(seen).sort((a,b)=>seen[a]<seen[b]?1:-1).slice(0,6); }

let qaGroup='Chest';
function openQuickAdd(){ const inp=document.getElementById('qaSearch'); if(inp) inp.value='';
 drawQuickAdd(''); applyAccent(); document.getElementById('qabg').classList.add('show'); }
function closeQuickAdd(){ document.getElementById('qabg').classList.remove('show'); }
document.getElementById('qabg').addEventListener('click',e=>{ if(e.target.id==='qabg')closeQuickAdd(); });
document.getElementById('qaSearch').addEventListener('input',e=>drawQuickAdd(e.target.value));
async function pickExtra(exId){ const d=day(ACTIVE);
 const it=d.items.find(x=>x.ex===exId);
 if(it&&it.skip) unskip(it); else if(!addExtra(d,exId)) return;
 closeQuickAdd(); render(); window.scrollTo({top:document.body.scrollHeight}); }
function qaButton(d,id){
 const it=d.items.find(x=>x.ex===id), bs=bestOf(hkey(id,null));
 const b=document.createElement('button'); b.className='opt';
 const flag=!it?'Add':it.skip?'Bring back':'In session';
 b.innerHTML='<span>'+LIB[id].n+(bs!==null?'<small>best '+bs+'kg logged</small>':'')+'</span><span class="flag">'+flag+'</span>';
 if(it&&!it.skip){ b.disabled=true; b.style.opacity='.45'; }
 else b.addEventListener('click',()=>pickExtra(id));
 return b; }
function drawQuickAdd(q){
 const d=day(ACTIVE), box=document.getElementById('qaList'); box.innerHTML='';
 const low=String(q||'').trim().toLowerCase();
 const head=t=>{ const h=document.createElement('h5'); h.textContent=t; h.style.margin='14px 0 8px'; box.appendChild(h); };
 if(!low){ const rec=recentIds(d);
  if(rec.length){ head('Recently logged'); rec.forEach(id=>box.appendChild(qaButton(d,id))); } }
 const groups={}; Object.keys(LIB).forEach(id=>{ if(low&&LIB[id].n.toLowerCase().indexOf(low)<0) return;
  (groups[LIB[id].g]=groups[LIB[id].g]||[]).push(id); });
 Object.keys(groups).forEach(g=>{ head(g); groups[g].forEach(id=>box.appendChild(qaButton(d,id))); });
 const nm=cleanName(q);
 if(nm&&!nameToId(nm)){
  if(!Object.keys(groups).length){ const p=document.createElement('p'); p.className='small'; p.textContent='Nothing in the library called that.'; box.appendChild(p); }
  const row=document.createElement('div'); row.className='step'; row.style.margin='10px 0';
  ['Chest','Back','Shoulders','Arms','Legs','Other'].forEach(g=>{
   const b=document.createElement('button'); b.className='sb'+(g===qaGroup?' on':''); b.style.cssText='width:auto;padding:0 9px;font-size:11px'; b.textContent=g;
   b.addEventListener('click',()=>{ qaGroup=g; drawQuickAdd(q); }); row.appendChild(b); });
  const mk=document.createElement('button'); mk.className='dbtn'; mk.textContent='Create "'+nm+'" ('+qaGroup+') and add it';
  mk.addEventListener('click',async()=>{ const id=await addCustom(nm,qaGroup,''); if(id) pickExtra(id); });
  box.appendChild(row); box.appendChild(mk);
 }
}
