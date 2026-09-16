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

