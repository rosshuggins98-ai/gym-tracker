'use strict';
/* The committed app/gym-tracker.html must be exactly what build.py emits
   from src/ -- the phone installs the built file, the tests load it, and a
   stale build means shipping code that differs from what was edited. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'), fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');

test('app/gym-tracker.html is up to date with src/ (python3 build.py --check)',()=>{
 const r=spawnSync('python3',[path.join(ROOT,'build.py'),'--check'],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr||r.stdout);
});

test('src/js modules are numbered and each ends with a newline',()=>{
 const dir=path.join(ROOT,'src','js');
 const files=fs.readdirSync(dir).filter(f=>f.endsWith('.js')).sort();
 assert.ok(files.length>5);
 files.forEach(f=>{
  assert.match(f,/^\d\d-[a-z-]+\.js$/,f+': name must be NN-name.js so concatenation order is explicit');
  const t=fs.readFileSync(path.join(dir,f),'utf8');
  assert.ok(t.endsWith('\n'),f+' must end with a newline (files are concatenated with no separator)');
  assert.ok(!t.includes('\r'),f+' must be LF-only');
 });
});
