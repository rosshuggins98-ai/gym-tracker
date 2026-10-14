/* ============ MILESTONES ============
   Worked out from history every time, never stored, so milestones reached
   before this existed show too, and an edited or deleted session moves
   them. Shown in Progress (the latest few and the nearest ones still to
   reach) and on the summary sheet when a session reaches one. */
const MS_SESSIONS=[10,25,50,75,100,150,200,300,500];
const MS_STREAK=[4,8,12,26,52];
const MS_DB=[10,15,20,25,30,35,40];                      /* kg per dumbbell */
const MS_TONNES=[10000,25000,50000,100000,250000,500000,1000000];
const MS_PBS=[10,25,50,100,250];
/* Lifts against bodyweight, when bodyweight is logged. */
const MS_BW=[{k:'legpress',x:[1,1.5,2],verb:'Leg pressed'},{k:'squat',x:[1,1.5],verb:'Squatted'},{k:'deadlift',x:[1,1.5,2],verb:'Deadlifted'}];
const byDateAsc=(a,b)=>a.date<b.date?-1:a.date>b.date?1:0;
function kgTxt(n){ return Math.round(n).toLocaleString('en-GB')+'kg'; }
/* The bodyweight reading nearest a date, before or after. */
function bwNear(date){ let best=null, gap=Infinity;
 bodyweight.forEach(e=>{ const g=Math.abs(new Date(e.date)-new Date(date)); if(g<gap){ gap=g; best=e; } }); return best; }
/* Every entry of every lift, oldest first, as {k, e}. */
function allEntries(){ const out=[]; Object.keys(hist).forEach(k=>(hist[k]||[]).forEach(e=>out.push({k,e,date:e.date}))); return out.sort(byDateAsc); }
function dumbbellKey(k){ return incDefault(k)===2; }
/* [{id, label, date, what?}] for every milestone reached, oldest first. */
function milestones(){ const out=[], ds=allSessionDates();
 MS_SESSIONS.forEach(n=>{ if(ds.length>=n) out.push({id:'s'+n,label:n+' sessions',date:ds[n-1]}); });
 /* week streaks: consecutive Monday-weeks with a session; dated by the
    first session of the week that reached the length */
 let run=0, prev=null; const seen={};
 [...new Set(ds.map(mondayOf))].sort().forEach(w=>{ run=(prev&&addDays(prev,7)===w)?run+1:1; prev=w;
  MS_STREAK.forEach(n=>{ if(run>=n&&!seen[n]) seen[n]=ds.find(d=>mondayOf(d)===w); }); });
 MS_STREAK.forEach(n=>{ if(seen[n]) out.push({id:'w'+n,label:n+'-week streak',date:seen[n]}); });
 const ents=allEntries();
 MS_DB.forEach(n=>{ const f=ents.find(x=>dumbbellKey(x.k)&&(x.e.top||0)>=n);
  if(f) out.push({id:'d'+n,label:'First '+n+'kg dumbbell set',date:f.date,what:keyName(f.k)}); });
 if(bodyweight.length) MS_BW.forEach(b=>b.x.forEach(x=>{
  const f=(hist[b.k]||[]).slice().sort(byDateAsc).find(e=>{ const bw=bwNear(e.date); return bw&&(e.top||0)>=x*bw.kg; });
  if(f) out.push({id:'b'+b.k+x,label:b.verb+' '+(x===1?'your bodyweight':x+'× your bodyweight'),date:f.date}); }));
 let tot=0, ti=0;
 ents.forEach(x=>{ tot+=entryVol(x.k,x.e); while(ti<MS_TONNES.length&&tot>=MS_TONNES[ti]){ out.push({id:'t'+MS_TONNES[ti],label:kgTxt(MS_TONNES[ti])+' lifted',date:x.date}); ti++; } });
 const pbs=recentPBs(1e9).slice().reverse();
 MS_PBS.forEach(n=>{ if(pbs.length>=n) out.push({id:'p'+n,label:n+' personal bests',date:pbs[n-1].date}); });
 return out.sort(byDateAsc); }
/* The nearest ones not reached yet, closest first: [{label, left, f}] where
   f is how far along (0-1). */
function nextMilestones(){ const out=[], ds=allSessionDates(), ents=allEntries();
 const ns=MS_SESSIONS.find(n=>n>ds.length); if(ns&&ds.length) out.push({label:ns+' sessions',left:(ns-ds.length)+' to go',f:ds.length/ns});
 const st=weekStreak(), nw=MS_STREAK.find(n=>n>st);
 if(st&&nw) out.push({label:nw+'-week streak',left:(nw-st)+' more week'+(nw-st===1?'':'s'),f:st/nw});
 const db=ents.filter(x=>dumbbellKey(x.k)).reduce((m,x)=>Math.max(m,x.e.top||0),0), nd=MS_DB.find(n=>n>db);
 if(db&&nd) out.push({label:nd+'kg dumbbells',left:(Math.round((nd-db)*10)/10)+'kg to go',f:db/nd});
 const tot=ents.reduce((s,x)=>s+entryVol(x.k,x.e),0), nt=MS_TONNES.find(n=>n>tot);
 if(tot&&nt) out.push({label:kgTxt(nt)+' lifted',left:kgTxt(nt-tot)+' to go',f:tot/nt});
 const np=recentPBs(1e9).length, npb=MS_PBS.find(n=>n>np);
 if(np&&npb) out.push({label:npb+' personal bests',left:(npb-np)+' to go',f:np/npb});
 return out.sort((a,b)=>b.f-a.f).slice(0,3); }
function msRow(m){ return '<div class="msrow"><span class="star">★</span><span class="nm">'+m.label+(m.what?' <small>'+escHTML(m.what)+'</small>':'')+'</span>'+
 '<span class="dt">'+shortDate(m.date)+'</span></div>'; }
/* Progress: the latest four reached, newest first, then the nearest three. */
function milestoneBlock(){ const got=milestones().reverse(), nx=nextMilestones();
 if(!got.length&&!nx.length) return '';
 return '<h5>Milestones</h5>'+(got.length?got.slice(0,4).map(msRow).join(''):'<div class="note">None yet — the first is 10 sessions.</div>')+
  (got.length>4?'<div class="note">'+got.length+' reached so far.</div>':'')+
  (nx.length?'<div class="ck-sub" style="margin-top:12px">Next up</div>'+nx.map(n=>'<div class="msnext"><span class="nm">'+n.label+'</span>'+
   '<span class="bar"><i style="width:'+Math.round(n.f*100)+'%"></i></span><span class="n">'+n.left+'</span></div>').join(''):''); }
/* Summary sheet: any milestone this session's date reached. */
function milestonesOn(date){ return milestones().filter(m=>m.date===date); }
