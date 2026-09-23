/* ============ CHART ============ */
function buildChart(pts,pts2){
 if(!pts.length)return '';
 const W=320,H=150,pl=30,pr=14,pt=18,pb=26;
 const vals=pts.concat(pts2||[]).map(p=>p.val);
 let mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals);
 if(mn===mx){mn=Math.max(0,mn-5);mx=mx+5;}
 const rg=mx-mn||1, iw=W-pl-pr, ih=H-pt-pb;
 const X=i=>pts.length===1?pl+iw/2:pl+(i/(pts.length-1))*iw, Y=v=>pt+ih-((v-mn)/rg)*ih;
 const top=Math.max.apply(null,pts.map(p=>p.val)); let path='',dots='',lbls='';
 pts.forEach((p,i)=>{ path+=(i?'L':'M')+X(i).toFixed(1)+' '+Y(p.val).toFixed(1)+' ';
  dots+='<circle class="cx-dot '+(p.today?'today':(p.val===top?'best':''))+'" cx="'+X(i).toFixed(1)+'" cy="'+Y(p.val).toFixed(1)+'" r="'+(p.today?4.5:4)+'"/>';
  if(i===pts.length-1||p.val===top)lbls+='<text class="cx-lbl" x="'+X(i).toFixed(1)+'" y="'+(Y(p.val)-9).toFixed(1)+'" text-anchor="middle">'+p.val+'</text>'; });
 let path2='';
 if(pts2&&pts2.length>1) pts2.forEach((p,i)=>{ path2+=(i?'L':'M')+X(i).toFixed(1)+' '+Y(p.val).toFixed(1)+' '; });
 let ax='<text class="cx-ax" x="'+pl+'" y="'+(H-8)+'" text-anchor="start">'+pts[0].label+'</text>';
 if(pts.length>1)ax+='<text class="cx-ax" x="'+(W-pr)+'" y="'+(H-8)+'" text-anchor="end">'+pts[pts.length-1].label+'</text>';
 ax+='<text class="cx-ax" x="4" y="'+(pt+4)+'">'+mx+'</text><text class="cx-ax" x="4" y="'+(pt+ih)+'">'+mn+'</text>';
 return '<div class="chartwrap"><svg viewBox="0 0 '+W+' '+H+'">'+
  (path2?'<path class="cx-line2" d="'+path2.trim()+'"/>':'')+
  (pts.length>1?'<path class="cx-line" d="'+path.trim()+'"/>':'')+dots+lbls+ax+'</svg></div>';
}
function openChart(exId,dId){
 const alt=swaps[exId]||null, k=hkey(exId,alt);
 document.getElementById('chartTitle').textContent=vName(exId,alt);
 const h=hist[k]||[], pts=h.map(e=>({label:shortDate(e.date),val:e.top}));
 const pts2=h.map(e=>({label:shortDate(e.date),val:Math.round(e1RM(e.top,e.reps)*10)/10}));
 const live=dId?curTop(dId,exId):null;
 if(live!==null){
  pts.push({label:'Today',val:live,today:true});
  const liveT=dId?topWithReps(dId,exId):null;
  pts2.push({label:'Today',val:Math.round(e1RM(live,liveT&&liveT.reps)*10)/10,today:true});
 }
 const body=document.getElementById('chartBody');
 if(!pts.length){ body.innerHTML='<div class="empty">No weights logged for this yet.<br>Log a weight and finish a session — your top set charts here.</div>'; }
 else{ const best=Math.max.apply(null,pts.map(p=>p.val)), last=pts[pts.length-1];
  const lastH=h[h.length-1], liveR=live!==null?(topWithReps(dId,exId)||{}).reps:null;
  const est1rm=live!==null?e1RMShown(live,liveR):(lastH?e1RMShown(lastH.top,lastH.reps):null);
  let target='';
  /* targets from this day's item if there is one, else wherever it's planned */
  const pool=(dId?day(dId).items:[]).concat(...PLAN.days.map(x=>x.items)), planIt=pool.find(x=>x.ex===exId)||null;
  const co=coach(k,planIt);
  if(co) target='<div class="note"><b>Next time:</b> '+coachText(co)+'</div>';
  const trend=trendFor(k);
  const trendTxt=trend==='up'?' Trending up over your last sessions.':trend==='down'?' Trending down over your last sessions.':trend==='flat'?' Holding flat over your last sessions.':'';
  body.innerHTML=buildChart(pts,pts.length>1?pts2:null)+'<div class="stats"><div class="stat"><b>'+best+'</b><span>Best kg</span></div>'+
   '<div class="stat"><b>'+last.val+'</b><span>'+(last.today?'Today':'Latest')+' kg</span></div>'+
   '<div class="stat"><b>'+(est1rm!==null?est1rm:'—')+'</b><span>Est. 1RM</span></div></div>'+
   (est1rm===null&&lastH&&lastH.reps>10?'<div class="note">Est. 1RM is only worked out from sets of 10 reps or fewer — above that the formula overestimates badly. Rep records below are the honest measure.</div>':'')+
   '<div class="note">'+h.length+' session'+(h.length===1?'':'s')+' logged.'+trendTxt+'</div>'+target+
   repRecordBlock(k)+incBlock(k)+variantBlock(exId,k)+
   '<h5 style="margin:18px 0 8px">Sessions</h5><div id="histRows">'+histRows(h)+'</div>'+
   (h.length?'<div class="note">Edit a weight or reps directly, or delete a mis-logged entry — saves immediately.</div>':'');
  wireHistRows(k,exId,dId);
  const ii=document.getElementById('incInput');
  if(ii) ii.addEventListener('change',async()=>{ await setInc(k,ii.value); openChart(exId,dId); render(); });
 }
 applyAccent(); document.getElementById('chartbg').classList.add('show');
}
/* Past-session list: shown newest-first, but each row's data-i is the index
   into the actual (chronological) hist[k] array, so edits/deletes address
   the right entry regardless of display order. */
function histRows(h){
 if(!h.length) return '<div class="note">No sessions logged yet.</div>';
 return h.map((e,i)=>({e,i})).sort((a,b)=>a.e.date<b.e.date?1:-1)
  .map(({e,i})=>'<div class="histrow" data-i="'+i+'"><span class="hdt">'+shortDate(e.date)+'</span>'+
   '<input class="hw" inputmode="decimal" value="'+e.top+'"><span class="hx">kg ×</span>'+
   '<input class="hrp" inputmode="numeric" value="'+(e.reps!=null?e.reps:'')+'">'+
   '<button class="mini del hdel">×</button></div>').join('');
}
function wireHistRows(k,exId,dId){
 const box=document.getElementById('histRows'); if(!box) return;
 box.querySelectorAll('.histrow').forEach(row=>{
  const i=+row.dataset.i, hw=row.querySelector('.hw'), hrp=row.querySelector('.hrp'), del=row.querySelector('.hdel');
  const commit=async()=>{
   const arr=hist[k]; if(!arr||!arr[i]) return;
   const w=parseFloat(hw.value); if(isNaN(w)) return;
   const r=parseInt(hrp.value,10);
   arr[i].top=w; arr[i].reps=isNaN(r)?null:r;
   arr.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
   await Store.set('gt4_hist',hist);
   openChart(exId,dId);
  };
  hw.addEventListener('change',commit); hrp.addEventListener('change',commit);
  del.addEventListener('click',async()=>{
   const arr=hist[k]; if(!arr) return;
   arr.splice(i,1);
   if(!arr.length) delete hist[k];
   await Store.set('gt4_hist',hist);
   openChart(exId,dId);
  });
 });
}
function repRecordBlock(k){
 const rr=repRecords(k), ns=REP_BUCKETS.filter(n=>rr[n]);
 if(!ns.length) return '';
 return '<h5 style="margin:18px 0 8px">Rep records</h5>'+ns.map(n=>'<div class="goal"><span class="nm">'+n+'+ reps</span>'+
  '<span class="tg">'+rr[n].w+'kg</span><span class="dt" style="margin-left:8px">'+shortDate(rr[n].date)+'</span></div>').join('')+
  '<div class="note">Heaviest weight you\'ve done for at least that many reps. Beating any row is a PB.</div>';
}
function incBlock(k){
 return '<div class="erow" style="margin-top:14px"><div class="en"><b>Weight jump</b>'+
  '<small>How much to add when every set hits its target'+(incFor(k)===0?' — 0 means bodyweight, reps only':'')+'.</small></div>'+
  '<input id="incInput" inputmode="decimal" value="'+incFor(k)+'" style="width:64px"><span class="small" style="margin-left:6px">kg</span></div>';
}
function variantBlock(exId,activeKey){
 const vm=variantMap(exId), keys=Object.keys(vm);
 if(keys.length<2) return '<div class="note">Tracked separately from other variations, so the numbers stay comparable.</div>';
 let rows=keys.map(k=>({k,nm:vm[k],b:pbOf(k)})).filter(x=>x.b).sort((a,b)=>b.b.w-a.b.w);
 return '<h5 style="margin:18px 0 8px">All variations</h5>'+
  rows.map(r=>'<div class="cue"><span class="n">'+(r.k===activeKey?'●':'·')+'</span><span><b>'+r.nm+'</b> — '+
   r.b.w+'kg'+(r.b.reps?' × '+r.b.reps:'')+', '+r.b.sessions+' session'+(r.b.sessions===1?'':'s')+'</span></div>').join('')+
  '<div class="note">Machines and free weights are not directly comparable, so each keeps its own record. Use this list to see where you stand on whichever one is free.</div>';
}
function closeChart(){ document.getElementById('chartbg').classList.remove('show'); }
document.getElementById('chartbg').addEventListener('click',e=>{ if(e.target.id==='chartbg')closeChart(); });

