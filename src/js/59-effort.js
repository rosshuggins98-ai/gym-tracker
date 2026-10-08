/* ============ EFFORT: HOW THE SESSION FELT ============
   One tap on the summary sheet, stored per date (one session a day) in
   gt4_effort and backups, not per exercise. "Off day" (tired, ill, slept
   badly) is the one the coach acts on: those sessions are left out of what
   it judges, so a bad day can't trigger a "drop back" or a stall -- plain
   "hard" can mean the weight is heavy, which is normal after a jump. */
const EFFORTS={easy:'Easy',solid:'Solid',hard:'Hard',off:'Off day'};
let efforts={};
function effortOf(date){ return EFFORTS[efforts[date]]?efforts[date]:null; }
function offDay(e){ return !!e&&efforts[e.date]==='off'; }
/* Tapping the chosen rating again clears it. */
async function setEffort(date,v){
 if(!EFFORTS[v]||efforts[date]===v) delete efforts[date]; else efforts[date]=v;
 await Store.set('gt4_effort',efforts); }
function effortRow(date){ const cur=effortOf(date);
 return '<span class="lbl">How did it feel?</span>'+Object.keys(EFFORTS).map(v=>
  '<button data-v="'+v+'" class="'+v+(v===cur?' on':'')+'">'+EFFORTS[v]+'</button>').join('')+
  (cur==='off'?'<div class="note">Noted — the coach won\'t judge your lifts on this session.</div>':''); }
/* The summary's row: re-renders itself, and re-runs the auto-backup so the
   copy on the phone has the rating (the first one ran before it was tapped). */
function wireEffort(date){ const el=document.getElementById('sumEffort'); if(!el) return;
 el.querySelectorAll('button').forEach(b=>b.addEventListener('click',async()=>{
  await setEffort(date,b.dataset.v); el.innerHTML=effortRow(date); wireEffort(date); render(); autoBackup(); })); }
