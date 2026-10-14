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

/* --- Metric switch (backlog item 2) --- */
test('chartVal: each metric, and null rather than a guess',async()=>{
 const {app}=await load();
 const now={date:'2026-10-10',top:22,reps:12,vol:660,sets:[{w:12,r:10,t:'warm'},{w:22,r:12},{w:22,r:9},{w:20,r:8}]};
 assert.equal(app.chartVal(now,'top'),22);
 assert.equal(app.chartVal(now,'reps'),12);
 assert.equal(app.chartVal(now,'vol'),660);
 /* e1rm: best of the ≤10-rep working sets -- 22x9 (28.6) beats 20x8 (25.3);
    22x12 is over 10 reps and the warm-up never counts */
 assert.equal(app.chartVal(now,'e1rm'),app.e1RMShown(22,9));
 const old={date:'2026-08-20',top:16,reps:10};             /* no vol, no sets */
 assert.equal(app.chartVal(old,'vol'),null,'no volume before 11 Sep: left off, not estimated');
 assert.equal(app.chartVal(old,'e1rm'),app.e1RMShown(16,10),'falls back to the top set');
 assert.equal(app.chartVal({date:'x',top:20,reps:15,sets:S(20,15,14)},'e1rm'),null,'only high-rep sets: none');
 assert.equal(app.chartVal({date:'x',top:20},'reps'),null,'no reps logged');
 assert.equal(app.chartVal(null,'top'),null);
});

test('chartSeries skips sessions a metric cannot show',async()=>{
 const {app}=await withHist();
 assert.equal(app.chartSeries('dbbench','top','all').length,4);
 assert.equal(app.chartSeries('dbbench','vol','all').length,0,'fixture has no vol');
 assert.equal(app.chartSeries('dbbench','reps','all').length,4);
});

test('metric: top set by default; a bodyweight lift is always reps',async()=>{
 const {app,set}=await load();
 set('hist',{dbbench:[{date:'2026-10-01',top:20,reps:10}],
  'alt::pull-ups':[{date:'2026-10-01',top:0,reps:5},{date:'2026-10-03',top:0,reps:6}]});
 set('chartMetric','top');
 assert.equal(app.chartMetricFor('dbbench'),'top');
 assert.equal(app.chartMetricFor('alt::pull-ups'),'reps','every session at 0kg');
 set('chartMetric','vol');
 assert.equal(app.chartMetricFor('dbbench'),'vol','the pick holds across lifts');
 assert.equal(app.chartMetricFor('alt::pull-ups'),'reps');
 set('incs',{dbbench:0});
 assert.equal(app.chartMetricFor('dbbench'),'reps','a 0kg jump means bodyweight');
 assert.equal(app.chartMetricChips('dbbench'),'','no metric chips for bodyweight');
});

test('today\'s unfinished session charts under every metric',async()=>{
 const {app,set}=await load();
 set('cur',{a:{dbbench:[{w:'12',r:'10',done:true,t:'warm'},{w:'22',r:'9',done:true},{w:'22',r:'8',done:true},{w:'22',r:'',done:false}]}});
 const e=app.chartLiveEntry('a','dbbench');
 assert.equal(app.chartVal(e,'top'),22);
 assert.equal(app.chartVal(e,'reps'),9);
 assert.equal(app.chartVal(e,'vol'),22*9+22*8,'warm-up and unticked sets left out');
 assert.equal(app.chartVal(e,'e1rm'),app.e1RMShown(22,9));
 assert.equal(app.chartLiveEntry('a','legpress'),null);
 assert.equal(app.chartLiveEntry(null,'dbbench'),null,'opened from Progress: no live session');
});

test('chartNum shortens big volumes; the first dot clears the y labels',async()=>{
 const {app}=await load();
 assert.equal(app.chartNum(660),'660');
 assert.equal(app.chartNum(12430),'12.4k');
 assert.equal(app.chartNum(22.5),'22.5');
 for(const [a,b] of [[14,22],[18.7,29.3],[540,682],[9800,12430]]){
  const x=xs(app.buildChart([{date:'2026-09-01',label:'',val:a},{date:'2026-10-01',label:'',val:b}]));
  const w=6*Math.max(app.chartNum(a).length,app.chartNum(b).length);
  assert.ok(x[0]-4>=4+w,'first dot clear of a '+w+'-unit label ('+a+'..'+b+')');
 }
});

test('openChart renders for every range and metric, including empty ones',async()=>{
 const {app,set}=await withHist();
 for(const m of ['top','e1rm','vol','reps']) for(const s of ['4w','3m','all']){ set('chartMetric',m); set('chartSpan',s); app.openChart('dbbench'); }
 set('hist',{dbbench:[{date:'2025-01-01',top:10,reps:10}]});
 set('chartSpan','4w'); app.openChart('dbbench');   /* history, but none in range */
 set('chartSpan','all'); app.openChart('legpress');  /* no history at all */
 assert.ok(true);
});
