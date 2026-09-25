const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function element(){return {innerHTML:'',textContent:'',hidden:true,children:[],disabled:false,dataset:{},style:{setProperty(){}},classList:{toggle(){},add(){}},setAttribute(){},querySelector(){return element()},focus(){},addEventListener(){},prepend(p){this.children.unshift(p)},append(){},get lastChild(){return {remove:()=>this.children.pop()}},getContext(){return {}},showModal(){this.open=true},close(){this.open=false}}}
const nodes=new Map(),storage=new Map();const context=vm.createContext({console,window:{scrollTo(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{documentElement:{},querySelectorAll(){return []},querySelector(s){if(!nodes.has(s))nodes.set(s,element());return nodes.get(s)},createElement:element,createTextNode:s=>s},requestAnimationFrame(){}});
for(const file of ['localization.js','story.js','game.js','lobby.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const run=s=>vm.runInContext(s,context);
assert.equal(run('HEROES.length'),8);
assert.equal(run('STAGES.length'),5);
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
for(let i=0;i<5;i++){run(`stage=${i};prepare();mode='fight';for(let k=0;k<2401&&mode==='fight';k++)tick(.05)`);const result=run('({stage:stage+1,result:mode,time:Math.round(elapsed),survivors:alive("blue").length})');console.log(result);assert.notEqual(result.result,'fight');assert.equal(run('units.every(u=>Number.isFinite(u.hp)&&u.hp>=0&&u.hp<=u.maxHp)'),true);assert.equal(run('new Set(units.filter(u=>u.hp>0).map(u=>u.x+","+u.y)).size===units.filter(u=>u.hp>0).length'),true);}
console.log('PASS: roster, traits, mana, skills, shields, pathfinding, pause, five-stage simulation');
for(const locale of ['zh','en','ja']){
 run(`language='${locale}'`);
 assert.equal(run('Object.keys(TEXT).every(key=>typeof tr(key)==="string"&&tr(key).length>0)'),true);
 assert.equal(run('HEROES.every(h=>heroText(h).name&&heroText(h).desc&&heroText(h).quote)'),true);
 assert.equal(run('STORY[language].every(c=>c.goal&&c.before.text&&c.before.line&&c.after.text&&c.after.line)'),true);
 assert.equal(run('STORY[language].length'),5);
}
run("stage=0;cleared=[];unlocked=0;prepare();finish(false)");assert.equal(run('cleared.length'),0);
run("finish(true);openStory(0,'after','advance');completeStory()");assert.equal(run('stage'),1);assert.equal(run('storyScene.part'),'before');assert.equal(run('mode'),'prep');
run("finish(true);saveProfile();cleared=[]");assert.equal(run('loadProfile().win'),true);assert.equal(run('loadProfile().survivors'),5);
run("completeStory();mode='fight';showView('lobby');tick(1)");assert.equal(run('elapsed'),0);assert.equal(run('paused'),true);
run("mode='prep';language='ja';displayHero='moon';saveProfile();language='en';displayHero='oak';cleared=[];loadProfile()");assert.equal(run('language'),'ja');assert.equal(run('displayHero'),'moon');assert.equal(run('unlocked'),2);
run("localStorage.setItem(SAVE_KEY,JSON.stringify({version:2,language:'invalid',displayHero:'boss',stage:99,cleared:[4],lineup:[{id:'boss',x:99,y:0}]}));language='zh';displayHero='oak';cleared=[];unlocked=0;stage=0;loadProfile()");assert.equal(run('language'),'zh');assert.equal(run('displayHero'),'oak');assert.equal(run('stage'),0);assert.equal(run('lineup.every(p=>p.id!=="boss")'),true);
console.log('PASS: three locales, all story chapters, story progression, camp pause, saved preferences, invalid save validation');
