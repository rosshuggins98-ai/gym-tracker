'use strict';
/* serve.py: the auto-backup endpoint, and the app's call to it. Spawns the
   real server on a free port with a temp backups dir. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {spawn}=require('node:child_process'), fs=require('fs'), os=require('os'), path=require('path'), http=require('http');
const {load}=require('./harness');
const ROOT=path.join(__dirname,'..');

function req(port,method,p,body){
 return new Promise((res,rej)=>{
  const r=http.request({host:'127.0.0.1',port,method,path:p,headers:body?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{}},x=>{
   let d=''; x.on('data',c=>d+=c); x.on('end',()=>res({status:x.statusCode,body:d,headers:x.headers})); });
  r.on('error',rej); if(body) r.write(body); r.end(); });
}
async function startServer(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gt-')), backups=path.join(dir,'bk');
 const port=20000+Math.floor(Math.random()*20000);
 const proc=spawn('python3',[path.join(ROOT,'serve.py'),'--port',String(port),'--dir',path.join(ROOT,'app'),'--backups',backups],{stdio:['ignore','pipe','pipe']});
 let err=''; proc.stderr.on('data',c=>err+=c);
 for(let i=0;i<50;i++){ try{ await req(port,'GET','/api/status'); break; }catch(e){ await new Promise(r=>setTimeout(r,100)); } }
 return {port,backups,stop:()=>{ proc.kill(); fs.rmSync(dir,{recursive:true,force:true}); },err:()=>err};
}

test('serve.py: static files, status, and POST /api/save writing a dated + latest backup',async()=>{
 const s=await startServer();
 try{
  const page=await req(s.port,'GET','/gym-tracker.html');
  assert.equal(page.status,200); assert.match(page.body,/const BUILD=/); assert.match(page.headers['cache-control'],/no-store/);
  let st=JSON.parse((await req(s.port,'GET','/api/status')).body);
  assert.deepEqual(st,{ok:true,backups:0,latest:null});

  const bad=await req(s.port,'POST','/api/save',JSON.stringify({app:'other'}));
  assert.equal(bad.status,400);
  const notjson=await req(s.port,'POST','/api/save','{nope');
  assert.equal(notjson.status,400);
  const nowhere=await req(s.port,'POST','/api/other','{}');
  assert.equal(nowhere.status,404);
  assert.ok(!fs.existsSync(s.backups)||fs.readdirSync(s.backups).length===0,'rejected posts write nothing');

  const ok=await req(s.port,'POST','/api/save',JSON.stringify({app:'gym-tracker',history:{bench:[{date:'2026-09-16',top:50}]}}));
  assert.equal(ok.status,200);
  const j=JSON.parse(ok.body); assert.equal(j.ok,true); assert.match(j.file,/^gym-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const files=fs.readdirSync(s.backups).sort();
  assert.deepEqual(files,[j.file,'gym-latest.json']);
  const back=JSON.parse(fs.readFileSync(path.join(s.backups,'gym-latest.json'),'utf8'));
  assert.equal(back.history.bench[0].top,50);

  /* second save the same day overwrites, no second dated file */
  await req(s.port,'POST','/api/save',JSON.stringify({app:'gym-tracker',history:{bench:[{date:'2026-09-16',top:55}]}}));
  assert.equal(fs.readdirSync(s.backups).length,2);
  assert.equal(JSON.parse(fs.readFileSync(path.join(s.backups,j.file),'utf8')).history.bench[0].top,55);
  st=JSON.parse((await req(s.port,'GET','/api/status')).body);
  assert.deepEqual(st,{ok:true,backups:1,latest:j.file});
 } finally { s.stop(); }
});

test('serve.py prunes dated backups to the newest 20',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gt-')); const bk=path.join(dir,'bk');
 const py=`import sys,json; sys.path.insert(0,${JSON.stringify(ROOT)}); import serve
for i in range(1,26): serve.save_backup(${JSON.stringify(bk)},{"app":"gym-tracker","i":i},today="2026-01-%02d"%i)
import os; print(json.dumps(sorted(os.listdir(${JSON.stringify(bk)}))))`;
 const out=require('node:child_process').execFileSync('python3',['-c',py]).toString();
 const files=JSON.parse(out); fs.rmSync(dir,{recursive:true,force:true});
 const dated=files.filter(f=>f!=='gym-latest.json');
 assert.equal(dated.length,20); assert.equal(dated[0],'gym-backup-2026-01-06.json'); assert.equal(dated[19],'gym-backup-2026-01-25.json');
});

test('the copy of serve.py embedded in termux/gym-setup.sh is byte-identical to serve.py',()=>{
 const sh=fs.readFileSync(path.join(ROOT,'termux','gym-setup.sh'),'utf8');
 const m=sh.match(/cat > "\$TOOLS\/serve\.py" << 'PYSRVEOF'\n([\s\S]*?)PYSRVEOF\n/);
 assert.ok(m,'heredoc not found');
 assert.equal(m[1],fs.readFileSync(path.join(ROOT,'serve.py'),'utf8'));
});

test('app: autoBackup posts the backup after a finished session, and is silent without a server',async()=>{
 const calls=[];
 const fetch=async(url,opts)=>{ calls.push({url,opts}); return {ok:true,json:async()=>({ok:true,file:'gym-backup-x.json'})}; };
 const {app,set,tick}=await load({fetch});
 set('hist',{}); set('cur',{push:{bench:[{w:'50',r:'8',done:true}]}});
 await app.doNewSession(); await tick();
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'api/save'); assert.equal(calls[0].opts.method,'POST');
 const body=JSON.parse(calls[0].opts.body); assert.equal(body.app,'gym-tracker'); assert.equal(body.history.bench[0].top,50);
 assert.equal(app.lastAuto.file,'gym-backup-x.json');

 const failing=async()=>{ throw new Error('connection refused'); };
 const q=await load({fetch:failing});
 q.set('hist',{}); q.set('cur',{push:{bench:[{w:'50',r:'8',done:true}]}});
 await q.app.doNewSession(); await q.tick();
 assert.equal(q.app.lastAuto,null);
 assert.equal(q.app.hist.bench[0].top,50,'the session itself still saved');
});
