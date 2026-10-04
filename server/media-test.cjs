'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createGameServer}=require('./server.cjs');
(async()=>{
 const dataDir=fs.mkdtempSync(path.resolve('.build/media-test-')),app=createGameServer({dataDir,gameDir:path.resolve('.'),port:0});
 const port=await app.start(),url='http://127.0.0.1:'+port+'/assets/music/lobby.wav',original=fs.createReadStream;
 let opened,closed;
 fs.createReadStream=(...args)=>{const stream=original(...args);if(String(args[0]).endsWith('lobby.wav')){opened=stream;closed=new Promise(resolve=>stream.once('close',resolve));}return stream;};
 try{
  const response=await fetch(url);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'audio/wav');
  const reader=response.body.getReader(),first=await reader.read();assert.ok(first.value.length>0);await reader.cancel();
  await Promise.race([closed,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Canceled media request left the file open')),2000);timer.unref();})]);
  assert.ok(opened.destroyed);assert.ok(opened.closed);
  const head=await fetch(url,{method:'HEAD'});assert.equal(Number(head.headers.get('content-length')),fs.statSync('assets/music/lobby.wav').size);
  console.log('PASS: music content type, canceled playback releases file handle, HEAD size matches asset');
 }finally{fs.createReadStream=original;await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
