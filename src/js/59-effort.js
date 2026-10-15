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

/* --- Session note --------------------------------------------------------
   One short note per session date ("slept badly", "gym packed"), typed on
   the summary sheet, kept in gt4_sessnote and backups (sessNotes). Stored as
   typed and escaped wherever it's shown (escHTML), so "didn't" keeps its
   apostrophe. Shown on the chart's session rows and in "Where you trained". */
const SESSNOTE_MAX=140;
let sessNotes={};
function sessNoteOf(date){ return typeof sessNotes[date]==='string'?sessNotes[date]:''; }
async function setSessNote(date,t){ const v=String(t||'').replace(/\s+/g,' ').trim().slice(0,SESSNOTE_MAX);
 if(v) sessNotes[date]=v; else delete sessNotes[date];
 await Store.set('gt4_sessnote',sessNotes); }
function sessNoteRow(date){
 return '<input id="sumNote" maxlength="'+SESSNOTE_MAX+'" placeholder="Add a note (e.g. slept badly, gym packed)" value="'+escHTML(sessNoteOf(date))+'">'; }
/* Saves when the box loses focus or Enter is pressed, then re-runs the
   auto-backup like the effort rating does. */
function wireSessNote(date){ const el=document.getElementById('sumNote'); if(!el) return;
 el.addEventListener('change',async()=>{ await setSessNote(date,el.value); el.value=sessNoteOf(date); autoBackup(); }); }
