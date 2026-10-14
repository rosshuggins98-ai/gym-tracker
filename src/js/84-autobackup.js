/* ============ AUTO-BACKUP ============
   After every finished session, POST the full backup to serve.py's
   /api/save so a copy lands on disk without the manual export. Strictly
   best-effort: file://, a plain `python3 -m http.server`, or a stopped
   server all just mean "no auto-backup", never an error the user sees mid
   workout. The relative URL keeps it working under any mount path. */
let lastAuto=null;   /* {date, file} of the last successful auto-backup */
async function autoBackup(){
 if(typeof fetch!=='function'||!/^https?:$/.test(location.protocol)) return null;
 try{
  const r=await fetch('api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(backup())});
  if(!r.ok) return null;
  const j=await r.json(); if(!j||!j.ok) return null;
  lastAuto={date:today(),file:j.file||''}; await Store.set('gt4_autobackup',lastAuto);
  return lastAuto;
 }catch(e){ return null; }
}
function autoBackupNote(){
 if(!lastAuto) return 'No auto-backup yet. When the app is served by <b>serve.py</b> (the Termux launcher does this), every finished session is also written to the phone\u2019s gym-backups folder.';
 return 'Auto-backup: last written <b>'+shortDate(lastAuto.date)+'</b>'+(lastAuto.file?' ('+lastAuto.file+')':'')+' to the server\u2019s gym-backups folder.';
}

/* ---- The off-phone copy (serve.py --offsite) ----
   The server sends each backup to a private GitHub repo in the background
   and reports how that went in /api/status as `offsite`:
   {enabled:false} when not set up, else {enabled, repo, pending, last_ok,
   error}. Read-only here, best-effort like autoBackup: no server, an older
   serve.py, or file:// just means nothing is shown. */
function canAskServer(){ return typeof fetch==='function'&&/^https?:$/.test(location.protocol); }
async function offsiteStatus(){
 if(!canAskServer()) return null;
 try{ const r=await fetch('api/status',{cache:'no-store'}); if(!r.ok) return null;
  const j=await r.json(); return (j&&j.offsite)||null; }catch(e){ return null; }
}
/* Right after a save the copy is usually still going: ask a few times
   (~10s) until it has gone up or failed. */
async function offsiteAfterSave(tries,wait){ let o=null;
 for(let i=0;i<(tries||6);i++){ o=await offsiteStatus();
  if(!o||!o.enabled||o.error||!o.pending) return o;
  await new Promise(r=>setTimeout(r,wait==null?1500:wait)); }
 return o; }
/* last_ok is the phone's local time, "YYYY-MM-DDTHH:MM". */
function localISO(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function sentWhen(t){ if(!t) return 'never';
 const day=t.slice(0,10), hm=t.slice(11,16);
 return (day===localISO(new Date())?'today':shortDate(day))+(hm?' at '+hm:''); }
/* Days since anything reached GitHub while something is waiting or failing:
   0 when all is well (or it's off), Infinity when nothing ever has. */
function offsiteStaleDays(o,now){
 if(!o||!o.enabled||!(o.error||o.pending)) return 0;
 if(!o.last_ok) return Infinity;
 return Math.max(0,Math.floor(((now||Date.now())-new Date(o.last_ok))/864e5)); }
const OFFSITE_STALE=7;
/* Data panel line. */
function offsiteText(o){
 if(!o) return '';
 if(!o.enabled) return '<b>GitHub copy:</b> not set up, so your backups only exist on this phone. To send them to a private GitHub repo as well, run <b>bash ~/gymtools/offsite-setup.sh</b> in Termux once.';
 const repo=o.repo?'<b>'+escHTML(o.repo)+'</b>':'GitHub', n=o.pending||0, wait=n?' '+n+' backup'+(n===1?'':'s')+' waiting.':'';
 if(o.error) return '<b>GitHub copy:</b> <span class="bad">not sent.</span> '+escHTML(o.error)+wait+' Last sent: '+sentWhen(o.last_ok)+'.';
 if(n) return '<b>GitHub copy:</b> sending to '+repo+'\u2026'+wait;
 return '<b>GitHub copy:</b> up to date in '+repo+'. Last sent '+sentWhen(o.last_ok)+'.'; }
/* Summary sheet line once the phone copy is written. */
function sumBackupLine(file,o,now){
 const phone='Backed up to the phone'+(o&&o.enabled&&!o.error&&!o.pending?' and GitHub':'')+' \u2713'+(file?' ('+file+')':'')+'.';
 if(!o||!o.enabled||(!o.error&&!o.pending)) return phone;
 const d=offsiteStaleDays(o,now);
 if(d>=OFFSITE_STALE) return phone+' <span class="bad">\u26a0 '+(d===Infinity?'Nothing has reached GitHub yet.':'Nothing has reached GitHub for '+d+' days.')+'</span> '+
  (o.error?escHTML(o.error)+' ':'')+'Details in Data.';
 return phone+(o.error?' Not on GitHub yet: '+escHTML(o.error):' GitHub copy still sending.'); }
async function loadOffsiteNote(){ const o=await offsiteStatus(), el=document.getElementById('offsiteNote');
 if(el&&o){ el.innerHTML='<br><br>'+offsiteText(o); } return o; }
