'use strict';
// The siege path uses continuous coordinates; allied defenders stay on build pads.
const DEFENSE_PATH=[[-1,1],[0,1],[1,1],[2,1],[3,1],[3,2],[3,3],[4,3],[5,3],[6,3],[6,4],[6,5],[7,5],[8,5]].map(([x,y])=>({x,y}));
const DEFENSE_PADS=[[1,0],[2,2],[4,2],[5,4],[7,4],[0,2],[4,0],[5,2],[2,4],[7,2],[0,4]].map(([x,y])=>({x,y}));
let defensePositions={},siege=null,spawnSerial=0;
const isDefense=()=>STAGES[stage].mode==='defense';
function deployable(x,y){return isDefense()?DEFENSE_PADS.some(p=>p.x===x&&p.y===y):x>=0&&x<8&&y>=3&&y<6;}
function makeDefenders(){
 const occupied=new Set();
 return lineup.map(p=>{
  let pad=defensePositions[p.id];
  if(!pad||!DEFENSE_PADS.some(a=>a.x===pad.x&&a.y===pad.y)||occupied.has(pad.x+','+pad.y))pad=DEFENSE_PADS.find(a=>!occupied.has(a.x+','+a.y));
  occupied.add(pad.x+','+pad.y);defensePositions[p.id]={...pad};
  const u=createUnit(p.id,'blue',pad.x,pad.y);u.range=Math.max(2.2,u.range);u.defender=true;return u;
 });
}
function prepareSiege(){
 siege={core:100,maxCore:100,wave:0,total:STAGES[stage].waves||(stage===1?3:4),remaining:0,spawnTimer:0,breakTimer:1.2,kills:0,leaks:0};
 spawnSerial=0;
}
function nextWave(){
 siege.wave++;siege.remaining=(stage===1?3:4)+siege.wave;siege.spawnTimer=.25;
 log('waveLog',{n:siege.wave,total:siege.total});
}
function spawnInvader(){
 const ids=['oak','knight','arrow','warden','ember'];
 const id=ids[(spawnSerial+siege.wave)%ids.length];
 const scale=(STAGES[stage].invaderScale||(stage===1?.30:.38))+siege.wave*.035;
 const u=createUnit(id,'red',-1,1,scale);
 u.uid='invader-'+(++spawnSerial);u.progress=0;u.raider=true;u.mana=0;u.travelSpeed=stage===1?.57:.63;
 u.cooldown=1;u.interval=2.2;u.range=2.1;u.leakDamage=18;u.atk*=.65;units.push(u);siege.remaining--;
}
function tickSiege(dt){
 if(siege.wave===0){siege.breakTimer-=dt;if(siege.breakTimer<=0)nextWave();}
 if(siege.remaining>0){siege.spawnTimer-=dt;if(siege.spawnTimer<=0){spawnInvader();siege.spawnTimer=1.75;}}
 for(const u of alive('blue')){
  u.hp=Math.min(u.maxHp,u.hp+u.maxHp*u.regen*dt);u.cooldown-=dt;
  const target=alive('red').filter(e=>dist(e,u)<=u.range).sort((a,b)=>b.progress-a.progress)[0];
  if(target&&u.cooldown<=0)basicAttack(u,target);
 }
 for(const u of alive('red')){
  u.progress+=u.travelSpeed*dt;
  if(u.progress>=DEFENSE_PATH.length-1){u.hp=0;u.escaped=true;siege.leaks++;siege.core=Math.max(0,siege.core-u.leakDamage);effects.push({type:'ring',x:7.7,y:5,color:'#ff8f85',life:.8,total:.8});log('breachLog',{n:u.leakDamage});continue;}
  const index=Math.floor(u.progress),t=u.progress-index,a=DEFENSE_PATH[index],b=DEFENSE_PATH[index+1];
  u.x=a.x+(b.x-a.x)*t;u.y=a.y+(b.y-a.y)*t;u.cooldown-=dt;
  const target=alive('blue').filter(a=>dist(a,u)<=2.1).sort((a,b)=>dist(a,u)-dist(b,u))[0];
  if(target&&u.cooldown<=0)basicAttack(u,target);
 }
 if(siege.core<=0||!alive('blue').length){finish(false);return;}
 if(siege.wave>0&&siege.remaining===0&&alive('red').length===0){
  if(siege.wave===siege.total){finish(true);return;}
  siege.breakTimer-=dt;
  if(siege.breakTimer<=0){nextWave();siege.breakTimer=3;}
 }else if(siege.wave>0)siege.breakTimer=3;
 if(elapsed>=180)finish(false,true);
}
function basicAttack(u,target){
 u.cooldown=u.interval/u.attackMult;u.action=.28;
 effects.push({type:u.range<=1?'slash':'beam',x:u.x,y:u.y,tx:target.x,ty:target.y,color:u.team==='blue'?'#b8e9ff':'#ffb5a1',life:.32,total:.32});
 damage(target,u.atk);u.mana=Math.min(100,u.mana+25);
 if(u.mana>=100){const next=target.hp>0?target:alive(target.team).sort((a,b)=>dist(a,u)-dist(b,u))[0];if(next)cast(u,next);}
}
function moveDeployment(id,x,y){
 if(mode!=='prep'||!deployable(x,y))return false;
 if(isDefense()){
  const mover=units.find(u=>u.id===id&&u.team==='blue');if(!mover)return false;
  const other=units.find(u=>u.team==='blue'&&u.x===x&&u.y===y&&u.id!==id);
  if(other)defensePositions[other.id]={x:mover.x,y:mover.y};defensePositions[id]={x,y};
 }else{
  const mover=lineup.find(p=>p.id===id);if(!mover)return false;
  const other=lineup.find(p=>p.x===x&&p.y===y&&p.id!==id);if(other){other.x=mover.x;other.y=mover.y;}mover.x=x;mover.y=y;
 }
 prepare();return true;
}
function renderCombatHud(){
 $('#act-label').textContent=tr('currentAct',{n:stage+1});
 $('#battle-mode').textContent=tr(isDefense()?'modeDefense':'modeExpedition');
 $('#battle-mode').dataset.mode=isDefense()?'defense':'expedition';
 $('#siege-hud').hidden=!isDefense();$('#expedition-hud').hidden=isDefense();
 if(isDefense()&&siege){$('#core-value').textContent=Math.ceil(siege.core)+' / '+siege.maxCore;$('#core-fill').style.width=siege.core+'%';$('#wave-value').textContent=siege.wave+' / '+siege.total;$('#remaining-value').textContent=siege.remaining+alive('red').length;}
 else{$('#allied-value').textContent=alive('blue').length;$('#enemy-value').textContent=alive('red').length;}
 $('#combat-instructions').textContent=tr(isDefense()?'defenseRules':'expeditionRules')+(isDefense()?' '+tr('defenseReach'):'');
}
