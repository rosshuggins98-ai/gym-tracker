/* ============ HISTORY EDITING ============
   Past sessions are corrected set by set. Entries keep every ticked set from
   2026-09-23 on, and their top / reps / vol are never typed: they are
   rebuilt from the sets by entryFromSets() (40-state), the same function
   finishing a session uses. Entries from before then have only a top set and
   keep top/reps editing (histEditTop). Each function changes hist in place
   and returns what it did (false when it refused); the chart sheet saves and
   redraws. */
function histEntry(k,i){ return (hist[k]&&hist[k][i])||null; }
function hasSets(e){ return !!(e&&Array.isArray(e.sets)&&e.sets.length); }
function workingCount(e){ return e.sets.filter(s=>s&&s.t!=='warm').length; }
function rebuildEntry(e){ const f=entryFromSets(e.sets); if(f){ e.top=f.top; e.reps=f.reps; e.vol=f.vol; } }
/* Typed weight and reps, or null when either is junk: kg 0-1000 ("22",
   "22.5", or "22,5" from a phone keyboard), reps a whole number 0-999 or
   blank (not counted). */
function parseSet(w,r){ const ws=String(w==null?'':w).trim().replace(',','.'), rs=String(r==null?'':r).trim();
 if(!/^\d+(\.\d+)?$/.test(ws)) return null; const wn=parseFloat(ws); if(wn>1000) return null;
 let rn=null; if(rs!==''){ if(!/^\d+$/.test(rs)) return null; rn=parseInt(rs,10); if(rn>999) return null; }
 return {w:wn,r:rn}; }
function histEditSet(k,i,j,w,r){ const e=histEntry(k,i); if(!hasSets(e)||!e.sets[j]) return false;
 const p=parseSet(w,r); if(!p) return false;
 e.sets[j].w=p.w; e.sets[j].r=p.r; rebuildEntry(e); return true; }
/* Warm-up <-> working set. The last working set can't become a warm-up: a
   session with no working set isn't a session. A drop or AMRAP set marked a
   warm-up comes back as a plain working set. */
function histToggleWarm(k,i,j){ const e=histEntry(k,i); if(!hasSets(e)||!e.sets[j]) return false; const s=e.sets[j];
 if(s.t==='warm') delete s.t;
 else { if(workingCount(e)<=1) return false; s.t='warm'; }
 rebuildEntry(e); return true; }
/* 'set' when one set went, 'entry' when it was the session's only set and
   the session went with it (and the exercise's key, if that was its last),
   false when it would leave only warm-ups. */
function histDeleteSet(k,i,j){ const e=histEntry(k,i); if(!hasSets(e)||!e.sets[j]) return false;
 if(e.sets.length===1){ hist[k].splice(i,1); if(!hist[k].length) delete hist[k]; return 'entry'; }
 if(e.sets[j].t!=='warm'&&workingCount(e)<=1) return false;
 e.sets.splice(j,1); rebuildEntry(e); return 'set'; }
/* Entries without sets: their top set is the record, so it is edited directly. */
function histEditTop(k,i,w,r){ const e=histEntry(k,i); if(!e||hasSets(e)) return false;
 const p=parseSet(w,r); if(!p) return false; e.top=p.w; e.reps=p.r; return true; }
