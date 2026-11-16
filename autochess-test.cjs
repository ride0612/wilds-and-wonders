// 自走棋规则测试：经济、商店、合星、部署、羁绊、存档往返、战斗与 20 关机器人通关模拟。
// 运行：node autochess-test.cjs（不需要浏览器与 WebGL）
const assert=require('node:assert/strict');
const AC=require('./autochess-core.js'),D=AC.Data;
const give=(s,id)=>{s.shop[0]=id;s.pool[id]--;s.gold+=D.UNITS[id].cost;return s.buy(0);};

// 经济与商店
let s=new AC.State(1);
assert.equal(s.shop.length,5);assert.equal(s.gold,D.START_GOLD);assert.equal(s.level,2);
let g=s.gold;assert.ok(s.reroll());assert.equal(s.gold,g-2,'刷新扣 2 金币');
s.gold=35;assert.equal(s.interest(),3);s.gold=80;assert.equal(s.interest(),5,'利息上限 5');
s.gold=4;assert.ok(s.buyXp()>0);assert.equal(s.gold,0);assert.equal(s.level,3);assert.equal(s.xp,2,'经验溢出升级');
assert.deepEqual(s.grantStage(0),{income:0,xp:0},'第一关不发补给');g=s.gold;
assert.ok(s.grantStage(1).income>=5);assert.ok(s.gold>g);assert.equal(s.grantStage(1),null,'同一关只发一次补给');

// 合星
s=new AC.State(2);give(s,'anvil');give(s,'anvil');let r=give(s,'anvil');
assert.equal(r.merges.length,1);assert.equal(r.merges[0].unit.star,2,'三个 1 星合成 2 星');
assert.equal(s.bench.filter(Boolean).length,1);
for(let i=0;i<6;i++)give(s,'anvil');assert.ok(s.bench.some(u=>u&&u.star===3),'九个合成 3 星');
s=new AC.State(3);give(s,'reed');s.move(s.bench[0],{kind:'board',x:2,y:6});give(s,'reed');give(s,'reed');
assert.equal(s.board['2,6'].star,2,'合星结果留在棋盘原位置');
s=new AC.State(4);give(s,'mote');give(s,'mote');for(const id of ['reed','flick','anvil','reed','flick','anvil','kestrel'])give(s,id);
assert.ok(s.bench.every(Boolean),'备战席已满');s.shop[1]='mote';s.gold+=1;assert.ok(s.canBuy(1),'满席仍可买能合成的棋子');
r=s.buy(1);assert.ok(r.ok);assert.equal(r.merges.length,1,'满席购买触发合成');

// 部署与出售
s=new AC.State(5);give(s,'anvil');give(s,'reed');give(s,'mote');
assert.ok(s.move(s.bench[0],{kind:'board',x:3,y:4}));assert.ok(!s.move(s.bench[1],{kind:'board',x:3,y:2}),'不能部署到敌方区域');
s.move(s.bench[1],{kind:'board',x:2,y:4});assert.equal(s.boardCount(),2);
assert.ok(!s.move(s.bench[2],{kind:'board',x:4,y:4}),'超过人口上限被拒绝');
assert.ok(s.move(s.bench[2],{kind:'board',x:3,y:4}),'与棋盘上的单位交换');
g=s.gold;const before=s.pool.anvil,anvil=s.bench.find(u=>u&&u.id==='anvil');assert.equal(s.sell(anvil),1);assert.equal(s.gold,g+1);assert.equal(s.pool.anvil,before+1);

// 羁绊
s=new AC.State(6);s.level=5;for(const id of ['anvil','basalt','aegis','warden','mote'])give(s,id);s.autoPlaceFromBench();
const at=s.activeTraits();assert.equal(at.bulwark,2,'4 个重装激活第 2 档');assert.equal(at.dawn,1);assert.equal(s.traitCounts().arcanist,1);

// 存档往返
s=new AC.State(7);s.level=4;give(s,'ember');give(s,'knight');s.autoPlaceFromBench();s.takeAugment('vital');s.grantStage(0);s.grantStage(1);
const copy=AC.State.fromJSON(JSON.parse(JSON.stringify(s.toJSON())));assert.deepEqual(copy.toJSON(),s.toJSON(),'存档往返一致');
assert.equal(AC.State.fromJSON({v:1,board:{'0,0':{uid:1,id:'anvil',star:1}}}).boardCount(),0,'存档不能把棋子放到敌方区域');
assert.equal(AC.State.fromJSON({v:1,bench:[{uid:1,id:'gacha',star:9}]}).benchCount(),0,'存档忽略未知棋子');

// 战斗：三个 1 星打赢第 1 关；失败扣完整度并发放补给；完整度归零只会过载重置
s=new AC.State(8);s.level=3;for(const id of ['anvil','reed','mote'])give(s,id);s.autoPlaceFromBench();
let res=AC.simulateFight(s,D.ENCOUNTERS[0],AC.makeRng(1));assert.ok(res.won);assert.ok(res.time<45);
s=new AC.State(9);g=s.gold;const loss=s.applyResult(false,3,false);assert.equal(loss.damage,10);assert.equal(s.hp,90);assert.ok(s.gold>g);
s.hp=5;const over=s.applyResult(false,4,true);assert.ok(over.overload);assert.equal(s.hp,D.START_HP);
assert.deepEqual(s.applyResult(false,4,true,true),{damage:0,relief:0,overload:false},'重温关卡不影响经济');
// 分波关卡：所有波次清空才算胜利
s=new AC.State(10);s.level=5;for(const id of ['aegis','helion','solace','ember','knight'])give(s,id);s.autoPlaceFromBench();
const waves=D.ENCOUNTERS.findIndex(e=>e.waves);const b=new AC.Battle();let end=null,waveEvents=0;b.on((t,d)=>{if(t==='finish')end=d;if(t==='wave')waveEvents++;});
b.start(s,D.ENCOUNTERS[waves]);for(let t=0;!end&&t<120;t+=1/30)b.step(1/30);
assert.ok(end&&end.won,'分波关卡可以获胜');assert.equal(waveEvents,D.ENCOUNTERS[waves].waves.length-1,'每一波都会刷新');
// 所有技能类型都能释放且数值有限
for(const id of Object.keys(D.UNITS)){
 const st=new AC.State(11);st.level=2;st.board['3,5']={uid:1,id,star:3};st.board['4,5']={uid:2,id:'anvil',star:1};
 const bt=new AC.Battle();let casts=0;bt.on(t=>{if(t==='cast')casts++;});bt.start(st,D.ENCOUNTERS[5]);
 for(let t=0;t<20&&bt.running;t+=1/30)bt.step(1/30);
 assert.ok(casts>0,id+' 释放技能');assert.ok(bt.units.every(u=>Number.isFinite(u.hp)&&u.hp<=u.maxHp+1e-6),id+' 生命值有效');
}

// 机器人跑完整个战役：每关都能打过，前期不应需要重试
const stats=AC.simulateCampaign(16,4000);
for(const st of stats)assert.ok(st.avgAttempts<12,'第 '+st.stage+' 关可以通过');
assert.ok(stats.slice(0,8).every(st=>st.firstWin>=80),'前 8 关首战胜率不低于 80%');
console.log(stats.map(x=>`${String(x.stage).padStart(2)}: 首战 ${x.firstWin}% · 平均 ${x.avgAttempts} 次 · Lv${x.avgLevel}`).join('\n'));
console.log('PASS: 经济、商店、合星、部署、羁绊、存档、战斗、分波、技能与 20 关模拟');
