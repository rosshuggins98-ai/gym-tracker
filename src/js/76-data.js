/* ============ DATA ============ */
function openData(){
 document.getElementById('exportOut').style.display='none';
 document.getElementById('importPreview').style.display='none';
 const m=Store.mode(), el=document.getElementById('storeStatus');
 if(m==='local')el.innerHTML='Saving to this device\u2019s browser storage \u2014 survives refreshes and closing the tab. Back up now and then so a cleared browser can\u2019t cost you your history.';
 else if(m==='claude')el.innerHTML='Saving to your Claude account. To run this from a home screen icon, download it and serve it yourself.';
 else el.innerHTML='<b>Running as a local file.</b> Chrome won\u2019t give file:// pages real storage. Your session is mirrored into the address bar so a refresh won\u2019t lose it, but export before closing the tab.';
 el.innerHTML='<b>Build '+BUILD+'</b> &mdash; progress dashboard, PB weight+reps, custom exercises.<br><br>'+el.innerHTML;
 const n=Object.keys(legacyLast||{}).length;
 const hn=Object.keys(hist||{}).length;
 el.innerHTML+='<br><br><b>Data found:</b> '+hn+' exercise'+(hn===1?'':'s')+' with logged history'+
  (n?', plus recovered weights for '+n+' exercise'+(n===1?'':'s')+' from an earlier version':'')+'.'+
  '<br><br>'+autoBackupNote();
 applyAccent(); document.getElementById('databg').classList.add('show');
}
function closeData(){ document.getElementById('databg').classList.remove('show'); }
document.getElementById('databg').addEventListener('click',e=>{ if(e.target.id==='databg')closeData(); });
function backup(){ return {app:"gym-tracker",version:4,build:BUILD,exported:new Date().toISOString(),
 plan:PLAN,cur,prev,swaps,history:hist,warm:warmDone,custom,barWeight:BARWEIGHT,notes,weekTarget:WEEKTARGET,routines,bodyweight,incs}; }
function dl(n,t,m){ try{ const b=new Blob([t],{type:m}),u=URL.createObjectURL(b),a=document.createElement('a');
 a.href=u;a.download=n;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);return true;}catch(e){return false;} }
function showExport(t,n){ document.getElementById('exportText').value=t;
 document.getElementById('exportNote').innerHTML='Saved as <b>'+n+'</b>. If nothing downloaded, tap <b>Copy text</b> and paste it somewhere safe.';
 document.getElementById('exportOut').style.display='block'; }
function exportJSON(){ const t=JSON.stringify(backup(),null,2),n='gym-backup-'+today()+'.json'; dl(n,t,'application/json'); showExport(t,n); }
function cell(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }
/* keyName() already handles both a merged-into-a-real-exercise key (e.g.
   "bench") and a synthetic global alt key (e.g. "alt::machine-chest-press")
   correctly -- reused here instead of re-deriving it, since the old
   base/variant split this used to do here assumed the pre-2026-09-10 key
   scheme and mislabeled every alt-only key as the literal string "alt".
   Body weight rides along as an "exercise" row so one sheet has everything. */
function csvText(){
 const rows=[];
 Object.keys(hist).forEach(k=>{
  const nm=keyName(k), nt=noteFor(k);
  (hist[k]||[]).forEach(h=>rows.push([h.date,nm,h.top,h.reps||'',nt]));
 });
 bodyweight.forEach(e=>rows.push([e.date,'Body weight',e.kg,'','']));
 if(!rows.length) return null;
 rows.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
 return [['Date','Exercise','Top weight (kg)','Reps at top weight','Note'].map(cell).join(',')]
  .concat(rows.map(r=>r.map(cell).join(','))).join('\r\n');
}
function exportCSV(){
 const t=csvText(), n='gym-history-'+today()+'.csv';
 if(t===null){ showExport('No history yet — finish a session first.',n); return; }
 dl(n,t,'text/csv'); showExport(t,n);
}
function copyExport(btn){ const ta=document.getElementById('exportText'); ta.focus(); ta.select();
 let ok=false; try{ ok=document.execCommand('copy'); }catch(e){}
 if(!ok&&navigator.clipboard){ navigator.clipboard.writeText(ta.value); ok=true; }
 btn.textContent=ok?'Copied':'Select above to copy'; setTimeout(()=>btn.textContent='Copy text',1600); }
document.getElementById('importFile').addEventListener('change',function(e){
 const f=e.target.files&&e.target.files[0]; if(!f)return;
 const pv=document.getElementById('importPreview'); pv.style.display='block';
 const rd=new FileReader();
 rd.onload=function(){ let d;
  try{ d=JSON.parse(rd.result); }catch(err){ pv.innerHTML='That file isn\u2019t readable. Choose a .json backup from this app.'; e.target.value=''; return; }
  if(!d||d.app!=='gym-tracker'){ pv.innerHTML='That doesn\u2019t look like a Gym Tracker backup.'; e.target.value=''; return; }
  const n=Object.values(d.history||{}).reduce((s,a)=>s+(a?a.length:0),0);
  pv.innerHTML='<b>Backup from '+(d.exported?shortDate(d.exported.slice(0,10)):'unknown')+'</b><div class="note">Holds '+n+' logged entr'+(n===1?'y':'ies')+'. Loading replaces your current data and plan.</div><div class="row"><button class="cancel" onclick="cancelImport()">Cancel</button><button class="confirm" onclick="applyImport()">Replace my data</button></div>';
  window.__imp=d; e.target.value=''; };
 rd.readAsText(f); });
function cancelImport(){ window.__imp=null; document.getElementById('importPreview').style.display='none'; }
async function applyImport(){ const d=window.__imp; if(!d)return;
 if(d.plan&&d.plan.days){ PLAN=d.plan; ACTIVE=PLAN.days[0].id; }
 cur=d.cur||{}; prev=d.prev||{}; hist=migrate(d.history||{}); swaps=d.swaps||{}; warmDone=d.warm||{};
 custom=d.custom||{}; Object.keys(custom).forEach(id=>LIB[id]=custom[id]);
 if(typeof d.barWeight==='number'&&d.barWeight>=0) BARWEIGHT=d.barWeight;
 if(typeof d.weekTarget==='number'&&d.weekTarget>0) WEEKTARGET=d.weekTarget;
 notes=d.notes||{}; routines=d.routines||[]; incs=(d.incs&&typeof d.incs==='object')?d.incs:{};
 bodyweight=Array.isArray(d.bodyweight)?d.bodyweight.filter(e=>e&&e.date&&e.kg>0):[];
 await Promise.all([Store.set('gt4_plan',PLAN),Store.set('gt4_cur',cur),Store.set('gt4_prev',prev),Store.set('gt4_bodyweight',bodyweight),
  Store.set('gt4_hist',hist),Store.set('gt4_swaps',swaps),Store.set('gt4_warm',warmDone),Store.set('gt4_custom',custom),
  Store.set('gt4_barweight',BARWEIGHT),Store.set('gt4_notes',notes),Store.set('gt4_weektarget',WEEKTARGET),
  Store.set('gt4_routines',routines),Store.set('gt4_incs',incs)]);
 window.__imp=null;
 document.getElementById('importPreview').innerHTML='<b>Restored ✓</b><div class="note">Your data is back.</div>';
 render(); }

