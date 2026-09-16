'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');

const day=()=>({id:'x',items:[{ex:'bench',sets:3,reps:[8,8,8],rest:150},{ex:'dbcurl',sets:2,reps:[12,12],rest:45,super:true},
 {ex:'pushdown',sets:2,reps:[12,12],rest:45},{ex:'calf',sets:2,reps:[15,15],super:true}]});

test('ssRole pairs an item with the next one; a trailing flag is ignored',async()=>{
 const {app}=await load(); const d=day();
 assert.equal(app.ssRole(d,0),null);
 assert.equal(app.ssRole(d,1),'first');
 assert.equal(app.ssRole(d,2),'second');
 assert.equal(app.ssRole(d,3),null,'super on the last item has no partner');
 assert.equal(app.ssRole(d,9),null);
 assert.equal(app.ssPartner(d,1).ex,'pushdown'); assert.equal(app.ssPartner(d,2).ex,'dbcurl'); assert.equal(app.ssPartner(d,0),null);
});

test('rest is taken after the second half only',async()=>{
 const {app}=await load(); const d=day();
 assert.equal(app.restAfter(d,0),150);
 assert.equal(app.restAfter(d,1),0);
 assert.equal(app.restAfter(d,2),45);
 assert.equal(app.restAfter(d,3),60,'trailing flag: normal rest, default 60');
});

test('a chain A.super B.super C rests only after C',async()=>{
 const {app}=await load();
 const d={id:'x',items:[{ex:'a',sets:1,reps:[1],super:true},{ex:'b',sets:1,reps:[1],super:true},{ex:'c',sets:1,reps:[1],rest:90}]};
 assert.equal(app.ssRole(d,0),'first'); assert.equal(app.ssRole(d,1),'first'); assert.equal(app.ssRole(d,2),'second');
 assert.deepEqual([0,1,2].map(i=>app.restAfter(d,i)),[0,0,90]);
});

test('the full-body preset supersets curl with pushdown',async()=>{
 const {app}=await load();
 const B=app.FULL_BODY_PLAN().days[1];
 const i=B.items.findIndex(x=>x.ex==='dbcurl');
 assert.equal(app.ssRole(B,i),'first'); assert.equal(app.ssPartner(B,i).ex,'pushdown');
});
