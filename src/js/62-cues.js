/* ============ CUES ============ */
function openCue(exId){
 const L=LIB[exId], k=hkey(exId,swaps[exId]||null);
 document.getElementById('cueTitle').textContent=exName(exId);
 document.getElementById('cueBody').innerHTML=(L&&L.c?L.c:['No cues saved for this one yet.'])
  .map((t,i)=>'<div class="cue"><span class="n">'+(i+1)+'</span><span>'+t+'</span></div>').join('')+
  '<div class="note">Form beats weight every time as a beginner. If your form breaks down, that set is done.</div>'+
  '<h5>Your note</h5><p class="small" style="margin-bottom:8px">Machine settings, bench angle, grip width — whatever helps you set up the same way next time.</p>'+
  '<textarea id="noteText" placeholder="e.g. pin 4, seat height 3" style="width:100%;min-height:76px;background:var(--card2);'+
  'border:1px solid var(--line);border-radius:12px;color:var(--text);font-family:inherit;font-size:14px;padding:10px;outline:none;resize:vertical"></textarea>'+
  '<div class="note" id="noteSaved" style="min-height:14px"></div>';
 const nt=document.getElementById('noteText'); nt.value=noteFor(k);
 let nSaveT=null;
 nt.addEventListener('input',()=>{
  clearTimeout(nSaveT);
  nSaveT=setTimeout(async()=>{
   if(nt.value) notes[k]=nt.value; else delete notes[k];
   await Store.set('gt4_notes',notes);
   const sv=document.getElementById('noteSaved'); if(sv){ sv.textContent='Saved'; setTimeout(()=>{ if(sv)sv.textContent=''; },1000); }
  },400);
 });
 applyAccent(); document.getElementById('cuebg').classList.add('show');
}
function closeCue(){ document.getElementById('cuebg').classList.remove('show'); render(); }
document.getElementById('cuebg').addEventListener('click',e=>{ if(e.target.id==='cuebg')closeCue(); });

