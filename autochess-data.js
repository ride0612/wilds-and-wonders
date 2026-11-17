/* 自走棋静态数据：棋子、敌人、羁绊、强化、20 关遭遇。所有数值集中在这里，方便调平衡。
   由 autochess_demo/scripts/data.gd 移植，并加入八位剧情角色与分波守点关卡。 */
(function(global){
'use strict';
const STAR_MULT=[1,1,1.8,3.24]; // 下标 = 星级

// skill.type:
//   shield_self 自身护盾        shield_near 自身与最近友军护盾   team_shield 全队护盾
//   pierce      直线穿透        aoe         目标处范围伤害(弹道)  nova   目标周围伤害(+控制)
//   strike      单体连斩        snipe       单体重击(远程)        slam   自身周围伤害+眩晕
//   multi       多目标齐射      blink       闪现到最弱敌人身边    meteor 敌人最密集处大范围
//   heal        治疗最虚弱友军及其周围
const UNITS={
 anvil:{name:['铁砧','Anvil','アンヴィル'],code:'U-01',cost:1,traits:['bulwark','dawn'],hp:750,atk:50,range:1,as:.65,armor:40,mana:80,startMana:30,
  skill:{name:['铁砧壁垒','Anvil Bulwark','鉄砧の防壁'],type:'shield_self',values:[0,300,450,700],desc:'展开塔盾，获得 {v} 点护盾。'}},
 reed:{name:['芦笛','Reed','リード'],code:'U-02',cost:1,traits:['marksman','echo'],hp:500,atk:55,range:4,as:.75,armor:15,mana:60,startMana:0,
  skill:{name:['穿林矢','Piercing Shot','穿林の矢'],type:'pierce',values:[0,220,330,500],desc:'射出贯穿箭矢，对直线上所有敌人造成 {v} 点伤害。'}},
 mote:{name:['星屑','Mote','モート'],code:'U-03',cost:1,traits:['arcanist','dawn'],hp:480,atk:40,range:3,as:.65,armor:15,mana:50,startMana:20,
  skill:{name:['星屑坠落','Stardust Fall','星屑落とし'],type:'aoe',values:[0,200,300,450],radius:1.3,desc:'召唤星屑砸向目标，对周围敌人造成 {v} 点伤害。'}},
 flick:{name:['疾刃','Flick','フリック'],code:'U-04',cost:1,traits:['striker','echo'],hp:600,atk:60,range:1,as:.8,armor:25,mana:50,startMana:0,
  skill:{name:['回旋双刃','Twin Whirl','旋回双刃'],type:'strike',values:[0,250,375,560],desc:'高速连斩当前目标，造成 {v} 点伤害。'}},
 basalt:{name:['磐岩','Basalt','バサルト'],code:'U-05',cost:2,traits:['bulwark','echo'],hp:900,atk:60,range:1,as:.6,armor:45,mana:90,startMana:40,
  skill:{name:['地裂重拳','Faultline Fist','地裂の重拳'],type:'slam',values:[0,150,225,340],radius:1.6,stun:1.5,desc:'重击地面，对周围敌人造成 {v} 点伤害并眩晕 1.5 秒。'}},
 bell:{name:['霜铃','Bell','ベル'],code:'U-06',cost:2,traits:['arcanist','echo'],hp:550,atk:45,range:3,as:.7,armor:15,mana:70,startMana:20,
  skill:{name:['霜铃回响','Frostbell Echo','霜鈴の残響'],type:'nova',values:[0,250,375,560],radius:1.5,stun:.8,fx:'frost',desc:'摇响冰铃，对目标周围敌人造成 {v} 点伤害并冻结 0.8 秒。'}},
 kestrel:{name:['鹞','Kestrel','ケストレル'],code:'U-07',cost:2,traits:['marksman','dawn'],hp:580,atk:70,range:4,as:.7,armor:15,mana:60,startMana:0,
  skill:{name:['鹞群齐射','Kestrel Volley','鷂の斉射'],type:'multi',values:[0,180,270,400],count:4,desc:'同时射击最近的 4 个敌人，各造成 {v} 点伤害。'}},
 umbra:{name:['影','Umbra','アンブラ'],code:'U-08',cost:2,traits:['striker','dawn'],hp:650,atk:65,range:1,as:.85,armor:25,mana:60,startMana:10,
  skill:{name:['影袭','Shadow Raid','影襲'],type:'blink',values:[0,300,450,700],desc:'闪现到生命最低的敌人身边，造成 {v} 点伤害。'}},
 solace:{name:['曜','Solace','ソレイス'],code:'U-09',cost:3,traits:['arcanist','dawn'],hp:700,atk:55,range:3,as:.7,armor:20,mana:90,startMana:30,
  skill:{name:['曜日陨星','Solar Meteor','曜日の隕星'],type:'meteor',values:[0,400,600,1200],radius:2,desc:'向敌人最密集处降下陨星，范围内造成 {v} 点伤害。'}},
 helion:{name:['赫','Helion','ヘリオン'],code:'U-10',cost:3,traits:['marksman','striker'],hp:700,atk:85,range:4,as:.7,armor:20,mana:80,startMana:0,
  skill:{name:['赫光电磁炮','Helion Railgun','赫光レールガン'],type:'pierce',values:[0,500,750,1500],width:.7,desc:'发射电磁炮，贯穿直线上所有敌人，造成 {v} 点伤害。'}},
 aegis:{name:['圣盾','Aegis','イージス'],code:'U-11',cost:3,traits:['bulwark','dawn'],hp:1100,atk:65,range:1,as:.65,armor:55,mana:100,startMana:50,
  skill:{name:['六棱圣域','Hex Sanctum','六稜の聖域'],type:'team_shield',values:[0,200,300,550],desc:'为全体友军提供 {v} 点护盾。'}},
 // —— 剧情协作者：沿用主线存档里的角色 ID，名称与技能名取自 characters.js ——
 warden:{story:true,code:'S-01',cost:1,traits:['bulwark','echo'],hp:720,atk:46,range:1,as:.65,armor:38,mana:80,startMana:30,
  skill:{type:'shield_near',values:[0,220,330,520],count:2,desc:'展开二重结界，为自身及最近两名友军施加 {v} 点护盾。'}},
 arrow:{story:true,code:'S-02',cost:1,traits:['marksman','dawn'],hp:500,atk:52,range:4,as:.75,armor:15,mana:60,startMana:0,
  skill:{type:'snipe',values:[0,250,375,560],desc:'八卦炉全功率照射极限火花，对当前目标造成 {v} 点伤害。'}},
 oak:{story:true,code:'S-03',cost:1,traits:['bulwark','arcanist'],hp:780,atk:48,range:1,as:.6,armor:40,mana:90,startMana:30,
  skill:{type:'shield_near',values:[0,200,300,480],count:2,desc:'运转七彩之气，为自身及最近两名友军施加 {v} 点护盾。'}},
 frost:{story:true,code:'S-04',cost:2,traits:['arcanist','marksman'],hp:560,atk:50,range:3,as:.7,armor:15,mana:70,startMana:20,
  skill:{type:'nova',values:[0,230,345,520],radius:1.5,stun:.5,fx:'frost',desc:'释放完美冻结，对目标周围敌人造成 {v} 点伤害并冻结 0.5 秒。'}},
 knight:{story:true,code:'S-05',cost:2,traits:['striker','dawn'],hp:780,atk:68,range:1,as:.8,armor:30,mana:60,startMana:10,
  skill:{type:'strike',values:[0,320,480,740],desc:'瞬步突进，以现世斩连斩当前目标造成 {v} 点伤害。'}},
 sage:{story:true,code:'S-06',cost:2,traits:['arcanist','echo'],hp:560,atk:40,range:3,as:.7,armor:15,mana:80,startMana:30,
  skill:{type:'heal',values:[0,280,420,650],radius:1.6,desc:'调配蓬莱之药，治疗生命比例最低的友军 {v} 点，并为其周围友军恢复一半。'}},
 ember:{story:true,code:'S-07',cost:3,traits:['striker','arcanist'],hp:820,atk:80,range:1,as:.8,armor:30,mana:80,startMana:20,
  skill:{type:'nova',values:[0,380,570,1100],radius:1.7,fx:'fire',desc:'挥舞莱瓦汀，烈焰覆盖目标区域，对周围敌人造成 {v} 点伤害。'}},
 moon:{story:true,code:'S-08',cost:3,traits:['marksman','echo'],hp:620,atk:88,range:4,as:.72,armor:15,mana:70,startMana:0,
  skill:{type:'snipe',values:[0,520,780,1500],pick:'weakest',desc:'停止时间布下飞刀，对生命最低的敌人造成 {v} 点伤害。'}}
};

const ENEMIES={
 crawler:{name:['蚀爬虫','Crawler','侵蝕クローラー'],en:'CRAWLER',code:'E-01',hp:460,atk:38,range:1,as:.8,armor:10,mana:0,shape:'crawler',size:1},
 spitter:{name:['蚀喷射体','Spitter','侵蝕スピッター'],en:'SPITTER',code:'E-02',hp:380,atk:44,range:3,as:.7,armor:5,mana:0,shape:'spitter',size:1},
 drone:{name:['蚀化无人机','Corrupted Drone','侵蝕ドローン'],en:'DRONE',code:'E-03',hp:300,atk:30,range:3,as:1.15,armor:0,mana:0,shape:'drone',size:.85},
 brute:{name:['蚀巨躯','Brute','侵蝕ブルート'],en:'BRUTE',code:'E-04',hp:1150,atk:68,range:1,as:.55,armor:35,mana:0,shape:'brute',size:1.25},
 shade:{name:['蚀影','Shade','侵蝕シェイド'],en:'SHADE',code:'E-05',hp:520,atk:62,range:1,as:1,armor:15,mana:70,shape:'shade',size:.95,
  skill:{name:['潜袭','Ambush','潜襲'],type:'blink',values:[0,220,220,220]}},
 mimic:{name:['相位拟态','Phase Mimic','位相ミミック'],en:'MIMIC',code:'E-06',hp:1250,atk:58,range:3,as:.7,armor:20,mana:80,shape:'mimic',size:1.15,
  skill:{name:['伪造回声','Forged Echo','偽りの残響'],type:'nova',values:[0,180,180,180],radius:1.5,stun:.6,fx:'void'}},
 gatekeeper:{name:['裂隙守门者','Rift Gatekeeper','裂隙の門番'],en:'GATEKEEPER',code:'B-01',hp:3600,atk:95,range:1,as:.6,armor:45,mana:100,shape:'boss1',size:1.9,boss:true,
  skill:{name:['裂隙震荡','Rift Quake','裂隙震動'],type:'slam',values:[0,260,260,260],radius:2.2,stun:1.2}},
 amalgam:{name:['污染聚合体','Tainted Amalgam','汚染集合体'],en:'AMALGAM',code:'B-02',hp:4400,atk:80,range:3,as:.7,armor:35,mana:80,shape:'boss3',size:1.9,boss:true,
  skill:{name:['样本喷发','Sample Burst','サンプル噴出'],type:'multi',values:[0,210,210,210],count:5}},
 shell:{name:['总控外壳','Control Shell','総制御外殻'],en:'CONTROL SHELL',code:'B-03',hp:5600,atk:105,range:1,as:.6,armor:60,mana:110,shape:'boss4',size:2,boss:true,
  skill:{name:['地址拼接','Address Splice','アドレス接合'],type:'team_shield',values:[0,260,260,260]}},
 core:{name:['寂蚀索引终端','Erosion Index Terminal','寂蝕インデックス端末'],en:'INDEX TERMINAL',code:'B-04',hp:7200,atk:120,range:2,as:.6,armor:50,mana:90,shape:'boss2',size:2.2,boss:true,
  skill:{name:['归零脉冲','Null Pulse','ゼロ化パルス'],type:'meteor',values:[0,380,380,380],radius:2.6}}
};

// thresholds 与 values 一一对应
const TRAITS={
 bulwark:{name:['重装','Bulwark','重装'],en:'BULWARK',code:'BLW',thresholds:[2,4],values:[300,650],desc:['重装单位最大生命 +{v}','Bulwark units gain +{v} max HP','重装ユニットの最大HP +{v}']},
 marksman:{name:['锐射','Marksman','鋭射'],en:'MARKSMAN',code:'MRK',thresholds:[2,4],values:[30,70],desc:['锐射单位攻击速度 +{v}%','Marksman units gain +{v}% attack speed','鋭射ユニットの攻撃速度 +{v}%']},
 arcanist:{name:['源术','Arcanist','源術'],en:'ARCANIST',code:'ARC',thresholds:[2,4],values:[20,45],desc:['全体友军技能伤害 +{v}%','All allies deal +{v}% skill damage','味方全員のスキルダメージ +{v}%']},
 striker:{name:['迅袭','Striker','迅襲'],en:'STRIKER',code:'STK',thresholds:[2,4],values:[25,50],desc:['迅袭单位暴击率 +{v}%，暴击伤害提升','Striker units gain +{v}% crit chance and stronger crits','迅襲ユニットの会心率 +{v}%、会心ダメージ上昇']},
 dawn:{name:['晨星','Dawnstar','暁星'],en:'DAWNSTAR',code:'DWN',thresholds:[2,4,6],values:[150,350,600],desc:['开战时全体友军获得 {v} 点护盾','All allies start combat with {v} shield','開戦時、味方全員に{v}のシールド']},
 echo:{name:['回响','Echo','残響'],en:'ECHO',code:'ECH',thresholds:[2,4,6],values:[20,45,70],desc:['回响单位施法后返还 {v} 点法力','Echo units refund {v} mana after casting','残響ユニットは発動後にマナを{v}回復']}
};

const AUGMENTS={
 fund:{name:['资金注入','Funding','資金注入'],en:'FUNDING',desc:['立即获得 12 金币。','Gain 12 gold now.','即座に12ゴールド獲得。'],icon:'◆'},
 power:{name:['战术强化','Tactical Boost','戦術強化'],en:'TACTICAL BOOST',desc:['全体友军攻击力 +15%。','All allies gain +15% attack.','味方全員の攻撃力 +15%。'],icon:'▲'},
 vital:{name:['生体增幅','Bio Amplifier','生体増幅'],en:'BIO AMPLIFIER',desc:['全体友军最大生命 +18%。','All allies gain +18% max HP.','味方全員の最大HP +18%。'],icon:'✚'},
 overclock:{name:['超频核心','Overclock','オーバークロック'],en:'OVERCLOCK',desc:['全体友军攻击速度 +15%。','All allies gain +15% attack speed.','味方全員の攻撃速度 +15%。'],icon:'≫'},
 precast:{name:['预载协议','Preload','プリロード'],en:'PRELOAD',desc:['全体友军开战时额外获得 25 点法力。','All allies start combat with +25 mana.','味方全員が開戦時にマナ+25。'],icon:'◎'},
 regen:{name:['纳米修复群','Nano Repair','ナノ修復群'],en:'NANO REPAIR',desc:['全体友军每秒回复 2% 最大生命。','All allies restore 2% max HP each second.','味方全員が毎秒最大HPの2%を回復。'],icon:'✦'},
 interest:{name:['复利账户','Compound','複利口座'],en:'COMPOUND',desc:['每关额外获得 2 金币。','Gain 2 extra gold every stage.','ステージごとに追加で2ゴールド。'],icon:'％'},
 training:{name:['加速训练','Accelerated Training','加速訓練'],en:'ACCEL TRAINING',desc:['立即获得 6 点经验，之后每关额外 +1 经验。','Gain 6 XP now and +1 XP every stage.','即座に経験値6、以後ステージごとに+1。'],icon:'↑'}
};

const MAX_LEVEL=8;
const XP_TO_NEXT={1:2,2:2,3:6,4:10,5:18,6:28,7:40};
const SHOP_ODDS={1:[100,0,0],2:[100,0,0],3:[75,25,0],4:[55,35,10],5:[40,40,20],6:[25,45,30],7:[20,35,45],8:[15,35,50]}; // 等级 -> [1费,2费,3费]
const POOL_SIZE={1:18,2:15,3:12};
const COST_COLORS={1:'#8e959c',2:'#2fb5a3',3:'#e6a817'};
const STAR_COLORS={1:'#c4cad1',2:'#ffd23f',3:'#6fe6ff'};

// 20 关遭遇。每个敌人：[id, 列, 行, 强度倍率]；带 waves 的是分波守点关。
const E=(m,...list)=>list.map(([id,c,r])=>[id,c,r,m]);
const ENCOUNTERS=[
 {enemies:E(.66,['crawler',2,2],['crawler',4,2])},
 {waves:[E(.7,['crawler',2,2],['crawler',4,2]),E(.74,['crawler',1,1],['crawler',5,1],['spitter',3,0])]},
 {enemies:E(.9,['drone',1,1],['drone',3,0],['drone',5,1],['crawler',2,3],['crawler',4,3])},
 {waves:[E(1,['crawler',1,3],['crawler',3,3],['crawler',5,3]),E(1.04,['crawler',2,2],['crawler',4,2],['spitter',2,0],['spitter',4,0])]},
 {boss:true,enemies:[['gatekeeper',3,2,1.18],...E(1.25,['crawler',1,3],['crawler',5,3])]},
 {enemies:E(1.42,['brute',3,3],['drone',1,1],['drone',5,1],['crawler',1,3],['crawler',5,3],['spitter',3,0])},
 {waves:[E(1.5,['crawler',1,3],['crawler',3,3],['crawler',5,3],['spitter',3,1]),E(1.56,['brute',3,2],['spitter',1,0],['spitter',5,0],['shade',6,2])]},
 {enemies:E(1.68,['mimic',3,1],['brute',2,3],['brute',4,3],['spitter',1,0],['spitter',5,0])},
 {waves:[E(1.76,['brute',2,3],['brute',4,3],['spitter',3,0]),E(1.8,['shade',0,2],['shade',6,2],['crawler',2,3],['crawler',4,3],['spitter',3,0]),E(1.84,['brute',3,2],['drone',1,0],['drone',5,0])]},
 {boss:true,enemies:[['amalgam',3,1,1.5],...E(1.9,['brute',2,3],['brute',4,3],['crawler',0,3],['crawler',6,3])]},
 {enemies:E(2.0,['brute',1,3],['brute',5,3],['shade',0,1],['shade',6,1],['spitter',2,0],['spitter',4,0],['mimic',3,2])},
 {waves:[E(2.16,['brute',2,3],['brute',4,3],['spitter',1,0],['spitter',5,0]),E(2.22,['shade',1,2],['shade',5,2],['mimic',3,1],['drone',0,0],['drone',6,0]),E(2.28,['brute',3,3],['crawler',1,3],['crawler',5,3],['spitter',3,0])]},
 {boss:true,enemies:[['mimic',3,1,3.1],...E(2.36,['shade',1,2],['shade',5,2],['brute',2,3],['brute',4,3])]},
 {enemies:E(2.2,['mimic',2,1],['mimic',4,1],['brute',1,3],['brute',3,3],['brute',5,3],['shade',0,2],['shade',6,2])},
 {waves:[E(2.38,['brute',1,3],['brute',3,3],['brute',5,3],['spitter',2,0],['spitter',4,0]),E(2.44,['shade',0,2],['shade',3,2],['shade',6,2],['mimic',3,0],['drone',1,0],['drone',5,0]),E(2.5,['brute',2,3],['brute',4,3],['mimic',3,1],['spitter',1,0],['spitter',5,0])]},
 {boss:true,enemies:[['shell',3,2,1.6],...E(2.5,['brute',1,3],['brute',5,3],['spitter',2,0],['spitter',4,0],['mimic',3,0])]},
 {waves:[E(2.36,['brute',2,3],['brute',4,3],['shade',0,2],['shade',6,2],['spitter',3,0]),E(2.4,['mimic',2,1],['mimic',4,1],['crawler',1,3],['crawler',3,3],['crawler',5,3]),E(2.44,['brute',1,3],['brute',3,3],['brute',5,3],['drone',2,0],['drone',4,0])]},
 {enemies:E(2.46,['brute',1,3],['brute',3,3],['brute',5,3],['shade',0,1],['shade',6,1],['shade',3,2],['mimic',2,0],['mimic',4,0],['spitter',3,0])},
 {waves:[E(2.48,['brute',2,3],['brute',4,3],['mimic',3,1],['spitter',1,0],['spitter',5,0]),E(2.52,['shade',0,2],['shade',2,2],['shade',4,2],['shade',6,2],['mimic',3,0]),E(2.56,['brute',1,3],['brute',3,3],['brute',5,3],['mimic',2,1],['mimic',4,1],['spitter',3,0])]},
 {boss:true,enemies:[['core',3,1,1.3],...E(2.36,['brute',2,3],['brute',4,3],['mimic',1,1],['mimic',5,1],['spitter',0,0],['spitter',6,0])]}
];

const ACData={STAR_MULT,UNITS,ENEMIES,TRAITS,AUGMENTS,MAX_LEVEL,XP_TO_NEXT,SHOP_ODDS,POOL_SIZE,COST_COLORS,STAR_COLORS,ENCOUNTERS,
 REROLL_COST:2,XP_COST:4,XP_PER_BUY:4,BENCH_SIZE:9,COLS:7,ROWS:8,PLAYER_ROW0:4,START_HP:100,START_GOLD:6,
 AUGMENT_STAGES:[1,5,9,13,17], // 0 起的关卡序号：进入备战时三选一
 unitIdsOfCost(cost){return Object.keys(UNITS).filter(id=>UNITS[id].cost===cost);},
 traitLevel(id,count){let lv=0;TRAITS[id].thresholds.forEach((t,i)=>{if(count>=t)lv=i+1;});return lv;},
 encounterEnemies(enc){return enc.waves?enc.waves.flat():enc.enemies;}
};
global.ACData=ACData;if(typeof module!=='undefined')module.exports=ACData;
})(globalThis);
