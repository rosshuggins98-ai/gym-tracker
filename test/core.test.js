'use strict';
/* 2026-10-26: a second pushdown machine (different pulley, so its weights
   aren't comparable) and the rehab exercises Ross's gym has, in a new Core
   group. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);

test('the second pushdown machine has its own history, reached from the swap button',async()=>{
 const {app}=await load();
 assert.equal(app.LIB.pushdown2.n,'Tricep Pushdown (machine 2)');
 assert.equal(app.LIB.pushdown.alts[0],'Tricep Pushdown (machine 2)','first on the swap list');
 assert.equal(app.hkey('pushdown','Tricep Pushdown (machine 2)'),'pushdown2','logged apart from the usual machine');
 assert.equal(app.hkey('pushdown',null),'pushdown');
 deq(app.musclesFor('pushdown2',null),{triceps:1});
 assert.equal(app.incFor('pushdown2'),app.incFor('pushdown'));
});

test('core exercises: crunches, back extensions, a Core muscle group, gym only',async()=>{
 const {app,set}=await load();
 assert.equal(app.MUSCLES.core,'Core');
 deq(['cablecrunch','mcrunch','mbackext','backext'].map(id=>[app.LIB[id].n,app.LIB[id].g]),
  [['Cable Crunch','Core'],['Machine Crunch','Core'],['Back Extension Machine','Core'],['Back Extension','Core']]);
 deq(app.musclesFor('cablecrunch',null),{core:1});
 deq(app.musclesFor('backext',null),{core:1,glutes:.5,hamstrings:.5});
 for(const id of ['cablecrunch','mcrunch','mbackext','backext']){
  assert.equal(app.homeOk(app.LIB[id].n),false,id+': no home version');
  assert.equal(app.homeAuto(id),null,id+': stays as planned, flagged as gym kit at home'); }
 set('PLAN',{name:'T',days:[{id:'a',name:'A',tag:'',av:'--a1',items:[{ex:'cablecrunch',sets:2,reps:[15,15]},{ex:'backext',sets:2,reps:[15,15]}]}]});
 set('swaps',{});
 deq(app.plannedByGroup(),{core:4,glutes:1,hamstrings:1});
 const c=await app.addCustom('Plank','Core','');
 deq(app.musclesFor(c,null),{core:1},'a custom Core exercise counts as core');
});
