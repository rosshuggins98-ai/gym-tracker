/* ============ STRENGTH CHECK ============
   Agreed with Ross on 2026-10-26: "where am I strong, where could I use
   more focus, and how do I compare with other lifters". Three parts, shown
   on Progress (strengthBlock) and the chart sheet (slLink):

   1. Strengths and focus: his own lifts against themselves (last 4 weeks
      vs the 4 before, through liftThenNow, the same numbers as Compare),
      and the balance of working sets between opposing muscles. Sets, not
      kg, because machine numbers aren't comparable from one machine to the
      next (his two pushdown machines).
   2. Bench against other lifters: FitnessVolt's bench press standards by
      bodyweight (CC BY 4.0, credited where shown). His dumbbell bench is
      converted to a barbell equivalent. Only bench, because their open data
      covers barbell and bodyweight lifts, not dumbbells or machines.
   3. A link to Strength Level for each lift it has a page for. Their terms
      forbid copying their standards, so the app only links; it never
      fetches anything from either site. */

/* FitnessVolt bench press standards, kg, by bodyweight: [bw, Beginner,
   Novice, Intermediate, Advanced, Elite]. From
   fitnessvolt.com/strength-standards/bench-press (taken 2026-10-26,
   converted from lb). Licence CC BY 4.0, credit "Powered by FitnessVolt". */
const BENCH_STD={
 male:[[49.9,24.0,38.1,56.7,78.5,102.5],[54.4,28.6,44.0,63.5,86.6,112.0],[59.0,33.1,49.4,69.9,94.3,120.7],
  [63.5,37.6,54.9,76.7,101.6,129.3],[68.0,42.2,60.3,82.6,108.9,137.0],[72.6,46.3,65.3,88.9,115.7,144.7],
  [77.1,50.8,70.3,94.8,122.5,152.4],[81.6,54.9,75.3,100.2,128.8,159.7],[86.2,59.0,80.3,106.1,135.2,166.5],
  [90.7,63.1,84.8,111.6,141.5,173.3],[95.3,67.1,89.4,116.6,147.4,180.1],[99.8,70.8,93.9,122.0,153.3,186.4],
  [104.3,74.8,98.4,127.0,158.8,192.8],[108.9,78.5,103.0,132.0,164.2,198.7],[113.4,82.1,107.0,136.5,169.6,204.6],
  [117.9,86.2,111.1,141.5,175.1,210.5],[122.5,89.4,115.2,146.1,180.1,215.9],[127.0,93.0,119.3,150.6,185.1,221.4],
  [131.5,96.6,123.4,154.7,190.1,226.8],[136.1,99.8,127.0,159.2,194.6,231.8],[140.6,103.4,131.1,163.3,199.1,237.2]],
 female:[[40.8,8.6,18.1,32.2,50.3,71.2],[45.4,10.4,20.9,35.8,54.9,76.7],[49.9,12.2,23.6,39.5,59.0,81.6],
  [54.4,14.5,26.3,42.6,63.1,86.2],[59.0,16.3,28.6,45.8,67.1,90.7],[63.5,18.1,31.3,49.0,70.8,94.8],
  [68.0,19.5,33.6,51.7,73.9,98.9],[72.6,21.3,35.8,54.4,77.1,103.0],[77.1,23.1,37.6,57.2,80.3,106.6],
  [81.6,24.9,39.9,59.9,83.5,109.8],[86.2,26.3,42.2,62.1,86.6,113.4],[90.7,28.1,44.0,64.9,89.4,116.6],
  [95.3,29.5,45.8,67.1,92.1,119.7],[99.8,30.8,47.6,69.4,94.8,122.5],[104.3,32.7,49.4,71.2,97.1,125.6],
  [108.9,34.0,51.3,73.5,99.8,128.4],[113.4,35.4,53.1,75.7,102.1,131.1],[117.9,36.7,54.9,77.6,104.3,133.8]]};
const STD_LEVELS=['Beginner','Novice','Intermediate','Advanced','Elite'];
const FV_CREDIT='<a href="https://fitnessvolt.com/strength-standards/" target="_blank" rel="noopener">Powered by FitnessVolt</a> (CC BY 4.0)';
/* Two dumbbells press roughly 80% of what a barbell does. Approximate. */
const DB_TO_BB=0.8;

/* Who the standards are for. Only sex is kept here; bodyweight is the
   latest reading in the body weight log (80-bodyweight). gt4_profile, in
   backups as `profile`. */
let profile={};
async function setSex(s){ if(s==='male'||s==='female') profile.sex=s; else delete profile.sex; await Store.set('gt4_profile',profile); }
function latestBW(){ return bodyweight.length?bodyweight[bodyweight.length-1]:null; }

/* The five thresholds at a bodyweight, interpolated between table rows and
   clamped at the ends. */
function benchStd(sex,bw){ const T=BENCH_STD[sex]; if(!T||!(bw>0)) return null;
 if(bw<=T[0][0]) return T[0].slice(1);
 if(bw>=T[T.length-1][0]) return T[T.length-1].slice(1);
 let i=0; while(T[i+1][0]<bw) i++;
 const a=T[i], b=T[i+1], f=(bw-a[0])/(b[0]-a[0]);
 return a.slice(1).map((v,j)=>Math.round((v+(b[j+1]-v)*f)*10)/10); }

/* His best bench as a barbell 1-rep max over the last 8 weeks: a barbell
   bench if he has one, else dumbbell bench converted. Only sets of 10 reps
   or fewer, like the chart's Est. 1RM. {e1, from:'bench'|'dbbench', set} */
function benchBest(){ const from=addDays(today(),-56);
 const best=k=>{ let b=null; (hist[k]||[]).forEach(e=>{ if(e.date<from) return;
   workSets(e).forEach(s=>{ const v=e1RMShown(s.w,s.r); if(v&&s.w>0&&(!b||v>b.v)) b={v,set:s,date:e.date}; }); }); return b; };
 const bb=best('bench'); if(bb) return {e1:bb.v,from:'bench',set:bb.set,date:bb.date};
 const db=best('dbbench'); if(db) return {e1:Math.round(db.v*2/DB_TO_BB*10)/10,from:'dbbench',set:db.set,date:db.date};
 return null; }

/* Where an estimated max sits: {level (index of the highest threshold
   reached, -1 below Beginner), next (kg to the next level), std}. */
function benchLevel(e1,std){ if(!std) return null; let level=-1;
 std.forEach((v,i)=>{ if(e1>=v) level=i; });
 return {level,std,next:level<std.length-1?Math.round((std[level+1]-e1)*10)/10:null}; }

/* Lifts in the current plan, as the history keys they're logged under at the
   gym (the plan's own exercises, so the list stays about what he trains). */
function planKeys(){ const sw=gymSwapMap(), seen={}, out=[];
 PLAN.days.forEach(d=>d.items.forEach(it=>{ if(it.extra) return; const k=hkey(it.ex,sw[it.ex]||null); if(!seen[k]){ seen[k]=1; out.push(k); } }));
 return out; }

/* Strengths and focus. Moving: best gains over the last 4 weeks.
   Focus: stalled (no better in 3 sessions) or not up on the 4 weeks before. */
function strengthsFocus(){ const ks=planKeys(), rows=ks.map(k=>liftThenNow(k,'4w')).filter(r=>r&&r.was&&r.pct!==null);
 const moving=rows.filter(r=>r.pct>0.02).sort((a,b)=>b.pct-a.pct).slice(0,3);
 const focus=[]; ks.forEach(k=>{ const r=rows.find(x=>x.k===k);
  if(stalled(k)) focus.push({k,nm:keyName(k),why:'no better in its last 3 sessions'});
  else if(r&&r.pct<=0.02) focus.push({k,nm:keyName(k),why:r.pct<-0.02?pctTxt(r.pct)+' on the 4 weeks before':'level with the 4 weeks before'}); });
 return {moving,focus:focus.slice(0,4)}; }

/* Working sets in the last 4 weeks for each opposing pair. Flagged when the
   smaller side is under 75% of the bigger. */
const PAIRS=[{a:'back',b:'chest',an:'Pulling (back)',bn:'Pushing (chest)'},
 {a:'hamstrings',b:'quads',an:'Hamstrings',bn:'Quads'},{a:'biceps',b:'triceps',an:'Biceps',bn:'Triceps'}];
function pairBalance(){ const to=addDays(today(),1), s=setsByGroup(addDays(to,-28),to,false);
 return PAIRS.map(p=>{ const a=s[p.a]||0, b=s[p.b]||0, lo=Math.min(a,b), hi=Math.max(a,b);
  return Object.assign({},p,{na:a,nb:b,off:hi>0&&lo<hi*0.75,low:a<b?p.an:p.bn}); }).filter(p=>p.na||p.nb); }

function strengthBlock(){
 let h='<h5>Strengths and focus</h5>';
 const SF=strengthsFocus();
 if(SF.moving.length) h+='<div class="ck-line good">Moving fastest: '+SF.moving.map(r=>escHTML(r.nm)+' '+pctTxt(r.pct)).join(', ')+'</div>';
 if(SF.focus.length) h+='<div class="ck-line warn">Could use focus: '+SF.focus.map(f=>escHTML(f.nm)+' ('+f.why+')').join('; ')+'</div>';
 if(!SF.moving.length&&!SF.focus.length) h+='<div class="note">Needs a few more weeks of sessions to compare.</div>';
 const PB=pairBalance();
 if(PB.length){
  h+=PB.map(p=>{ const t=p.na+p.nb, w=t?Math.round(p.na/t*100):50;
   return '<div class="pair'+(p.off?' off':'')+'"><div class="pl"><span>'+p.an+' '+fmtSets(p.na)+'</span><span>'+fmtSets(p.nb)+' '+p.bn+'</span></div>'+
    '<div class="pbar"><i style="width:'+w+'%"></i></div></div>'; }).join('');
  const off=PB.filter(p=>p.off);
  h+='<div class="note">Working sets in the last 4 weeks. '+(off.length?'Behind: <b>'+off.map(p=>p.low).join('</b> and <b>')+'</b>. An extra set or two a week would even it up.':'All three pairs are close to even.')+
   ' Sets, not kg, because machines differ.</div>';
 }
 h+='<h5>Bench against other lifters</h5>'+benchBody();
 return h; }

function benchBody(){
 const sexBtns='<div class="place" id="sexPick"><span class="lbl">Compare with</span>'+[['male','Men'],['female','Women']].map(([v,l])=>
  '<button data-s="'+v+'"'+(profile.sex===v?' class="on"':'')+'>'+l+'</button>').join('')+'</div>';
 const bw=latestBW();
 if(!profile.sex||!bw) return sexBtns+(bw?'':'<div class="erow" style="align-items:stretch;margin-top:8px"><div class="en" style="flex:1"><input id="stdBw" inputmode="decimal" placeholder="Your bodyweight in kg" style="margin-top:0"></div>'+
  '<button class="mini" id="stdBwGo" style="width:auto;padding:0 12px;font-size:12px">Save</button></div>')+
  '<div class="note">Bench standards depend on bodyweight. One reading is enough; update it every few months.</div>';
 const B=benchBest();
 if(!B) return sexBtns+'<div class="note">Log a bench session (10 reps or fewer on a set) to see where it sits.</div>';
 const L=benchLevel(B.e1,benchStd(profile.sex,bw.kg)), lv=L.level>=0?STD_LEVELS[L.level]:'Working towards Beginner';
 const max=L.std[4]*1.05, pos=v=>Math.min(100,Math.round(v/max*100));
 let h=sexBtns+'<div class="stdlv"><b>'+lv+'</b>'+(L.next!==null?'<span>'+L.next+'kg to '+STD_LEVELS[L.level+1]+'</span>':'')+'</div>'+
  '<div class="stdbar"><i style="width:'+pos(B.e1)+'%"></i>'+L.std.map((v,i)=>'<em style="left:'+pos(v)+'%" title="'+STD_LEVELS[i]+'"></em>').join('')+'</div>'+
  '<div class="stdticks">'+L.std.map((v,i)=>'<span style="left:'+pos(v)+'%">'+STD_LEVELS[i][0]+'</span>').join('')+'</div>';
 h+='<div class="note">Est. barbell max <b>'+B.e1+'kg</b> at '+bw.kg+'kg bodyweight, from '+setTxt(B.set)+' on '+shortDate(B.date)+
  (B.from==='dbbench'?' with dumbbells (per hand). Converted on the rule of thumb that two dumbbells press about 80% of a barbell, so treat it as a rough guide.':'.')+
  ' Levels for '+(profile.sex==='male'?'men':'women')+': Beginner '+L.std[0]+', Novice '+L.std[1]+', Intermediate '+L.std[2]+', Advanced '+L.std[3]+', Elite '+L.std[4]+'kg. '+FV_CREDIT+'.</div>';
 return h; }

function wireStrength(rerender){
 document.querySelectorAll('#sexPick button').forEach(b=>b.addEventListener('click',async()=>{ await setSex(profile.sex===b.dataset.s?'':b.dataset.s); rerender(); }));
 const inp=document.getElementById('stdBw'), go=document.getElementById('stdBwGo');
 const save=async()=>{ if(inp&&await logBodyweight(inp.value)) rerender(); };
 if(go) go.addEventListener('click',save);
 if(inp) inp.addEventListener('keydown',e=>{ if(e.key==='Enter') save(); }); }

/* Strength Level pages, by history key. Only pages confirmed to exist
   (2026-10-26); anything else gets no link rather than a dead one. */
const SL_SLUG={bench:'bench-press',dbbench:'dumbbell-bench-press',mchest:'chest-press',incline:'incline-dumbbell-bench-press',
 latpulldown:'lat-pulldown',cablerow:'seated-cable-row',legext:'leg-extension',legcurl:'seated-leg-curl',legpress:'sled-leg-press',
 dbcurl:'dumbbell-curl',hammer:'dumbbell-hammer-curl',lateral:'dumbbell-lateral-raise',pushdown:'tricep-pushdown',pushdown2:'tricep-pushdown',
 'alt::rope-pushdown':'tricep-rope-pushdown',cablecurl:'cable-bicep-curl',dbrdl:'dumbbell-romanian-deadlift',rdl:'romanian-deadlift',
 goblet:'goblet-squat',hipthrust:'hip-thrust',squat:'squat',deadlift:'deadlift',cablecrunch:'high-pulley-crunch',mcrunch:'machine-seated-crunch',
 dbshoulder:'dumbbell-shoulder-press',ohp:'overhead-press'};
function slUrl(k){ const s=SL_SLUG[k]; return s?'https://strengthlevel.com/strength-standards/'+s+'/kg':null; }
function slLink(k){ const u=slUrl(k); if(!u) return '';
 return '<a class="dbtn sl" href="'+u+'" target="_blank" rel="noopener">Compare on Strength Level ↗</a>'; }
