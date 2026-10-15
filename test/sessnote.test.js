'use strict';
/* Session note (backlog item 8): one short note per session date, typed on
   the summary sheet, shown on the chart's session rows and in "Where you
   trained", and carried in backups. Written before the code. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load,plain}=require('./harness');
const deq=(a,b,m)=>assert.deepEqual(plain(a),b,m);

test('setSessNote: trimmed, spaces collapsed, capped at 140, cleared when empty',async()=>{
 const {app}=await load();
 await app.setSessNote('2026-10-06','  slept   badly,\n gym packed  ');
 assert.equal(app.sessNoteOf('2026-10-06'),'slept badly, gym packed');
 await app.setSessNote('2026-10-07','x'.repeat(200));
 assert.equal(app.sessNoteOf('2026-10-07').length,140);
 await app.setSessNote('2026-10-06','   ');
 assert.equal(app.sessNoteOf('2026-10-06'),'','cleared');
 deq(Object.keys(app.sessNotes),['2026-10-07'],'an empty note is removed, not stored blank');
 assert.equal(app.sessNoteOf('2026-01-01'),'');
});

test('the note rides in the backup and the import; older backups without one still load',async()=>{
 const {app,set,ctx,tick}=await load();
 await app.setSessNote('2026-10-06','gym packed, short rests');
 const b=app.backup(); deq(b.sessNotes,{'2026-10-06':'gym packed, short rests'});
 set('sessNotes',{});
 ctx.window.__imp=JSON.parse(JSON.stringify(b)); await app.applyImport(); await tick();
 assert.equal(app.sessNoteOf('2026-10-06'),'gym packed, short rests');
 const old=JSON.parse(JSON.stringify(b)); delete old.sessNotes;
 ctx.window.__imp=old; await app.applyImport(); await tick();
 deq(app.sessNotes,{},'a backup from before notes: none');
});

test('the note shows on session rows, in Where you trained and on the summary -- as text, never HTML',async()=>{
 const {app,set}=await load();
 set('hist',{dbbench:[{date:'2026-10-06',top:22,reps:12,vol:264,sets:[{w:22,r:12}]},{date:'2026-10-03',top:22,reps:10}]});
 await app.setSessNote('2026-10-06','<b>tired</b> & "slow"');
 const safe='&lt;b&gt;tired&lt;/b&gt; &amp; &quot;slow&quot;';
 for(const [where,html] of [['session rows',app.histRows(app.hist.dbbench,'dbbench')],['Where you trained',app.placeBlock()],
   ['summary',app.sessNoteRow('2026-10-06')]]){
  assert.ok(html.indexOf(safe)>=0,where+': shown, escaped');
  assert.ok(html.indexOf('<b>tired')<0,where+': never as markup');
 }
 assert.ok(app.histRows(app.hist.dbbench,'dbbench').split('class="hnote"').length===2,'only the dated session has a note line');
 assert.ok(app.sessNoteRow('2026-10-03').indexOf('value=""')>0,'no note: empty box');
});
