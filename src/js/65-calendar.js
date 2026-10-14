/* ============ CALENDAR ============
   Progress -> Calendar: the last few months as month grids, newest first,
   one dot per session day (filled at the gym, ringed at home), so turning up
   is visible over months, not just this week. Tap a day for what was
   trained. Dates are UTC ISO days, like today() and history. */
let calMonthsShown=3, calPick=null;
/* [{y, m}] for the last n months, oldest first, ending with this month. */
function calMonths(n){ const t=today(), y=+t.slice(0,4), m=+t.slice(5,7)-1, out=[];
 for(let i=n-1;i>=0;i--){ const d=new Date(Date.UTC(y,m-i,1)); out.push({y:d.getUTCFullYear(),m:d.getUTCMonth()}); }
 return out; }
function isoOf(y,m,d){ return new Date(Date.UTC(y,m,d)).toISOString().slice(0,10); }
/* {date: 'gym'|'home'} for every session day. */
function calDays(){ const by={}; sessionsByDate().forEach(s=>{ by[s.date]=s.at; }); return by; }
function calMonthHTML(y,m,days){
 const first=new Date(Date.UTC(y,m,1)), lead=(first.getUTCDay()+6)%7, n=new Date(Date.UTC(y,m+1,0)).getUTCDate(), td=today();
 let cells='', count=0;
 for(let i=0;i<lead;i++) cells+='<span></span>';
 for(let d=1;d<=n;d++){ const iso=isoOf(y,m,d), at=days[iso]; if(at) count++;
  cells+='<button class="cd'+(at?' s '+at:'')+(iso===td?' td':'')+(iso===calPick?' pick':'')+'"'+
   (at?' data-date="'+iso+'"':' disabled')+'>'+d+'</button>'; }
 const name=first.toLocaleString('en-GB',{month:'long',timeZone:'UTC'})+(y!==+td.slice(0,4)?' '+y:'');
 return '<div class="cmonth"><div class="cmh"><b>'+name+'</b><span>'+count+' session'+(count===1?'':'s')+'</span></div>'+
  '<div class="cgrid">'+['M','T','W','T','F','S','S'].map(x=>'<i>'+x+'</i>').join('')+cells+'</div></div>'; }
/* What was trained on a day: each lift's best set, where, how it felt, the note. */
function calDetail(date){ const lifts=[];
 Object.keys(hist).forEach(k=>(hist[k]||[]).forEach(e=>{ if(e.date===date) lifts.push({nm:keyName(k),set:setTxt(bestSet(e)),home:placeOf(e)==='home'}); }));
 if(!lifts.length) return '';
 const ef=effortOf(date), wd=new Date(date).toLocaleString('en-GB',{weekday:'long',timeZone:'UTC'});
 return '<div class="cdet"><b>'+wd+' '+shortDate(date)+'</b> · '+(lifts.some(l=>l.home)?'Home':'Gym')+(ef?' · '+EFFORTS[ef]:'')+
  '<div>'+lifts.map(l=>escHTML(l.nm)+' <span>'+l.set+'</span>').join('<br>')+'</div>'+
  (sessNoteOf(date)?'<small>'+escHTML(sessNoteOf(date))+'</small>':'')+'</div>'; }
function calendarBlock(){ const ds=allSessionDates(); if(!ds.length) return '';
 const days=calDays(), ms=calMonths(calMonthsShown).reverse();
 const earliest=isoOf(ms[ms.length-1].y,ms[ms.length-1].m,1), older=ds.some(x=>x<earliest);
 return '<h5>Calendar</h5>'+ms.map(x=>{ const g=calMonthHTML(x.y,x.m,days);
   return calPick&&calPick.slice(0,7)===isoOf(x.y,x.m,1).slice(0,7)?g+calDetail(calPick):g; }).join('')+
  (older&&calMonthsShown<6?'<button class="dbtn" id="calMore">Show 6 months</button>':'')+
  '<div class="note">Filled: a gym session. Ringed: at home. Tap a day to see what you trained.</div>'; }
function wireCalendar(){ const box=document.getElementById('calBox'); if(!box) return;
 const redo=()=>{ box.innerHTML=calendarBlock(); wireCalendar(); };
 box.querySelectorAll('.cd.s').forEach(b=>b.addEventListener('click',()=>{ calPick=calPick===b.dataset.date?null:b.dataset.date; redo(); }));
 const more=document.getElementById('calMore'); if(more) more.addEventListener('click',()=>{ calMonthsShown=6; redo(); }); }
