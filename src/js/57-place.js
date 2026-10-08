/* ============ PLACE: GYM OR HOME ============
   The user trains at a gym (dumbbells 18, 20, 22, 24) and at home with an
   adjustable set (20.5, 22.5), and both log to the same exercise -- so gym 22
   then home 22.5 read as progress, and back again as a drop. PLACE is where
   today's session is (it stays on whatever was picked last); doNewSession
   stamps it on each history entry as `at` and on prev as `_at`. Entries
   without `at` (everything before 2026-10-08) count as gym, the usual place;
   a past home session is re-tagged from the chart sheet, a whole date at once. */
const PLACES={gym:'Gym',home:'Home'};
let PLACE='gym';
function placeOf(e){ return e&&e.at==='home'?'home':'gym'; }
/* Switching place swaps the plan to the home kit or back (see below), and
   re-prefills the active day's untouched sets (not ticked,
   reps not typed), so the "last" weights come from the right place. */
async function setPlace(p){ if(!PLACES[p]||p===PLACE) return;
 if(p==='home'){ PLACE=p; enterPlace(); } else { PLACE=p; swaps=gymSwaps; }
 const c=cur[ACTIVE];
 if(c) Object.keys(c).forEach(exId=>{ (c[exId]||[]).forEach((x,i)=>{ if(x&&!x.done&&!x.rt) c[exId][i]=null; }); });
 await Store.set('gt4_place',PLACE); queueSave(); flush(); }
/* Every entry on a date, across all lifts, to one place. */
async function tagDate(date,p){
 Object.keys(hist).forEach(k=>(hist[k]||[]).forEach(e=>{ if(e.date===date) e.at=p; }));
 await Store.set('gt4_hist',hist); }
/* Dumbbell weights seen at a place, from every dumbbell lift's working sets:
   the rack there, as far as the log knows. */
function rackAt(p){ const s={};
 Object.keys(hist).forEach(k=>{ if(incDefault(k)!==2) return;
  (hist[k]||[]).forEach(e=>{ if(placeOf(e)===p) workSets(e).forEach(x=>{ if(x.w>0) s[x.w]=1; }); }); });
 return Object.keys(s).map(Number).sort((a,b)=>a-b); }
/* A weight moved onto a rack: dir 1 = the lightest above `above`, -1 = the
   heaviest at or below w, 0 = the nearest (lighter on a tie). Falls back to
   the nearest, and to w itself on an empty rack. */
function snapW(rack,w,dir,above){ if(!rack.length) return w;
 if(dir>0){ const u=rack.filter(x=>x>above); if(u.length) return u[0]; }
 if(dir<0){ const d=rack.filter(x=>x<=w); if(d.length) return d[d.length-1]; }
 return rack.reduce((b,x)=>Math.abs(x-w)<Math.abs(b-w)?x:b); }
function placeBar(d){
 const c=document.createElement('div'); c.className='place';
 const n=PLACE==='home'&&d?d.items.filter(it=>swaps[it.ex]&&swaps[it.ex]!==gymSwaps[it.ex]).length:0;
 c.innerHTML='<span class="lbl">Training at</span>'+Object.keys(PLACES).map(p=>
  '<button data-p="'+p+'"'+(p===PLACE?' class="on"':'')+'>'+PLACES[p]+'</button>').join('')+
  (PLACE==='home'?'<span class="lbl">'+(n?n+' swapped for dumbbells &amp; bench':'dumbbells &amp; bench')+'</span>':'');
 c.querySelectorAll('button').forEach(b=>b.addEventListener('click',async()=>{ await setPlace(b.dataset.p); render(); }));
 return c; }
/* Progress: every past session with a Gym / Home toggle, newest first, so
   home sessions from before the tag existed can be marked in one pass. The
   lifts listed are the dumbbell ones first, since their weights give a home
   session away (20.5, 22.5). */
let placeAll=false;
function sessionsByDate(){ const by={};
 Object.keys(hist).forEach(k=>(hist[k]||[]).forEach(e=>{ (by[e.date]=by[e.date]||[]).push({k,e}); }));
 return Object.keys(by).sort().reverse().map(date=>({date,at:by[date].some(x=>placeOf(x.e)==='home')?'home':'gym',
  lifts:by[date].sort((a,b)=>(incDefault(b.k)===2)-(incDefault(a.k)===2)).map(x=>keyName(x.k)+' '+x.e.top)})); }
function placeBlock(){ const ss=sessionsByDate(); if(!ss.length) return '';
 const show=placeAll?ss:ss.slice(0,8);
 return '<h5>Where you trained</h5>'+show.map(s=>'<div class="plrow"><span class="dt">'+shortDate(s.date)+'</span>'+
  '<span class="ls">'+(effortOf(s.date)?'<i class="eff '+effortOf(s.date)+'">'+EFFORTS[effortOf(s.date)]+'</i>':'')+s.lifts.slice(0,3).join(', ')+'</span>'+
  '<button class="mini hpl'+(s.at==='home'?' home':'')+'" data-date="'+s.date+'">'+PLACES[s.at]+'</button></div>').join('')+
  (ss.length>show.length?'<button class="dbtn" id="plMore">Show all '+ss.length+' sessions</button>':'')+
  '<div class="note">Tap to switch a session between gym and home. The coach and your "last time" weights only compare sessions from the same place, so gym 22kg and home 22.5kg aren\'t read as progress.</div>'; }
function wirePlace(){ const box=document.getElementById('placeBox'); if(!box) return;
 const redo=()=>{ box.innerHTML=placeBlock(); wirePlace(); };
 box.querySelectorAll('.plrow .hpl').forEach(b=>b.addEventListener('click',async()=>{
  await tagDate(b.dataset.date,b.classList.contains('home')?'gym':'home'); redo(); render(); }));
 const m=document.getElementById('plMore'); if(m) m.addEventListener('click',()=>{ placeAll=true; redo(); }); }
/* --- Home kit: swap the plan to what the home equipment can do ----------
   Home is an adjustable dumbbell set and an adjustable bench. At home every
   planned exercise that needs gym kit is swapped for one that doesn't: the
   gym swap if that already works at home (Overhead Extension for Pushdown),
   else HOME_PREF, else the first of its alts that works. Picks made at home
   are kept apart in homePicks (gt4_homeswaps, '' = keep the planned one), so
   the gym swaps are untouched and come straight back at the gym.
   While at home `swaps` is the computed map (homeSwapMap) and the gym map
   waits in gymSwaps; at the gym `swaps` is the gym map itself, as always. */
const HOME_IDS=['dbbench','incline','dbfly','pushup','dbshoulder','lateral','frontraise','dbrow','pullover','goblet',
 'lunge','bulgarian','dbrdl','dblegcurl','hammer','dbcurl','concentration','ohext','skull','calf'];
/* Library and alt names that need only dumbbells, the bench or bodyweight. */
const HOME_NAME=/dumbbell|\bdb\b|goblet|push-?ups|bulgarian|lunge|single-leg rdl|glute bridge|bench dips|rear delt fly/i;
/* Better home stand-ins than the first workable alt, where there is one. */
const HOME_PREF={legcurl:'Dumbbell Leg Curl',legext:'Bulgarian Split Squat',hipthrust:'Dumbbell RDL',
 pecdeck:'Dumbbell Fly',facepull:'Rear Delt Fly',cablecurl:'Dumbbell Curl',bbcurl:'Dumbbell Curl',preacher:'Concentration Curl'};
let homePicks={}, gymSwaps={};
function homeOk(name){ const id=nameToId(name);
 if(id&&HOME_IDS.indexOf(id)>=0) return true;
 if(id&&LIB[id]&&!custom[id]) return false;
 return HOME_NAME.test(String(name||'')); }
/* The automatic home choice for a plan slot: an alt name, or null to keep
   the planned exercise (it works at home, or nothing listed does). */
function homeAuto(exId){
 const g=gymSwaps[exId]; if(g&&homeOk(g)) return g;
 if(homeOk(exName(exId))) return null;
 const pref=HOME_PREF[exId]; if(pref) return pref;
 return ((LIB[exId]&&LIB[exId].alts)||[]).find(homeOk)||null; }
/* Marked (non-enumerable, so never saved) to tell it from the gym map. */
function homeSwapMap(){ const m={}, seen={}; Object.defineProperty(m,'__home',{value:true});
 PLAN.days.forEach(d=>d.items.forEach(it=>{ const id=it.ex; if(seen[id]) return; seen[id]=1;
  const p=homePicks[id], v=p!==undefined?(p||null):homeAuto(id); if(v) m[id]=v; }));
 return m; }
/* The gym map wherever it currently lives -- for backups and the URL hash. */
function gymSwapMap(){ return PLACE==='home'?gymSwaps:swaps; }
/* Call after anything replaces `swaps` or the plan while at home. */
function enterPlace(){ if(PLACE==='home'){ if(!swaps.__home) gymSwaps=swaps; swaps=homeSwapMap(); } }
/* A slot at home still on gym kit, with no home option found. */
function needsGym(exId){ return PLACE==='home'&&!swaps[exId]&&!homeOk(exName(exId)); }
