/* 共享数据：剧情角色、关卡列表与全局进度变量（大厅、剧情、存档共用）。
   战斗已替换为自走棋：规则见 autochess-core.js，画面见 autochess-render.js，界面见 autochess-ui.js。
   旧版棋盘战斗代码保留在 legacy/ 目录，不再加载。 */
'use strict';
// 旧羁绊表只用于兼容 characters.js 的本地化改名；战斗羁绊见 ACData.TRAITS
const TRAITS={guard:{name:'守卫',icon:'♜',desc:''},wild:{name:'林地',icon:'❧',desc:''},ranger:{name:'游侠',icon:'➶',desc:''},arcane:{name:'秘术',icon:'✧',desc:''},dawn:{name:'晨曦',icon:'☀',desc:''}};
const HEROES=[
{id:'oak',name:'橡木卫士',role:'前排 · 护盾',icon:'♜',color:'#d6c68d',bg:'#56603b',hp:1000,atk:48,range:1,interval:1.25,traits:['guard','wild'],type:'shield',skill:'',desc:'',power:200},
{id:'arrow',name:'逐风游侠',role:'后排 · 单体伤害',icon:'➶',color:'#bbd6a1',bg:'#36583e',hp:630,atk:74,range:4,interval:1,traits:['ranger','wild'],type:'damage',skill:'',desc:'',power:250},
{id:'ember',name:'余烬法师',role:'前排 · 范围伤害',icon:'♨',color:'#edb58c',bg:'#704539',hp:570,atk:48,range:3,interval:1.25,traits:['arcane','dawn'],type:'aoe',skill:'',desc:'',power:185},
{id:'sage',name:'苔光医师',role:'后排 · 治疗',icon:'❀',color:'#afdabf',bg:'#396154',hp:650,atk:36,range:3,interval:1.2,traits:['wild','dawn'],type:'heal',skill:'',desc:'',power:280},
{id:'knight',name:'曙光骑士',role:'前排 · 单体伤害',icon:'♞',color:'#e8d5a1',bg:'#645b3c',hp:1050,atk:65,range:1,interval:1.2,traits:['guard','dawn'],type:'damage',skill:'',desc:'',power:230},
{id:'frost',name:'霜语术士',role:'后排 · 范围伤害',icon:'❄',color:'#a9d2df',bg:'#35596c',hp:590,atk:50,range:3,interval:1.25,traits:['arcane','ranger'],type:'aoe',skill:'',desc:'',power:170},
{id:'warden',name:'符石守望',role:'前排 · 护盾',icon:'⬡',color:'#bcb4e2',bg:'#504567',hp:1100,atk:42,range:1,interval:1.3,traits:['guard','arcane'],type:'shield',skill:'',desc:'',power:220},
{id:'moon',name:'月影猎手',role:'后排 · 单体伤害',icon:'☽',color:'#c8b5de',bg:'#514061',hp:610,atk:82,range:3,interval:1.05,traits:['ranger','arcane','wild'],type:'damage',skill:'',desc:'',power:290}
];
const STAGES=[
 {name:'雨夜车站',icon:'☂',enemies:[],scale:1},{name:'观测站夜袭',icon:'♜',enemies:[],scale:1},{name:'沉没档案馆',icon:'◈',enemies:[],scale:1},
 {name:'黎明撤离线',icon:'⚑',enemies:[],scale:1},{name:'海底钟楼',icon:'♛',enemies:[],scale:1}
];
STAGES.forEach((s,i)=>s.mode=(i===1||i===3)?'defense':'expedition');
const BOSS={id:'boss',name:'远古石王',role:'最终 Boss',icon:'♛',color:'#efa284',bg:'#6b3930',hp:2800,atk:100,range:1,interval:1.4,traits:[],type:'aoe',skill:'大地震颤',desc:'',power:125};
const $=s=>document.querySelector(s);
let stage=0,unlocked=0,mode='prep',paused=false,speed=1,selected='oak',battleResult=null;
const def=id=>HEROES.find(h=>h.id===id)||BOSS;
// 档案里的标签显示自走棋羁绊
function heroTags(h){const u=globalThis.ACData?.UNITS[h.id];if(!u)return '';return u.traits.map(t=>'<span class="tag">'+ACData.TRAITS[t].name[{zh:0,en:1,ja:2}[language]]+'</span>').join('');}
