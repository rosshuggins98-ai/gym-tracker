/* ============ REST TIMER ============ */
let restEnd=0, restIv=null;
function restStart(sec){
 restEnd=Date.now()+sec*1000;
 const el=document.getElementById('rest'); el.classList.add('show'); el.classList.remove('done');
 document.getElementById('restL').textContent='Rest';
 clearInterval(restIv); restIv=setInterval(restTick,250); restTick();
}
function restAdd(sec){ if(restEnd<Date.now())restEnd=Date.now(); restEnd+=sec*1000;
 const el=document.getElementById('rest'); el.classList.remove('done');
 document.getElementById('restL').textContent='Rest';
 if(!restIv)restIv=setInterval(restTick,250); restTick(); }
/* Between the two halves of a superset there's no rest -- the bar briefly
   points at what's next instead of counting down, then gets out of the way. */
function restCue(nextName){
 clearInterval(restIv); restIv=null; restEnd=0;
 const el=document.getElementById('rest'); el.classList.add('show'); el.classList.add('done');
 document.getElementById('restT').textContent='→'; document.getElementById('restL').textContent='No rest — '+nextName;
 clearTimeout(restCue._t); restCue._t=setTimeout(()=>{ if(!restIv) restStop(); },6000);
}
function restStop(){ clearInterval(restIv); restIv=null;
 document.getElementById('rest').classList.remove('show'); }
function restTick(){
 const ms=restEnd-Date.now();
 const el=document.getElementById('rest'), t=document.getElementById('restT');
 if(ms<=0){ t.textContent='0:00'; el.classList.add('done');
  document.getElementById('restL').textContent='Go — next set';
  clearInterval(restIv); restIv=null;
  if(navigator.vibrate) navigator.vibrate([200,100,200]);
  setTimeout(()=>{ if(!restIv) restStop(); },8000); return; }
 const s=Math.ceil(ms/1000);
 t.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
}

/* Fired the moment a ticked-done set is a PB -- the pill alone was too quiet
   for the single most motivating moment in the app. */
function celebratePB(){
 const el=document.getElementById('pbToast'); if(!el) return;
 el.classList.add('show');
 if(navigator.vibrate) navigator.vibrate([60,40,60,40,140]);
 clearTimeout(celebratePB._t);
 celebratePB._t=setTimeout(()=>el.classList.remove('show'),1800);
}

