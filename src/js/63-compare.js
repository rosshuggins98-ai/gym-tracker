/* ============ COMPARE: THEN VS NOW ============
   The Progress sheet's "How you're doing" section. Pick a span and it lines
   the last N days up against the N days before -- sessions, kg moved, PBs,
   bodyweight -- then every lift's best set then vs now, biggest gain first.
   "All time" compares each lift's first session with its best in the last
   4 weeks. Tap a lift to open its chart inline. Scores are entryScore(), as
   the coach uses, but rows show real sets, never estimated 1RMs. */
const SPANS=[{id:'1w',d:7,lbl:'Week'},{id:'4w',d:28,lbl:'4 weeks'},{id:'3m',d:91,lbl:'3 months'},{id:'all',d:0,lbl:'All time'}];
let cmpSpan='4w', cmpOpen=null;
/* [from, to) for the span ending today, and the same length before it. All
   time's "now" is the last 4 weeks and its "before" is everything. */
function spanWindows(id){ const sp=SPANS.find(s=>s.id===id)||SPANS[1], to=addDays(today(),1);
 const from=addDays(to,-(sp.d||28));
 return {sp,from,to,bFrom:sp.d?addDays(from,-sp.d):'0000',bTo:sp.d?from:to}; }
/* Entries from before per-set history have no vol; top x reps x planned sets
   is close enough for a total (10 reps where reps weren't logged either). */
function entryVol(k,e){ return typeof e.vol==='number'?e.vol:(e.top||0)*(e.reps||10)*plannedSetsFor(k); }
function spanTotals(from,to){ let vol=0; const ds={};
 Object.keys(hist).forEach(k=>(hist[k]||[]).forEach(e=>{ if(e.date>=from&&e.date<to){ vol+=entryVol(k,e); ds[e.date]=1; } }));
 return {sessions:Object.keys(ds).length,vol:Math.round(vol),
  pbs:recentPBs(1e9).filter(p=>p.date>=from&&p.date<to).length}; }
/* Latest bodyweight reading at or before a date (exclusive end). */
function bwAt(to){ let b=null; bodyweight.forEach(e=>{ if(e.date<to) b=e; }); return b; }
const topEntry=a=>a.reduce((b,e)=>entryScore(e)>entryScore(b)?e:b);
/* An entry whose working sets have reps logged. The first weeks' entries
   often have only a weight, which scores as one rep and would make every
   gain since then look huge. */
const withReps=e=>workSets(e).some(s=>s.r);
/* One row per lift trained in the "now" window: {k, nm, now, was, pct}.
   "was" is the best in the window before; else the latest session before
   the span; else (no history before it, or all time) the lift's first
   session. Baselines with reps are preferred; with only a weight to go on,
   pct compares top weights. A lift with one session ever is new (was null). */
function liftRows(id){ const W=spanWindows(id), rows=[];
 Object.keys(hist).forEach(k=>{ const h=(hist[k]||[]).slice().sort((a,b)=>a.date<b.date?-1:1);
  const inN=h.filter(e=>e.date>=W.from&&e.date<W.to); if(!inN.length) return;
  const now=topEntry(inN), pool=h.filter(e=>e!==now&&e.date<=now.date&&(!W.sp.d||e.date<W.from)), rp=pool.filter(withReps), c=rp.length?rp:pool;
  let was=null;
  if(W.sp.d&&c.length){ const inB=c.filter(e=>e.date>=W.bFrom); was=inB.length?topEntry(inB):c[c.length-1]; }
  else { const f=h.filter(e=>e!==now&&e.date<=now.date), fr=f.filter(withReps); was=(fr.length?fr:f)[0]||null; }
  const byW=was&&!(withReps(was)&&withReps(now)), a=was?(byW?was.top:entryScore(was)):0, b=byW?now.top:entryScore(now);
  rows.push({k,nm:keyName(k),now,was,pct:a>0?(b-a)/a:null}); });
 return rows.sort((x,y)=>(y.pct===null?-1e9:y.pct)-(x.pct===null?-1e9:x.pct)); }
function pctTxt(p){ const n=Math.round(p*100); return (n>0?'+':n<0?'−':'±')+Math.abs(n)+'%'; }
function deltaTag(a,b){ if(!a) return ''; const p=(b-a)/a;
 return '<em class="'+(p>0.02?'up':p<-0.02?'down':'flat')+'">'+pctTxt(p)+'</em>'; }
function liftDetail(k){ const h=(hist[k]||[]).slice().sort((a,b)=>a.date<b.date?-1:1);
 const pts=h.map(e=>({label:shortDate(e.date),val:e.top}));
 return '<div class="cmp-detail">'+buildChart(pts)+h.slice(-5).reverse().map(e=>'<div class="cmp-sess"><span>'+shortDate(e.date)+'</span>'+
  workSets(e).map(s=>(s.w>0?s.w+'×':'')+(s.r||'?')).join(', ')+'</div>').join('')+'</div>'; }
function compareBlock(){
 const W=spanWindows(cmpSpan), all=!W.sp.d, rows=liftRows(cmpSpan), first=allSessionDates()[0];
 let h='<div class="cmp-spans">'+SPANS.map(s=>'<button data-span="'+s.id+'"'+(s.id===cmpSpan?' class="on"':'')+'>'+s.lbl+'</button>').join('')+'</div>';
 h+='<div class="ck-sub">'+(all?'Since you started ('+shortDate(first)+') · each lift\'s first session vs its best in the last 4 weeks':
  'Last '+W.sp.lbl.toLowerCase()+' vs the '+W.sp.lbl.toLowerCase()+' before'+(first>=W.from?' · you started '+shortDate(first)+', so lifts compare with their first session':''))+'</div>';
 const N=spanTotals(all?'0000':W.from,W.to), B=all?null:spanTotals(W.bFrom,W.bTo);
 const bN=bwAt(W.to), bB=all?(bodyweight[0]||null):(bwAt(W.from)||bodyweight.find(e=>e.date>=W.from)||null), bwD=bN&&bB&&bN!==bB?Math.round((bN.kg-bB.kg)*10)/10:null;
 const tile=(v,l,d)=>'<div class="s"><b>'+v+'</b><span>'+l+'</span>'+(d||'')+'</div>';
 h+='<div class="bigstat cmp-tiles">'+tile(N.sessions,'Sessions',B?deltaTag(B.sessions,N.sessions):'')+
  tile(N.vol>=10000?(N.vol/1000).toFixed(1)+'k':N.vol,'kg lifted',B?deltaTag(B.vol,N.vol):'')+
  tile(N.pbs,'PBs','')+'</div>';
 if(bwD!==null) h+='<div class="note">Bodyweight '+(bwD>0?'+':'')+bwD+'kg ('+bB.kg+' → '+bN.kg+')'+(all?' since your first reading.':' over the span.')+'</div>';
 const cmp=rows.filter(r=>r.pct!==null), up=cmp.filter(r=>r.pct>0.02), down=cmp.filter(r=>r.pct<-0.02);
 if(!rows.length){ h+='<div class="note">Nothing logged in this span yet.</div>'; return h; }
 /* The median, so one lift that changed kit (a 16kg dumbbell row logged
    as the machine row) can't swing it. */
 if(cmp.length){ const ps=cmp.map(r=>r.pct).sort((a,b)=>a-b), m=ps.length>>1, avg=ps.length%2?ps[m]:(ps[m-1]+ps[m])/2;
  h+='<div class="ck-line '+(avg>=0?'good':'warn')+'">Stronger on <b>'+up.length+' of '+cmp.length+'</b> lifts'+
   (down.length?', down on '+down.length:'')+' · typical change '+pctTxt(avg)+'.</div>'; }
 h+=rows.map(r=>'<div class="cmp-row'+(cmpOpen===r.k?' open':'')+'" data-k="'+r.k+'"><div class="cmp-top"><span class="nm">'+r.nm+'</span>'+
  (r.pct===null?'<em class="new">new</em>':'<em class="'+(r.pct>0.02?'up':r.pct<-0.02?'down':'flat')+'">'+pctTxt(r.pct)+'</em>')+'</div>'+
  '<div class="cmp-sets">'+(r.was?setTxt(bestSet(r.was))+' <small>'+shortDate(r.was.date)+'</small> → ':'')+
  '<b>'+setTxt(bestSet(r.now))+'</b> <small>'+shortDate(r.now.date)+'</small></div>'+
  (cmpOpen===r.k?liftDetail(r.k):'')+'</div>').join('');
 h+='<div class="note">Best set in each span by weight and reps together, so 20kg × 13 beats 20kg × 10. Tap a lift for its chart.</div>';
 return h; }
function wireCompare(){ const box=document.getElementById('cmpBox'); if(!box) return;
 const redo=()=>{ box.innerHTML=compareBlock(); wireCompare(); };
 box.querySelectorAll('[data-span]').forEach(b=>b.addEventListener('click',()=>{ cmpSpan=b.dataset.span; cmpOpen=null; redo(); }));
 box.querySelectorAll('.cmp-row').forEach(r=>r.addEventListener('click',()=>{ cmpOpen=cmpOpen===r.dataset.k?null:r.dataset.k; redo(); })); }
