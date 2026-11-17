const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
const nodes=new Map(),storage=new Map();
function element(){return {innerHTML:'',textContent:'',hidden:true,children:[],disabled:false,dataset:{},style:{setProperty(){}},classList:{toggle(){},add(){},remove(){},contains(){return false}},setAttribute(){},querySelector(){return element()},focus(){},addEventListener(){},prepend(p){this.children.unshift(p)},append(){},get lastChild(){return {remove:()=>this.children.pop()}},getContext(){return {}},showModal(){this.open=true},close(){this.open=false}};}
const context=vm.createContext({console,AbortController,window:{scrollTo(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{body:element(),documentElement:{},querySelectorAll(){return []},querySelector(s){if(/^#[\w-]+$/.test(s))assert.ok(ids.has(s.slice(1)),'DOM exists: '+s);if(!nodes.has(s))nodes.set(s,element());return nodes.get(s)},createElement:element,createTextNode:s=>s},requestAnimationFrame(){},fetch(){throw new Error('Offline game must not fetch');}});
for(const m of html.matchAll(/<script src="([^"]+)"/g))vm.runInContext(fs.readFileSync(m[1],'utf8'),context,{filename:m[1]});
const run=s=>vm.runInContext(s,context);
assert.equal(run('DIMENSION_STORY.length'),20);
assert.ok(run('DIMENSION_STORY.every(s=>s.before.length>=1&&s.after.length>=1&&s.goal)'),'every stage has placeholder scenes and a goal');
assert.ok(run("DIMENSION_STORY.flatMap(s=>[...s.before,...s.after]).every(s=>s.text&&(!s.speaker||['你','抉择','同行者'].includes(s.speaker)||DIMENSION_ACTORS[s.speaker]))"));
assert.equal(run('CAMPAIGN_CATALOG.every((c,i)=>c.start===i*5&&c.stages.length===5)'),true);
for(const m of html.matchAll(/data-i18n="([^"]+)"/g))assert.ok(run('TEXT['+JSON.stringify(m[1])+']'),'translation '+m[1]);
assert.ok(!run('SAVE_KEY').startsWith('wilds-and-wonders'));
run("pendingProtagonist='female';confirmProtagonist();openStory(0,'before','prepare');revealCinematic();dismissCinematic();openStory(0,'before','read')");
assert.equal(run('cinema.shot'),0,'archive replay starts at beginning');
run('dismissCinematic();saveProfile();dimensionState=freshDimensionState();loadProfile()');
// 章末同行邀请已随旧剧情移除：最后一节战后剧情必须能直接完成，不能卡在空的邀请窗口
run("dimensionState=freshDimensionState();cleared=Array.from({length:20},(_,i)=>i);unlocked=19;stage=19;prepare();openStory(19,'after','advance');completeStory()");
assert.ok(!run("$('#return-companion-dialog').open"),'final scene does not open an empty invitation');
assert.equal(run('storyScene'),null,'final scene completes');
assert.equal(run('Object.keys(RETURN_COMPANIONS).length'),0);
run('loadDimensionState({version:DIMENSION_VERSION,companion:"bad",returned:true,bookmarks:{"19:after":999,"0:before":0}})');
assert.equal(run('dimensionState.companion'),null);assert.equal(run('dimensionState.returned'),false);
assert.equal(run('dimensionState.bookmarks["19:after"]'),undefined);
assert.ok(run('dimensionArchiveHtml().includes("第一章")'));
console.log('PASS: real HTML IDs, scripts, localization keys, 20 placeholder scenes, save isolation, replay and final-scene completion');

// Exercise the actual loaded page: removing the feature must not leave hidden APIs or dependencies.
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
assert.ok(!scripts.some(p=>/gacha|account/.test(p)));
assert.ok(!/id="(?:gacha|draw|inventory-weapons)/.test(html));
assert.equal(run('typeof performDraw'),'undefined');assert.equal(run('typeof accountApi'),'undefined');
assert.equal(run('OWNED_HEROES.length'),8);
const cast=run('HEROES.map(h=>({id:h.id,name:h.name,portrait:characterImage(h.id),battle:characterModel(h.id)}))');
assert.deepEqual(Array.from(cast,h=>h.name),['红美铃','雾雨魔理沙','芙兰朵露·斯卡雷特','八意永琳','魂魄妖梦','琪露诺','博丽灵梦','十六夜咲夜']);
for(const h of cast){
 assert.ok(h.portrait.startsWith('data:image/'),'portrait for '+h.name);
 assert.ok(run('HeroModels.SPECS['+JSON.stringify(h.id)+']'),'3D model spec for '+h.name);
 assert.equal(run('DIMENSION_ACTORS['+JSON.stringify(h.name)+'].hero'),h.id);
}
for(const language of ['zh','en','ja']){
 run('language='+JSON.stringify(language)+';setLanguage(language);renderMusicControls()');
 for(const h of cast)assert.ok(!/Guardian|Mage|Hunter|Healer|骑士|卫士/.test(run('heroText(def('+JSON.stringify(h.id)+')).name')));
}
run("storageBefore=JSON.stringify(profileSnapshot());localStorage.setItem('never-yield.fold-01.collection.v1',JSON.stringify({tickets:99999,equipment:{oak:'crescent'}}));saveProfile();loadProfile()");
assert.equal(run('JSON.stringify(profileSnapshot())'),run('storageBefore'),'cast refresh preserves story progress');
assert.equal(run("HEROES.every(h=>ACData.UNITS[h.id]&&ACData.UNITS[h.id].story&&HeroModels.SPECS[h.id])"),true,'every story character is recruitable and has a 3D model');
run("openStory(7,'before','read');renderCinematic()");assert.equal(run("$('#cinema-contact').hidden"),true);run('dismissCinematic()');
// Exercise the auto-chess text helpers and a headless battle for every story character.
for(const h of cast){assert.ok(run('acName('+JSON.stringify(h.id)+')&&acSkillName('+JSON.stringify(h.id)+')&&acSkillDesc('+JSON.stringify(h.id)+',2)'));const r=run('(()=>{const s=new AC.State(3);s.level=3;s.board["3,5"]={uid:1,id:'+JSON.stringify(h.id)+',star:2};s.board["2,4"]={uid:2,id:"anvil",star:2};return AC.simulateFight(s,ACData.ENCOUNTERS[0],AC.makeRng(9));})()');assert.ok(r.won,'two 2-star units clear stage 1 with '+h.name);}
run('stage=0;cleared=[];unlocked=0;acState=new AC.State(5);prepare();acStartCombat()');assert.equal(run('mode'),'prep','cannot engage with an empty board');
console.log('PASS: eight Touhou cast entries with portraits and 3D specs, no draw UI/API, old-save compatibility, localization, music controls, dialogue portraits and battle rendering');

module.exports={run,context};


