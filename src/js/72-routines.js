/* ============ ROUTINES ============ */
/* Named snapshots of PLAN.days, switchable. Logged history is keyed by
   exercise, not by routine or day, so switching never loses a number --
   only which exercises are currently planned changes. */
let routines=[];
function newRoutineId(){ return 'r_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
async function saveRoutine(){
 const inp=document.getElementById('routineName'), nm=cleanName(inp.value); if(!nm) return;
 routines.push({id:newRoutineId(),label:nm,savedISO:today(),days:cleanDays(PLAN.days)});
 await Store.set('gt4_routines',routines);
 inp.value=''; drawRoutines();
}
async function loadRoutine(id){
 const r=routines.find(x=>x.id===id); if(!r) return;
 PLAN={name:r.label,startedISO:today(),days:JSON.parse(JSON.stringify(r.days))};
 ACTIVE=PLAN.days[0].id;
 await Store.set('gt4_plan',PLAN); mirrorHash();
 drawEdit(); render();
}
async function deleteRoutine(id){
 routines=routines.filter(x=>x.id!==id);
 await Store.set('gt4_routines',routines);
 drawRoutines();
}
function drawRoutines(){
 const box=document.getElementById('routineBody'); if(!box) return;
 if(!routines.length){ box.innerHTML='<div class="note">No saved routines yet.</div>'; return; }
 box.innerHTML=routines.map(r=>'<div class="erow" data-id="'+r.id+'"><div class="en"><b>'+r.label+'</b>'+
  '<small>'+r.days.length+' day'+(r.days.length===1?'':'s')+' · saved '+shortDate(r.savedISO)+'</small></div>'+
  '<button class="mini rload" style="width:auto;padding:0 10px;font-size:11px">Load</button>'+
  '<button class="mini del rdel" style="width:auto;padding:0 10px;font-size:11px">Delete</button></div>').join('');
 box.querySelectorAll('.erow').forEach(row=>{
  const id=row.dataset.id;
  row.querySelector('.rload').addEventListener('click',()=>loadRoutine(id));
  row.querySelector('.rdel').addEventListener('click',()=>deleteRoutine(id));
 });
}

