/* ============ STORAGE ============ */
const Store=(function(){
 let mode='none'; const mem={};
 const hasWS=(typeof window!=='undefined'&&window.storage&&typeof window.storage.get==='function');
 const hasLS=(function(){try{localStorage.setItem('__t','1');localStorage.removeItem('__t');return true;}catch(e){return false;}})();
 if(hasWS)mode='claude'; else if(hasLS)mode='local';
 async function get(k){ try{
   if(mode==='claude'){const r=await window.storage.get(k,false);return r?JSON.parse(r.value):null;}
   if(mode==='local'){const v=localStorage.getItem(k);return v?JSON.parse(v):null;}
  }catch(e){} return mem[k]!==undefined?mem[k]:null; }
 async function set(k,v){ mem[k]=v; try{
   if(mode==='claude'){await window.storage.set(k,JSON.stringify(v),false);return true;}
   if(mode==='local'){localStorage.setItem(k,JSON.stringify(v));return true;}
  }catch(e){return false;} return false; }
 return {get,set,mode:()=>mode};
})();

