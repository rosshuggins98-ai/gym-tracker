'use strict';
/* End-to-end run of the Termux launcher on this machine: install into a
   temp HOME, point update-url at a local server that serves this repo, run
   the Gym widget's serve.sh, and check it (1) pulls the app + sw.js,
   (2) notices the installer in the repo is newer than the one installed,
   re-runs it, and hands over to the new launcher, (3) ends with serve.py
   running on the requested port and the auto-backup endpoint answering.
   Termux-only commands (termux-toast, am, ...) are absent here and the
   scripts guard or /dev/null them, so it runs anywhere with bash+python3. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {spawn,spawnSync}=require('node:child_process'), fs=require('fs'), os=require('os'), path=require('path'), http=require('http');
const ROOT=path.join(__dirname,'..');

function get(port,p){ return new Promise((res,rej)=>{ http.get({host:'127.0.0.1',port,path:p},x=>{ let d=''; x.on('data',c=>d+=c); x.on('end',()=>res({status:x.statusCode,body:d})); }).on('error',rej); }); }
async function waitFor(port,p,tries){ for(let i=0;i<(tries||60);i++){ try{ return await get(port,p); }catch(e){ await new Promise(r=>setTimeout(r,100)); } } throw new Error('server never came up on '+port); }

test('serve.sh self-updates the launcher from the repo, then runs serve.py',{timeout:60000},async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'gt-home-'));
 fs.mkdirSync(path.join(home,'storage','downloads'),{recursive:true});
 const env=Object.assign({},process.env,{HOME:home,GYM_SETUP_NOLAUNCH:'1'});
 const tools=path.join(home,'gymtools');

 /* "repo" server: serves the working tree so the update URL resolves */
 const repoPort=20000+Math.floor(Math.random()*20000), appPort=repoPort+1;
 const repo=spawn('python3',[path.join(ROOT,'serve.py'),'--port',String(repoPort),'--dir',ROOT,'--backups',path.join(home,'unused')],{stdio:'ignore'});
 try{
  await waitFor(repoPort,'/api/status');

  /* 1. install from a deliberately OLD installer: the current one with its version knocked back */
  const setup=fs.readFileSync(path.join(ROOT,'termux','gym-setup.sh'),'utf8');
  const oldSetup=setup.replace(/GYM_SETUP_VERSION=\d+/,'GYM_SETUP_VERSION=1').replace(/api\/save/g,'api/old');
  const oldPath=path.join(home,'storage','downloads','gym-setup.sh'); fs.writeFileSync(oldPath,oldSetup);
  let r=spawnSync('bash',[oldPath],{env,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr+r.stdout);
  assert.ok(fs.existsSync(path.join(tools,'serve.sh')));
  assert.equal(fs.readFileSync(path.join(tools,'gym-setup.sh'),'utf8'),oldSetup,'installer keeps a copy of itself');
  assert.match(fs.readFileSync(path.join(tools,'serve.py'),'utf8'),/api\/old/,'old serve.py installed');
  fs.writeFileSync(path.join(tools,'update-url'),'http://127.0.0.1:'+repoPort+'/app/gym-tracker.html\n');
  fs.writeFileSync(path.join(tools,'no-wakelock'),'');

  /* 2. tap the widget */
  r=spawnSync('bash',[path.join(tools,'serve.sh')],{env:Object.assign({},env,{GYM_PORT:String(appPort),GYM_SETUP_NOLAUNCH:''}),encoding:'utf8',timeout:30000});
  const out=r.stdout+r.stderr;
  assert.match(out,/Updating launcher scripts \(v\d+\)/,out);
  assert.equal(fs.readFileSync(path.join(tools,'gym-setup.sh'),'utf8'),setup,'installer replaced by the repo copy');
  assert.equal(fs.readFileSync(path.join(tools,'serve.py'),'utf8'),fs.readFileSync(path.join(ROOT,'serve.py'),'utf8'),'serve.py refreshed');
  assert.equal(fs.readFileSync(path.join(tools,'web','gym-tracker.html'),'utf8'),fs.readFileSync(path.join(ROOT,'app','gym-tracker.html'),'utf8'),'app pulled');
  assert.equal(fs.readFileSync(path.join(tools,'web','sw.js'),'utf8'),fs.readFileSync(path.join(ROOT,'app','sw.js'),'utf8'),'sw.js pulled');
  assert.ok(fs.existsSync(path.join(home,'gym-log.txt')),'attendance logged');

  /* 3. the NEW server is what's running, with the backup endpoint */
  const st=await waitFor(appPort,'/api/status');
  assert.equal(JSON.parse(st.body).ok,true);
  const page=await get(appPort,'/gym-tracker.html?v=1');
  assert.match(page.body,/const BUILD=/);
  const pid=parseInt(fs.readFileSync(path.join(tools,'server.pid'),'utf8'),10); assert.ok(pid>0);

  /* 4. a second tap is a no-op: nothing to update, server already running */
  r=spawnSync('bash',[path.join(tools,'serve.sh')],{env:Object.assign({},env,{GYM_PORT:String(appPort),GYM_SETUP_NOLAUNCH:''}),encoding:'utf8',timeout:30000});
  assert.doesNotMatch(r.stdout+r.stderr,/Updating|Updated/);
  assert.equal(parseInt(fs.readFileSync(path.join(tools,'server.pid'),'utf8'),10),pid,'same server, not restarted');

  /* 5. stop */
  spawnSync('bash',[path.join(tools,'stop.sh')],{env,encoding:'utf8'});
  await new Promise(r=>setTimeout(r,300));
  await assert.rejects(get(appPort,'/api/status'));
 } finally {
  repo.kill();
  try{ const pid=parseInt(fs.readFileSync(path.join(tools,'server.pid'),'utf8'),10); if(pid) process.kill(pid); }catch(e){}
  fs.rmSync(home,{recursive:true,force:true});
 }
});
