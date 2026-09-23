/* ============ PLAN EDITOR ============ */
function openEdit(){ applyAccent(); drawEdit(); document.getElementById('editbg').classList.add('show'); }
function closeEdit(){ document.getElementById('editbg').classList.remove('show'); render(); }
document.getElementById('editbg').addEventListener('click',e=>{ if(e.target.id==='editbg')closeEdit(); });
document.getElementById('routineSaveBtn').addEventListener('click',saveRoutine);
function drawEdit(){
 const d=day(ACTIVE);
 document.getElementById('editTitle').textContent='Edit '+d.name+' — '+d.tag;
 const b=document.getElementById('editBody'); b.innerHTML='';
 d.items.forEach((it,idx)=>{
  const r=document.createElement('div'); r.className='erow';
  const canRm=it.sets>1&&!lastSetUsed(d.id,it.ex,it.sets);
  r.innerHTML='<div class="en"><b>'+exName(it.ex)+(it.extra?' <small style="display:inline">· today only</small>':it.skip?' <small style="display:inline">· skipped today</small>':'')+'</b>'+
   '<div class="step"><button class="sb" data-a="minus"'+(canRm?'':' disabled')+'>&minus;</button>'+
   '<span class="sv">'+it.sets+' set'+(it.sets===1?'':'s')+'</span>'+
   '<button class="sb" data-a="plus">+</button></div>'+
   '<input value="'+repsFor(it).join(', ')+'" data-i="'+idx+'">'+
   '<small>Reps per set, comma separated. Type <b>max</b> for to-failure.</small>'+
   '<input inputmode="numeric" data-rest="1" value="'+restFor(it)+'" style="width:72px">'+
   '<small>Rest between sets, seconds.</small>'+
   (idx<d.items.length-1?'<button class="mini ssb'+(it.super?' on':'')+'" data-a="ss" style="width:auto;padding:0 10px;font-size:11px;margin-top:6px">'+
    (it.super?'Superset with next ✓':'Superset with next')+'</button>':'')+'</div>'+
   '<button class="mini" data-a="up">'+I.up+'</button><button class="mini" data-a="dn">'+I.dn+'</button>'+
   '<button class="mini del" data-a="rm">×</button>';
  r.querySelectorAll('.sb').forEach(btn=>btn.addEventListener('click',()=>{
   if(btn.dataset.a==='plus') addSet(it); else removeSet(it,d.id);
   drawEdit(); }));
  const rinp=r.querySelector('[data-rest]');
  rinp.addEventListener('change',()=>{
   const v=parseInt(rinp.value,10);
   if(v>0&&v!==REST_DEFAULT) it.rest=Math.min(v,600); else delete it.rest;
   savePlan(); drawEdit(); });
  const inp=r.querySelector('input:not([data-rest])');
  inp.addEventListener('change',()=>{
   const parts=inp.value.split(',').map(s=>s.trim()).filter(Boolean)
     .map(s=>/^max$/i.test(s)?'max':(parseInt(s,10)||10));
   if(parts.length){ it.reps=parts; it.sets=parts.length; }
   savePlan(); drawEdit(); });
  r.querySelectorAll('.mini').forEach(btn=>btn.addEventListener('click',()=>{
   const a=btn.dataset.a;
   if(a==='ss'){ if(it.super) delete it.super; else it.super=true; }
   if(a==='rm') d.items.splice(idx,1);
   if(a==='up'&&idx>0) d.items.splice(idx-1,0,d.items.splice(idx,1)[0]);
   if(a==='dn'&&idx<d.items.length-1) d.items.splice(idx+1,0,d.items.splice(idx,1)[0]);
   savePlan(); drawEdit(); }));
  b.appendChild(r);
 });
 const n=setCount(d);
 let advice = n<10 ? 'Light for a full session — fine while you build the habit.' :
   n<=16 ? 'A good beginner range. Add a set every couple of weeks as it starts feeling easy.' :
   n<=22 ? 'Solid working volume. Expect 60&ndash;75 minutes.' :
   'High volume &mdash; this is the territory that made your original plan hard to finish.';
 document.getElementById('volNote').innerHTML='<b>'+n+' working sets</b> this session. '+advice;
 const add=document.getElementById('addBody'); add.innerHTML='';
 const box=document.createElement('div'); box.className='erow'; box.style.alignItems='stretch';
 box.innerHTML='<div class="en"><b>Create your own</b>'+
  '<input id="cxName" placeholder="Exercise name (e.g. Pendlay Row)">'+
  '<input id="cxAlts" placeholder="Alternatives, comma separated (optional)">'+
  '<div class="step" id="cxGroups"></div>'+
  '<small>It joins the library, gets its own progress chart, and can be added to any session.</small></div>';
 add.appendChild(box);
 const gsel=box.querySelector('#cxGroups'); let chosen='Chest';
 ['Chest','Back','Shoulders','Arms','Legs','Other'].forEach(g=>{
  const b=document.createElement('button'); b.className='sb'; b.style.width='auto'; b.style.padding='0 9px';
  b.style.fontSize='11px'; b.textContent=g;
  if(g===chosen){ b.style.borderColor='var(--accent)'; b.style.color='var(--accent)'; }
  b.addEventListener('click',()=>{ chosen=g;
   gsel.querySelectorAll('.sb').forEach(x=>{ x.style.borderColor='var(--line)'; x.style.color='var(--text)'; });
   b.style.borderColor='var(--accent)'; b.style.color='var(--accent)'; });
  gsel.appendChild(b);
 });
 const mk=document.createElement('button'); mk.className='dbtn'; mk.textContent='Add to library and this session';
 mk.addEventListener('click',async()=>{
  const nm=box.querySelector('#cxName').value, al=box.querySelector('#cxAlts').value;
  if(!cleanName(nm)) return;
  const id=await addCustom(nm,chosen,al);
  if(id){ d.items.push({ex:id,sets:3,reps:[12,10,8]}); savePlan(); drawEdit(); }
 });
 add.appendChild(mk);
 const groups={}; Object.keys(LIB).forEach(id=>{ (groups[LIB[id].g]=groups[LIB[id].g]||[]).push(id); });
 Object.keys(groups).forEach(g=>{
  const h=document.createElement('h5'); h.textContent=g; h.style.margin='14px 0 8px'; add.appendChild(h);
  groups[g].forEach(id=>{
   const has=d.items.some(it=>it.ex===id);
   const bt=document.createElement('button'); bt.className='opt'; bt.disabled=has;
   const bs=bestOf(hkey(id,null));
   bt.innerHTML='<span>'+LIB[id].n+(bs!==null?'<small>best '+bs+'kg logged</small>':'')+'</span><span class="flag">'+(has?'In session':'Add')+'</span>';
   if(LIB[id].custom) bt.innerHTML=bt.innerHTML.replace('</span><span class="flag">','</span><span class="flag">custom · ');
   if(has) bt.style.opacity='.45';
   else bt.addEventListener('click',()=>{ d.items.push({ex:id,sets:3,reps:[12,10,8]}); savePlan(); drawEdit(); });
   if(LIB[id].custom){
    const del=document.createElement('button'); del.className='dbtn';
    del.style.cssText='margin:-6px 0 10px;font-size:12px;padding:9px;color:var(--warn);border-color:var(--warn)';
    del.textContent='Delete "'+LIB[id].n+'" from library';
    del.addEventListener('click',async()=>{ await deleteCustom(id); drawEdit(); });
    add.appendChild(bt); add.appendChild(del); return;
   }
   add.appendChild(bt); });
 });
 drawRoutines();
}
function savePlan(){ Store.set('gt4_plan',PLAN); mirrorHash(); }
function sameDays(a,b){ return JSON.stringify(a)===JSON.stringify(b); }
/* Swap the whole plan for a built-in one. The outgoing plan is kept as a
   routine unless an identical one is already saved -- "try full body for a
   month" must never mean re-typing PPL by hand to go back. Per-day state
   (today's sets, last-session prefill, warm-up ticks) is keyed by day id and
   simply stops being displayed; history is per exercise and unaffected. */
async function loadPreset(key){
 const P=PRESETS[key]; if(!P) return;
 const outgoing=cleanDays(PLAN.days);
 if(!routines.some(r=>sameDays(r.days,outgoing))){
  routines.push({id:newRoutineId(),label:cleanName(PLAN.name||'Previous plan')||'Previous plan',savedISO:today(),days:outgoing});
  await Store.set('gt4_routines',routines);
 }
 PLAN=P.make(); ACTIVE=PLAN.days[0].id;
 savePlan(); drawRoutines(); drawEdit(); render();
}
function resetPlan(){ return loadPreset('ppl'); }

