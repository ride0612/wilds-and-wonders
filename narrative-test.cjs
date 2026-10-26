const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
const nodes=new Map(),storage=new Map();
function element(){return {innerHTML:'',textContent:'',hidden:true,children:[],disabled:false,dataset:{},style:{setProperty(){}},classList:{toggle(){},add(){},remove(){},contains(){return false}},setAttribute(){},querySelector(){return element()},focus(){},addEventListener(){},prepend(p){this.children.unshift(p)},append(){},get lastChild(){return {remove:()=>this.children.pop()}},getContext(){return {}},showModal(){this.open=true},close(){this.open=false}};}
const context=vm.createContext({console,window:{scrollTo(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{body:element(),documentElement:{},querySelectorAll(){return []},querySelector(s){if(/^#[\w-]+$/.test(s))assert.ok(ids.has(s.slice(1)),'DOM exists: '+s);if(!nodes.has(s))nodes.set(s,element());return nodes.get(s)},createElement:element,createTextNode:s=>s},requestAnimationFrame(){},fetch(){throw new Error('Offline game must not fetch');}});
for(const m of html.matchAll(/<script src="([^"]+)"/g))vm.runInContext(fs.readFileSync(m[1],'utf8'),context,{filename:m[1]});
const run=s=>vm.runInContext(s,context);
assert.equal(run('DIMENSION_STORY.length'),20);
assert.ok(run('DIMENSION_STORY.every(s=>s.before.length>=15&&s.after.length>=10)'));
assert.ok(run("DIMENSION_STORY.flatMap(s=>[...s.before,...s.after]).every(s=>s.text&&(!s.speaker||['你','抉择','同行者'].includes(s.speaker)||DIMENSION_ACTORS[s.speaker]))"));
assert.equal(run('CAMPAIGN_CATALOG.every((c,i)=>c.start===i*5&&c.stages.length===5)'),true);
for(const m of html.matchAll(/data-i18n="([^"]+)"/g))assert.ok(run('TEXT['+JSON.stringify(m[1])+']'),'translation '+m[1]);
assert.ok(!run('SAVE_KEY').startsWith('wilds-and-wonders'));
run("pendingProtagonist='female';confirmProtagonist();openStory(0,'before','prepare');revealCinematic();nextCinematic();revealCinematic();nextCinematic();dismissCinematic();openStory(0,'before','prepare')");
assert.equal(run('cinema.shot'),2,'reopen resumes checkpoint');
run('saveProfile();dimensionState=freshDimensionState();loadProfile();dismissCinematic();openStory(0,"before","prepare")');
assert.equal(run('cinema.shot'),2,'saved checkpoint survives reload');
run('dismissCinematic();openStory(0,"before","read")');assert.equal(run('cinema.shot'),0,'archive replay starts at beginning');
run("dismissCinematic();dimensionState=freshDimensionState();pendingReturnCompanion='nono'");assert.equal(run('confirmReturnCompanion()'),false,'cannot invite before final scene');
for(const route of ['lmingfei','nono','chuzihang']){
 run("dimensionState=freshDimensionState();cleared=Array.from({length:20},(_,i)=>i);unlocked=19;stage=19;prepare();openStory(19,'after','advance');completeStory()");
 assert.equal(run("$('#return-companion-dialog').open"),true,'skip must stop at invitation');
 assert.equal(run('dimensionState.returned'),false);
 run("pendingReturnCompanion='invalid'");assert.equal(run('confirmReturnCompanion()'),false);
 run('pendingReturnCompanion='+JSON.stringify(route));assert.equal(run('confirmReturnCompanion()'),true);
 assert.equal(run('dimensionState.companion'),route);
 assert.equal(run('confirmReturnCompanion()'),false,'cannot choose twice');
 assert.equal(run("cinematicShots(19,'after').some(s=>/\{(?:companion|accept|arrival|room|dinner|tomorrow)\}/.test(s.text))"),false,'all route tokens resolved');
 assert.equal(run('dimensionState.returned'),false,'choice alone is not completed return');
 run('completeStory();saveProfile();dimensionState=freshDimensionState();loadProfile()');
 assert.equal(run('dimensionState.returned'),true);assert.equal(run('dimensionState.companion'),route);
 assert.ok(run('dimensionArchiveHtml().includes(RETURN_COMPANIONS[dimensionState.companion].name)'));
 run("openStory(19,'after','read');completeStory()");assert.equal(run("$('#return-companion-dialog').open"),false,'replay retains invitation');
}
run("dimensionState=freshDimensionState();openStory(19,'after','read');cinema.shot=cinematicShots(19,'after').findIndex(s=>s.choice);revealCinematic();cinema.auto=true;tickCinematic(60)");
assert.equal(run("$('#return-companion-dialog').open"),true,'auto cannot select a companion');
assert.equal(run('dimensionState.companion'),null);
run("$('#return-companion-cancel').onclick()");assert.equal(run('dimensionState.companion'),null);
run('loadDimensionState({version:DIMENSION_VERSION,companion:"bad",returned:true,bookmarks:{"19:after":999,"0:before":3}})');
assert.equal(run('dimensionState.companion'),null);assert.equal(run('dimensionState.returned'),false);
assert.equal(run('dimensionState.bookmarks["19:after"]'),undefined);
run("dimensionState=freshDimensionState();dimensionState.bookmarks['19:after']=30;dismissCinematic();dimensionState.bookmarks['19:after']=30;openStory(19,'after','advance')");assert.equal(run('cinema.shot'),run("cinematicShots(19,'after').findIndex(s=>s.choice)"),'stale checkpoint cannot bypass invitation');
console.log('PASS: real HTML IDs, scripts, localization keys, 20 scenes, save isolation, reading resume, 3 distinct endings, choice lock, skip/auto guard, cargo and persistence');

