/* ============ RENDER ============ */
function applyAccent(){ const d=day(ACTIVE);
 document.documentElement.style.setProperty('--accent','var('+d.av+')');
 document.documentElement.style.setProperty('--accent-soft','var('+d.av+'s)'); }
/* A day finished this week shows a tick and the weekday in place of its tag;
   of the rest, the one done longest ago is marked as next. */
function renderTabs(){
 const t=document.getElementById('dayToggle'), dn=daysDoneThisWeek(), nx=nextDay();
 t.style.gridTemplateColumns='repeat('+PLAN.days.length+',1fr)';
 t.innerHTML=PLAN.days.map(d=>{ const cl=(d.id===ACTIVE?'on ':'')+(dn[d.id]?'dn':d.id===nx?'nx':'');
  return '<button data-day="'+d.id+'"'+(cl.trim()?' class="'+cl.trim()+'"':'')+
  ' style="'+(d.id===ACTIVE?'background:var('+d.av+')':'')+'">'+d.name+
  (dn[d.id]?'<em>✓ Done '+weekday(dn[d.id])+'</em>':d.id===nx?'<em>Up next</em>':'<small>'+d.tag+'</small>')+'</button>'; }).join('');
 t.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>switchDay(b.dataset.day)));
}
function render(){
 applyAccent(); renderTabs();
 const d=day(ACTIVE);
 document.getElementById('plabel').textContent=setCount(d)+' sets planned';
 const wk=workoutsThisWeek(), streak=weekStreak();
 document.getElementById('weekTag').textContent='Week '+weekNo();
 const wg=document.getElementById('weekGoal'), hit=wk>=WEEKTARGET;
 wg.innerHTML=(streak?'<span class="streak">🔥 '+streak+'-week streak</span>':'')+
  '<span class="'+(hit?'hit':'')+'">'+wk+' of '+WEEKTARGET+' this week'+(hit?' — hit ✓':'')+'</span>';
 wg.onclick=async()=>{ const opts=[2,3,4,5,6]; WEEKTARGET=opts[(opts.indexOf(WEEKTARGET)+1)%opts.length];
  await Store.set('gt4_weektarget',WEEKTARGET); render(); };
 const app=document.getElementById('app'); app.innerHTML='';
 const ck=checkinCard(); if(ck) app.appendChild(ck);
 const td=todoStrip(d); if(td) app.appendChild(td);
 if(d.warm){
  const w=document.createElement('div'); w.className='warm'+(warmDone[d.id]===today()?' on':'');
  w.innerHTML='<div class="wt"><b>Warm up first</b><small>'+d.warm+'</small></div>'+
   '<button class="tick'+(warmDone[d.id]===today()?' on':'')+'">'+I.tick+'</button>';
  w.querySelector('.tick').addEventListener('click',()=>{
   if(warmDone[d.id]===today()) delete warmDone[d.id]; else warmDone[d.id]=today();
   Store.set('gt4_warm',warmDone); render(); });
  app.appendChild(w);
 }
 const head=document.createElement('div'); head.className='area';
 const dnA=daysDoneThisWeek()[d.id];
 head.innerHTML='<b>'+d.tag+'</b><span class="rule"></span>'+(dnA?'<span class="donetag">✓ Done this week ('+weekday(dnA)+')</span>':''); app.appendChild(head);
 d.items.forEach((it,idx)=>app.appendChild(it.skip?skippedCard(it,d):card(it,d,idx)));
 const add=document.createElement('button'); add.className='addex'; add.textContent='+ Add an exercise for today';
 add.addEventListener('click',openQuickAdd); app.appendChild(add);
 updateProgress();
}
function skippedCard(it,d){
 const c=document.createElement('div'); c.className='ex skipped';
 c.innerHTML='<div class="ex-head"><div><div class="name">'+vName(it.ex,swaps[it.ex]||null)+'</div>'+
  '<div class="meta"><span class="pill reps">skipped today · back next session</span></div></div>'+
  '<div class="setfoot" style="padding:0"><button>Undo</button></div></div>';
 c.querySelector('button').addEventListener('click',()=>{ unskip(it); render(); });
 return c;
}
function card(it,d,idx){
 const exId=it.ex, alt=swaps[exId]||null, name=vName(exId,alt), reps=repsFor(it);
 const k0=hkey(exId,alt), role=ssRole(d,idx), partner=ssPartner(d,idx);
 const noteText=noteFor(k0);
 const notePreview=noteText?'<div class="exnote">'+
  escHTML(noteText.split('\n')[0].slice(0,60))+(noteText.length>60||noteText.indexOf('\n')>=0?'…':'')+'</div>':'';
 const c=document.createElement('div'); c.className='ex'+(alt?' swapped':'')+(role?' ss'+role:'');
 if(role==='first'){ const sb=document.createElement('div'); sb.className='ssbar'; sb.textContent='Superset'; c.appendChild(sb); }
 const h=document.createElement('div'); h.className='ex-head';
 h.innerHTML='<div><div class="name">'+name+'</div>'+notePreview+'<div class="meta"></div></div><div class="exbtns">'+
  '<button class="ibtn infob">'+I.info+'</button>'+
  '<button class="ibtn swapb'+(alt?' on':'')+'">'+I.swap+'</button>'+
  '<button class="ibtn chartb">'+I.chart+'</button>'+
  '<button class="ibtn plateb">'+I.plate+'</button></div>';
 c.appendChild(h);
 if(noteText) h.querySelector('.exnote').addEventListener('click',()=>openCue(exId));
 h.querySelector('.infob').addEventListener('click',()=>openCue(exId));
 h.querySelector('.swapb').addEventListener('click',()=>openSwap(exId));
 h.querySelector('.chartb').addEventListener('click',()=>openChart(exId,d.id));
 h.querySelector('.plateb').addEventListener('click',()=>openPlates(exId,d.id));
 const s=document.createElement('div'); s.className='sets';
 const ch=document.createElement('div'); ch.className='colhead';
 ch.innerHTML='<div>Set</div><div>Weight</div><div>Reps</div><div></div>'; s.appendChild(ch);
 /* Weight buttons step by the exercise's own jump (2kg dumbbells, 5kg pin
    stacks), so + lands on a weight that exists. Bodyweight work (jump 0)
    still steps 2.5 for assisted or loaded variants. */
 const stepW=incFor(k0)||2.5, wu=wuOf(it), rng=rangeLabel(it);
 for(let ri=0;ri<wu+reps.length;ri++){ const isW=ri<wu, i=ri-wu, tg=isW?null:reps[i];
  const x=slot(d.id,exId,ri,isW?'warm':undefined), tt=isW?'':(tg===null||tg==='max')?'max':tg;
  const lw=lastW(d.id,exId,ri), lt=lw!==null?'last <b>'+lw+'</b>':'';
  const typLbl=isW?'warm-up':typeLabel(x.t);
  const row=document.createElement('div'); row.className='set'+(x.t==='warm'?' warm':'')+(repsUnconfirmed(x)?' unconf':'');
  row.innerHTML='<div class="idx"><b>'+(isW?'W':(i+1))+'</b>'+(isW?'':'<small>×'+(rng&&tt!=='max'?rng:tt)+'</small>')+
   (typLbl?'<small class="typ '+(isW?'warm':x.t)+'">'+typLbl+'</small>':'')+'</div>'+
   '<div class="field"><div class="fstep">'+
    '<button class="stepbtn" data-f="w" data-d="-'+stepW+'">&minus;</button>'+
    '<input inputmode="decimal" placeholder="–" value="'+(x.w||'')+'" data-k="w">'+
    '<button class="stepbtn" data-f="w" data-d="'+stepW+'">+</button></div>'+
    '<span class="last">'+lt+'</span></div>'+
   '<div class="field"><div class="fstep">'+
    '<button class="stepbtn" data-f="r" data-d="-1">&minus;</button>'+
    '<input inputmode="numeric" placeholder="'+(tt||'–')+'" value="'+(x.r||'')+'" data-k="r">'+
    '<button class="stepbtn" data-f="r" data-d="1">+</button></div>'+
    '<span class="last">'+(repsUnconfirmed(x)?'not typed':'')+'</span></div>'+
   '<button class="tick'+(x.done?' on':'')+'">'+I.tick+'</button>';
  const wI=row.querySelector('[data-k="w"]'),rI=row.querySelector('[data-k="r"]'),tk=row.querySelector('.tick');
  const markTyped=y=>{ if(!y.rt){ y.rt=true; row.classList.remove('unconf'); row.querySelectorAll('.last')[1].textContent=''; } };
  wI.addEventListener('input',()=>{ slot(d.id,exId,ri).w=wI.value; queueSave(); pills(c,it,d); });
  wI.addEventListener('blur',flush);
  rI.addEventListener('input',()=>{ const y=slot(d.id,exId,ri); y.r=rI.value; markTyped(y); queueSave(); });
  rI.addEventListener('blur',flush);
  row.querySelectorAll('.stepbtn').forEach(btn=>{
   btn.addEventListener('click',()=>{
    const f=btn.dataset.f, delta=parseFloat(btn.dataset.d), y=slot(d.id,exId,ri);
    let v=parseFloat(f==='w'?y.w:y.r); if(isNaN(v))v=0;
    v=Math.max(0,Math.round((v+delta)*100)/100);
    const sv=f==='w'?String(v):String(Math.round(v));
    if(f==='w'){ y.w=sv; wI.value=sv; } else { y.r=sv; rI.value=sv; markTyped(y); }
    queueSave(); flush(); pills(c,it,d);
   });
  });
  tk.addEventListener('click',()=>{ const y=slot(d.id,exId,ri); y.done=!y.done; tk.classList.toggle('on',y.done);
   if(y.done&&!sessionStart[d.id]){ sessionStart[d.id]=Date.now(); Store.set('gt4_start',sessionStart); }
   if(y.done&&!y.r&&tt&&tt!=='max'){ y.r=String(tt); rI.value=tt; }
   row.classList.toggle('unconf',repsUnconfirmed(y)); row.querySelectorAll('.last')[1].textContent=repsUnconfirmed(y)?'not typed':'';
   if(y.done){ const sec=restAfter(d,idx); if(sec) restStart(sec); else restCue(vName(partner.ex,swaps[partner.ex]||null)); }
   pills(c,it,d);
   if(y.done&&pbCheck(d.id,exId,k0)) celebratePB();
   done(c,it,d); updateProgress(); queueSave(); flush(); });
  /* A warm-up row is always a warm-up; the badge cycle is for planned sets. */
  if(!isW) row.querySelector('.idx').addEventListener('click',()=>{
   const y=slot(d.id,exId,ri); y.t=nextSetType(y.t);
   queueSave(); flush(); render();
  });
  s.appendChild(row);
 }
 c.appendChild(s);
 const f=document.createElement('div'); f.className='setfoot';
 const canRm=it.sets>1&&!lastSetUsed(d.id,exId,wu+it.sets);
 const wa=cur[d.id]&&cur[d.id][exId], canRmW=wu>0&&!(wa&&wa[wu-1]&&wa[wu-1].done);
 f.innerHTML='<button class="rms"'+(canRm?'':' disabled')+'>&minus; Set</button>'+
  '<button class="ads">+ Set</button>'+
  (wu<WU_MAX?'<button class="adw">+ Warm-up</button>':'')+(canRmW?'<button class="rmw">&minus; Warm-up</button>':'')+
  '<span class="hint">'+(it.sets>1&&!canRm?'Clear the last set to remove it':'')+'</span>'+
  (it.extra?'<button class="keep">Keep in plan</button>'+(anyDone(d.id,exId)?'':'<button class="rmx">Remove</button>'):
   (anyDone(d.id,exId)||role)?'':'<button class="skp">Skip today</button>');
 f.querySelector('.ads').addEventListener('click',()=>{ addSet(it); render(); });
 f.querySelector('.rms').addEventListener('click',()=>{ if(removeSet(it,d.id)) render(); });
 const aw=f.querySelector('.adw'), rw=f.querySelector('.rmw');
 if(aw) aw.addEventListener('click',()=>{ if(addWarmup(d,it)) render(); });
 if(rw) rw.addEventListener('click',()=>{ if(removeWarmup(d,it)) render(); });
 const kp=f.querySelector('.keep'), rx=f.querySelector('.rmx'), sk=f.querySelector('.skp');
 if(kp) kp.addEventListener('click',()=>{ keepExtra(it); render(); });
 if(rx) rx.addEventListener('click',()=>{ if(removeExtra(d,it)) render(); });
 if(sk) sk.addEventListener('click',()=>{ if(skipToday(d,it)) render(); });
 c.appendChild(f);
 pills(c,it,d); done(c,it,d); return c;
}
function pills(c,it,d){
 const exId=it.ex, alt=swaps[exId]||null, k=hkey(exId,alt);
 const rl=repsFor(it).map(r=>(r===null||r==='max')?'max':r).join(' · ');
 const b=pbOf(k);
 const rg=rangeLabel(it);
 let h='<span class="pill reps">'+it.sets+' × '+(rg||rl)+'</span>';
 const idx=d.items.indexOf(it), role=ssRole(d,idx), partner=ssPartner(d,idx);
 if(role==='first') h+='<span class="pill ss">then '+vName(partner.ex,swaps[partner.ex]||null)+', no rest</span>';
 else if(role==='second') h+='<span class="pill ss">after '+vName(partner.ex,swaps[partner.ex]||null)+'</span>';
 if(restFor(it)!==REST_DEFAULT&&role!=='first') h+='<span class="pill reps">rest '+fmtRest(restFor(it))+'</span>';
 if(it.extra)h+='<span class="pill ss">today only</span>';
 if(alt)h+='<span class="pill swap">swapped</span>';
 if(b) h+='<span class="pill best">best '+b.w+'kg'+(b.reps?' × '+b.reps:'')+'</span>';
 else {
  /* no history for this variant yet - show a sibling's best so a swap still has a reference */
  const vm=variantMap(exId);
  const other=Object.keys(vm).filter(x=>x!==k).map(x=>({nm:vm[x],b:pbOf(x)})).filter(x=>x.b).sort((x,y)=>y.b.w-x.b.w)[0];
  if(other) h+='<span class="pill best">new here — '+other.nm+' best '+other.b.w+'kg</span>';
 }
 const co=coach(k,it);
 if(co) h+='<span class="pill coach '+co.kind+'">'+coachPill(co)+'</span>';
 const pb=pbCheck(d.id,exId,k);
 if(pb) h+='<span class="pill pb">'+I.tick+(pb.kind==='weight'?'PB weight':pb.kind==='reps'?'PB reps':pb.kind==='range'?'PB for '+pb.n+'+ reps':'First log')+'</span>';
 if(co&&co.why) h+='<div class="coachwhy">'+co.why+'</div>';
 const m=c.querySelector('.meta'); m.innerHTML=h;
 const cp=m.querySelector('.pill.coach');
 if(cp&&co&&(co.kind==='up'||co.kind==='stall'||co.kind==='down')) cp.addEventListener('click',()=>applyCoach(d,it,co.w));
}
function done(c,it,d){ const wu=wuOf(it); c.classList.toggle('complete', repsFor(it).every((_,i)=>{
 const a=cur[d.id]&&cur[d.id][it.ex]; return a&&a[wu+i]&&a[wu+i].done; })); }
function updateProgress(){
 const d=day(ACTIVE), total=setCount(d); let n=0;
 d.items.forEach(it=>{ if(!it.skip){ const wu=wuOf(it); repsFor(it).forEach((_,i)=>{ const a=cur[d.id]&&cur[d.id][it.ex]; if(a&&a[wu+i]&&a[wu+i].done)n++; }); } });
 document.getElementById('bar').style.width=total?(n/total*100)+'%':'0%';
 document.getElementById('pcount').textContent=n+' / '+total+' sets';
}

