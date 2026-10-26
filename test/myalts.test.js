'use strict';
/* Typed swap names (2026-10-26): a grip, attachment, straps or a second
   machine, typed on the swap sheet, kept per exercise and backed up. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);

async function beginner(){
 const r=await load(); const {app,set}=r;
 set('PLAN',app.BEGINNER_PLAN()); set('ACTIVE','bgA'); set('swaps',{}); set('hist',{}); set('prev',{});
 set('cur',{}); set('sessionStart',{}); set('PLACE','gym'); set('myAlts',{});
 return r;
}

test('a typed name is cleaned, kept for that exercise, and not added twice',async()=>{
 const {app}=await beginner();
 assert.equal(await app.addMyAlt('latpulldown','  Lat Pulldown <straps> '),'Lat Pulldown straps');
 assert.equal(await app.addMyAlt('latpulldown','lat pulldown STRAPS'),'Lat Pulldown straps','same name, any case');
 assert.equal(await app.addMyAlt('latpulldown','   '),null,'empty is ignored');
 deq(app.myAlts,{latpulldown:['Lat Pulldown straps']});
 assert.equal(await app.addMyAlt('latpulldown','lat pulldown'),'','the planned exercise itself means no swap');
 deq(app.myAltsOf('dbbench'),[]);
});

test('a typed name gets its own history; an exact library name joins that exercise',async()=>{
 const {app,set,tick}=await beginner();
 assert.equal(app.hkey('latpulldown','Lat Pulldown straps'),'alt::lat-pulldown-straps');
 assert.equal(app.hkey('latpulldown','Cable Row'),'cablerow');
 const n=await app.addMyAlt('latpulldown','Lat Pulldown straps'); set('swapT','latpulldown'); await app.chooseSwap(n);
 assert.equal(app.swaps.latpulldown,'Lat Pulldown straps');
 set('cur',{bgA:{latpulldown:[{w:'60',r:'12',done:true}]}}); set('sessionStart',{bgA:Date.now()});
 await app.doNewSession('bgA'); await tick();
 assert.equal(app.hist['alt::lat-pulldown-straps'][0].top,60); assert.equal(app.hist.latpulldown,undefined);
 await app.removeMyAlt('latpulldown','Lat Pulldown straps');
 deq(app.myAlts,{}); assert.equal(app.hist['alt::lat-pulldown-straps'].length,1,'removing the name keeps its history');
});

test('typed names are in the backup and come back on import',async()=>{
 const {app}=await beginner();
 await app.addMyAlt('pushdown','Pushdown rope'); await app.addMyAlt('pushdown','Pushdown machine 2');
 const b=JSON.parse(JSON.stringify(app.backup()));
 deq(b.myAlts,{pushdown:['Pushdown rope','Pushdown machine 2']});
 const r2=await load(); r2.ctx.window.__imp=JSON.parse(JSON.stringify(b)); await r2.app.applyImport();
 deq(r2.app.myAlts,b.myAlts);
 const r3=await load(); delete b.myAlts; r3.ctx.window.__imp=b; await r3.app.applyImport();
 deq(r3.app.myAlts,{},'an older backup loads with none');
});
