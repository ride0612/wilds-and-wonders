// 把网页版的角色与关卡数据导出给 Godot 版：godot/data/cast.json、godot/data/campaign.json
// 用法：node scripts/export-godot-data.cjs
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const castCtx=vm.createContext({}),src=read('characters.js');
const a=src.indexOf('const STORY_CAST'),b=src.indexOf('\n};',a)+3;
vm.runInContext(src.slice(a,b).replace('const STORY_CAST','STORY_CAST'),castCtx);
const dataCtx=vm.createContext({STORY_CAST:{}});vm.runInContext(read('autochess-data.js'),dataCtx);
const units=vm.runInContext('ACData.UNITS',dataCtx),encounters=vm.runInContext('ACData.ENCOUNTERS',dataCtx);
const cast=Object.entries(castCtx.STORY_CAST).map(([id,h])=>{const u=units[id];return {id,...h,code:u.code,cost:u.cost,hp:u.hp,atk:u.atk,armor:u.armor,range:u.range,mana:u.mana,traits:u.traits};});
const stages=encounters.map((e,i)=>({n:i+1,type:e.boss?'boss':e.waves?'defense':'battle',enemies:(e.enemies||[]).length,waves:e.waves?e.waves.length:0}));
const out=path.join(root,'godot','data');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'cast.json'),JSON.stringify(cast,null,1));
fs.writeFileSync(path.join(out,'campaign.json'),JSON.stringify(stages));
// 自走棋完整数据（剧情角色名称与技能名取自 characters.js）
const D=vm.runInContext('ACData',dataCtx),story=castCtx.STORY_CAST;
const unitsOut={};for(const [id,u] of Object.entries(D.UNITS)){const c=story[id];unitsOut[id]={...u,name:c?c.name:u.name[0],skill:{...u.skill,name:c?c.skill:u.skill.name[0]}};}
const enemiesOut={};for(const [id,e] of Object.entries(D.ENEMIES))enemiesOut[id]={...e,name:e.name[0],skill:e.skill?{...e.skill,name:e.skill.name[0]}:undefined};
const traitsOut={};for(const [id,t] of Object.entries(D.TRAITS))traitsOut[id]={...t,name:t.name[0],desc:t.desc[0]};
const augOut={};for(const [id,a] of Object.entries(D.AUGMENTS))augOut[id]={...a,name:a.name[0],desc:a.desc[0]};
const ac={STAR_MULT:D.STAR_MULT,UNITS:unitsOut,ENEMIES:enemiesOut,TRAITS:traitsOut,AUGMENTS:augOut,MAX_LEVEL:D.MAX_LEVEL,XP_TO_NEXT:D.XP_TO_NEXT,SHOP_ODDS:D.SHOP_ODDS,POOL_SIZE:D.POOL_SIZE,COST_COLORS:D.COST_COLORS,STAR_COLORS:D.STAR_COLORS,ENCOUNTERS:D.ENCOUNTERS,
 REROLL_COST:D.REROLL_COST,XP_COST:D.XP_COST,XP_PER_BUY:D.XP_PER_BUY,BENCH_SIZE:D.BENCH_SIZE,COLS:D.COLS,ROWS:D.ROWS,PLAYER_ROW0:D.PLAYER_ROW0,START_HP:D.START_HP,START_GOLD:D.START_GOLD,AUGMENT_STAGES:D.AUGMENT_STAGES};
fs.writeFileSync(path.join(out,'autochess.json'),JSON.stringify(ac,null,1));
console.log(JSON.stringify({cast:cast.length,stages:stages.length}));
