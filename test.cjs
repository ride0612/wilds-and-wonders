const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function element(){return {innerHTML:'',textContent:'',hidden:true,children:[],disabled:false,dataset:{},style:{setProperty(){}},classList:{toggle(){},add(){},remove(){},contains(){return false}},setAttribute(){},querySelector(){return element()},focus(){},addEventListener(){},prepend(p){this.children.unshift(p)},append(){},get lastChild(){return {remove:()=>this.children.pop()}},getContext(){return {}},showModal(){this.open=true},close(){this.open=false}}}
const nodes=new Map(),storage=new Map();const context=vm.createContext({console,window:{scrollTo(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{body:element(),documentElement:{},querySelectorAll(){return []},querySelector(s){if(!nodes.has(s))nodes.set(s,element());return nodes.get(s)},createElement:element,createTextNode:s=>s},requestAnimationFrame(){}});
for(const file of ['gacha-data.js','localization.js','combat-text.js','story.js','game.js','characters.js','defense.js','arena.js','campaign.js','presentation.js','protagonist.js','cinematics.js','account.js','gacha.js','campaign-expansion.js','skill-fx.js','music.js','lobby.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const run=s=>vm.runInContext(s,context);
assert.equal(run("$('#protagonist-dialog').open"),true);
assert.equal(run("$('#protagonist-confirm').disabled"),true);
run("$('#protagonist-female').onclick();confirmProtagonist()");
assert.equal(run('protagonist'),'female');
assert.equal(run('featureProtagonist'),true);
assert.equal(run('HEROES.length'),8);
assert.equal(run('STAGES.length'),20);
assert.equal(run('HEROES.every(h=>h.traits.length>=1&&h.traits.length<=3)'),true);
assert.equal(run("traitCounts(['oak','oak']).guard"),1);
assert.equal(run("alive('blue')[0].maxHp"),1180);
assert.equal(run("alive('blue')[0].shield"),180);
run("units=[createUnit('knight','blue',2,3),createUnit('oak','red',2,2)];mode='fight';tick(.05)");
assert.equal(run('units[0].mana'),0);
run('tick(.3)');assert.equal(run('units[0].mana'),25);
run("units=[createUnit('moon','blue',1,3),createUnit('boss','red',1,2)];units[0].mana=75;units[0].cooldown=0;mode='fight';tick(.05)");
assert.equal(run('units[0].mana'),0);assert.equal(run('units[1].hp'),2800-82-290);
run("units=[createUnit('sage','blue',1,3),createUnit('oak','blue',1,4),createUnit('boss','red',1,2)];units[1].hp=100;cast(units[0],units[2])");assert.equal(run('units[1].hp'),380);
run("units=[createUnit('oak','blue',1,3),createUnit('boss','red',1,2)];cast(units[0],units[1]);damage(units[0],150)");assert.equal(run('units[0].hp'),1000);assert.equal(run('units[0].shield'),50);
run("units=[createUnit('ember','blue',1,3),createUnit('oak','red',1,2),createUnit('arrow','red',2,2),createUnit('sage','red',4,0)];cast(units[0],units[1])");assert.equal(run('units[1].hp'),815);assert.equal(run('units[2].hp'),445);assert.equal(run('units[3].hp'),650);
run("units=[createUnit('oak','blue',1,4),createUnit('sage','blue',1,3),createUnit('boss','red',1,0)]");assert.equal(run('nextStep(units[0],units[2]).y'),4);assert.notEqual(run('nextStep(units[0],units[2]).x'),1);
run("prepare();mode='fight';paused=true;tick(1)");assert.equal(run('elapsed'),0);
for(let i=0;i<20;i++){run(`stage=${i};prepare();mode='fight';for(let k=0;k<3601&&mode==='fight';k++)tick(.05)`);const result=run('({stage:stage+1,result:mode,time:Math.round(elapsed),survivors:alive("blue").length,core:siege?.core})');console.log(result);assert.equal(result.result,'win');assert.equal(run('units.every(u=>Number.isFinite(u.hp)&&u.hp>=0&&u.hp<=u.maxHp)'),true);assert.equal(run('new Set(units.filter(u=>u.hp>0&&!u.raider).map(u=>u.x+","+u.y)).size===units.filter(u=>u.hp>0&&!u.raider).length'),true);}
console.log('PASS: roster, traits, mana, skills, shields, pathfinding, pause, twenty-stage simulation');
for(const locale of ['zh','en','ja']){
 run(`language='${locale}'`);
 assert.equal(run('Object.keys(TEXT).every(key=>typeof tr(key)==="string"&&tr(key).length>0)'),true);
 assert.equal(run('HEROES.every(h=>heroText(h).name&&heroText(h).desc&&heroText(h).quote)'),true);
 assert.equal(run('STORY[language].every(c=>c.goal&&c.before.text&&c.before.line&&c.after.text&&c.after.line)'),true);
 assert.equal(run('STORY[language].length'),20);
}
run("stage=0;cleared=[];unlocked=0;prepare();finish(false)");assert.equal(run('cleared.length'),0);
run("finish(true);openStory(0,'after','advance');completeStory()");assert.equal(run('stage'),1);assert.equal(run('storyScene.part'),'before');assert.equal(run('mode'),'prep');
run("finish(true);saveProfile();cleared=[]");assert.equal(run('loadProfile().win'),true);assert.equal(run('loadProfile().survivors'),5);
run("completeStory();mode='fight';showView('lobby');tick(1)");assert.equal(run('elapsed'),0);assert.equal(run('paused'),true);
run("mode='prep';language='ja';displayHero='moon';saveProfile();language='en';displayHero='oak';cleared=[];loadProfile()");assert.equal(run('language'),'ja');assert.equal(run('displayHero'),'moon');assert.equal(run('unlocked'),2);
run("localStorage.setItem(SAVE_KEY,JSON.stringify({version:2,language:'invalid',displayHero:'boss',stage:99,cleared:[4],lineup:[{id:'boss',x:99,y:0}]}));language='zh';displayHero='oak';cleared=[];unlocked=0;stage=0;loadProfile()");assert.equal(run('language'),'zh');assert.equal(run('displayHero'),'oak');assert.equal(run('stage'),0);assert.equal(run('lineup.every(p=>p.id!=="boss")'),true);
console.log('PASS: three locales, all story chapters, story progression, camp pause, saved preferences, invalid save validation');

// Defense rules must hold even when enemies leak or a wave has not spawned yet.
run("stage=1;prepare();mode='fight';tick(.05)");assert.equal(run('mode'),'fight');
assert.equal(run('siege.wave'),0);
run("siege.wave=1;siege.remaining=0;siege.breakTimer=3;tick(.05)");assert.equal(run('mode'),'fight');
run("siege.wave=siege.total;siege.remaining=1;tick(.05)");assert.equal(run('mode'),'fight');
run("prepare();mode='fight';siege.wave=1;siege.remaining=0;siege.core=18;spawnInvader();siege.remaining=0;units.at(-1).progress=DEFENSE_PATH.length-1;units.filter(u=>u.team==='blue').forEach(u=>u.cooldown=99);tick(.05)");
assert.equal(run('mode'),'lose');assert.equal(run('siege.core'),0);assert.equal(run('siege.leaks'),1);
assert.equal(run('battleResult.core'),0);
run("prepare();mode='fight';siege.wave=1;siege.remaining=1;spawnInvader();const raider=units.at(-1);raider.progress=2;raider.cooldown=0;raider.mana=75;tick(.05)");
assert.equal(run('raider.mana'),0);assert.equal(run('raider.castFlash>0'),true);
run("prepare();mode='fight';const fixedPads=JSON.stringify(alive('blue').map(u=>[u.x,u.y]));for(let i=0;i<240;i++)tick(.05)");
assert.equal(run("JSON.stringify(alive('blue').map(u=>[u.x,u.y]))===fixedPads"),true);
assert.equal(run("moveDeployment('oak',0,2)"),false);
run("prepare();const expeditionFormation=JSON.stringify(lineup);const oldOak={...defensePositions.oak},oldKnight={...defensePositions.knight};moveDeployment('oak',oldKnight.x,oldKnight.y)");
assert.equal(run('JSON.stringify(defensePositions.knight)===JSON.stringify(oldOak)'),true);
assert.equal(run('JSON.stringify(lineup)===expeditionFormation'),true);
assert.equal(run("moveDeployment('oak',0,1)"),false);
run("saveProfile();defensePositions={};loadProfile()");
assert.equal(run('JSON.stringify(defensePositions.oak)===JSON.stringify(oldKnight)'),true);
run('stage=0;prepare()');assert.equal(run('siege'),null);
assert.equal(run('JSON.stringify(lineup)===expeditionFormation'),true);
for(let y=0;y<6;y++)for(let x=0;x<8;x++)assert.equal(run(`JSON.stringify(boardCell(center(${x},${y})))`),JSON.stringify({x,y}));
assert.equal(run("openCampaign('unannounced-02')"),false);
run("mode='fight';showCampaignLibrary();const libraryTime=elapsed;tick(1)");
assert.equal(run('paused&&elapsed===libraryTime'),true);

console.log('PASS: wave gates, core destruction, stationary defense, legal pads, swaps, saved formations, projection and chapter locks');
assert.equal(run('HEROES.every(h=>[4,5,6].includes(h.stars))'),true);
assert.equal(run('HEROES.filter(h=>h.stars===6).length'),2);
run("showView('adventure');stage=0;prepare();mode='fight';clearUltimate();cast(units.find(u=>u.id==='knight'&&u.team==='blue'),alive('red')[0])");
assert.equal(run('ultimateActive.id'),'knight');assert.equal(run("$('#ultimate-overlay').hidden"),false);
run("triggerUltimate(createUnit('moon','blue',1,4))");assert.equal(run('ultimateQueue.length'),1);
run('tickPresentation(3.3)');assert.equal(run('ultimateActive.id'),'moon');
run('paused=true;tickPresentation(2)');assert.equal(run('ultimateActive.time'),0);
run('paused=false;tickPresentation(3.3)');assert.equal(run('ultimateActive'),null);
run("triggerUltimate(createUnit('ember','blue',1,4))");assert.equal(run('ultimateActive'),null);
run("presentationSettings.effects=false;triggerUltimate(createUnit('knight','blue',1,4));saveProfile();presentationSettings.effects=true;loadProfile()");assert.equal(run('presentationSettings.effects'),false);
run('presentationSettings.effects=true;prepare()');assert.equal(run('ultimateQueue.length'),0);
console.log('PASS: character rarities, six-star cast trigger, simultaneous cast queue, pause, lower rarity effects and saved cinematic preference');

run("showView('adventure');stage=0;prepare();mode='fight';triggerUltimate(createUnit('knight','blue',1,4));triggerUltimate(createUnit('knight','blue',1,4))");
assert.equal(run('ultimateQueue.length'),0);
run("clearUltimate();triggerUltimate(createUnit('knight','blue',1,4))");assert.equal(run('ultimateActive'),null);
run("triggerUltimate(createUnit('knight','red',1,0))");assert.equal(run('ultimateActive.team'),'red');
run("clearUltimate();showView('lobby');showView('adventure');triggerUltimate(createUnit('knight','blue',1,4))");assert.equal(run('ultimateActive'),null);
run("prepare();mode='fight';triggerUltimate(createUnit('knight','blue',1,4))");assert.equal(run('ultimateActive.id'),'knight');assert.equal(run('ultimateActive.duration'),3.2);
for(const locale of ['zh','en','ja']){
 run(`language='${locale}'`);
 for(let i=0;i<20;i++)for(const part of ['before','after']){
  assert.ok(run(`cinematicShots(${i},'${part}').length`)>=6);
  assert.equal(run(`cinematicShots(${i},'${part}').every(s=>s.text&&(!s.speaker||s.speaker==='protagonist'||OWNED_HEROES.includes(s.speaker)))`),true);
 }
}
run("stage=0;unlocked=4;cleared=[0,1,2,3,4];prepare();openStory(0,'before','read');nextCinematic()");
assert.equal(run('cinema.shot'),0);assert.equal(run('cinema.chars>0'),true);
run('nextCinematic()');assert.equal(run('cinema.shot'),1);
run("$('#cinema-back').onclick()");assert.equal(run('cinema.shot'),0);
run("$('#cinema-auto').onclick();revealCinematic();tickCinematic(30)");assert.equal(run('cinema.shot'),1);
run('setLanguage("en")');assert.equal(run('cinema.shot'),1);assert.equal(run('cinema.chars'),0);
run('completeStory()');assert.equal(run('stage'),0);assert.equal(run('cinema'),null);
run("openStory(0,'before','read');dismissCinematic();tickCinematic(60)");assert.equal(run('cinema'),null);
console.log('PASS: once-per-team/hero cinematics, encounter reset, 120 localized cutscenes, reveal/next/back/auto/locale, replay and cleanup');

run("protagonist=null;openProtagonistPicker();pendingProtagonist='invalid';confirmProtagonist()");assert.equal(run('protagonist'),null);
run("pendingProtagonist='male';confirmProtagonist();saveProfile();protagonist=null;featureProtagonist=false;loadProfile()");assert.equal(run('protagonist'),'male');assert.equal(run('featureProtagonist'),true);
run("const progressBefore=JSON.stringify({stage,cleared,lineup});openProtagonistPicker();pendingProtagonist='female';confirmProtagonist()");
assert.equal(run('JSON.stringify({stage,cleared,lineup})===progressBefore'),true);
assert.equal(run("$('#display-art').dataset.hero"),'protagonist-female');
for(const locale of ['zh','en','ja']){run(`language='${locale}';openStory(0,'before','read');cinema.shot=6;renderCinematic();revealCinematic()`);assert.equal(run("$('#cinema-right').src"),'assets/characters/protagonist-female-v2.png');assert.equal(run("$('#story-dialogue').textContent.length>0"),true);run('dismissCinematic()');}
run("localStorage.setItem(SAVE_KEY,JSON.stringify({version:2,protagonist:'bad',stage:2,cleared:[0,1]}));loadProfile()");assert.equal(run('protagonist'),null);assert.equal(run('stage'),2);assert.equal(run('cleared.length'),2);
console.log('PASS: explicit protagonist choice, both variants, save/reload, old-save migration, progress retention and localized story portraits');

// The starting duo must clear the opener even before using the free recruitment tickets.
run("lineup=[{id:'oak',x:2,y:3},{id:'arrow',x:1,y:5}];stage=0;prepare();mode='fight';for(let k=0;k<2401&&mode==='fight';k++)tick(.05)");
assert.equal(run('mode'),'win','starter duo opener');
// Every possible worst-case limited pool collection (duo, Moon, one five-star) remains playable.
for(const five of ['ember','sage','frost','warden'])for(let i=0;i<20;i++){
 run(`lineup=[{id:'oak',x:2,y:3},{id:'${five}',x:5,y:4},{id:'arrow',x:1,y:5},{id:'moon',x:3,y:5}];defensePositions={};stage=${i};prepare();mode='fight';for(let k=0;k<3601&&mode==='fight';k++)tick(.05)`);
 assert.equal(run('mode'),'win',five+' minimum collection stage '+(i+1));
}
console.log('PASS: starter duo and all 80 worst-case limited collection encounters');

