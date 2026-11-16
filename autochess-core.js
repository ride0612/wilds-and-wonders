/* 自走棋规则引擎：一局的全部状态（经济、商店、备战席、棋盘、合星、羁绊）与自动战斗。
   不依赖任何画面节点，可在 Node 或浏览器里直接跑模拟。
   由 autochess_demo/scripts/game_state.gd 与 battle.gd 移植；弹道改为规则层结算，有无画面结果一致。 */
(function(global){
'use strict';
const D=global.ACData||(typeof require!=='undefined'?require('./autochess-data.js'):null);
const cellKey=(x,y)=>x+','+y;
const parseKey=k=>{const [x,y]=k.split(',').map(Number);return {x,y};};
function makeRng(seed){let a=seed|0;const f=()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};f.int=(lo,hi)=>lo+Math.floor(f()*(hi-lo+1));return f;}

// ---------- 一局的状态 ----------
class State{
 constructor(seed){this.newGame(seed);}
 newGame(seed){
  this.rng=makeRng(seed===undefined?Math.floor(Math.random()*2**31):seed);
  this.gold=D.START_GOLD;this.level=2;this.xp=0;this.hp=D.START_HP;
  this.shop=[];this.shopLocked=false;this.bench=Array(D.BENCH_SIZE).fill(null);this.board={};
  this.pool={};for(const id in D.UNITS)this.pool[id]=D.POOL_SIZE[D.UNITS[id].cost];
  this.augments=[];this.nextUid=1;this.wins=0;this.losses=0;
  this.granted=-1;   // 已发放过回合收入的最高关卡
  this.offered=[];   // 已提供过强化选择的关卡
  this.streak=0;     // 同一关连续失利次数
  this.rollShop();
 }
 // ---------- 经济 ----------
 interest(){return Math.min(Math.floor(this.gold/10),5);}
 stageIncome(){return 5+this.interest()+(this.augments.includes('interest')?2:0);}
 /** 首次抵达某一关时发放收入与经验并刷新商店；重复进入不再发放。 */
 grantStage(stageIdx){
  if(stageIdx<=this.granted)return null;
  const first=this.granted<0;this.granted=stageIdx;this.streak=0;
  if(first)return {income:0,xp:0};
  const income=this.stageIncome();this.gold+=income;
  const xp=2+(this.augments.includes('training')?1:0);this.addXp(xp);
  if(!this.shopLocked)this.rollShop();this.shopLocked=false;
  return {income,xp};
 }
 xpNeeded(){return D.XP_TO_NEXT[this.level]||0;}
 addXp(n){
  if(this.level>=D.MAX_LEVEL)return false;
  this.xp+=n;let leveled=false;
  while(this.level<D.MAX_LEVEL&&this.xp>=this.xpNeeded()){this.xp-=this.xpNeeded();this.level++;leveled=true;}
  if(this.level>=D.MAX_LEVEL)this.xp=0;
  return leveled;
 }
 /** 0 = 失败，1 = 成功，2 = 成功并升级 */
 buyXp(){if(this.level>=D.MAX_LEVEL||this.gold<D.XP_COST)return 0;this.gold-=D.XP_COST;return this.addXp(D.XP_PER_BUY)?2:1;}
 // ---------- 商店 ----------
 rollShop(){
  for(const id of this.shop)if(id)this.pool[id]++;
  this.shop=[];for(let i=0;i<5;i++)this.shop.push(this._drawUnit());
 }
 _drawUnit(){
  const odds=D.SHOP_ODDS[this.level],r=this.rng.int(1,100);let cost=1,acc=0;
  for(let i=0;i<odds.length;i++){acc+=odds[i];if(r<=acc){cost=i+1;break;}}
  for(let c=cost;c>0;c--){ // 某个费用抽空时向下取
   const candidates=D.unitIdsOfCost(c).filter(id=>this.pool[id]>0);if(!candidates.length)continue;
   let pick=this.rng.int(1,candidates.reduce((s,id)=>s+this.pool[id],0));
   for(const id of candidates){pick-=this.pool[id];if(pick<=0){this.pool[id]--;return id;}}
  }
  return '';
 }
 reroll(){if(this.gold<D.REROLL_COST)return false;this.gold-=D.REROLL_COST;this.rollShop();return true;}
 canBuy(slot){
  const id=this.shop[slot];if(!id||this.gold<D.UNITS[id].cost)return false;
  return this._benchFree()>=0||this.countCopies(id,1)>=2; // 满席但买下即可合成
 }
 buy(slot){
  if(!this.canBuy(slot))return {ok:false};
  const id=this.shop[slot];this.gold-=D.UNITS[id].cost;this.shop[slot]='';
  const u=this._makeUnit(id,1),idx=this._benchFree();
  if(idx>=0){this.bench[idx]=u;return {ok:true,unit:u,merges:this.checkMerges()};}
  return {ok:true,unit:u,merges:this.checkMerges(u)};
 }
 sellValue(u){const cost=D.UNITS[u.id].cost,copies=3**(u.star-1);return u.star===1||cost===1?cost*copies:cost*copies-1;}
 sell(u){const loc=this.locate(u);if(!loc)return 0;this._removeAt(loc);const v=this.sellValue(u);this.gold+=v;this.pool[u.id]+=3**(u.star-1);return v;}
 // ---------- 位置 ----------
 _makeUnit(id,star){return {uid:this.nextUid++,id,star};}
 _benchFree(){return this.bench.indexOf(null);}
 benchCount(){return this.bench.filter(Boolean).length;}
 boardCount(){return Object.keys(this.board).length;}
 boardCap(){return this.level;}
 boardUnits(){return Object.entries(this.board).map(([k,u])=>({...parseKey(k),unit:u}));}
 locate(u){
  const i=this.bench.findIndex(b=>b&&b.uid===u.uid);if(i>=0)return {kind:'bench',index:i};
  for(const k in this.board)if(this.board[k].uid===u.uid)return {kind:'board',...parseKey(k)};
  return null;
 }
 unitAt(loc){return loc.kind==='bench'?this.bench[loc.index]:this.board[cellKey(loc.x,loc.y)]||null;}
 _removeAt(loc){if(loc.kind==='bench')this.bench[loc.index]=null;else delete this.board[cellKey(loc.x,loc.y)];}
 _putAt(loc,u){if(loc.kind==='bench')this.bench[loc.index]=u;else if(!u)delete this.board[cellKey(loc.x,loc.y)];else this.board[cellKey(loc.x,loc.y)]=u;}
 static isPlayerCell(x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<D.COLS&&y>=D.PLAYER_ROW0&&y<D.ROWS;}
 /** 把单位移到目标位置；目标有单位则交换。返回是否成功。 */
 move(u,target){
  const from=this.locate(u);if(!from||!target)return false;
  if(target.kind==='board'&&!State.isPlayerCell(target.x,target.y))return false;
  if(target.kind==='bench'&&!(target.index>=0&&target.index<D.BENCH_SIZE))return false;
  if(from.kind===target.kind&&from.index===target.index&&from.x===target.x&&from.y===target.y)return false;
  const other=this.unitAt(target);
  if(from.kind==='bench'&&target.kind==='board'&&!other&&this.boardCount()>=this.boardCap())return false; // 人口上限
  this._removeAt(from);if(other){this._removeAt(target);this._putAt(from,other);}this._putAt(target,u);return true;
 }
 /** 开战前若场上未满员，自动把备战席单位补上。返回被放置的单位。 */
 autoPlaceFromBench(){
  const placed=[];
  for(let i=0;i<this.bench.length&&this.boardCount()<this.boardCap();i++){
   const u=this.bench[i];if(!u)continue;const cell=this._freeCellFor(u);if(!cell)break;
   this.bench[i]=null;this.board[cellKey(cell.x,cell.y)]=u;placed.push(u);
  }
  return placed;
 }
 _freeCellFor(u){
  const melee=D.UNITS[u.id].range<=1,rows=melee?[4,5,6,7]:[7,6,5,4];
  for(const y of rows)for(const x of [3,2,4,1,5,0,6])if(!this.board[cellKey(x,y)])return {x,y};
  return null;
 }
 // ---------- 合星 ----------
 countCopies(id,star){return this.bench.filter(u=>u&&u.id===id&&u.star===star).length+Object.values(this.board).filter(u=>u.id===id&&u.star===star).length;}
 /** 反复检查三合一。extra 为满席购买时还没有位置的那个单位。 */
 checkMerges(extra=null){
  const events=[];let changed=true;
  while(changed){
   changed=false;const groups={};
   const add=(u,loc)=>{if(u.star<3)(groups[u.id+'#'+u.star]||(groups[u.id+'#'+u.star]=[])).push(loc);};
   for(const k in this.board)add(this.board[k],{kind:'board',...parseKey(k)}); // 棋盘位置排前，合成结果优先留在场上
   this.bench.forEach((u,i)=>{if(u)add(u,{kind:'bench',index:i});});
   if(extra){
    const locs=groups[extra.id+'#'+extra.star];
    if(locs&&locs.length>=2){const two=locs.slice(0,2),keep=two[0],nu=this._makeUnit(extra.id,extra.star+1);two.forEach(l=>this._removeAt(l));this._putAt(keep,nu);events.push({unit:nu,loc:keep});extra=null;changed=true;continue;}
   }
   for(const k in groups){
    const locs=groups[k];if(locs.length<3)continue;
    const three=locs.slice(0,3),first=this.unitAt(three[0]),nu=this._makeUnit(first.id,first.star+1);
    three.forEach(l=>this._removeAt(l));this._putAt(three[0],nu);events.push({unit:nu,loc:three[0]});changed=true;break;
   }
  }
  return events;
 }
 // ---------- 羁绊 ----------
 traitCounts(){const seen=new Set(),counts={};for(const u of Object.values(this.board)){if(seen.has(u.id))continue;seen.add(u.id);for(const t of D.UNITS[u.id].traits)counts[t]=(counts[t]||0)+1;}return counts;}
 activeTraits(){const out={},counts=this.traitCounts();for(const t in counts){const lv=D.traitLevel(t,counts[t]);if(lv>0)out[t]=lv;}return out;}
 // ---------- 强化 ----------
 offerAugments(){const c=Object.keys(D.AUGMENTS).filter(a=>!this.augments.includes(a));for(let i=c.length-1;i>0;i--){const j=this.rng.int(0,i);[c[i],c[j]]=[c[j],c[i]];}return c.slice(0,3);}
 takeAugment(a){if(!D.AUGMENTS[a]||this.augments.includes(a))return;this.augments.push(a);if(a==='fund')this.gold+=12;else if(a==='training')this.addXp(6);}
 // ---------- 结算 ----------
 /** 胜利 +1 金币；失利扣终端完整度并发放逐次递减的重整补给。完整度归零时终端过载：损失一半金币后重置。 */
 applyResult(won,surviving,boss,practice=false){
  if(practice)return {damage:0,relief:0,overload:false};
  if(won){this.wins++;this.gold+=1;this.streak=0;return {damage:0,relief:1,overload:false};}
  this.losses++;const damage=4+surviving*2+(boss?8:0);this.hp=Math.max(0,this.hp-damage);
  const relief=Math.max(2,5-this.streak);this.streak++;this.gold+=relief;this.addXp(1);
  let overload=false;if(this.hp<=0){overload=true;this.gold=Math.ceil(this.gold/2);this.hp=D.START_HP;}
  return {damage,relief,overload};
 }
 // ---------- 存档 ----------
 toJSON(){return {v:1,gold:this.gold,level:this.level,xp:this.xp,hp:this.hp,shop:this.shop,shopLocked:this.shopLocked,bench:this.bench,board:this.board,augments:this.augments,nextUid:this.nextUid,wins:this.wins,losses:this.losses,granted:this.granted,offered:this.offered,streak:this.streak};}
 static fromJSON(data){
  const s=new State();if(!data||data.v!==1)return s;
  const int=(v,lo,hi,d)=>Number.isInteger(v)&&v>=lo&&v<=hi?v:d,unit=u=>u&&D.UNITS[u.id]&&[1,2,3].includes(u.star)&&Number.isInteger(u.uid);
  s.gold=int(data.gold,0,9999,D.START_GOLD);s.level=int(data.level,1,D.MAX_LEVEL,2);s.xp=int(data.xp,0,200,0);s.hp=int(data.hp,1,D.START_HP,D.START_HP);
  s.bench=Array(D.BENCH_SIZE).fill(null);if(Array.isArray(data.bench))data.bench.slice(0,D.BENCH_SIZE).forEach((u,i)=>{if(unit(u))s.bench[i]={uid:u.uid,id:u.id,star:u.star};});
  s.board={};if(data.board&&typeof data.board==='object')for(const k in data.board){const p=parseKey(k),u=data.board[k];if(State.isPlayerCell(p.x,p.y)&&unit(u)&&s.boardCount()<s.level)s.board[k]={uid:u.uid,id:u.id,star:u.star};}
  s.augments=Array.isArray(data.augments)?[...new Set(data.augments.filter(a=>D.AUGMENTS[a]))]:[];
  s.shop=Array.isArray(data.shop)&&data.shop.length===5&&data.shop.every(id=>id===''||D.UNITS[id])?[...data.shop]:s.shop;s.shopLocked=data.shopLocked===true;
  s.wins=int(data.wins,0,9999,0);s.losses=int(data.losses,0,9999,0);s.granted=int(data.granted,-1,D.ENCOUNTERS.length-1,-1);s.streak=int(data.streak,0,99,0);
  s.offered=Array.isArray(data.offered)?data.offered.filter(Number.isInteger):[];
  const owned=[...s.bench.filter(Boolean),...Object.values(s.board)];s.nextUid=Math.max(int(data.nextUid,1,1e9,1),...owned.map(u=>u.uid+1));
  // 卡池按存档里的棋子与商店重新结算
  for(const id in D.UNITS)s.pool[id]=D.POOL_SIZE[D.UNITS[id].cost];
  for(const u of owned)s.pool[u.id]=Math.max(0,s.pool[u.id]-3**(u.star-1));for(const id of s.shop)if(id)s.pool[id]=Math.max(0,s.pool[id]-1);
  return s;
 }
}

// ---------- 战斗单位 ----------
function makeUnit(id,star,team,enemyType=false,strength=1){
 const def=enemyType?D.ENEMIES[id]:D.UNITS[id],m=enemyType?strength:D.STAR_MULT[star];
 return {id,def,enemyType,star,team,scaleMult:strength,size:def.size||1,boss:!!def.boss,
  gpos:{x:0,y:0},maxHp:def.hp*m,hp:def.hp*m,atk:def.atk*m,atkSpeed:def.as,armor:def.armor,maxMana:def.mana,mana:def.startMana||0,
  reach:(def.range<=1?1.3:def.range+.3)+(def.boss?.6:0),crit:.1,critMult:1.5,skillMult:1,regen:0,shield:0,moveSpeed:2.2,echoMana:0,
  alive:true,target:null,cd:0,stun:0,castLock:0,retarget:0,dealt:0,healed:0,moving:false,face:{x:0,y:team===0?-1:1},
  spawnT:0,deathT:-1,flash:0,attackT:1,castT:1,serial:0};
}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),dist2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
function segDist(p,a,b){const abx=b.x-a.x,aby=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*abx+(p.y-a.y)*aby)/(abx*abx+aby*aby)));return Math.hypot(p.x-(a.x+abx*k),p.y-(a.y+aby*k));}

const C={ally:0xfff4c2,enemy:0xff4a55,crit:0xffe24a,skill:0x7fe6ff,shield:0xcfe9ff,team:0x66d8ff,blink:0xa867ff,pierce:0x8dffb0,rail:0xffe36a,frost:0x8fdcff,star:0xffc46a,slam:0xffb060,meteor:0xffd76a,fire:0xff7a3c,mark:0xff9aa8,heal:0x8dffc0,void:0xd65cff};

class Battle{
 constructor(){this.units=[];this.projectiles=[];this.scheduled=[];this.running=false;this.time=0;this.listeners=[];this.rng=Math.random;this.augments=[];this.serial=0;this.waveIdx=0;this.waves=[];this.timeout=45;}
 on(fn){this.listeners.push(fn);return this;}
 emit(type,data={}){for(const fn of this.listeners)fn(type,data);}
 clear(){this.units=[];this.projectiles=[];this.scheduled=[];this.running=false;this.time=0;this.emit('clear');}
 start(state,encounter){
  this.clear();this.augments=state.augments;const traits=state.activeTraits();this.traits=traits;
  for(const {x,y,unit} of state.boardUnits()){const u=makeUnit(unit.id,unit.star,0);u.gpos={x:x+.5,y:y+.5};u.uid=unit.uid;this._applyBonuses(u,traits);this._add(u);}
  this.waves=encounter.waves?encounter.waves:[encounter.enemies];this.waveIdx=0;this.timeout=45+25*(this.waves.length-1);this._waveDelay=-1;
  this._spawnWave(0);
  if(traits.dawn){const v=D.TRAITS.dawn.values[traits.dawn-1];for(const u of this.units)if(u.team===0){u.shield+=v;this.emit('fx',{kind:'ring',at:u.gpos,lift:.9,color:C.ally,r0:.1,r1:.55,life:.6,width:.05});}}
  this.running=true;this.emit('start',{waves:this.waves.length});
 }
 _add(u){u.serial=++this.serial;this.units.push(u);this.emit('spawn',{u});return u;}
 _spawnWave(i){
  for(const [id,c,r,m] of this.waves[i]){const u=makeUnit(id,1,1,true,m);u.gpos={x:c+.5,y:r+.5};this._nudgeFree(u);this._add(u);if(i>0)this.emit('fx',{kind:'ring',at:u.gpos,lift:.05,color:C.enemy,r0:.1,r1:.8*u.size,life:.5,width:.06,filled:true});}
  if(i>0)this.emit('wave',{n:i+1,total:this.waves.length});
 }
 _nudgeFree(u){for(let k=0;k<12&&this.units.some(o=>o.alive&&dist(o.gpos,u.gpos)<.45);k++)u.gpos.y=Math.max(.3,u.gpos.y-.4),u.gpos.x+=(k%2?-.3:.3);}
 _applyBonuses(u,traits){
  const tr=u.def.traits,val=t=>D.TRAITS[t].values[traits[t]-1];
  if(traits.bulwark&&tr.includes('bulwark'))u.maxHp+=val('bulwark');
  if(traits.marksman&&tr.includes('marksman'))u.atkSpeed*=1+val('marksman')/100;
  if(traits.arcanist)u.skillMult+=val('arcanist')/100;
  if(traits.striker&&tr.includes('striker')){u.crit+=val('striker')/100;u.critMult=1.8;}
  if(traits.echo&&tr.includes('echo'))u.echoMana=val('echo');
  if(this.augments.includes('power'))u.atk*=1.15;
  if(this.augments.includes('vital'))u.maxHp*=1.18;
  if(this.augments.includes('overclock'))u.atkSpeed*=1.15;
  if(this.augments.includes('precast'))u.mana+=25;
  if(this.augments.includes('regen'))u.regen=.02;
  u.hp=u.maxHp;
 }
 alive(team){return this.units.filter(u=>u.alive&&u.team===team);}
 enemiesLeft(){let n=this.alive(1).length;for(let i=this.waveIdx+1;i<this.waves.length;i++)n+=this.waves[i].length;return n;}
 damageReport(){return this.units.filter(u=>u.team===0).map(u=>({id:u.id,star:u.star,dealt:u.dealt,healed:u.healed,alive:u.alive})).sort((a,b)=>b.dealt-a.dealt);}
 step(dt){
  if(!this.running)return;
  this.time+=dt;
  for(let i=0;i<this.scheduled.length;){const ev=this.scheduled[i];ev.t-=dt;if(ev.t<=0){this.scheduled.splice(i,1);ev.fn();}else i++;}
  this._stepProjectiles(dt);
  for(const u of this.units){u.spawnT+=dt;u.attackT+=dt;u.castT+=dt;u.flash=Math.max(0,u.flash-dt*6);if(u.alive)this._tickUnit(u,dt);else if(u.deathT>=0)u.deathT+=dt;}
  this._separate(dt);
  const allies=this.alive(0).length,enemies=this.alive(1).length;
  if(enemies===0&&allies>0&&this.waveIdx<this.waves.length-1){ // 下一波
   if(this._waveDelay<0)this._waveDelay=1.3;this._waveDelay-=dt;
   if(this._waveDelay<=0){this._waveDelay=-1;this._spawnWave(++this.waveIdx);}
   return;
  }
  if(allies===0||enemies===0||this.time>=this.timeout){
   this.running=false;const left=this.enemiesLeft(),won=left===0&&allies>0;let mvp=null;
   for(const u of this.units)if(u.team===0&&(!mvp||u.dealt>mvp.dealt))mvp={id:u.id,star:u.star,dealt:Math.round(u.dealt)};
   this.emit('finish',{won,surviving:left,mvp,time:this.time,timeout:this.time>=this.timeout});
  }
 }
 _nearest(u,team){let best=null,bd=Infinity;for(const o of this.units)if(o.alive&&o.team===team){const d=dist2(u.gpos,o.gpos);if(d<bd){bd=d;best=o;}}return best;}
 _tickUnit(u,dt){
  u.moving=false;
  if(u.regen>0)u.hp=Math.min(u.maxHp,u.hp+u.maxHp*u.regen*dt);
  if(u.stun>0){u.stun-=dt;return;}
  if(u.castLock>0){u.castLock-=dt;return;}
  u.cd-=dt;u.retarget-=dt;
  if(!u.target||!u.target.alive||u.retarget<=0){u.target=this._nearest(u,1-u.team);u.retarget=1;}
  const tgt=u.target;if(!tgt)return;
  const d=dist(u.gpos,tgt.gpos);if(d>.001)u.face={x:(tgt.gpos.x-u.gpos.x)/d,y:(tgt.gpos.y-u.gpos.y)/d};
  if(u.maxMana>0&&u.mana>=u.maxMana&&u.def.skill){this._cast(u);return;}
  if(d<=u.reach){if(u.cd<=0){u.cd=1/u.atkSpeed;this._attack(u,tgt);}}
  else{u.gpos.x+=u.face.x*u.moveSpeed*dt;u.gpos.y+=u.face.y*u.moveSpeed*dt;this._clamp(u);u.moving=true;}
 }
 _clamp(u){u.gpos.x=Math.max(.3,Math.min(D.COLS-.3,u.gpos.x));u.gpos.y=Math.max(.3,Math.min(D.ROWS-.3,u.gpos.y));}
 _separate(dt){ // 简单的单位推挤，避免重叠
  const k=Math.min(1,dt*10);
  for(const a of this.units){if(!a.alive)continue;
   for(const b of this.units){if(b===a||!b.alive)continue;
    const dx=a.gpos.x-b.gpos.x,dy=a.gpos.y-b.gpos.y,d=Math.hypot(dx,dy),min=.62*(a.size+b.size)*.5+.1;
    if(d<min&&d>.0001){a.gpos.x+=dx/d*(min-d)*.5*k;a.gpos.y+=dy/d*(min-d)*.5*k;}
   }
   this._clamp(a);
  }
 }
 _shoot(from,target,tpos,opts){const p={from:{x:from.x,y:from.y},pos:{x:from.x,y:from.y},target,tpos:{x:tpos.x,y:tpos.y},speed:opts.speed||9.5,arc:opts.arc||0,color:opts.color,size:opts.size||.05,travelled:0,k:0,done:false,onHit:opts.onHit,lift:opts.lift??1};this.projectiles.push(p);this.emit('projectile',{p});return p;}
 _stepProjectiles(dt){
  for(const p of this.projectiles){
   if(p.target&&p.target.alive)p.tpos={x:p.target.gpos.x,y:p.target.gpos.y};
   p.travelled+=p.speed*dt;const total=Math.max(.01,dist(p.from,p.tpos));p.k=Math.min(1,p.travelled/total);
   p.pos.x=p.from.x+(p.tpos.x-p.from.x)*p.k;p.pos.y=p.from.y+(p.tpos.y-p.from.y)*p.k;
   if(p.k>=1){p.done=true;p.onHit&&p.onHit();}
  }
  this.projectiles=this.projectiles.filter(p=>!p.done);
 }
 _attack(u,tgt){
  let dmg=u.atk,crit=false;if(this.rng()<u.crit){dmg*=u.critMult;crit=true;}
  if(u.maxMana>0)u.mana=Math.min(u.maxMana,u.mana+10);
  u.attackT=0;const melee=u.def.range<=1;this.emit('attack',{u,tgt,crit,melee});
  if(melee){this._damage(u,tgt,dmg,'atk',crit);this.emit('fx',{kind:'slash',at:tgt.gpos,lift:.9,angle:Math.atan2(u.face.y,u.face.x),color:crit?C.crit:u.team===0?C.ally:C.enemy,radius:crit?.62:.45});}
  else this._shoot(u.gpos,tgt,tgt.gpos,{color:u.team===0?0xbfe4ff:C.enemy,size:.045,arc:.12,onHit:()=>this._damage(u,tgt,dmg,'atk',crit)});
 }
 _damage(src,tgt,amount,kind,crit=false){
  if(!tgt.alive)return;
  if(kind==='atk')amount*=100/(100+tgt.armor);
  amount=Math.max(1,amount);const raw=amount;let absorbed=0;
  if(tgt.shield>0){absorbed=Math.min(tgt.shield,amount);tgt.shield-=absorbed;amount-=absorbed;}
  tgt.hp-=amount;if(src)src.dealt+=raw;
  if(tgt.maxMana>0)tgt.mana=Math.min(tgt.maxMana,tgt.mana+Math.min(raw*.03,8));
  tgt.flash=1;this.emit('damage',{src,tgt,raw,kind,crit,absorbed});
  if(tgt.hp<=0)this._kill(tgt);
 }
 _heal(src,tgt,amount){if(!tgt.alive)return;const v=Math.min(tgt.maxHp-tgt.hp,amount);tgt.hp+=v;if(src)src.healed+=v;this.emit('heal',{src,tgt,amount:v});}
 _kill(u){u.hp=0;u.alive=false;u.deathT=0;this.emit('kill',{u});}
 _schedule(t,fn){this.scheduled.push({t,fn});}
 // ---------- 技能 ----------
 _cast(u){
  const sk=u.def.skill,foes=1-u.team,fx=d=>this.emit('fx',d);
  u.mana=0;u.castLock=.35;u.castT=0;
  let v=sk.values[u.enemyType?1:u.star]*u.skillMult;if(u.enemyType)v*=u.scaleMult;
  this.emit('cast',{u,skill:sk});
  fx({kind:'ring',at:u.gpos,lift:.05,color:u.team===0?C.skill:C.enemy,r0:.08,r1:.62,life:.4,width:.045});
  const hit=(o,amount)=>this._damage(u,o,amount,'skill');
  switch(sk.type){
   case 'shield_self':u.shield+=v;this.emit('shield',{u,amount:v});fx({kind:'ring',at:u.gpos,lift:.9,color:C.shield,r0:.18,r1:.62,life:.6,width:.07,filled:true});break;
   case 'shield_near':{
    const near=this.alive(u.team).filter(a=>a!==u).sort((a,b)=>dist2(a.gpos,u.gpos)-dist2(b.gpos,u.gpos)).slice(0,sk.count||2);
    for(const a of [u,...near]){a.shield+=v;this.emit('shield',{u:a,amount:v});fx({kind:'ring',at:a.gpos,lift:.9,color:C.shield,r0:.14,r1:.55,life:.65,width:.06,filled:true});if(a!==u)fx({kind:'beam',from:[u.gpos.x,u.gpos.y,1.1],to:[a.gpos.x,a.gpos.y,1],color:C.shield,width:.04,life:.3});}
    break;}
   case 'team_shield':
    for(const a of this.alive(u.team)){a.shield+=v;this.emit('shield',{u:a,amount:v});fx({kind:'ring',at:a.gpos,lift:.9,color:u.team===0?C.team:C.enemy,r0:.12,r1:.52,life:.7,width:.05,filled:true});}
    fx({kind:'ring',at:u.gpos,lift:.05,color:u.team===0?C.team:C.enemy,r0:.2,r1:3.6,life:.8,width:.08});break;
   case 'heal':{
    const friends=this.alive(u.team).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp),low=friends[0];if(!low)break;
    fx({kind:'beam',from:[u.gpos.x,u.gpos.y,1.3],to:[low.gpos.x,low.gpos.y,1.1],color:C.heal,width:.05,life:.35});
    for(const a of friends)if(dist(a.gpos,low.gpos)<=sk.radius){this._heal(u,a,a===low?v:v*.5);fx({kind:'ring',at:a.gpos,lift:.05,color:C.heal,r0:.1,r1:.6,life:.6,width:.05,filled:true});fx({kind:'burst',at:a.gpos,lift:.4,color:C.heal,count:8,speed:1.2,size:.04,life:.7,up:1.6});}
    break;}
   case 'strike':{
    const tg=u.target;if(!tg||!tg.alive)break;
    for(let k=0;k<3;k++)this._schedule(.08*k,()=>{if(!tg.alive)return;hit(tg,v/3);fx({kind:'slash',at:tg.gpos,lift:.9,angle:this.rng()*Math.PI*2,color:C.crit,radius:.66});});
    this.emit('hitstop',{dur:.05});break;}
   case 'snipe':{
    let tg=u.target;if(sk.pick==='weakest'){let low=Infinity;for(const o of this.alive(foes))if(o.hp<low){low=o.hp;tg=o;}}
    if(!tg||!tg.alive)break;u.target=tg;
    const big=v>600;fx({kind:'telegraph',at:tg.gpos,radius:.45,color:u.team===0?C.skill:C.enemy,life:.25,follow:tg});
    this._schedule(.22,()=>{fx({kind:'beam',from:[u.gpos.x,u.gpos.y,1.2],to:[tg.gpos.x,tg.gpos.y,1],color:big?C.rail:C.skill,width:big?.16:.09,life:.3});if(tg.alive)hit(tg,v);fx({kind:'burst',at:tg.gpos,lift:.9,color:big?C.rail:C.skill,count:16,speed:3.2,size:.06,life:.5});this.emit('shake',{v:big?9:4});if(big)this.emit('hitstop',{dur:.07});});
    break;}
   case 'blink':{
    let tg=null,low=Infinity;for(const o of this.alive(foes))if(o.hp<low){low=o.hp;tg=o;}
    if(!tg)break;
    fx({kind:'burst',at:{...u.gpos},lift:.9,color:u.team===0?C.blink:C.void,count:14,speed:2.2,size:.05,life:.5});
    const from={...u.gpos},side=u.team===0?1:-1;
    u.gpos={x:tg.gpos.x+(this.rng()-.5)*.8,y:Math.max(.3,Math.min(D.ROWS-.3,tg.gpos.y+.7*side))};u.target=tg;this._clamp(u);this.emit('blink',{u,from});
    this._schedule(.12,()=>{if(tg.alive)hit(tg,v);fx({kind:'slash',at:tg.gpos,lift:.9,angle:.5,color:u.team===0?C.blink:C.void,radius:.74});fx({kind:'burst',at:{...u.gpos},lift:.9,color:u.team===0?C.blink:C.void,count:14,speed:2.2,size:.05,life:.5});this.emit('hitstop',{dur:.06});});
    break;}
   case 'pierce':{
    const tg=u.target;if(!tg)break;
    const dx=tg.gpos.x-u.gpos.x,dy=tg.gpos.y-u.gpos.y,len=Math.hypot(dx,dy)||1,a=u.gpos,b={x:u.gpos.x+dx/len*9,y:u.gpos.y+dy/len*9},width=sk.width||.55;
    for(const o of this.alive(foes))if(segDist(o.gpos,a,b)<=width)hit(o,v);
    const big=v>600;fx({kind:'beam',from:[a.x,a.y,1.1],to:[b.x,b.y,1.1],color:big?C.rail:C.pierce,width:big?.22:.1,life:.35});
    this.emit('shake',{v:big?10:4});if(big)this.emit('hitstop',{dur:.08});break;}
   case 'aoe':case 'nova':{
    const tg=u.target;if(!tg)break;
    const center={...tg.gpos},radius=sk.radius,stun=sk.stun||0,nova=sk.type==='nova',col=C[sk.fx]||(nova?C.frost:C.star);
    const land=()=>{
     for(const o of this.alive(foes))if(dist(o.gpos,center)<=radius){hit(o,v);if(stun>0&&o.alive){o.stun=Math.max(o.stun,stun);this.emit('stun',{u:o,dur:stun,fx:sk.fx});}}
     fx({kind:'ring',at:center,lift:.05,color:col,r0:.1,r1:radius,life:.5,width:.07,filled:true});fx({kind:'burst',at:center,lift:.3,color:col,count:26,speed:3.3,size:.06,life:.7,up:.6});
     if(sk.fx==='fire')fx({kind:'pillar',at:center,color:col,radius:radius*.8,life:.7});
     this.emit('shake',{v:7});
    };
    if(nova){fx({kind:'telegraph',at:center,radius,color:col,life:.18});this._schedule(.18,land);}
    else this._shoot({x:u.gpos.x,y:u.gpos.y},null,center,{speed:6,arc:1.1,color:col,size:.1,lift:1.2,onHit:land});
    break;}
   case 'slam':{
    for(const o of this.alive(foes))if(dist(o.gpos,u.gpos)<=sk.radius){hit(o,v);if(o.alive){o.stun=Math.max(o.stun,sk.stun||0);this.emit('stun',{u:o,dur:sk.stun||0});}}
    const col=u.team===0?C.slam:C.enemy;fx({kind:'ring',at:u.gpos,lift:.05,color:col,r0:.2,r1:sk.radius,life:.55,width:.09,filled:true});fx({kind:'burst',at:u.gpos,lift:.1,color:col,count:30,speed:3.6,size:.07,life:.7,up:1.2});
    this.emit('shake',{v:14});this.emit('hitstop',{dur:.07});break;}
   case 'multi':{
    const list=this.alive(foes).sort((x,y)=>dist2(x.gpos,u.gpos)-dist2(y.gpos,u.gpos)).slice(0,sk.count||3);
    list.forEach((o,k)=>this._shoot(u.gpos,o,o.gpos,{speed:11-k,arc:.3,color:u.team===0?0xff9a5a:C.enemy,size:.06,onHit:()=>hit(o,v)}));break;}
   case 'meteor':{
    const list=this.alive(foes);if(!list.length)break;
    const radius=sk.radius;let best=list[0].gpos,bn=0;
    for(const o of list){let n=0;for(const o2 of list)if(dist(o.gpos,o2.gpos)<=radius)n++;if(n>bn){bn=n;best=o.gpos;}}
    const p={...best},col=u.team===0?C.meteor:C.enemy;
    fx({kind:'telegraph',at:p,radius,color:col,life:.55});
    this._schedule(.55,()=>{
     for(const o of this.alive(foes))if(dist(o.gpos,p)<=radius)hit(o,v);
     fx({kind:'beam',from:[p.x,p.y,9],to:[p.x,p.y,0],color:col,width:.4,life:.25});fx({kind:'ring',at:p,lift:.05,color:col,r0:.2,r1:radius*1.25,life:.7,width:.1,filled:true});fx({kind:'burst',at:p,lift:.1,color:col,count:50,speed:5.5,size:.08,life:1,up:1});
     this.emit('shake',{v:24});this.emit('hitstop',{dur:.12});
    });break;}
  }
  if(u.echoMana>0)u.mana+=u.echoMana;
 }
}

/** 简单机器人：保留 10 金币吃利息，优先买已有的和高费棋子，金币多时升级。用于平衡模拟。 */
function botShop(s,stageIdx){
 for(let guard=0;guard<40;guard++){
  let best=-1,bestScore=-1;
  for(let i=0;i<5;i++){const id=s.shop[i];if(!id||!s.canBuy(i))continue;const score=D.UNITS[id].cost+s.countCopies(id,1)*2.5+s.countCopies(id,2)*3;if(score>bestScore){bestScore=score;best=i;}}
  const reserve=stageIdx>=2?10:0;
  if(best>=0&&(s.gold-D.UNITS[s.shop[best]].cost>=reserve||bestScore>=3.5)){s.buy(best);continue;}
  if(s.gold>=reserve+8&&s.level<D.MAX_LEVEL&&s.boardCount()>=s.boardCap()){s.buyXp();continue;}
  if(s.gold>=30){s.reroll();continue;}
  break;
 }
 if(s.bench.filter(u=>!u).length<2)for(const u of s.bench)if(u&&u.star===1&&s.countCopies(u.id,1)===1){s.sell(u);break;}
 s.autoPlaceFromBench();
 const power=u=>D.UNITS[u.id].cost*D.STAR_MULT[u.star];
 for(const u of [...s.bench]){
  if(!u)continue;let weakest=null,low=999;
  for(const b of s.boardUnits())if(power(b.unit)<low){low=power(b.unit);weakest=b;}
  if(weakest&&power(u)>low+.5)s.move(u,{kind:'board',x:weakest.x,y:weakest.y});
 }
}
/** 无画面打完一场，返回 {won,surviving,time}。 */
function simulateFight(state,encounter,rng){
 const b=new Battle();if(rng)b.rng=rng;let result=null;b.on((type,d)=>{if(type==='finish')result=d;});
 b.start(state,encounter);for(let t=0;!result&&t<200;t+=1/30)b.step(1/30);
 return result||{won:false,surviving:b.enemiesLeft(),time:200};
}
/** 机器人跑完整个战役，统计每关首战胜率与重试次数。 */
function simulateCampaign(games=20,seed0=1000){
 const stats=D.ENCOUNTERS.map(()=>({plays:0,firstWins:0,attempts:0,level:0,gold:0}));
 for(let g=0;g<games;g++){
  const s=new State(seed0+g),rng=makeRng(seed0*7+g);
  for(let i=0;i<D.ENCOUNTERS.length;i++){
   s.grantStage(i);if(D.AUGMENT_STAGES.includes(i))s.takeAugment(s.offerAugments()[0]);
   const st=stats[i];st.plays++;
   for(let attempt=0;attempt<30;attempt++){
    botShop(s,i);if(attempt===0){st.level+=s.level;st.gold+=s.gold;}
    const r=simulateFight(s,D.ENCOUNTERS[i],rng);s.applyResult(r.won,r.surviving,!!D.ENCOUNTERS[i].boss);st.attempts++;
    if(r.won){if(attempt===0)st.firstWins++;break;}
   }
  }
 }
 return stats.map((st,i)=>({stage:i+1,firstWin:Math.round(100*st.firstWins/st.plays),avgAttempts:+(st.attempts/st.plays).toFixed(2),avgLevel:+(st.level/st.plays).toFixed(1),avgGold:Math.round(st.gold/st.plays)}));
}

const AC={Data:D,State,Battle,makeUnit,makeRng,cellKey,parseKey,COLORS:C,botShop,simulateFight,simulateCampaign};
global.AC=AC;if(typeof module!=='undefined')module.exports=AC;
})(globalThis);
