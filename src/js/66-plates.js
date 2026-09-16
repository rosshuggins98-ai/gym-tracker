/* ============ PLATE CALCULATOR ============ */
const PLATES=[25,20,15,10,5,2.5,1.25];   /* standard kg Olympic set, assumed unlimited per size */
let BARWEIGHT=20;   /* kg, configurable; persisted separately from any one exercise */
/* Greedy largest-first breakdown of one side's weight into available plates.
   Snaps to the nearest multiple of the smallest plate (1.25kg) first, since
   that's the actual achievable resolution -- anything finer isn't loadable. */
function platesFor(perSide){
 let remaining=Math.round(Math.max(0,perSide)/1.25)*1.25;
 remaining=Math.round(remaining*100)/100;
 const achieved=remaining, out=[];
 PLATES.forEach(p=>{ while(remaining>=p-1e-9){ out.push(p); remaining=Math.round((remaining-p)*100)/100; } });
 return {plates:out,perSide:achieved};
}
/* Full calculation for a target total (bar + both sides). */
function plateCalc(target,barW){
 barW=(barW===undefined||barW===null)?BARWEIGHT:barW;
 if(!(target>barW)) return {short:true,barW:barW};
 const {plates,perSide}=platesFor((target-barW)/2);
 const achievedTotal=Math.round((barW+perSide*2)*100)/100;
 return {short:false,barW:barW,perSide:perSide,plates:plates,
  achievedTotal:achievedTotal,exact:Math.abs(achievedTotal-target)<0.01};
}
function openPlates(exId,dId){
 document.getElementById('plateTitle').textContent='Plates — '+exName(exId);
 const seed=(dId&&curTop(dId,exId)!==null)?curTop(dId,exId):(bestOf(hkey(exId,swaps[exId]||null))||BARWEIGHT*2);
 const body=document.getElementById('plateBody');
 body.innerHTML='<div class="step" style="justify-content:center">'+
   '<span class="sv">Bar</span><button class="sb" id="barMinus">&minus;</button>'+
   '<span class="sv" id="barVal">'+BARWEIGHT+'kg</span><button class="sb" id="barPlus">+</button></div>'+
  '<div style="max-width:170px;margin:14px auto 4px"><input id="plateTarget" inputmode="decimal" value="'+seed+'" '+
   'style="width:100%;background:var(--card2);border:1px solid var(--line);border-radius:11px;color:var(--text);'+
   'font-family:inherit;font-weight:700;font-size:20px;text-align:center;padding:12px 4px;outline:none"></div>'+
  '<div class="note" style="text-align:center;margin-top:0">target total, kg</div>'+
  '<div id="plateResult"></div>';
 const tI=document.getElementById('plateTarget');
 const refresh=()=>{ const v=parseFloat(tI.value); renderPlateResult(isNaN(v)?0:v); };
 tI.addEventListener('input',refresh);
 document.getElementById('barMinus').addEventListener('click',async()=>{
  BARWEIGHT=Math.max(0,Math.round((BARWEIGHT-2.5)*100)/100);
  await Store.set('gt4_barweight',BARWEIGHT);
  document.getElementById('barVal').textContent=BARWEIGHT+'kg'; refresh(); });
 document.getElementById('barPlus').addEventListener('click',async()=>{
  BARWEIGHT=Math.round((BARWEIGHT+2.5)*100)/100;
  await Store.set('gt4_barweight',BARWEIGHT);
  document.getElementById('barVal').textContent=BARWEIGHT+'kg'; refresh(); });
 refresh();
 applyAccent(); document.getElementById('platebg').classList.add('show');
}
function renderPlateResult(target){
 const el=document.getElementById('plateResult'), r=plateCalc(target,BARWEIGHT);
 if(r.short){ el.innerHTML='<div class="empty">At or below the bar ('+r.barW+'kg) — nothing to load.</div>'; return; }
 let h='<div class="bigstat"><div class="s"><b>'+r.barW+'</b><span>Bar kg</span></div>'+
  '<div class="s"><b>'+r.perSide+'</b><span>Per side kg</span></div>'+
  '<div class="s"><b>'+r.achievedTotal+'</b><span>Total kg</span></div></div>';
 if(r.plates.length){
  h+='<h5>Load per side, largest first</h5><div class="meta" style="margin:10px 2px 4px">'+
   r.plates.map(p=>'<span class="pill reps">'+p+'kg</span>').join('')+'</div>';
 } else {
  h+='<div class="note">Bar only — no plates needed.</div>';
 }
 if(!r.exact) h+='<div class="note"><b>Not exact.</b> Nearest loadable total is '+r.achievedTotal+
  'kg — smallest plate is 1.25kg per side, so anything finer than that isn’t achievable.</div>';
 el.innerHTML=h;
}
function closePlates(){ document.getElementById('platebg').classList.remove('show'); }
document.getElementById('platebg').addEventListener('click',e=>{ if(e.target.id==='platebg')closePlates(); });

