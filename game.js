/* Standalone deterministic grid simulation. No build or server required. */
'use strict';
const TRAITS={guard:{name:'守卫',icon:'♜',desc:'2 / 3 人：全队最大生命 +18% / +30%'},wild:{name:'林地',icon:'❧',desc:'2 / 3 人：全队每秒回复 1% / 2% 生命'},ranger:{name:'游侠',icon:'➶',desc:'2 / 3 人：全队攻击速度 +20% / +35%'},arcane:{name:'秘术',icon:'✧',desc:'2 / 3 人：全队技能强度 +25% / +45%'},dawn:{name:'晨曦',icon:'☀',desc:'2 / 3 人：全队开战获得 100 / 180 护盾'}};
const HEROES=[
{id:'oak',name:'橡木卫士',role:'前排 · 护盾',icon:'♜',color:'#d6c68d',bg:'#56603b',hp:1000,atk:48,range:1,interval:1.25,traits:['guard','wild'],type:'shield',skill:'古木之拥',desc:'为自身及距离最近的两名友军施加 200 点护盾。',power:200},
{id:'arrow',name:'逐风游侠',role:'后排 · 单体伤害',icon:'➶',color:'#bbd6a1',bg:'#36583e',hp:630,atk:74,range:4,interval:1,traits:['ranger','wild'],type:'damage',skill:'穿林之箭',desc:'向最近敌人射出一支穿林之箭，造成 250 点伤害。',power:250},
{id:'ember',name:'余烬法师',role:'后排 · 范围伤害',icon:'♨',color:'#edb58c',bg:'#704539',hp:570,atk:48,range:3,interval:1.25,traits:['arcane','dawn'],type:'aoe',skill:'陨火星雨',desc:'对目标及其周围一格的敌人造成 185 点范围伤害。',power:185},
{id:'sage',name:'苔光医师',role:'后排 · 治疗',icon:'❀',color:'#afdabf',bg:'#396154',hp:650,atk:36,range:3,interval:1.2,traits:['wild','dawn'],type:'heal',skill:'复苏之芽',desc:'治疗生命比例最低的友军 280 点，并治疗相邻友军 140 点。',power:280},
{id:'knight',name:'曙光骑士',role:'前排 · 单体伤害',icon:'♞',color:'#e8d5a1',bg:'#645b3c',hp:1050,atk:65,range:1,interval:1.2,traits:['guard','dawn'],type:'damage',skill:'破晓重斩',desc:'对最近敌人造成 230 点伤害。',power:230},
{id:'frost',name:'霜语术士',role:'后排 · 范围伤害',icon:'❄',color:'#a9d2df',bg:'#35596c',hp:590,atk:50,range:3,interval:1.25,traits:['arcane','ranger'],type:'aoe',skill:'冰晶领域',desc:'对目标及其周围一格的敌人造成 170 点范围伤害。',power:170},
{id:'warden',name:'符石守望',role:'前排 · 护盾',icon:'⬡',color:'#bcb4e2',bg:'#504567',hp:1100,atk:42,range:1,interval:1.3,traits:['guard','arcane'],type:'shield',skill:'符文屏障',desc:'为自身及距离最近的两名友军施加 220 点护盾。',power:220},
{id:'moon',name:'月影猎手',role:'后排 · 单体伤害',icon:'☽',color:'#c8b5de',bg:'#514061',hp:610,atk:82,range:3,interval:1.05,traits:['ranger','arcane','wild'],type:'damage',skill:'月落',desc:'对最近敌人造成 290 点伤害。',power:290}
];
const STAGES=[
 {name:'雨夜车站',icon:'☂',enemies:['oak','arrow','warden'],scale:.48},
 {name:'观测站夜袭',icon:'♜',enemies:[],scale:1},
 {name:'沉没档案馆',icon:'◈',enemies:['knight','frost','sage','moon','arrow'],scale:.64},
 {name:'黎明撤离线',icon:'⚑',enemies:[],scale:1},
 {name:'海底钟楼',icon:'♛',enemies:['boss','warden','ember','sage'],scale:.85}
];
STAGES.forEach((s,i)=>s.mode=(i===1||i===3)?'defense':'expedition');
const BOSS={id:'boss',name:'远古石王',role:'最终 Boss',icon:'♛',color:'#efa284',bg:'#6b3930',hp:2800,atk:100,range:1,interval:1.4,traits:[],type:'aoe',skill:'大地震颤',desc:'震击全场，对所有敌人造成 125 点伤害。',power:125};
const $=s=>document.querySelector(s), canvas=$('#board'),ctx=canvas.getContext('2d');
let lineup=[{id:'oak',x:2,y:3},{id:'knight',x:5,y:3},{id:'arrow',x:1,y:5},{id:'sage',x:3,y:5},{id:'ember',x:6,y:5}];
let battleResult=null,logs=[];
let selected='oak',stage=0,unlocked=0,mode='prep',units=[],effects=[],elapsed=0,speed=1,paused=false,drag=null,last=0,accumulator=0;
const GRID={x:88,y:58,w:98,h:87,cols:8,rows:6};
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y),alive=team=>units.filter(u=>u.team===team&&u.hp>0),def=id=>HEROES.find(h=>h.id===id)||BOSS;
function traitCounts(ids){const c={};new Set(ids).forEach(id=>def(id).traits.forEach(t=>c[t]=(c[t]||0)+1));return c;}
function bonus(c,key,low,high){return c[key]>=3?high:c[key]>=2?low:0;}
function createUnit(id,team,x,y,scale=1){const base=def(id),w=team==='blue'&&typeof collectionState!=='undefined'&&collectionState?.equipment[id],weapon=w?GACHA_DATA.weapons[w]:null,h=weapon?{...base,atk:base.atk+weapon.atk,power:base.power+weapon.power}:base;return {...h,uid:team+'-'+id,team,x,y,px:x,py:y,maxHp:h.hp*scale,hp:h.hp*scale,atk:h.atk*scale,power:h.power*scale,mana:0,shield:0,cooldown:.3,moveCd:0,skillMult:1,regen:0,attackMult:1};}
function applyTraits(team){const teamUnits=alive(team),c=traitCounts(teamUnits.map(u=>u.id));teamUnits.forEach(u=>{u.maxHp*=1+bonus(c,'guard',.18,.3);u.hp=u.maxHp;u.regen=bonus(c,'wild',.01,.02);u.attackMult=1+bonus(c,'ranger',.2,.35);u.skillMult=1+bonus(c,'arcane',.25,.45);u.shield=bonus(c,'dawn',100,180);});}
function prepare(){
 mode='prep';paused=false;elapsed=0;accumulator=0;effects=[];battleResult=null;drag=null;resetUltimateBattle();
 units=isDefense()?makeDefenders():lineup.map(p=>createUnit(p.id,'blue',p.x,p.y));
 if(isDefense())prepareSiege();else siege=null;
 const spots=[[3,1],[5,1],[2,0],[6,0],[0,0]];
 if(!isDefense())STAGES[stage].enemies.forEach((id,i)=>units.push(createUnit(id,'red',...spots[i],STAGES[stage].scale)));
 applyTraits('blue');applyTraits('red');$('#result').hidden=true;logs=[];log('readyLog');renderUI();saveProfile();
}
function log(key,params={}){logs.unshift({key,params,time:elapsed});logs=logs.slice(0,50);renderLog();}
function renderLog(){
 $('#log').innerHTML='';
 for(const entry of logs){const p=document.createElement('p'),time=document.createElement('time');time.textContent=formatTime(entry.time);
 const params={...entry.params};if(params.hero){const h=heroText(def(params.hero));params.name=h.name;params.skill=h.skill;}
 p.append(time,document.createTextNode(tr(entry.key,params)));$('#log').append(p);}
}
function formatTime(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');}
function renderUI(){
 renderStages();renderTraits();renderRoster();renderDetails();
 $('#stage-title').textContent=stageName(stage);$('#progress').innerHTML=String(stage+1).padStart(2,'0')+' <i>/ '+String(STAGES.length).padStart(2,'0')+'</i>';
 $('#team-count').textContent=lineup.length+' / 5';
 $('#phase').textContent=tr(mode==='prep'?'prep':mode==='fight'?(paused?'paused':'fighting'):mode==='win'?'winPhase':'losePhase');
 $('#start').disabled=mode!=='prep'||!lineup.length;$('#reset').disabled=mode!=='prep';$('#pause').disabled=mode!=='fight';
 $('#pause').textContent=tr(paused?'resume':'pause');$('#board-hint').textContent=tr(mode==='prep'?(isDefense()?'defenseHint':'prepHint'):'fightHint');
 $('#start').textContent=tr(isDefense()?'defenseStart':'start');renderCombatHud();
 updateStoryBrief();if(battleResult)renderResult();syncPresentationLayout();
}
function renderStages(){$('#stages').innerHTML=STAGES.map((s,i)=>({s,i})).filter(({i})=>Math.floor(i/5)===Math.floor(stage/5)).map(({s,i})=>`<button class="stage ${i===stage?'active':''}" data-stage="${i}" ${i>unlocked||mode==='fight'?'disabled':''}><b>${cleared.includes(i)?'✓':s.icon}</b><span>${stageName(i)}<small>${String(i+1).padStart(2,'0')} / ${tr(s.mode==='defense'?'modeDefense':s.enemies.includes('boss')?'bossLabel':'explore')}</small></span></button>`).join('');}
function renderTraits(){const c=traitCounts(lineup.map(p=>p.id));$('#trait-count').textContent=tr('activeTraits',{n:Object.values(c).filter(n=>n>=2).length});$('#traits').innerHTML=Object.keys(TRAITS).map(key=>{const t=traitText(key);return `<div class="trait ${c[key]>=2?'active':''}"><div class="trait-top"><span class="trait-icon">${t.icon}</span><b>${t.name}</b><span class="count">${c[key]||0} / ${c[key]>=2?3:2}</span></div><p>${t.desc}</p></div>`;}).join('');}
function renderRoster(){$('#roster').innerHTML=HEROES.filter(h=>typeof OWNED_HEROES==='undefined'||OWNED_HEROES.includes(h.id)).map(original=>{const h=heroText(original),on=lineup.some(p=>p.id===h.id);return `<article tabindex="0" role="button" aria-label="${tr('inspect',{name:h.name})}" class="hero-card ${selected===h.id?'selected':''}" data-id="${h.id}" style="--hero-bg:${h.bg};--hero-color:${h.color}"><div class="hero-art">${on?'<span class="deployed">'+tr('onTeam')+'</span>':''}<img src="${characterImage(h.id)}" alt=""><span class="hero-card-stars">${starText(h.id)}</span></div><div class="hero-card-body"><h3>${h.name}</h3><div class="tags">${heroTags(h)}</div><button data-toggle="${h.id}" class="${on?'on':''}" ${mode!=='prep'||(!on&&lineup.length>=5)?'disabled':''}>${tr(on?'remove':'deploy')}</button></div></article>`;}).join('');}
function heroTags(h){return h.traits.map(t=>'<span class="tag">'+traitText(t).name+'</span>').join('');}
function renderDetails(){const h=heroText(def(selected));$('#details').innerHTML=`<div class="hero-summary"><div class="portrait" style="--hero-bg:${h.bg};--hero-color:${h.color}">${h.icon}</div><div><h3>${h.name}</h3><small>${h.role}</small></div></div><div class="tags">${heroTags(h)}</div><div class="stats"><div><span>${tr('hp')}</span><b>${h.hp}</b></div><div><span>${tr('atk')}</span><b>${h.atk}</b></div><div><span>${tr('range')}</span><b>${tr('cells',{n:h.range})}</b></div></div><div class="skill"><b>✧ ${h.skill} <span class="muted">/ ${tr('mana')}</span></b><p>${h.desc}</p><p>${tr('manaHint')}</p></div>`;}
function toggleHero(id){if(mode!=='prep'||!OWNED_HEROES.includes(id))return;const i=lineup.findIndex(p=>p.id===id);if(i>=0)lineup.splice(i,1);else if(lineup.length<5){outer:for(let y=5;y>=3;y--)for(let x=0;x<8;x++)if(!lineup.some(p=>p.x===x&&p.y===y)){lineup.push({id,x,y});break outer;}}prepare();}
function floatText(u,text,color){effects.push({type:'text',x:u.x,y:u.y,text,color,life:1,total:1});}
function damage(u,amount){if(u.hp<=0)return;u.hitFlash=.16;const blocked=Math.min(u.shield,amount);u.shield-=blocked;u.hp=Math.max(0,u.hp-(amount-blocked));floatText(u,Math.round(amount),u.team==='red'?'#ffd2a1':'#ffa6a6');if(u.hp===0){log('fallenLog',{hero:u.id});if(isDefense()&&u.team==='red'&&siege)siege.kills++;}}
function cast(u,target){emitSkillFx(u,target);triggerUltimate(u);u.mana=0;u.castFlash=.85;const amount=u.power*u.skillMult;log('castLog',{hero:u.id});if(u.type==='damage'){effects.push({type:'beam',x:u.x,y:u.y,tx:target.x,ty:target.y,color:u.color,life:.45,total:.45});damage(target,amount);}else if(u.type==='aoe'){const targets=alive(target.team).filter(e=>u.id==='boss'||dist(e,target)<=1);targets.forEach(e=>{damage(e,amount);effects.push({type:'ring',x:e.x,y:e.y,color:u.color,life:.6,total:.6});});}else if(u.type==='heal'){const friends=alive(u.team).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);const low=friends[0];friends.filter(a=>dist(a,low)<=1).forEach(a=>{const heal=Math.min(a.maxHp-a.hp,amount*(a===low?1:.5));a.hp+=heal;floatText(a,'+'+Math.round(heal),'#b9efa9');effects.push({type:'ring',x:a.x,y:a.y,color:'#9fe3a8',life:.6,total:.6});});}else{alive(u.team).sort((a,b)=>dist(a,u)-dist(b,u)).slice(0,3).forEach(a=>{a.shield+=amount;floatText(a,tr('shieldFloat',{n:Math.round(amount)}),'#e5d697');});}}
// Breadth-first pathfinding to a free cell within attack range; occupied cells block movement.
function nextStep(u,target){const occupied=new Set(units.filter(a=>a.hp>0&&a!==u).map(a=>a.x+','+a.y));const queue=[{x:u.x,y:u.y,first:null}],seen=new Set([u.x+','+u.y]);for(let i=0;i<queue.length;i++){const p=queue[i];if(dist(p,target)<=u.range)return p.first;const options=[[0,-1],[-1,0],[1,0],[0,1]].map(([dx,dy])=>({x:p.x+dx,y:p.y+dy})).sort((a,b)=>dist(a,target)-dist(b,target));for(const n of options){const key=n.x+','+n.y;if(n.x<0||n.x>=8||n.y<0||n.y>=6||seen.has(key)||occupied.has(key))continue;seen.add(key);queue.push({...n,first:p.first||n});}}return null;}
function tick(dt){if(mode!=='fight'||paused)return;elapsed+=dt;if(isDefense()){tickSiege(dt);return;}for(const u of units){if(u.hp<=0)continue;u.hp=Math.min(u.maxHp,u.hp+u.maxHp*u.regen*dt);u.cooldown-=dt;u.moveCd-=dt;const enemies=alive(u.team==='blue'?'red':'blue').sort((a,b)=>dist(u,a)-dist(u,b));if(!enemies.length)break;const target=enemies[0];if(dist(u,target)<=u.range){if(u.cooldown<=0){basicAttack(u,target);}}else if(u.moveCd<=0){let next=nextStep(u,target);if(!next){for(const other of enemies.slice(1)){next=nextStep(u,other);if(next)break;}}if(next){u.x=next.x;u.y=next.y;}u.moveCd=.35;}}
if(!alive('red').length)finish(true);else if(!alive('blue').length)finish(false);else if(elapsed>=120)finish(false,true);}
function finish(win,timeout=false){
 mode=win?'win':'lose';battleResult={win,timeout,survivors:alive('blue').length,time:elapsed,core:siege?.core,leaks:siege?.leaks};
 if(win){if(!cleared.includes(stage))cleared.push(stage);unlocked=Math.max(unlocked,Math.min(STAGES.length-1,stage+1));}
 log(win?'winLog':timeout?'timeoutLog':'loseLog');saveProfile();renderUI();
}
function renderResult(){
 const {win,timeout,survivors,time,core,leaks}=battleResult;
 $('#result').innerHTML=`<span class="sigil">${win?'✧':'☽'}</span><h2>${tr(win?(stage===STAGES.length-1?'finalVictory':'victory'):timeout?'timeoutTitle':'defeat')}</h2><p>${win?(isDefense()?tr('defenseSummary',{core:Math.ceil(core??100),leaks:leaks??0}):tr('clearSummary',{stage:stageName(stage),n:survivors})):tr(isDefense()?'defenseDefeat':'defeatSummary')}<br>${tr('battleTime',{time:formatTime(time)})}</p><button class="primary" id="continue">${tr(win?'continueStory':'retry')}</button>`;
 $('#result').hidden=false;$('#continue').onclick=()=>{if(win)openStory(stage,'after','advance');else prepare();};
}
function roundRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function frame(now){const realDt=Math.min((now-last)/1000||0,.05);last=now;if(mode==='fight'&&!paused){accumulator+=realDt*speed;while(accumulator>=.05){tick(.05);accumulator-=.05;if(mode!=='fight'){accumulator=0;break;}}}if(!paused){visualTime+=realDt;units.forEach(u=>{u.action=Math.max(0,(u.action||0)-realDt*speed);u.hitFlash=Math.max(0,(u.hitFlash||0)-realDt*speed);u.castFlash=Math.max(0,(u.castFlash||0)-realDt*speed);u.px+=(u.x-u.px)*Math.min(1,realDt*12*speed);u.py+=(u.y-u.py)*Math.min(1,realDt*12*speed);});effects.forEach(e=>e.life-=realDt*speed);effects=effects.filter(e=>e.life>0);}tickPresentation(realDt);tickCinematic(realDt);tickMusic(realDt);draw();requestAnimationFrame(frame);}
function pointerPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*960/r.width,y:(e.clientY-r.top)*660/r.height};}
canvas.addEventListener('pointerdown',e=>{const p=pointerPos(e),{x,y}=boardCell(p);const u=units.find(a=>Math.round(a.x)===x&&Math.round(a.y)===y&&a.hp>0);if(!u)return;selected=u.id;renderDetails();renderRoster();if(mode==='prep'&&u.team==='blue'){drag={id:u.id,pos:p};canvas.setPointerCapture(e.pointerId);}});
canvas.addEventListener('pointermove',e=>{const p=pointerPos(e);hoverCell=boardCell(p);if(drag)drag.pos=p;});
canvas.addEventListener('pointerup',e=>{if(!drag)return;const {x,y}=boardCell(pointerPos(e)),id=drag.id;drag=null;hoverCell=null;moveDeployment(id,x,y);});canvas.addEventListener('pointercancel',()=>{drag=null;hoverCell=null;});
$('#roster').addEventListener('click',e=>{const toggle=e.target.closest('[data-toggle]');if(toggle){toggleHero(toggle.dataset.toggle);return;}const card=e.target.closest('[data-id]');if(card){selected=card.dataset.id;renderDetails();renderRoster();}});
$('#roster').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.hero-card')){e.preventDefault();selected=e.target.dataset.id;renderDetails();renderRoster();}});
$('#stages').addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(b&&!b.disabled){stage=Number(b.dataset.stage);prepare();openStory(stage,'before','prepare');}});
$('#start').onclick=()=>{if(mode!=='prep'||!lineup.length)return;mode='fight';log('startLog');renderUI();};$('#speed').onclick=()=>{speed=speed===1?2:1;$('#speed').textContent=speed+'×';};$('#pause').onclick=()=>{if(mode==='fight'){paused=!paused;renderUI();}};$('#reset').onclick=()=>{if(mode!=='prep')return;defensePositions={};lineup=[{id:'oak',x:2,y:3},{id:'knight',x:5,y:3},{id:'arrow',x:1,y:5},{id:'sage',x:3,y:5},{id:'ember',x:6,y:5}].filter(p=>OWNED_HEROES.includes(p.id));prepare();};$('#help').onclick=()=>$('#guide').showModal();$('#close-help').onclick=$('#got-it').onclick=()=>$('#guide').close();
// Boot and persistence are owned by lobby.js, after all modules have loaded.
