'use strict';
const {createGameServer}=require('./server.cjs'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=fs.mkdtempSync(path.resolve(__dirname,'../.build/account-test-'));
const save={version:2,language:'zh',displayHero:'oak',protagonist:'female',featureProtagonist:true,lineup:[{id:'oak',x:2,y:3}],stage:0,cleared:[],defensePositions:{},presentation:{effects:true,motion:true}};
(async()=>{
 let app=createGameServer({dataDir:dir,gameDir:path.resolve(__dirname,'..'),port:0}),port=await app.start(),origin=`http://127.0.0.1:${port}`,cookie='';
 const call=async(route,method='GET',body,extra={})=>{const r=await fetch(origin+'/api/'+route,{method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...extra},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,body:await r.json(),headers:r.headers};};
 try{
  assert.equal((await call('me')).status,401);
  assert.equal((await call('register','POST',{username:'a',password:'short'})).status,400);
  let r=await call('register','POST',{username:'Test_User',password:'Demo-password-123'});assert.equal(r.status,200);assert.equal(r.body.user.username,'test_user');assert.equal(r.body.profile.name,null);assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);const cookieA=cookie;
  const rows=app.db.prepare('SELECT * FROM users').all();assert.notEqual(rows[0].password_hash,'Demo-password-123');assert.equal(rows[0].salt.length,32);
  assert.equal((await call('register','POST',{username:'TEST_USER',password:'Another-password-123'})).status,409);
  assert.equal((await call('profile','PUT',{name:'<img>',avatar:'female',save,revision:0})).status,400);
  assert.equal((await call('profile','PUT',{name:'星野',avatar:'female',save,revision:0})).status,200);
  assert.equal((await call('profile','PUT',{name:'星野',avatar:'female',save,revision:0})).status,409);
  assert.equal((await call('profile','PUT',{name:'星野',avatar:'female',save:{...save,cleared:[4]},revision:1})).status,400);
  assert.equal((await call('profile','PUT',{name:'星野',avatar:'female',save,revision:1},{Origin:'https://evil.invalid'})).status,403);
  assert.equal((await call('profile','PUT',{name:'星野',avatar:'female',save,revision:1},{'Content-Type':'text/plain'})).status,415);
  assert.equal((await fetch(origin+'/server/server.cjs')).status,404);assert.equal((await fetch(origin+'/.build/accounts.sqlite')).status,404);assert.equal((await fetch(origin+'/index.html')).status,200);
  r=await call('register','POST',{username:'second_user',password:'Demo-password-123'});assert.equal(r.body.profile.save,null);const cookieB=cookie;
  const rows2=app.db.prepare('SELECT * FROM users').all();assert.notEqual(rows2[0].salt,rows2[1].salt);assert.notEqual(rows2[0].password_hash,rows2[1].password_hash);
  assert.equal((await call('profile','PUT',{name:'Haruka',avatar:'male',save:{...save,protagonist:'male'},revision:0})).status,200);
  cookie=cookieA;r=await call('me');assert.equal(r.body.profile.name,'星野');assert.equal(r.body.profile.revision,1);
  const writes=await Promise.all([call('profile','PUT',{name:'星野',avatar:'female',save,revision:1}),call('profile','PUT',{name:'星野',avatar:'female',save,revision:1})]);assert.deepEqual(writes.map(x=>x.status).sort(),[200,409]);
  await app.close();app=createGameServer({dataDir:dir,gameDir:path.resolve(__dirname,'..'),port:0});port=await app.start();origin=`http://127.0.0.1:${port}`;
  assert.equal((await call('me')).body.profile.name,'星野');assert.equal((await call('logout','POST',{})).status,200);cookie=cookieA;assert.equal((await call('me')).status,401);
  assert.equal((await call('login','POST',{username:'test_user',password:'Wrong-password-123'})).status,401);
  assert.equal((await call('login','POST',{username:'test_user',password:'Demo-password-123'})).status,200);
  cookie=cookieB;app.db.prepare('UPDATE sessions SET expires=0').run();assert.equal((await call('me')).status,401);
  for(let i=0;i<31;i++)r=await call('login','POST',{username:'x',password:'x'});assert.equal(r.status,429);
  console.log('PASS: registration, salted hashes, login errors, cookie flags, naming validation, account isolation, save validation, concurrent revisions, disk persistence, logout, expiry, origin checks, private-file blocking and rate limits');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
