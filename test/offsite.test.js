'use strict';
/* serve.py's off-phone copy: every dated backup is sent to a private GitHub
   repo through the contents API. Runs the real server against a fake GitHub
   on localhost (config "api" points at it), so nothing leaves the machine. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {spawn}=require('node:child_process'), fs=require('fs'), os=require('os'), path=require('path'), http=require('http'), crypto=require('crypto');
const ROOT=path.join(__dirname,'..');
const TOKEN='github_pat_TESTTOKEN123', REPO='ross/gym-backups';
const ENV=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/_proxy$/i.test(k)));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* A fake GitHub: GET repo, GET/PUT contents. Records every request. */
function fakeGitHub(opts){
 const o=Object.assign({private:true,token:TOKEN,canWrite:true},opts||{});
 const files={}, reqs=[];
 const srv=http.createServer((q,s)=>{ let body=''; q.on('data',c=>body+=c); q.on('end',()=>{
  const auth=q.headers.authorization||'', u=decodeURIComponent(q.url.split('?')[0]);
  reqs.push({method:q.method,path:u,auth,ua:q.headers['user-agent'],body:body?JSON.parse(body):null});
  const send=(code,obj)=>{ s.writeHead(code,{'Content-Type':'application/json'}); s.end(JSON.stringify(obj)); };
  if(auth!=='Bearer '+o.token) return send(401,{message:'Bad credentials'});
  if(u==='/repos/'+REPO&&q.method==='GET') return send(200,{full_name:REPO,private:o.private});
  const m=u.match(/^\/repos\/ross\/gym-backups\/contents\/(.+)$/);
  if(!m) return send(404,{message:'Not Found'});
  const f=files[m[1]];
  if(q.method==='GET') return f?send(200,{sha:f.sha,path:m[1]}):send(404,{message:'Not Found'});
  if(q.method==='PUT'){
   if(!o.canWrite) return send(403,{message:'Resource not accessible by personal access token'});
   const b=JSON.parse(body);
   if(f&&!b.sha) return send(422,{message:'"sha" wasn\'t supplied.'});
   if(f&&b.sha!==f.sha) return send(409,{message:'does not match'});
   if(!f&&b.sha) return send(404,{message:'Not Found'});
   const content=Buffer.from(b.content,'base64').toString('utf8');
   const sha=crypto.createHash('sha1').update(content+Math.random()).digest('hex');
   files[m[1]]={sha,content,message:b.message};
   return send(f?200:201,{content:{sha,path:m[1]}});
  }
  send(405,{});
 }); });
 return {files,reqs,o,listen:port=>new Promise(r=>srv.listen(port||0,'127.0.0.1',()=>r(srv.address().port))),close:()=>new Promise(r=>{ srv.closeAllConnections&&srv.closeAllConnections(); srv.close(()=>r()); })};
}
function req(port,method,p,body){
 return new Promise((res,rej)=>{
  const r=http.request({host:'127.0.0.1',port,method,path:p,headers:body?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{}},x=>{
   let d=''; x.on('data',c=>d+=c); x.on('end',()=>res({status:x.statusCode,body:d})); });
  r.on('error',rej); if(body) r.write(body); r.end(); });
}
function freePort(){ return 20000+Math.floor(Math.random()*30000); }
function tmpHome(){ const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gt-off-')); const bk=path.join(dir,'bk'); fs.mkdirSync(bk); return {dir,bk,cfg:path.join(dir,'offsite.json')}; }
function writeCfg(h,apiPort,extra){ fs.writeFileSync(h.cfg,JSON.stringify(Object.assign({repo:REPO,token:TOKEN,api:'http://127.0.0.1:'+apiPort,retry:0.3},extra||{}))); }
function seed(h,date,obj){ fs.writeFileSync(path.join(h.bk,'gym-backup-'+date+'.json'),JSON.stringify(Object.assign({app:'gym-tracker'},obj||{}),null,1)); }
async function startServer(h,withOffsite){
 const port=freePort(), args=[path.join(ROOT,'serve.py'),'--port',String(port),'--dir',path.join(ROOT,'app'),'--backups',h.bk];
 if(withOffsite!==false) args.push('--offsite',h.cfg);
 const proc=spawn('python3',args,{stdio:['ignore','pipe','pipe'],env:ENV});
 let log=''; proc.stdout.on('data',c=>log+=c); proc.stderr.on('data',c=>log+=c);
 for(let i=0;i<50;i++){ try{ await req(port,'GET','/api/status'); break; }catch(e){ await sleep(100); } }
 return {port,proc,log:()=>log,stop:()=>new Promise(r=>{ if(proc.exitCode!==null||proc.signalCode) return r(); proc.once('exit',r); proc.kill(); })};
}
async function status(s){ return JSON.parse((await req(s.port,'GET','/api/status')).body).offsite; }
async function until(fn,ms){ const t=Date.now(); while(Date.now()-t<(ms||6000)){ const v=await fn(); if(v) return v; await sleep(100); } return fn(); }
/* async, not spawnSync: the fake GitHub lives in this process and has to keep answering */
function check(h){ return new Promise(res=>{ const p=spawn('python3',[path.join(ROOT,'serve.py'),'--offsite-check','--offsite',h.cfg,'--backups',h.bk],{env:ENV});
 let stdout='', stderr=''; p.stdout.on('data',c=>stdout+=c); p.stderr.on('data',c=>stderr+=c);
 p.on('close',status=>res({status,stdout,stderr})); }); }

test('offsite: off unless configured -- status says so and nothing is sent',async()=>{
 const h=tmpHome(), gh=fakeGitHub(), ghPort=await gh.listen();
 seed(h,'2026-01-01');
 const a=await startServer(h,false);                    /* no --offsite at all */
 const b=await startServer(Object.assign({},h),true);   /* --offsite, but no settings file yet */
 try{
  assert.deepEqual(await status(a),{enabled:false});
  assert.deepEqual(await status(b),{enabled:false});
  await sleep(400); assert.equal(gh.reqs.length,0);
 } finally { await a.stop(); await b.stop(); await gh.close(); fs.rmSync(h.dir,{recursive:true,force:true}); }
});

test('offsite: sends existing backups on start, then each save, updating a same-day file',async()=>{
 const h=tmpHome(), gh=fakeGitHub(), ghPort=await gh.listen();
 writeCfg(h,ghPort);
 seed(h,'2026-01-02',{n:2}); seed(h,'2026-01-01',{n:1});
 const s=await startServer(h);
 try{
  await until(async()=>(await status(s)).pending===0);
  assert.deepEqual(Object.keys(gh.files).sort(),['gym-backup-2026-01-01.json','gym-backup-2026-01-02.json']);
  const puts=gh.reqs.filter(r=>r.method==='PUT');
  assert.deepEqual(puts.map(r=>r.path),['/repos/'+REPO+'/contents/gym-backup-2026-01-01.json','/repos/'+REPO+'/contents/gym-backup-2026-01-02.json'],'oldest first');
  assert.ok(gh.reqs.every(r=>r.auth==='Bearer '+TOKEN&&r.ua),'token and a user agent on every call');
  assert.equal(gh.files['gym-backup-2026-01-01.json'].content,fs.readFileSync(path.join(h.bk,'gym-backup-2026-01-01.json'),'utf8'),'byte for byte');
  assert.match(gh.files['gym-backup-2026-01-01.json'].message,/^Gym backup 2026-01-01/);
  let st=await status(s);
  assert.equal(st.enabled,true); assert.equal(st.repo,REPO); assert.equal(st.error,null); assert.match(st.last_ok,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);

  /* a finished session: today's file goes up */
  const r1=JSON.parse((await req(s.port,'POST','/api/save',JSON.stringify({app:'gym-tracker',v:1}))).body);
  await until(()=>gh.files[r1.file]);
  assert.equal(JSON.parse(gh.files[r1.file].content).v,1);
  /* a second finish the same day replaces it (PUT with the sha) */
  await req(s.port,'POST','/api/save',JSON.stringify({app:'gym-tracker',v:2}));
  await until(()=>gh.files[r1.file]&&JSON.parse(gh.files[r1.file].content).v===2);
  assert.equal(JSON.parse(gh.files[r1.file].content).v,2);
  const last=gh.reqs.filter(r=>r.method==='PUT').pop(); assert.ok(last.body.sha,'update carries the sha');
  st=await status(s); assert.equal(st.pending,0); assert.equal(st.error,null);
  assert.ok(!JSON.stringify(st).includes(TOKEN)&&!s.log().includes(TOKEN),'the token is never shown or logged');
 } finally { await s.stop(); await gh.close(); fs.rmSync(h.dir,{recursive:true,force:true}); }
});

test('offsite: what was sent is remembered -- a restart sends only what changed',async()=>{
 const h=tmpHome(), gh=fakeGitHub(), ghPort=await gh.listen();
 writeCfg(h,ghPort); seed(h,'2026-01-01'); seed(h,'2026-01-02');
 let s=await startServer(h);
 try{
  await until(async()=>(await status(s)).pending===0); await s.stop();
  const before=gh.reqs.filter(r=>r.method==='PUT').length; assert.equal(before,2);
  seed(h,'2026-01-03',{n:3});
  s=await startServer(h);
  await until(async()=>(await status(s)).pending===0);
  const puts=gh.reqs.filter(r=>r.method==='PUT').slice(before).map(r=>r.path);
  assert.deepEqual(puts,['/repos/'+REPO+'/contents/gym-backup-2026-01-03.json']);
 } finally { await s.stop(); await gh.close(); fs.rmSync(h.dir,{recursive:true,force:true}); }
});

test('offsite: refuses a public repo, and says why',async()=>{
 const h=tmpHome(), gh=fakeGitHub({private:false}), ghPort=await gh.listen();
 writeCfg(h,ghPort); seed(h,'2026-01-01');
 const s=await startServer(h);
 try{
  const st=await until(async()=>{ const x=await status(s); return x.error&&x; });
  assert.match(st.error,/public/); assert.equal(st.pending,1);
  assert.equal(gh.reqs.filter(r=>r.method==='PUT').length,0,'nothing sent');
 } finally { await s.stop(); await gh.close(); fs.rmSync(h.dir,{recursive:true,force:true}); }
});

test('offsite: a wrong or expired token, a repo the token can\'t see, read-only access, a broken settings file',async()=>{
 const cases=[
  [{},{token:'github_pat_OLD'},/token/i],
  [{},{repo:'ross/other'},/can't find ross\/other/],
  [{canWrite:false},{},/write/],
 ];
 for(const [ghOpts,cfg,re] of cases){
  const h=tmpHome(), gh=fakeGitHub(ghOpts), ghPort=await gh.listen();
  writeCfg(h,ghPort,cfg); seed(h,'2026-01-01');
  const s=await startServer(h);
  try{
   const st=await until(async()=>{ const x=await status(s); return x.error&&x; });
   assert.match(st.error,re); assert.equal(st.pending,1); assert.equal(Object.keys(gh.files).length,0);
  } finally { await s.stop(); await gh.close(); fs.rmSync(h.dir,{recursive:true,force:true}); }
 }
 const h=tmpHome(); fs.writeFileSync(h.cfg,'{not json'); seed(h,'2026-01-01');
 const s=await startServer(h);
 try{ const st=await status(s); assert.equal(st.enabled,true); assert.match(st.error,/offsite-setup/); }
 finally { await s.stop(); fs.rmSync(h.dir,{recursive:true,force:true}); }
});

test('offsite: no signal -- keeps the backup waiting and sends it once GitHub can be reached',async()=>{
 const h=tmpHome(), ghPort=freePort();
 writeCfg(h,ghPort); seed(h,'2026-01-01');
 const s=await startServer(h);
 const gh=fakeGitHub();
 try{
  const st=await until(async()=>{ const x=await status(s); return x.error&&x; });
  assert.match(st.error,/Couldn't reach GitHub/); assert.equal(st.pending,1);
  await gh.listen(ghPort);                               /* back in signal */
  await until(async()=>(await status(s)).pending===0);
  assert.ok(gh.files['gym-backup-2026-01-01.json']); assert.equal((await status(s)).error,null);
 } finally { await s.stop(); await gh.close(); fs.rmSync(h.dir,{recursive:true,force:true}); }
});

test('offsite: a file already on GitHub that this phone doesn\'t know about is replaced, not an error',async()=>{
 const h=tmpHome(), gh=fakeGitHub(), ghPort=await gh.listen();
 gh.files['gym-backup-2026-01-01.json']={sha:'abc',content:'{}',message:'old'};
 writeCfg(h,ghPort); seed(h,'2026-01-01',{n:1});
 const s=await startServer(h);
 try{
  await until(async()=>(await status(s)).pending===0);
  assert.equal(JSON.parse(gh.files['gym-backup-2026-01-01.json'].content).n,1);
  assert.equal((await status(s)).error,null);
 } finally { await s.stop(); await gh.close(); fs.rmSync(h.dir,{recursive:true,force:true}); }
});

test('offsite: --offsite-check tests the repo and token and sends what is waiting',async()=>{
 const h=tmpHome(), gh=fakeGitHub(), ghPort=await gh.listen();
 writeCfg(h,ghPort);
 let r=await check(h);                                         /* nothing on the phone yet: still checks the repo */
 assert.equal(r.status,0,r.stdout+r.stderr); assert.match(r.stdout,/ross\/gym-backups/);
 assert.ok(gh.reqs.some(q=>q.path==='/repos/'+REPO));
 seed(h,'2026-01-01'); seed(h,'2026-01-02');
 r=await check(h);
 assert.equal(r.status,0,r.stdout+r.stderr); assert.match(r.stdout,/Copied 2 backups/);
 assert.equal(Object.keys(gh.files).length,2);
 r=await check(h); assert.equal(r.status,0); assert.match(r.stdout,/up to date/);
 gh.o.private=false; seed(h,'2026-01-03');
 r=await check(h); assert.equal(r.status,1); assert.match(r.stdout+r.stderr,/public/);
 assert.ok(!(r.stdout+r.stderr).includes(TOKEN));
 await gh.close(); fs.rmSync(h.dir,{recursive:true,force:true});
});

test('offsite-setup.sh (written by the installer): saves owner/name and the token privately, checks, and turns off',()=>{
 const {spawnSync}=require('node:child_process');
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'gt-home-')); fs.mkdirSync(path.join(home,'storage','downloads'),{recursive:true});
 try{
  let r=spawnSync('bash',[path.join(ROOT,'termux','gym-setup.sh')],{env:Object.assign({},ENV,{HOME:home,GYM_SETUP_NOLAUNCH:'1'}),encoding:'utf8'});
  assert.equal(r.status,0,r.stderr+r.stdout);
  const script=path.join(home,'gymtools','offsite-setup.sh'), cfg=path.join(home,'gymtools','offsite.json');
  /* no network: a proxy that isn't there, so the check fails as "no signal" without leaving the machine */
  const env=Object.assign({},ENV,{HOME:home,https_proxy:'http://127.0.0.1:9',HTTPS_PROXY:'http://127.0.0.1:9'});
  r=spawnSync('bash',[script],{env,input:'https://github.com/ross/gym-backups.git\n'+TOKEN+'\n',encoding:'utf8',timeout:60000});
  assert.equal(r.status,1,r.stdout+r.stderr);
  assert.match(r.stdout,/Saved for ross\/gym-backups/); assert.match(r.stdout,/Couldn't reach GitHub/);
  assert.ok(!(r.stdout+r.stderr).includes(TOKEN),'token not echoed');
  assert.deepEqual(JSON.parse(fs.readFileSync(cfg,'utf8')),{repo:REPO,token:TOKEN});
  assert.equal(fs.statSync(cfg).mode&0o777,0o600,'only Termux can read it');
  r=spawnSync('bash',[script],{env,input:'not a repo\nx\n',encoding:'utf8'});
  assert.equal(r.status,1); assert.equal(JSON.parse(fs.readFileSync(cfg,'utf8')).repo,REPO,'a bad name changes nothing');
  r=spawnSync('bash',[script,'off'],{env,encoding:'utf8'});
  assert.equal(r.status,0); assert.ok(!fs.existsSync(cfg));
 } finally { fs.rmSync(home,{recursive:true,force:true}); }
});

test('app: Data panel and summary wording for the GitHub copy',async()=>{
 const {load}=require('./harness');
 const {app}=await load();
 const now=new Date('2026-10-14T12:00:00').getTime();
 assert.equal(app.offsiteText(null),'','an older server says nothing');
 assert.match(app.offsiteText({enabled:false}),/not set up.*offsite-setup\.sh/);
 assert.match(app.offsiteText({enabled:true,repo:REPO,pending:0,error:null,last_ok:'2026-10-13T19:40'}),/up to date in <b>ross\/gym-backups<\/b>\. Last sent 13 Oct at 19:40/);
 assert.match(app.offsiteText({enabled:true,repo:REPO,pending:2,error:"Couldn't reach GitHub (no signal?). It will try again.",last_ok:null}),
  /not sent\..*Couldn&#39;t reach GitHub.*2 backups waiting\. Last sent: never/);
 assert.match(app.offsiteText({enabled:true,repo:'<x>/y',pending:0,error:null,last_ok:null}),/&lt;x&gt;\/y/,'escaped');

 const f='gym-backup-2026-10-14.json';
 assert.equal(app.sumBackupLine(f,null),'Backed up to the phone ✓ ('+f+').');
 assert.equal(app.sumBackupLine(f,{enabled:false}),'Backed up to the phone ✓ ('+f+').');
 assert.equal(app.sumBackupLine(f,{enabled:true,pending:0,error:null,last_ok:'2026-10-14T11:59'},now),'Backed up to the phone and GitHub ✓ ('+f+').');
 assert.match(app.sumBackupLine(f,{enabled:true,pending:1,error:null,last_ok:'2026-10-13T10:00'},now),/still sending/);
 const recent=app.sumBackupLine(f,{enabled:true,pending:1,error:'No signal.',last_ok:'2026-10-10T10:00'},now);
 assert.match(recent,/Not on GitHub yet: No signal\./); assert.doesNotMatch(recent,/⚠/);
 const stale=app.sumBackupLine(f,{enabled:true,pending:3,error:'Token expired.',last_ok:'2026-10-01T10:00'},now);
 assert.match(stale,/⚠ Nothing has reached GitHub for 13 days\..*Token expired\..*Details in Data/);
 assert.match(app.sumBackupLine(f,{enabled:true,pending:1,error:'Public.',last_ok:null},now),/Nothing has reached GitHub yet/);
 assert.equal(app.offsiteStaleDays({enabled:true,pending:0,error:null,last_ok:'2026-01-01T00:00'},now),0,'old but nothing waiting is fine');
});

test('app: after a save it asks the server until the GitHub copy has gone up; silent without one',async()=>{
 const {load}=require('./harness');
 const seen=[]; let n=0;
 const fetch=async url=>{ seen.push(url); n++;
  return {ok:true,json:async()=>({ok:true,offsite:{enabled:true,repo:REPO,pending:n<3?1:0,error:null,last_ok:'2026-10-14T10:00'}})}; };
 const {app}=await load({fetch});
 const o=await app.offsiteAfterSave(6,0);
 assert.equal(o.pending,0); assert.equal(seen.length,3); assert.ok(seen.every(u=>u==='api/status'));
 const q=await load({fetch:async()=>({ok:true,json:async()=>({ok:true,backups:1,latest:'x'})})});
 assert.equal(await q.app.offsiteAfterSave(6,0),null,'an older serve.py: nothing');
 const r=await load({fetch:async()=>{ throw new Error('refused'); }});
 assert.equal(await r.app.offsiteAfterSave(6,0),null,'no server: nothing');
});
