/* Loads app/gym-tracker.html's <script> into a vm sandbox with a stub DOM so
   the pure logic (migrate, PB detection, volume/trend/1RM, presets, the
   finish-session flow) can be exercised from node with no jsdom, no npm.

   The stub is deliberately dumb: every element is a Proxy that swallows
   property sets, returns itself for querySelector, [] for querySelectorAll,
   and no-ops for listeners. Rendering therefore "succeeds" without producing
   anything -- these tests are about the data model, not the DOM. Storage
   ends up in Store's in-memory fallback (no localStorage, no window.storage),
   so every test starts from a clean slate by calling load() again.

   Run:  node --test test/          (node >= 18, nothing to install) */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm');

const HTML=path.join(__dirname,'..','app','gym-tracker.html');

function stubEl(){
 const store={};
 const el=new Proxy(function(){}, {
  get(_,k){
   if(k==='classList') return {add(){},remove(){},toggle(){},contains(){return false;}};
   if(k==='style') return new Proxy({},{get:(t,p)=>p==='setProperty'?()=>{}:t[p],set:(t,p,v)=>{t[p]=v;return true;}});
   if(k==='dataset') return store.dataset||(store.dataset={});
   if(k==='querySelectorAll') return ()=>[];
   if(k==='querySelector') return ()=>stubEl();
   if(k==='getContext') return ()=>new Proxy({},{get:()=>()=>{}});
   if(k==='innerHTML'||k==='textContent'||k==='value') return store[k]||'';
   if(k==='then') return undefined;   /* not a thenable -- `await el` must not hang */
   if(k in store) return store[k];
   if(typeof k==='symbol') return undefined;
   return ()=>stubEl();               /* any other read is assumed to be a method call */
  },
  set(_,k,v){ store[k]=v; return true; }
 });
 return el;
}

function makeDom(){
 const listeners={};
 const document={
  getElementById:()=>stubEl(), createElement:()=>stubEl(), querySelector:()=>stubEl(), querySelectorAll:()=>[],
  addEventListener:()=>{}, documentElement:stubEl(), body:stubEl(), visibilityState:'visible'
 };
 const window={
  addEventListener:(n,f)=>{ (listeners[n]=listeners[n]||[]).push(f); }, scrollTo:()=>{},
  __listeners:listeners
 };
 const localStorage=new Proxy({},{get(){ throw new Error('no localStorage in tests'); }});
 return {document,window,localStorage,navigator:{},history:{replaceState:()=>{}},location:{hash:'',protocol:'http:'},
  fetch:undefined,URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},Blob:function(){},FileReader:function(){},
  setTimeout,clearTimeout,setInterval,clearInterval,console,Date,JSON,Math,Object,Array,String,Number,parseInt,parseFloat,isNaN,encodeURIComponent,decodeURIComponent,Promise};
}

/* Names bound by every top-level `let`/`const`, including the multi-name
   form the app uses (`let cur={}, prev={}, hist={};`). Walks each declaration
   tracking bracket depth and string state so a comma inside an initializer
   isn't mistaken for the next name. */
function declaredNames(js){
 const out=[];
 const re=/^(?:let|const)\s+/gm; let m;
 while((m=re.exec(js))){
  let i=m.index+m[0].length, depth=0, q=null, expectName=true;
  while(i<js.length){
   const c=js[i];
   if(q){ if(c==='\\') i++; else if(c===q) q=null; i++; continue; }
   if(expectName){ const nm=/^[A-Za-z_$][\w$]*/.exec(js.slice(i,i+80)); if(nm){ out.push(nm[0]); i+=nm[0].length; } expectName=false; continue; }
   if(c==='"'||c==="'"||c==='`'){ q=c; i++; continue; }
   if(c==='('||c==='['||c==='{') depth++;
   else if(c===')'||c===']'||c==='}') depth--;
   else if(depth===0&&c===','){ expectName=true; i++; while(/\s/.test(js[i])) i++; continue; }
   else if(depth===0&&(c===';'||c==='\n')) break;
   i++;
  }
 }
 return out;
}

/* Evaluate the app and hand back its global scope, after boot has settled. */
async function load(opts){
 opts=opts||{};
 const html=fs.readFileSync(HTML,'utf8');
 const js=html.match(/<script>([\s\S]*)<\/script>/)[1];
 const g=makeDom(); if(opts.fetch) g.fetch=opts.fetch;
 const ctx=vm.createContext(g);
 /* Top-level const/let/function declarations don't land on the context
    object, so append an explicit export of everything a test might want. */
 const names=[...js.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1]);
 const lets=declaredNames(js);
 const all=[...new Set(names.concat(lets))];
 const exportSrc='\n;globalThis.__app={'+all.map(n=>n+':()=>'+n).join(',')+'};'+
  '\nglobalThis.__set={'+lets.map(n=>n+':(v)=>{'+n+'=v;}').join(',')+'};';
 vm.runInContext(js+exportSrc,ctx,{filename:'gym-tracker.html'});
 /* boot() is an async IIFE; give it a few macrotasks to finish */
 for(let i=0;i<20;i++) await new Promise(r=>setImmediate(r));
 const app=new Proxy({},{get:(_,k)=>{ if(k in g.__app) return g.__app[k](); throw new Error('no such app symbol: '+String(k)); }});
 const set=(k,v)=>{ if(!(k in g.__set)) throw new Error('not assignable: '+k); g.__set[k](v); };
 const tick=async(n)=>{ for(let i=0;i<(n||20);i++) await new Promise(r=>setImmediate(r)); };
 return {app,set,ctx:g,tick};
}
/* Values built inside the sandbox have the sandbox's own Array/Object
   prototypes, which strict deepEqual rejects. Round-trip through JSON to
   compare by shape. */
function plain(v){ return v===undefined?undefined:JSON.parse(JSON.stringify(v)); }
module.exports={load,plain};
