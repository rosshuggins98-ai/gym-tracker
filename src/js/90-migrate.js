/* ============ MIGRATION ============ */
function migrate(h){
 const out={};
 Object.keys(h||{}).forEach(k=>{
  const p=k.split('::'), base=p[0], variant=p[1];
  const nb=MIGRATE[base]||base;
  /* A shared alt:: key whose name has since been promoted to a real library
     exercise (e.g. "Chest-Supported Row" was only ever a swap alt until the
     full-body plan needed it as a slot of its own). hkey() now resolves that
     name straight to the id, so history logged under the old alt:: key has to
     follow it or the exercise starts from zero. */
  if(base==='alt'&&variant){
   const id=Object.keys(LIB).filter(x=>slug(LIB[x].n)===variant)[0];
   const nk=id||k; out[nk]=(out[nk]||[]).concat(h[k]||[]); return;
  }
  if(!variant){
   if(!LIB[nb]&&nb.indexOf('c_')!==0) { out[k]=(out[k]||[]).concat(h[k]||[]); return; }
   out[nb]=(out[nb]||[]).concat(h[k]||[]); return;
  }
  /* Old-style swapped-variant key (base::slug from before alternates got a shared,
     name-based key). Recover the original alt text from the base's alt list so it
     lands on the same key hkey() would produce today — merged into a real exercise
     if the name matches one, otherwise the shared alt:: key. Unrecoverable slugs
     (base since renamed/removed) fall back to their old key rather than vanishing. */
  const orig=((LIB[nb]&&LIB[nb].alts)||[]).filter(a=>slug(a)===variant)[0];
  const nk=orig?hkey(nb,orig):(nb+'::'+variant);
  out[nk]=(out[nk]||[]).concat(h[k]||[]);
 });
 Object.keys(out).forEach(k=>out[k].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0));
 return out;
}
async function pullLegacy(){
 /* history from v3 blob + v1/v2 per-exercise keys */
 let merged={};
 const v3=await Store.get('gt3_hist'); if(v3){ merged=Object.assign(merged,v3); legacyFound++; }
 const oldIds=Object.keys(MIGRATE).filter(k=>k.indexOf('d1_')===0||k.indexOf('d2_')===0);
 const vals=await Promise.all(oldIds.map(id=>Store.get('gt_hist_'+id)));
 oldIds.forEach((id,i)=>{ if(vals[i]&&vals[i].length){ merged[id]=(merged[id]||[]).concat(vals[i]); legacyFound++; } });
 return migrate(merged);
}
/* Recover weights typed into older versions that were never "finished" */
async function pullLegacyWeights(){
 const out={};
 const keys=['gt3_cur_d1','gt3_cur_d2','gt3_cur_d3','gt3_prev_d1','gt3_prev_d2','gt3_prev_d3',
             'gt_d1_cur','gt_d2_cur','gt_d1_prev','gt_d2_prev'];
 const blobs=await Promise.all(keys.map(k=>Store.get(k)));
 blobs.forEach(b=>{
  if(!b||typeof b!=='object') return;
  Object.keys(b).forEach(oldId=>{
   const arr=b[oldId]; if(!Array.isArray(arr)) return;
   const ws=arr.map(x=>(x&&x.w)?x.w:null);
   if(!ws.some(Boolean)) return;
   const nid=MIGRATE[oldId]||oldId;
   if(!LIB[nid]) return;
   if(!out[nid]) { out[nid]=ws; legacyFound++; }
   else out[nid]=out[nid].map((v,i)=>v||ws[i]||null);
  });
 });
 return out;
}

