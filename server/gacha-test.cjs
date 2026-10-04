'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {roll,catalog}=require('./gacha.cjs'),{createGameServer}=require('./server.cjs');
// Exhaustive base-rate boundaries and exact worst-case pity, independent of random luck.
for(const banner of catalog.banners){
 let counts={4:0,5:0,6:0};for(let n=0;n<10000;n++){let first=true;const r=roll(banner,{six:0,five:0},max=>{if(first){first=false;return n;}return 0;});counts[r.stars]++;}assert.deepEqual(counts,{4:9000,5:800,6:200});
 const pity={six:0,five:0};for(let i=1;i<=120;i++){const r=roll(banner,pity,n=>n-1);assert.equal(r.stars,i%60===0?6:i%10===0?5:4);if(i%60===0)assert.deepEqual(pity,{six:0,five:0});}
 const p={six:59,five:9};assert.equal(roll(banner,p,n=>n-1).stars,6);assert.deepEqual(p,{six:0,five:0});
}
(async()=>{
 const dir=fs.mkdtempSync(path.resolve('.build/gacha-test-'));let app=createGameServer({dataDir:dir,gameDir:path.resolve('.'),port:0}),port=await app.start(),origin='http://127.0.0.1:'+port,cookie='';
 const call=async(route,method='GET',body)=>{const r=await fetch(origin+'/api/'+route,{method,headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};
 try{
  assert.equal((await call('draw','POST',{banner:'limited-character',count:10,requestId:randomUUID()})).status,401);
  let r=await call('register','POST',{username:'recruit_test',password:'TestPassword-123'});assert.equal(r.status,200);assert.deepEqual(r.data.collection.heroes,['oak','arrow']);assert.equal(r.data.collection.tickets,60);const id=r.data.user.id;
  let request={banner:'limited-character',count:10,requestId:randomUUID()};
  const parallel=await Promise.all([call('draw','POST',request),call('draw','POST',request)]);assert.deepEqual(parallel[0].data.results,parallel[1].data.results);assert.equal((await call('collection')).data.collection.tickets,50);
  assert.equal((await call('draw','POST',{...request,count:1})).status,400);
  assert.equal((await call('draw','POST',{banner:'fake',count:10,requestId:randomUUID()})).status,400);
  for(let i=0;i<5;i++)assert.equal((await call('draw','POST',{...request,requestId:randomUUID()})).status,200);
  let state=(await call('collection')).data.collection;assert.equal(state.tickets,0);assert.ok(state.heroes.includes('moon'));assert.ok(state.history.some(i=>i.stars>=5));assert.deepEqual(state.pity['standard-character'],{six:0,five:0});assert.ok(state.dust>0);
  const before=JSON.stringify(state);assert.equal((await call('draw','POST',{...request,requestId:randomUUID()})).status,400);assert.equal(JSON.stringify((await call('collection')).data.collection),before);
  // First-clear rewards and optimistic profile update must form a single transaction.
  const save={version:2,language:'zh',displayHero:'oak',lineup:[{id:'oak',x:2,y:3}],stage:19,cleared:Array.from({length:20},(_,i)=>i)};
  r=await call('profile','PUT',{name:'星野',avatar:'female',revision:0,save});assert.equal(r.status,200);assert.equal(r.data.collection.tickets,200);
  assert.equal((await call('profile','PUT',{name:'星野',avatar:'female',revision:1,save})).data.collection.tickets,200);
  assert.equal((await call('profile','PUT',{name:'星野',avatar:'female',revision:1,save})).status,409);assert.equal((await call('collection')).data.collection.tickets,200);
  assert.equal((await call('profile','PUT',{name:'星野',avatar:'female',revision:2,save:{...save,lineup:[{id:'knight',x:2,y:3}]}})).status,400);
  for(let i=0;i<6;i++)assert.equal((await call('draw','POST',{banner:'limited-weapon',count:10,requestId:randomUUID()})).status,200);
  state=(await call('collection')).data.collection;assert.equal(state.weapons.crescent,1);assert.ok(!state.weapons.daybreak);assert.equal(state.history.length,100);
  r=await call('equip','POST',{hero:'oak',weapon:'crescent'});assert.equal(r.data.collection.equipment.oak,'crescent');r=await call('equip','POST',{hero:'arrow',weapon:'crescent'});assert.equal(r.data.collection.equipment.oak,undefined);assert.equal(r.data.collection.equipment.arrow,'crescent');
  assert.equal((await call('equip','POST',{hero:'knight',weapon:'crescent'})).status,400);assert.equal((await call('equip','POST',{hero:'oak',weapon:'daybreak'})).status,400);
  const tickets=r.data.collection.tickets;r=await call('exchange','POST',{});assert.equal(r.data.collection.tickets,tickets+1);
  const persistent=r.data.collection;await app.close();app=createGameServer({dataDir:dir,gameDir:path.resolve('.'),port:0});port=await app.start();origin='http://127.0.0.1:'+port;assert.deepEqual((await call('collection')).data.collection,persistent);
  assert.equal((await call('draw','POST',request)).data.collection.tickets,persistent.tickets);
  // Fresh account isolation and migration retain previously available legacy characters.
  r=await call('register','POST',{username:'recruit_other',password:'TestPassword-123'});assert.equal(r.data.collection.tickets,60);assert.deepEqual(r.data.collection.weapons,{});
  app.db.prepare('DELETE FROM collections WHERE user_id=?').run(id);await app.close();app=createGameServer({dataDir:dir,gameDir:path.resolve('.'),port:0});port=await app.start();origin='http://127.0.0.1:'+port;await call('login','POST',{username:'recruit_test',password:'TestPassword-123'});assert.equal((await call('collection')).data.collection.heroes.length,8);
  for(const file of ['gacha-data.js','gacha.js','campaign-expansion.js','skill-fx.js','music.js','assets/music/lobby.wav'])assert.equal((await fetch(origin+'/'+file)).status,200,file);
  console.log('PASS: all four base-rate distributions, 10/60 pity boundaries, six-star priority, authenticated draws, concurrent retry idempotency, wallet atomicity, independent pools, 20 one-time rewards, ownership enforcement, equipment exclusivity, history cap, restart persistence, account isolation and legacy migration');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
