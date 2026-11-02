'use strict';
/* 2026-11-02, Ross asked: rows and the lat pulldown stand in for each
   other, and log into that exercise's own history. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const {load}=require('./harness');

test('row and pulldown are alternatives both ways, logged under the real exercise',async()=>{
 const {app}=await load();
 assert.ok(app.LIB.latpulldown.alts.includes('Cable Row'));
 assert.ok(app.LIB.cablerow.alts.includes('Lat Pulldown'));
 assert.ok(app.LIB.csrow.alts.includes('Lat Pulldown'));
 assert.equal(app.hkey('latpulldown','Cable Row'),'cablerow');
 assert.equal(app.hkey('cablerow','Lat Pulldown'),'latpulldown');
 assert.equal(app.hkey('csrow','Lat Pulldown'),'latpulldown');
});
