/* ============ CHART ============
   Points are {label, val, date?, today?, home?}. When every point has a date
   (ISO day) they are placed by date, so a week off shows as a gap rather
   than looking like back-to-back sessions; without dates they're spaced
   evenly. Past 30 points the dots shrink, so a few months still read at
   phone width. */
function buildChart(pts,pts2){
 if(!pts.length)return '';
 const vals=pts.concat(pts2||[]).map(p=>p.val);
 let mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals);
 if(mn===mx){mn=Math.max(0,mn-5);mx=mx+5;}
 /* the left margin fits the longer y label ("540", "18.7", "12.4k"), so the
    first dot never sits on it */
 const W=320,H=150,pl=Math.max(30,12+6*Math.max(chartNum(mx).length,chartNum(mn).length)),pr=14,pt=18,pb=26;
 const rg=mx-mn||1, iw=W-pl-pr, ih=H-pt-pb;
 const byDate=pts.every(p=>p.date), ts=byDate?pts.map(p=>Date.parse(p.date)):[];
 const t0=byDate?Math.min.apply(null,ts):0, t1=byDate?Math.max.apply(null,ts):0;
 /* x for point i of a series; a series of its own (pts2) is placed by its
    own dates, or by index alongside pts when it has none */
 const X=(i,p)=>{ if(byDate&&p&&p.date) return t1===t0?pl+iw/2:pl+((Date.parse(p.date)-t0)/(t1-t0))*iw;
  return pts.length===1?pl+iw/2:pl+(i/(pts.length-1))*iw; }, Y=v=>pt+ih-((v-mn)/rg)*ih;
 const r=pts.length>30?3:4;
 const top=Math.max.apply(null,pts.map(p=>p.val)); let path='',dots='',lbls='';
 /* Value labels go on the latest point and on the first time the best was
    reached -- not on every tie for the best, which stacked into "2222". The
    best's label is dropped when it would sit on top of the latest's. */
 const last=pts.length-1, bi=pts.findIndex(p=>p.val===top);
 const nearLast=Math.abs(X(bi,pts[bi])-X(last,pts[last]))<26&&Math.abs(Y(top)-Y(pts[last].val))<14;
 pts.forEach((p,i)=>{ const x=X(i,p).toFixed(1); path+=(i?'L':'M')+x+' '+Y(p.val).toFixed(1)+' ';
  dots+='<circle class="cx-dot '+(p.today?'today':(p.val===top?'best':''))+(p.home?' home':'')+'" cx="'+x+'" cy="'+Y(p.val).toFixed(1)+'" r="'+(p.today?r+.5:r)+'"/>';
  if(i===last||(i===bi&&!nearLast))lbls+='<text class="cx-lbl" x="'+x+'" y="'+(Y(p.val)-9).toFixed(1)+'" text-anchor="middle">'+chartNum(p.val)+'</text>'; });
 let path2='';
 if(pts2&&pts2.length>1) pts2.forEach((p,i)=>{ path2+=(i?'L':'M')+X(i,p).toFixed(1)+' '+Y(p.val).toFixed(1)+' '; });
 let ax='<text class="cx-ax" x="'+pl+'" y="'+(H-8)+'" text-anchor="start">'+pts[0].label+'</text>';
 if(pts.length>1)ax+='<text class="cx-ax" x="'+(W-pr)+'" y="'+(H-8)+'" text-anchor="end">'+pts[pts.length-1].label+'</text>';
 ax+='<text class="cx-ax" x="4" y="'+(pt+4)+'">'+chartNum(mx)+'</text><text class="cx-ax" x="4" y="'+(pt+ih)+'">'+chartNum(mn)+'</text>';
 return '<div class="chartwrap"><svg viewBox="0 0 '+W+' '+H+'">'+
  (path2?'<path class="cx-line2" d="'+path2.trim()+'"/>':'')+
  (pts.length>1?'<path class="cx-line" d="'+path.trim()+'"/>':'')+dots+lbls+ax+'</svg></div>';
}
/* --- Range ----------------------------------------------------------------
   The chart sheet's range chips: Compare's spans minus the single week, which
   is too few sessions to draw. Kept for the session in a variable (like
   cmpSpan), so it stays put from one exercise to the next. */
const CHART_SPANS=SPANS.filter(s=>s.id!=='1w');
let chartSpan='all';
/* First day inside the span (ending today), or null for all time -- the same
   window as Compare's spanWindows(). */
function chartFrom(span){ const sp=SPANS.find(s=>s.id===span); return sp&&sp.d?addDays(addDays(today(),1),-sp.d):null; }
/* History entries for a key inside the span, oldest first. */
function chartEntries(k,span){ const from=chartFrom(span);
 return (hist[k]||[]).filter(e=>e&&e.date&&(!from||e.date>=from))
  .sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0); }
/* --- Metric ---------------------------------------------------------------
   What the line shows. Top set is the default (the measure Ross chose); a
   bodyweight lift has no weight to chart, so it shows reps. The choice holds
   for the session, like the range. */
const CHART_METRICS=[{id:'top',lbl:'Top set',unit:'kg'},{id:'e1rm',lbl:'Est. 1RM',unit:'kg'},
 {id:'vol',lbl:'Volume',unit:'kg'},{id:'reps',lbl:'Reps',unit:'reps'}];
let chartMetric='top';
/* Reps only: a zero weight jump means bodyweight (incFor), and so does a lift
   whose every session was logged at 0kg. */
function chartBodyweight(k){ const h=hist[k]||[]; return incFor(k)===0||(h.length>0&&h.every(e=>!e.top)); }
function chartMetricFor(k){ return chartBodyweight(k)?'reps':chartMetric; }
/* One entry's value for a metric, or null when it can't be worked out
   honestly -- the point is then left off rather than guessed:
   - e1rm: best estimate from a working set of 10 reps or fewer (e1RMShown's
     rule); older entries without sets fall back to the top set (workSets)
   - vol: recorded from 2026-09-11 only; earlier entries have none
   - reps: reps at the top set */
function chartVal(e,metric){
 if(!e) return null;
 if(metric==='e1rm'){ let m=null; workSets(e).forEach(s=>{ const v=s.w>0?e1RMShown(s.w,s.r):null; if(v!==null&&(m===null||v>m)) m=v; }); return m; }
 if(metric==='vol') return typeof e.vol==='number'&&e.vol>0?Math.round(e.vol):null;
 if(metric==='reps') return typeof e.reps==='number'&&e.reps>0?e.reps:null;
 return typeof e.top==='number'&&!isNaN(e.top)?e.top:null; }
/* [{date, label, val, home}] for one metric over a span. */
function chartSeries(k,metric,span){
 return chartEntries(k,span).map(e=>({date:e.date,label:shortDate(e.date),val:chartVal(e,metric),home:placeOf(e)==='home'}))
  .filter(p=>p.val!==null); }
/* Today's unfinished session as an entry, the shape chartVal() reads. */
function chartLiveEntry(dId,exId){ const t=dId?topWithReps(dId,exId):null; if(!t) return null;
 const a=cur[dId]&&cur[dId][exId];
 return {date:today(),top:t.top,reps:t.reps,vol:exVolume(a),sets:doneSets(a)}; }
/* Axis and point labels: 12,400 reads as 12.4k so it fits the axis. */
function chartNum(v){ return v>=10000?(Math.round(v/100)/10)+'k':String(v); }
function chartSpanChips(){
 return '<div class="cmp-spans chart-spans">'+CHART_SPANS.map(s=>'<button data-cspan="'+s.id+'"'+(s.id===chartSpan?' class="on"':'')+'>'+s.lbl+'</button>').join('')+'</div>'; }
function chartMetricChips(k){
 if(chartBodyweight(k)) return '';
 const m=chartMetricFor(k);
 return '<div class="cmp-spans chart-metrics">'+CHART_METRICS.map(x=>'<button data-cmetric="'+x.id+'"'+(x.id===m?' class="on"':'')+'>'+x.lbl+'</button>').join('')+'</div>'; }
/* The note under the tiles: what the line is, and why any session is missing. */
function chartMetricNote(k,metric,inSpan){
 const left=inSpan.filter(e=>chartVal(e,metric)===null).length, s=n=>n+' session'+(n===1?'':'s');
 if(metric==='reps') return chartBodyweight(k)?'A bodyweight lift, so this charts the reps of your best set each session.':'Reps of your top set each session.';
 if(metric==='e1rm') return 'Estimated one-rep max from your best set of 10 reps or fewer.'+
  (left?' '+s(left)+' had only higher-rep sets, where the estimate overshoots badly, so they aren\'t shown. Rep records below are the honest measure there.':'');
 if(metric==='vol') return 'Kg × reps across your working sets each session (warm-ups not counted).'+
  (left?' '+s(left)+' have no volume recorded (it started on 11 Sep), so they aren\'t shown.':'');
 return 'Heaviest working set each session.'; }
function openChart(exId,dId){
 const alt=swaps[exId]||null, k=hkey(exId,alt);
 document.getElementById('chartTitle').textContent=vName(exId,alt);
 const h=hist[k]||[], sp=CHART_SPANS.find(s=>s.id===chartSpan)||CHART_SPANS[CHART_SPANS.length-1];
 const metric=chartMetricFor(k), M=CHART_METRICS.find(x=>x.id===metric);
 const inSpan=chartEntries(k,chartSpan), pts=chartSeries(k,metric,chartSpan);
 const liveE=chartLiveEntry(dId,exId), liveV=chartVal(liveE,metric);
 if(liveV!==null) pts.push({date:today(),label:'Today',val:liveV,today:true,home:PLACE==='home'});
 const body=document.getElementById('chartBody');
 if(!h.length&&!liveE){ body.innerHTML='<div class="empty">No weights logged for this yet.<br>Log a weight and finish a session — your top set charts here.</div>'; }
 else{ const best=pts.length?Math.max.apply(null,pts.map(p=>p.val)):null, last=pts.length?pts[pts.length-1]:null;
  /* change across what's on screen: latest point against the first */
  const chg=pts.length>1?Math.round((last.val-pts[0].val)*10)/10:null;
  const bestLbl=({'4w':'4-wk best','3m':'3-mo best'}[sp.id])||'Best '+M.unit;
  let target='';
  /* targets from this day's item if there is one, else wherever it's planned */
  const pool=(dId?day(dId).items:[]).concat(...PLAN.days.map(x=>x.items)), planIt=pool.find(x=>x.ex===exId)||null;
  const co=coach(k,planIt);
  if(co) target='<div class="note"><b>Next time:</b> '+coachText(co)+'</div>';
  const trend=trendFor(k);
  const trendTxt=trend==='up'?' Trending up over your last sessions.':trend==='down'?' Trending down over your last sessions.':trend==='flat'?' Holding flat over your last sessions.':'';
  const chart=pts.length?buildChart(pts):
   '<div class="note">'+(inSpan.length?'None of the sessions in this range can show '+M.lbl.toLowerCase()+' (see below).':
    'Nothing logged in the last '+sp.lbl.toLowerCase()+'. Pick a longer range to see this lift.')+'</div>';
  body.innerHTML=chartSpanChips()+chartMetricChips(k)+chart+
   '<div class="stats"><div class="stat"><b>'+(best!==null?chartNum(best):'—')+'</b><span>'+bestLbl+'</span></div>'+
   '<div class="stat"><b>'+(last?chartNum(last.val):'—')+'</b><span>'+(last&&last.today?'Today':'Latest')+' '+M.unit+'</span></div>'+
   '<div class="stat"><b>'+(chg!==null?(chg>0?'+':chg<0?'−':'±')+chartNum(Math.abs(chg)):'—')+'</b><span>Change '+M.unit+'</span></div></div>'+
   '<div class="note">'+chartMetricNote(k,metric,inSpan)+'</div>'+
   '<div class="note">'+h.length+' session'+(h.length===1?'':'s')+' logged'+(sp.d?', '+inSpan.length+' in the last '+sp.lbl.toLowerCase():'')+'.'+trendTxt+
   (pts.some(p=>p.home)?' Ringed dots are home sessions.':'')+'</div>'+target+
   repRecordBlock(k)+incBlock(k)+variantBlock(exId,k)+
   '<h5 style="margin:18px 0 8px">Sessions</h5><div id="histRows">'+histRows(h)+'</div>'+
   (h.length?'<div class="note">Edit a weight or reps directly, or delete a mis-logged entry — saves immediately. Tap Gym / Home to move that whole day\'s session to the other place.</div>':'');
  wireHistRows(k,exId,dId);
  body.querySelectorAll('[data-cspan]').forEach(b=>b.addEventListener('click',()=>{ chartSpan=b.dataset.cspan; openChart(exId,dId); }));
  body.querySelectorAll('[data-cmetric]').forEach(b=>b.addEventListener('click',()=>{ chartMetric=b.dataset.cmetric; openChart(exId,dId); }));
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
  .map(({e,i})=>'<div class="histrow" data-i="'+i+'"><span class="hdt">'+shortDate(e.date)+
   (effortOf(e.date)?'<i class="eff '+effortOf(e.date)+'">'+EFFORTS[effortOf(e.date)]+'</i>':'')+'</span>'+
   '<input class="hw" inputmode="decimal" value="'+e.top+'"><span class="hx">kg ×</span>'+
   '<input class="hrp" inputmode="numeric" value="'+(e.reps!=null?e.reps:'')+'">'+
   '<button class="mini hpl'+(placeOf(e)==='home'?' home':'')+'">'+PLACES[placeOf(e)]+'</button>'+
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
  /* Gym <-> home for the whole session that day, every lift in it. */
  row.querySelector('.hpl').addEventListener('click',async()=>{
   const e=hist[k]&&hist[k][i]; if(!e) return;
   await tagDate(e.date,placeOf(e)==='home'?'gym':'home'); openChart(exId,dId); render(); });
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

