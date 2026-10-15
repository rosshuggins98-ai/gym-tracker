'use strict';
/* Training calendar in Progress (backlog item 9). */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);

test('calMonths: the last n months, oldest first, ending this month, across a new year',async()=>{
 const {app}=await load(), t=app.today(), y=+t.slice(0,4), m=+t.slice(5,7)-1;
 const ms=plain(app.calMonths(3));
 assert.equal(ms.length,3); deq(ms[2],{y,m},'ends with this month');
 const twelve=plain(app.calMonths(12));
 const first=new Date(Date.UTC(y,m-11,1));
 deq(twelve[0],{y:first.getUTCFullYear(),m:first.getUTCMonth()},'12 months back lands in the year before');
 for(let i=1;i<12;i++) assert.ok(twelve[i].y*12+twelve[i].m===twelve[i-1].y*12+twelve[i-1].m+1,'consecutive');
});

test('a month grid: Monday first, one button per day, sessions marked, home ringed',async()=>{
 const {app}=await load();
 /* October 2026 starts on a Thursday: three blank cells before the 1st */
 const html=app.calMonthHTML(2026,9,{'2026-10-06':'gym','2026-10-08':'home','2026-10-13':'gym'});
 const cells=html.split('class="cgrid">')[1];
 assert.equal((cells.match(/<span><\/span>/g)||[]).length,3,'Mon-Wed blank');
 assert.equal((cells.match(/class="cd/g)||[]).length,31,'31 days');
 assert.ok(/October<\/b><span>3 sessions</.test(html),'month name and count');
 assert.ok(/class="cd s gym[^"]*" data-date="2026-10-06">6</.test(html));
 assert.ok(/class="cd s home[^"]*" data-date="2026-10-08">8</.test(html));
 assert.ok(/class="cd[^"]*" disabled>7</.test(html),'a day without a session is not tappable');
 const jan=app.calMonthHTML(2025,0,{});
 assert.ok(/January 2025<\/b><span>0 sessions/.test(jan),'another year shows its year');
});

test('calendarBlock: newest month first, more months on request, a tapped day explained',async()=>{
 const {app,set}=await load(), t=app.today(), d=n=>app.addDays(t,-n);
 set('hist',{dbbench:[{date:d(150),top:16,reps:10},{date:d(3),top:22,reps:12,sets:[{w:22,r:12},{w:22,r:10}]}],
  legpress:[{date:d(3),top:140,reps:12,at:'home'}]});
 await app.setSessNote(d(3),'short on time');
 set('calMonthsShown',3); set('calPick',null);
 const a=app.calendarBlock();
 const names=[...a.matchAll(/class="cmh"><b>([^<]+)</g)].map(m=>m[1]);
 assert.equal(names.length,3); assert.equal(names[0],new Date(t).toLocaleString('en-GB',{month:'long',timeZone:'UTC'}),'this month first');
 assert.ok(a.indexOf('id="calMore"')>0,'older sessions exist: offer 6 months');
 set('calMonthsShown',6);
 assert.ok(app.calendarBlock().indexOf('id="calMore"')<0,'already showing 6');
 set('calPick',d(3));
 const p=app.calendarBlock();
 assert.ok(p.indexOf('class="cdet"')>0,'the picked day is explained');
 assert.ok(p.indexOf('Dumbbell Bench')>0&&p.indexOf('22kg × 12')>0&&p.indexOf('Leg Press')>0,'what was trained, best sets');
 assert.ok(p.indexOf('Home')>0,'where');
 assert.ok(p.indexOf('short on time')>0,'the note');
 set('hist',{}); assert.equal(app.calendarBlock(),'','nothing logged: no calendar');
});
