/* ============ SWAP ============ */
let swapT=null;
function openSwap(exId){ swapT=exId; const L=LIB[exId]||{alts:[]}, alt=swaps[exId]||null;
 document.getElementById('swapTitle').textContent=exName(exId);
 const list=document.getElementById('swapList'); list.innerHTML='';
 const hasData=curTop(ACTIVE,exId)!==null;
 if(hasData){ const w=document.createElement('p'); w.className='small';
  w.innerHTML='<b>You have weights logged for this exercise today.</b> They will be recorded under whichever option is selected when you finish the session — so pick the one you actually did.';
  list.appendChild(w); }
 [{n:exName(exId),v:null,f:'Planned'}].concat((L.alts||[]).map(a=>({n:a,v:a,f:''}))).forEach(o=>{
  const b=document.createElement('button'); b.className='opt'+(alt===o.v?' on':'');
  const bs=bestOf(hkey(exId,o.v));
  b.innerHTML='<span>'+o.n+(bs!==null?'<small>best '+bs+'kg logged</small>':'<small>no history yet</small>')+'</span><span class="flag">'+(alt===o.v?'Using':o.f)+'</span>';
  b.addEventListener('click',()=>chooseSwap(o.v)); list.appendChild(b); });
 applyAccent(); document.getElementById('swapbg').classList.add('show');
}
async function chooseSwap(v){ const id=swapT; if(!id)return;
 if(v===null)delete swaps[id]; else swaps[id]=v;
 await Store.set('gt4_swaps',swaps); mirrorHash(); closeSwap(); render(); }
function closeSwap(){ document.getElementById('swapbg').classList.remove('show'); }
document.getElementById('swapbg').addEventListener('click',e=>{ if(e.target.id==='swapbg')closeSwap(); });

