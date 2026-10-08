'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);

/* The user's beginner plan and gym swaps as of the 6 Oct backup. */
function plan(set){
 set('PLAN',{name:'T',days:[
  {id:'bgA',name:'A',tag:'',av:'--a1',items:['goblet','dbbench','latpulldown','dbrdl','dbcurl','pushdown'].map(ex=>({ex,sets:3,reps:[10,10,10]}))},
  {id:'bgB',name:'B',tag:'',av:'--a2',items:['legpress','incline','cablerow','legcurl','lateral','hammer'].map(ex=>({ex,sets:3,reps:[10,10,10]}))},
  {id:'bgC',name:'C',tag:'',av:'--a3',items:['dbbench','csrow','legext','legcurl','dbshoulder','pushdown'].map(ex=>({ex,sets:3,reps:[10,10,10]}))}]});
 set('ACTIVE','bgA'); set('cur',{}); set('prev',{}); set('hist',{}); set('PLACE','gym');
 set('swaps',{hammer:'Cable Curl',dbcurl:'Cable Curl',goblet:'Leg Press',pushdown:'Overhead Extension',cablerow:'Chest-Supported Row'});
}
const names=(app,id)=>app.day(id).items.map(it=>app.vName(it.ex,app.swaps[it.ex]||null));

test('at home every day is dumbbells and bench only; back at the gym the gym swaps return',async()=>{
 const {app,set}=await load(); plan(set);
 const gym=JSON.stringify(plain(app.swaps));
 await app.setPlace('home');
 deq(names(app,'bgA'),['Goblet Squat','Dumbbell Bench','DB Pullover','Dumbbell RDL','Dumbbell Curl','Overhead Extension']);
 deq(names(app,'bgB'),['Goblet Squat','Dumbbell Incline','Single-arm DB Row','Dumbbell Leg Curl','Lateral Raises','Hammer Curl']);
 deq(names(app,'bgC'),['Dumbbell Bench','Single-arm DB Row','Bulgarian Split Squat','Dumbbell Leg Curl','DB Shoulder Press','Overhead Extension']);
 for(const d of ['bgA','bgB','bgC']) names(app,d).forEach(n=>assert.ok(app.homeOk(n),n));
 assert.equal(app.hkey('legcurl',app.swaps.legcurl),'dblegcurl','home stand-ins are real library entries');
 assert.equal(JSON.stringify(plain(app.backup().swaps)),gym,'backup keeps the gym swaps');
 await app.setPlace('gym');
 assert.equal(JSON.stringify(plain(app.swaps)),gym);
});

test('a pick made at home only applies at home',async()=>{
 const {app,set}=await load(); plan(set);
 await app.setPlace('home');
 set('swapT','legpress'); await app.chooseSwap('Bulgarian Split Squat');
 set('swapT','dbcurl'); await app.chooseSwap(null);
 assert.equal(app.swaps.legpress,'Bulgarian Split Squat');
 assert.equal(app.swaps.dbcurl,undefined,'planned Dumbbell Curl kept at home');
 app.render(); assert.equal(app.swaps.legpress,'Bulgarian Split Squat','survives a re-render');
 deq(app.backup().homeSwaps,{legpress:'Bulgarian Split Squat',dbcurl:''});
 await app.setPlace('gym');
 assert.equal(app.swaps.legpress,undefined); assert.equal(app.swaps.dbcurl,'Cable Curl');
});

test('needsGym: a slot with no home option is flagged at home only',async()=>{
 const {app,set}=await load(); plan(set);
 app.PLAN.days[0].items.push({ex:'pullup',sets:3,reps:[8,8,8]});
 assert.equal(app.needsGym('pullup'),false);
 await app.setPlace('home');
 assert.equal(app.swaps.pullup,undefined); assert.equal(app.needsGym('pullup'),true);
});

test('prefill: a prev logged as a different exercise is not used',async()=>{
 const {app,set,tick}=await load(); plan(set);
 set('hist',{legcurl:[{date:'2026-10-01',top:50,reps:11}]});
 set('ACTIVE','bgB'); set('cur',{bgB:{legcurl:[{w:'50',r:'11',done:true}]}});
 await app.doNewSession(); await tick();
 assert.equal(app.prev.bgB._keys.legcurl,'legcurl');
 assert.equal(app.lastW('bgB','legcurl',0),'50','gym: machine weight');
 await app.setPlace('home');
 assert.equal(app.lastW('bgB','legcurl',0),null,'home: Dumbbell Leg Curl has no history, so no 50kg prefill');
});

test('prefill: a prev from before _keys counts as logged under the gym swaps',async()=>{
 const {app,set}=await load(); plan(set);
 set('prev',{bgA:{_date:'2026-10-01',goblet:[{w:'100',r:'10'}],dbbench:[{w:'22',r:'10'}]}});
 assert.equal(app.lastW('bgA','goblet',0),'100','gym: the slot is Leg Press, as it was logged');
 await app.setPlace('home');
 assert.notEqual(app.lastW('bgA','goblet',0),'100','home: Goblet Squat must not get the leg press weight');
 assert.equal(app.lastW('bgA','dbbench',0),'22','unswapped slot still prefills');
});
