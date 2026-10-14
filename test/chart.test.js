'use strict';
/* The exercise chart: range filtering (chartSeries) and placing points by
   date rather than by index (buildChart), so a gap in training shows. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);
const S=(w,...rs)=>rs.map(r=>({w,r}));
/* cx of every dot in a buildChart() SVG, left to right as drawn */
const xs=svg=>[...svg.matchAll(/<circle[^>]*cx="([\d.]+)"/g)].map(m=>+m[1]);
const rs=svg=>[...svg.matchAll(/<circle[^>]*r="([\d.]+)"/g)].map(m=>+m[1]);

async function withHist(){
 const ctx=await load(), {app,set}=ctx, td=app.today(), d=n=>app.addDays(td,-n);
 /* stored out of order on purpose: the series must come out oldest first */
 set('hist',{dbbench:[
  {date:d(5),top:22,reps:10,sets:S(22,10,9)},
  {date:d(100),top:16,reps:10},
  {date:d(20),top:20,reps:12,sets:S(20,12,10),at:'home'},
  {date:d(60),top:18,reps:10,sets:S(18,10,10)}]});
 return {...ctx,d};
}

test('chartSeries: oldest first, filtered by range',async()=>{
 const {app,d}=await withHist();
 deq(app.chartSeries('dbbench','top','all').map(p=>p.date),[d(100),d(60),d(20),d(5)]);
 deq(app.chartSeries('dbbench','top','3m').map(p=>p.val),[18,20,22],'3 months: 91 days');
 deq(app.chartSeries('dbbench','top','4w').map(p=>p.val),[20,22],'4 weeks: 28 days');
 assert.equal(app.chartSeries('dbbench','top','4w')[0].home,true,'home flag carried');
 deq(app.chartSeries('nothing','top','all'),[]);
 deq(plain(app.CHART_SPANS).map(s=>s.id),['4w','3m','all'],'no one-week chip');
});

test('chartSeries: the range edge matches Compare\'s window',async()=>{
 const {app,set}=await load(), td=app.today(), d=n=>app.addDays(td,-n);
 set('hist',{x:[{date:d(28),top:1},{date:d(27),top:2},{date:td,top:3}]});
 deq(app.chartSeries('x','top','4w').map(p=>p.val),[2,3],'27 days back is in, 28 is out');
 assert.equal(app.chartFrom('4w'),app.spanWindows('4w').from);
 assert.equal(app.chartFrom('all'),null);
});

test('buildChart: points with dates are placed by date, so a gap shows',async()=>{
 const {app,d}=await load().then(c=>({...c,d:n=>c.app.addDays(c.app.today(),-n)}));
 const pts=[{date:d(30),label:'a',val:10},{date:d(29),label:'b',val:11},{date:d(2),label:'c',val:12}];
 const x=xs(app.buildChart(pts));
 assert.equal(x.length,3);
 assert.ok(x[0]<x[1]&&x[1]<x[2],'left to right by date');
 assert.ok(x[2]-x[1]>20*(x[1]-x[0]),'a 27-day gap is far wider than a 1-day one');
});

test('buildChart: without dates it still spaces evenly (older callers)',async()=>{
 const {app}=await load();
 const x=xs(app.buildChart([{label:'a',val:1},{label:'b',val:2},{label:'c',val:3}]));
 assert.ok(Math.abs((x[1]-x[0])-(x[2]-x[1]))<0.2);
 const one=xs(app.buildChart([{date:'2026-10-01',label:'a',val:1}]));
 assert.equal(one.length,1,'a single point still draws');
});

test('buildChart: smaller dots past 30 points; today stays larger',async()=>{
 const {app}=await load(), td=app.today();
 const many=Array.from({length:31},(_,i)=>({date:app.addDays(td,-40+i),label:'',val:20+i%3}));
 many.push({date:td,label:'Today',val:21,today:true});
 const r=rs(app.buildChart(many));
 assert.ok(r.slice(0,-1).every(v=>v===3),'past 30 points: r=3');
 assert.equal(r[r.length-1],3.5,'today is half a step bigger');
 const few=rs(app.buildChart(many.slice(0,5)));
 assert.ok(few.every(v=>v===4));
});

test('buildChart: one label for a tied best, plus the latest',async()=>{
 const {app}=await load(), td=app.today(), d=n=>app.addDays(td,-n);
 const lbl=svg=>[...svg.matchAll(/class="cx-lbl"[^>]*>([^<]+)</g)].map(m=>m[1]);
 const tied=[{date:d(40),label:'',val:18},{date:d(20),label:'',val:22},{date:d(17),label:'',val:22},{date:d(14),label:'',val:22},{date:d(1),label:'',val:20}];
 assert.deepEqual(lbl(app.buildChart(tied)),['22','20'],'first best and latest only');
 const near=[{date:d(40),label:'',val:18},{date:d(2),label:'',val:22},{date:d(1),label:'',val:22}];
 assert.deepEqual(lbl(app.buildChart(near)),['22'],'best right beside the latest at the same height: one label');
});

test('openChart renders for every range, including one with nothing in it',async()=>{
 const {app,set}=await withHist();
 for(const s of ['4w','3m','all']){ set('chartSpan',s); app.openChart('dbbench'); }
 set('hist',{dbbench:[{date:'2025-01-01',top:10,reps:10}]});
 set('chartSpan','4w'); app.openChart('dbbench');   /* history, but none in range */
 set('chartSpan','all'); app.openChart('legpress');  /* no history at all */
 assert.ok(true);
});
