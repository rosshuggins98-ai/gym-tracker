'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);

test('an extra is today-only: logged to history, then gone from the plan at finish',async()=>{
 const {app,set,tick}=await load();
 set('hist',{}); const d=app.day('push');
 assert.equal(app.addExtra(d,'pecdeck'),true);
 assert.equal(app.addExtra(d,'pecdeck'),false,'never the same exercise twice in a day');
 assert.equal(app.addExtra(d,'bench'),false);
 const it=d.items[d.items.length-1];
 deq(it,{ex:'pecdeck',sets:3,reps:[12,12,12],extra:true});
 assert.equal(app.setCount(d),13+3,'extras count toward today\'s sets');
 set('cur',{push:{pecdeck:[{w:'45',r:'12',done:true}]}});
 await app.doNewSession(); await tick();
 assert.equal(app.hist.pecdeck[0].top,45);
 assert.ok(!app.day('push').items.some(x=>x.ex==='pecdeck'));
 assert.equal(app.prev.push.pecdeck[0].w,'45','prev keeps it, so adding it on another day prefills from here');
});

test('Keep in plan makes an extra permanent',async()=>{
 const {app,tick}=await load();
 const d=app.day('push'); app.addExtra(d,'pecdeck');
 app.keepExtra(d.items[d.items.length-1]);
 await app.doNewSession(); await tick();
 deq(app.day('push').items.slice(-1),[{ex:'pecdeck',sets:3,reps:[12,12,12]}]);
});

test('an extra copies sets, reps and rest from where the exercise is already planned',async()=>{
 const {app,tick}=await load();
 await app.loadPreset('beginner'); await tick();
 app.addExtra(app.day('bgA'),'legcurl');
 deq(app.day('bgA').items.slice(-1),[{ex:'legcurl',sets:3,reps:[12,12,12],extra:true,rest:90}]);
});

test('skip today: out of the count, prefills dropped, nothing logged, back next session',async()=>{
 const {app,set,tick}=await load();
 set('hist',{ohp:[{date:'2026-09-01',top:30,reps:8}]});
 const d=app.day('push'), it=d.items.find(x=>x.ex==='ohp');
 set('cur',{}); app.slot('push','ohp',0);   /* the render-time prefill from history */
 assert.equal(app.cur.push.ohp[0].w,'30');
 assert.equal(app.skipToday(d,it),true);
 assert.equal(app.setCount(d),13-3);
 assert.equal(app.cur.push.ohp,undefined);
 await app.doNewSession(); await tick();
 assert.equal(app.hist.ohp.length,1,'a skip never re-logs last time\'s weight');
 assert.equal(app.day('push').items.find(x=>x.ex==='ohp').skip,undefined);
 assert.equal(app.setCount(app.day('push')),13);
});

test('skip and remove are refused once a set is ticked',async()=>{
 const {app,set}=await load();
 const d=app.day('push'); app.addExtra(d,'pecdeck');
 set('cur',{push:{ohp:[{w:'30',r:'8',done:true}],pecdeck:[{w:'40',r:'12',done:true}]}});
 assert.equal(app.skipToday(d,d.items.find(x=>x.ex==='ohp')),false);
 assert.equal(app.removeExtra(d,d.items.find(x=>x.ex==='pecdeck')),false);
 set('cur',{push:{}});
 assert.equal(app.removeExtra(d,d.items.find(x=>x.ex==='pecdeck')),true);
 assert.ok(!d.items.some(x=>x.ex==='pecdeck'));
});

test('routine snapshots never carry today-only changes',async()=>{
 const {app,set,tick}=await load();
 set('routines',[]);
 const d=app.day('push'); app.addExtra(d,'pecdeck'); app.skipToday(d,d.items[0]);
 await app.loadPreset('beginner'); await tick();
 const saved=app.routines[0].days.find(x=>x.id==='push');
 assert.ok(!saved.items.some(x=>x.ex==='pecdeck'));
 assert.ok(saved.items.every(x=>!x.skip));
});

test('recently logged lists last-30-day exercises not already in today\'s session',async()=>{
 const {app,set}=await load();
 const td=app.today();
 set('hist',{pecdeck:[{date:td,top:40}],bench:[{date:td,top:50}],legext:[{date:'2020-01-01',top:30}],'alt::x':[{date:td,top:1}]});
 deq(app.recentIds(app.day('push')),['pecdeck']);
});
