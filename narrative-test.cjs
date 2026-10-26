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

// Exercise the actual loaded page: removing the feature must not leave hidden APIs or dependencies.
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
assert.ok(!scripts.some(p=>/gacha|account/.test(p)));
assert.ok(!/id="(?:gacha|draw|inventory-weapons)/.test(html));
assert.equal(run('typeof performDraw'),'undefined');assert.equal(run('typeof accountApi'),'undefined');
assert.equal(run('OWNED_HEROES.length'),8);
const cast=run('HEROES.map(h=>({id:h.id,name:h.name,portrait:characterImage(h.id),battle:characterImage(h.id,"chibi")}))');
assert.deepEqual(Array.from(cast,h=>h.name),['芬格尔','方晴','楚子航','沈岚','凯撒','诺诺','路明非','零']);
for(const h of cast){
 assert.ok(run('DIMENSION_STORY.some(s=>[...s.before,...s.after].some(l=>l.speaker==='+JSON.stringify(h.name)+'))'),'story appearance: '+h.name);
 for(const p of [h.portrait,h.battle]){const b=fs.readFileSync(p);assert.equal(b.subarray(1,4).toString(),'PNG');assert.equal(b[25],6,'RGBA PNG: '+p);}
 assert.equal(run('DIMENSION_ACTORS['+JSON.stringify(h.name)+'].hero'),h.id);
}
for(const language of ['zh','en','ja']){
 run('language='+JSON.stringify(language)+';setLanguage(language);renderMusicControls()');
 for(const h of cast)assert.ok(!/Guardian|Mage|Hunter|Healer|骑士|卫士/.test(run('heroText(def('+JSON.stringify(h.id)+')).name')));
}
run("storageBefore=JSON.stringify(profileSnapshot());localStorage.setItem('never-yield.fold-01.collection.v1',JSON.stringify({tickets:99999,equipment:{oak:'crescent'}}));saveProfile();loadProfile()");
assert.equal(run('JSON.stringify(profileSnapshot())'),run('storageBefore'),'cast refresh preserves story progress');
assert.equal(run("createUnit('oak','blue',1,3).atk"),run("def('oak').atk"),'retired weapon cannot alter stats');
run("openStory(7,'before','read');cinema.shot=cinematicShots(7,'before').findIndex(s=>s.speaker==='凯撒');renderCinematic()");
assert.equal(run("$('#cinema-left').src"),'assets/cast/caesar-portrait.png');assert.equal(run("$('#cinema-left').hidden"),false);
assert.equal(run("$('#cinema-contact').hidden"),true);run('dismissCinematic()');
// Render branch checks catch missing motion data and accidental aspect-ratio distortion.
run("for(const key of ['save','restore','translate','rotate','beginPath','ellipse','fill','stroke','moveTo','lineTo','closePath','fillText','quadraticCurveTo'])ctx[key]=()=>{};ctx.drawImage=(image,x,y,w,h)=>{if(![x,y,w,h].every(Number.isFinite)||Math.abs(w/h-image.naturalWidth/image.naturalHeight)>1e-8)throw Error('sprite dimensions')};");
for(const h of cast){run('CHARACTER_SPRITES['+JSON.stringify(h.id)+']={complete:true,naturalWidth:1024,naturalHeight:1280};drawMiniature(createUnit('+JSON.stringify(h.id)+',"blue",1,4),{x:100,y:200});drawSkillFx({hero:'+JSON.stringify(h.id)+',sx:1,sy:4,color:"#d1a580"},{x:100,y:200},.5)');}
console.log('PASS: all eight cast assets and story appearances, no draw UI/API, old-save compatibility, localization, music controls, dialogue portraits and battle rendering');

