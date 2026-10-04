'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomInt}=require('node:crypto');
const catalog=require(fs.existsSync(path.join(__dirname,'../gacha-data.js'))?'../gacha-data.js':'../game/gacha-data.js');
const error=code=>{throw Object.assign(new Error(code),{status:400,code});};
function roll(banner,pity,rng=n=>randomInt(n)){
 const n=rng(10000),stars=pity.six>=59||n<200?6:pity.five>=9||n<1000?5:4;
 pity.six=stars===6?0:pity.six+1;pity.five=stars>=5?0:pity.five+1;
 const pool=banner[stars===6?'six':stars===5?'five':'four'];return {id:pool[rng(pool.length)],stars,kind:banner.kind};
}
function createGacha(db){
 db.exec('CREATE TABLE IF NOT EXISTS collections(user_id TEXT PRIMARY KEY REFERENCES users(id),state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS draws(user_id TEXT NOT NULL REFERENCES users(id),request_id TEXT NOT NULL,request TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(user_id,request_id));');
 function fresh(legacy){return {tickets:catalog.initialTickets,dust:0,heroes:legacy?['oak','arrow','ember','sage','knight','frost','warden','moon']:[...catalog.starter],weapons:{},equipment:{},pity:Object.fromEntries(catalog.banners.map(b=>[b.id,{six:0,five:0}])),history:[],rewards:[]};}
 function save(id,state){db.prepare('INSERT INTO collections VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET state=excluded.state').run(id,JSON.stringify(state));}
 function get(id){let row=db.prepare('SELECT state FROM collections WHERE user_id=?').get(id);if(!row){const p=db.prepare('SELECT save FROM profiles WHERE user_id=?').get(id);const s=fresh(!!p?.save);save(id,s);return s;}return JSON.parse(row.state);}
 function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}
 function pull(id,b){
  const banner=catalog.banners.find(x=>x.id===b?.banner);
  if(!banner||![1,10].includes(b.count)||typeof b.requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(b.requestId))error('invalidDraw');
  return transaction(()=>{
   const request=JSON.stringify([b.banner,b.count]),old=db.prepare('SELECT * FROM draws WHERE user_id=? AND request_id=?').get(id,b.requestId);
   if(old){if(old.request!==request)error('invalidDraw');return {collection:get(id),results:JSON.parse(old.result),replayed:true};}
   const state=get(id);if(state.tickets<b.count)error('notEnoughTickets');state.tickets-=b.count;
   const results=[];for(let i=0;i<b.count;i++){
    const item=roll(banner,state.pity[b.banner]);item.duplicate=item.kind==='character'?state.heroes.includes(item.id):!!state.weapons[item.id];
    item.dust=item.duplicate?({4:10,5:50,6:200}[item.stars]):0;state.dust+=item.dust;
    if(!item.duplicate){if(item.kind==='character')state.heroes.push(item.id);else state.weapons[item.id]=1;}
    results.push(item);state.history.unshift({...item,banner:banner.id,time:Date.now()});
   }
   state.history=state.history.slice(0,100);save(id,state);db.prepare('INSERT INTO draws VALUES (?,?,?,?)').run(id,b.requestId,request,JSON.stringify(results));return {collection:state,results};
  });
 }
 function equip(id,b){return transaction(()=>{const state=get(id);if(!state.heroes.includes(b?.hero)||b.weapon!==null&&!state.weapons[b.weapon])error('invalidDraw');if(b.weapon)for(const hero of Object.keys(state.equipment))if(state.equipment[hero]===b.weapon)delete state.equipment[hero];if(b.weapon)state.equipment[b.hero]=b.weapon;else delete state.equipment[b.hero];save(id,state);return {collection:state};});}
 function exchange(id){return transaction(()=>{const state=get(id);if(state.dust<100)error('notEnoughDust');state.dust-=100;state.tickets++;save(id,state);return {collection:state};});}
 // Called inside the profile update transaction; each act grants tickets once per account.
 function reward(id,cleared){const state=get(id);for(const act of cleared)if(!state.rewards.includes(act)){state.rewards.push(act);state.tickets+=10;}save(id,state);return state;}
 return {get,pull,equip,exchange,reward,transaction};
}
module.exports={createGacha,roll,catalog};
