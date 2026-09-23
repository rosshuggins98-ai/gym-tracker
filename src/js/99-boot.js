/* ============ BOOT ============ */
/* Offline shell cache -- see sw.js. Registration itself fails quietly
   wherever it can't work (file://, or a non-localhost LAN origin isn't a
   secure context): the app already ran fine before this existed, so a
   rejected registration just means no offline cache, not a broken app. */
if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
document.getElementById('buildBadge').textContent=BUILD;
document.getElementById('dataBtn').innerHTML=I.db;
document.getElementById('editBtn').innerHTML=I.edit;
document.getElementById('progBtn').innerHTML=I.chart;
(async function(){
 const [pl,a,th,h,sw,c,p,w]=await Promise.all([Store.get('gt4_plan'),Store.get('gt4_active'),Store.get('gt4_theme'),
  Store.get('gt4_hist'),Store.get('gt4_swaps'),Store.get('gt4_cur'),Store.get('gt4_prev'),Store.get('gt4_warm')]);
 const cx=await Store.get('gt4_custom'); if(cx){ custom=cx; Object.keys(cx).forEach(id=>LIB[id]=cx[id]); }
 PLAN=(pl&&pl.days&&pl.days.length)?pl:DEFAULT_PLAN();
 /* One-time: the Full Body day (added 2026-09-10, removed shortly after) may
    already be sitting in a saved plan from before it was pulled back out.
    Strip it if present, leaving everything else about the plan untouched.
    No-op once it's gone; doesn't touch its exercises' logged history, which
    stays keyed by exercise and is still reachable if the day ever comes back. */
 if(PLAN.days.some(d=>d.id==='full')){ PLAN.days=PLAN.days.filter(d=>d.id!=='full'); await Store.set('gt4_plan',PLAN); }
 setTheme(th==='light'?'light':'dark');
 hist=h?migrate(h):await pullLegacy();
 if(!h) await Store.set('gt4_hist',hist);
 const savedLast=await Store.get('gt4_legacylast');
 if(savedLast) legacyLast=savedLast;
 else { legacyLast=await pullLegacyWeights(); if(Object.keys(legacyLast).length) await Store.set('gt4_legacylast',legacyLast); }
 swaps=sw||{}; cur=c||{}; prev=p||{}; warmDone=w||{};
 const bw=await Store.get('gt4_barweight'); if(typeof bw==='number'&&bw>=0) BARWEIGHT=bw;
 const wt=await Store.get('gt4_weektarget'); if(typeof wt==='number'&&wt>0) WEEKTARGET=wt;
 notes=(await Store.get('gt4_notes'))||{};
 incs=(await Store.get('gt4_incs'))||{};
 routines=(await Store.get('gt4_routines'))||[];
 lastAuto=(await Store.get('gt4_autobackup'))||null;
 bodyweight=(await Store.get('gt4_bodyweight'))||[];
 sessionStart=(await Store.get('gt4_start'))||{};
 ACTIVE=(a&&PLAN.days.some(d=>d.id===a))?a:PLAN.days[0].id;
 if(Store.mode()==='none'){
  const rec=readHash();
  if(rec){ if(rec.pl&&rec.pl.days)PLAN=rec.pl;
   if(rec.a&&PLAN.days.some(d=>d.id===rec.a))ACTIVE=rec.a;
   if(rec.t)setTheme(rec.t==='light'?'light':'dark');
   if(rec.c)cur=rec.c; if(rec.p)prev=rec.p; if(rec.h)hist=rec.h; if(rec.s)swaps=rec.s; if(rec.w)warmDone=rec.w; }
  document.getElementById('storeWarn').classList.add('show');
 }
 if(!pl) await Store.set('gt4_plan',PLAN);
 render();
})();
