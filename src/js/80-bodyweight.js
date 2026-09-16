/* ============ BODY WEIGHT ============
   One reading per day; logging again the same day replaces it. Kept apart
   from exercise history (different thing, different chart) but exported in
   the same backup and CSV. */
async function logBodyweight(kg,date){
 const v=Math.round(parseFloat(kg)*10)/10; if(isNaN(v)||v<=0) return false;
 const dt=date||today();
 bodyweight=bodyweight.filter(e=>e.date!==dt).concat([{date:dt,kg:v}]).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
 await Store.set('gt4_bodyweight',bodyweight); return true;
}
async function deleteBodyweight(date){
 bodyweight=bodyweight.filter(e=>e.date!==date); await Store.set('gt4_bodyweight',bodyweight);
}
/* Change over roughly the last 30 days: latest reading vs the earliest one
   inside the window (null with fewer than two readings in it). */
function bodyweightTrend(){
 if(bodyweight.length<2) return null;
 const last=bodyweight[bodyweight.length-1];
 const cutoff=new Date(new Date(last.date)-30*864e5).toISOString().slice(0,10);
 const win=bodyweight.filter(e=>e.date>=cutoff);
 if(win.length<2) return null;
 return {from:win[0],to:last,delta:Math.round((last.kg-win[0].kg)*10)/10,days:Math.round((new Date(last.date)-new Date(win[0].date))/864e5)};
}
function bodyweightBlock(){
 const last=bodyweight.length?bodyweight[bodyweight.length-1]:null, tr=bodyweightTrend();
 let h='<h5>Body weight</h5>';
 h+='<div class="erow" style="align-items:stretch"><div class="en" style="flex:1">'+
  '<input id="bwIn" inputmode="decimal" placeholder="'+(last?last.kg:'e.g. 82.4')+'" style="margin-top:0"></div>'+
  '<button class="mini" id="bwLog" style="width:auto;padding:0 12px;font-size:12px">Log today</button></div>';
 if(!last){ h+='<div class="note">Nothing logged yet. A reading every week or so is plenty — the chart shows the direction, not the daily noise.</div>'; return h; }
 const pts=bodyweight.slice(-20).map(e=>({label:shortDate(e.date),val:e.kg}));
 if(pts.length>1) h+=buildChart(pts,null);
 h+='<div class="stats"><div class="stat"><b>'+last.kg+'</b><span>Latest kg</span></div>'+
  '<div class="stat"><b>'+(tr?(tr.delta>0?'+':'')+tr.delta:'—')+'</b><span>'+(tr?'kg / '+tr.days+' days':'Change')+'</span></div>'+
  '<div class="stat"><b>'+bodyweight.length+'</b><span>Readings</span></div></div>'+
  '<div class="note">Latest '+shortDate(last.date)+'. <a href="#" id="bwDel" style="color:var(--warn)">Delete latest</a></div>';
 return h;
}
function wireBodyweight(rerender){
 const inp=document.getElementById('bwIn'), btn=document.getElementById('bwLog'), del=document.getElementById('bwDel');
 if(btn) btn.addEventListener('click',async()=>{ if(await logBodyweight(inp.value)) rerender(); });
 if(inp) inp.addEventListener('keydown',async e=>{ if(e.key==='Enter'&&await logBodyweight(inp.value)) rerender(); });
 if(del) del.addEventListener('click',async e=>{ e.preventDefault(); if(bodyweight.length){ await deleteBodyweight(bodyweight[bodyweight.length-1].date); rerender(); } });
}

