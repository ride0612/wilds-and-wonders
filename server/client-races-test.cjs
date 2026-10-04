'use strict';
// Delay real client API continuations to exercise races that fast loopback HTTP hides.
// Account identity changes model acceptAccount/logout; no production endpoints are mocked into the app.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../gacha.js'),'utf8');
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const requests=[],elements=new Map(),values=new Map();
 const element=selector=>{if(!elements.has(selector))elements.set(selector,{dataset:{},attributes:{},events:{},hidden:false,isConnected:true,focus(){this.focused=true;},setAttribute(name,value){this.attributes[name]=value;},addEventListener(name,handler){this.events[name]=handler;}});return elements.get(selector);};
 const heroes=['oak','arrow','ember','sage','knight','frost','warden','moon'].map(id=>({id,stars:['moon','knight'].includes(id)?6:['oak','arrow'].includes(id)?4:5}));
 const scope={TEXT:{},crypto:require('node:crypto'),language:'zh',mode:'prep',accountGeneration:1,accountUser:{id:'account-a'},OWNED_HEROES:['oak','arrow'],skinByHero:{},
  GACHA_DATA:require('../gacha-data.js'),HEROES:heroes,CHARACTER_DESIGNS:Object.fromEntries(heroes.map(h=>[h.id,h])),presentationSettings:{effects:true},matchMedia:()=>({matches:false}),
  characterImage:id=>'assets/characters/'+id+'-portrait.png',def:id=>heroes.find(h=>h.id===id),heroText:h=>({name:h.id,skill:h.id+' skill',desc:'Skill description',traits:['test']}),traitText:id=>({name:id}),
  localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)},
  flushAccountSave:async()=>{},renderLobby(){},renderRoster(){},openUtilityDialog(){},prepare(){scope.prepares++;},prepares:0,$:element,
  accountApi:(route,method='GET',body)=>new Promise((resolve,reject)=>requests.push({route,method,body,resolve,reject}))};
 scope.tr=(key,args={})=>{let text=scope.TEXT[key]?.[0]||key;for(const [name,value]of Object.entries(args))text=text.replaceAll('{'+name+'}',String(value));return text;};
 vm.createContext(scope);vm.runInContext(source,scope,{filename:'gacha.js'});
 vm.runInContext('renderGacha=()=>{};renderWeapons=()=>{};initGacha();',scope);
 const run=code=>vm.runInContext(code,scope),read=()=>JSON.parse(run('JSON.stringify(collectionState)'));
 const state=(heroes=['oak','arrow'],tickets=60)=>({heroes,tickets,dust:0,weapons:{practice:1},equipment:{},pity:{},history:[]});
 const set=value=>{scope.incomingState=value;run('setCollection(incomingState)');};
 const switchAccount=(id='account-b')=>{scope.accountUser={id};scope.accountGeneration++;run('resetGachaSession()');set(state());};
 set(state());return {scope,requests,elements,values,element,run,read,state,set,switchAccount};
}
function musicFixture(){
 const events=new Map(),elements=new Map(),players=[];
 class FakeAudio{
  constructor(){this.paused=true;this.calls=[];players.push(this);}
  play(){this.paused=false;return new Promise((resolve,reject)=>{const call={settled:false,resolve:()=>{call.settled=true;resolve();},reject:error=>{call.settled=true;reject(error);}};this.calls.push(call);});}
  pause(){this.paused=true;for(const call of this.calls)if(!call.settled)call.reject(Object.assign(new Error('play interrupted by pause'),{name:'AbortError'}));}
 }
 const element=selector=>{if(!elements.has(selector))elements.set(selector,{});return elements.get(selector);};
 const scope={TEXT:{},Audio:FakeAudio,storyScene:null,currentView:'lobby',document:{hidden:false,addEventListener:(name,handler)=>events.set(name,handler)},window:{addEventListener(){}},
  localStorage:{getItem:()=>null,setItem(){}},$:element,tr:key=>key,gachaLoc:value=>value[0]};
 vm.createContext(scope);vm.runInContext(fs.readFileSync(path.join(__dirname,'../music.js'),'utf8'),scope,{filename:'music.js'});
 const run=code=>vm.runInContext(code,scope);run('initMusic()');events.get('pointerdown')();
 return {scope,players,events,element,run};
}
(async()=>{
 let f=fixture();
 const draw=f.run('performDraw(10)');await turn();
 assert.equal(f.requests[0].route,'draw');assert.ok(f.values.has('wilds.pending.draw.account-a'));
 f.switchAccount();f.values.set('wilds.pending.draw.account-b','unrelated-pending');
 f.requests[0].resolve({collection:f.state(['oak','arrow','moon'],50),results:[{id:'moon'}]});await draw;
 assert.deepEqual(f.read().heroes,['oak','arrow']);assert.equal(f.read().tickets,60);
 assert.equal(f.values.has('wilds.pending.draw.account-a'),false);assert.equal(f.values.get('wilds.pending.draw.account-b'),'unrelated-pending');
 assert.equal(f.run('gachaResults.length'),0);

 f=fixture();const opening=f.run('openGacha()');
 await f.run('performDraw(10)');assert.deepEqual(f.requests.map(r=>r.route),['collection']);
 f.requests[0].resolve({collection:f.state()});await opening;assert.equal(f.run('gachaBusy'),false);
 const afterRefresh=f.run('performDraw(1)');await turn();assert.equal(f.requests[1].route,'draw');
 f.requests[1].resolve({collection:f.state(['oak','arrow','moon'],59),results:[{id:'moon'}]});await afterRefresh;
 assert.equal(f.read().tickets,59);assert.ok(f.read().heroes.includes('moon'));

 f=fixture();const oldRefresh=f.run('openGacha()');f.switchAccount();
 f.requests[0].resolve({collection:f.state(['oak','arrow','knight'],20)});await oldRefresh;
 assert.deepEqual(f.read().heroes,['oak','arrow']);assert.equal(f.read().tickets,60);

 f=fixture();const lostResponse=f.run('performDraw(10)');await turn();const originalId=f.requests[0].body.requestId;
 f.requests[0].reject(new Error('networkError'));await lostResponse;
 assert.equal(JSON.parse(f.values.get('wilds.pending.draw.account-a')).requestId,originalId);
 const retry=f.run('performDraw(10)');await turn();assert.equal(f.requests[1].body.requestId,originalId);
 f.requests[1].resolve({collection:f.state(['oak','arrow','moon'],50),results:[{id:'moon'}]});await retry;
 assert.equal(f.values.has('wilds.pending.draw.account-a'),false);assert.equal(f.read().tickets,50);

 f=fixture();const exchange=f.element('#gacha-exchange').onclick();await turn();assert.equal(f.requests[0].route,'exchange');
 f.switchAccount();f.requests[0].resolve({collection:f.state(['oak','arrow','moon'],99)});await exchange;
 assert.deepEqual(f.read().heroes,['oak','arrow']);assert.equal(f.read().tickets,60);

 f=fixture();const select={dataset:{equip:'practice'},value:'oak',closest(){return this;}};
 const equip=f.element('#inventory-weapons').onchange({target:select});await turn();assert.equal(f.requests[0].route,'equip');
 f.switchAccount();const equipped=f.state();equipped.equipment.oak='practice';f.requests[0].resolve({collection:equipped});await equip;
 assert.deepEqual(f.read().equipment,{});assert.equal(f.scope.prepares,0);

 // Reveals and gallery inspection consume an existing server result; they never issue a draw.
 const item=(id,stars,duplicate=false)=>({kind:'character',id,stars,duplicate,dust:duplicate?50:0});
 f=fixture();f.element('#gacha-dialog').open=true;
 const single=f.run('performDraw(1)');await turn();f.requests[0].resolve({collection:f.state(['oak','arrow','moon'],59),results:[item('moon',6)]});await single;
 assert.equal(f.run('gachaRevealPhase'),'sealed');assert.equal(f.run('gachaRevealIndex'),0);assert.equal(f.element('#gacha-results').hidden,true);
 const singleState=JSON.stringify(f.read());f.run('advanceGachaReveal()');assert.equal(f.run('gachaRevealPhase'),'revealed');
 assert.equal(f.element('#gacha-reveal').dataset.rarity,6);assert.equal(f.element('#gacha-reveal-kicker').textContent,f.scope.tr('cardSixArrival'));
 assert.match(f.element('#gacha-reveal-card').innerHTML,/moon-card-v1\.png/);assert.match(f.element('#gacha-reveal-card').innerHTML,/rarity-6/);
 f.run('advanceGachaReveal()');assert.equal(f.run('gachaRevealPhase'),'overview');assert.equal(f.element('#gacha-results').hidden,false);
 assert.equal(JSON.stringify(f.read()),singleState);assert.equal(f.requests.length,1);

 f.scope.sampleResults=[item('frost',5,true),item('moon',6),...Array.from({length:8},()=>item('oak',4))];
 f.run('gachaResults=sampleResults;beginGachaReveal();advanceGachaReveal()');assert.equal(f.element('#gacha-reveal').dataset.rarity,5);
 assert.equal(f.element('#gacha-reveal-kicker').textContent,f.scope.tr('drawResults'));assert.match(f.element('#gacha-reveal-card').innerHTML,/rarity-5/);assert.match(f.element('#gacha-reveal-card').innerHTML,/50/);
 f.run('advanceGachaReveal()');assert.equal(f.run('gachaRevealPhase'),'sealed');assert.equal(f.run('gachaRevealIndex'),1);
 f.run('advanceGachaReveal()');assert.equal(f.element('#gacha-reveal-kicker').textContent,f.scope.tr('cardSixArrival'));
 f.run('skipGachaReveal()');assert.equal(f.run('gachaRevealPhase'),'overview');assert.equal((f.element('#gacha-results').innerHTML.match(/data-card-index=/g)||[]).length,10);
 assert.equal(JSON.stringify(f.read()),singleState);assert.equal(f.requests.length,1);

 f.element('#gacha-gallery-open').onclick();assert.equal(f.element('#gacha-art-view').hidden,false);assert.equal(f.run('gachaInspectItem.id'),'moon');
 const galleryCard={dataset:{galleryId:'frost'}};f.element('#gacha-gallery-list').onclick({target:{closest:()=>galleryCard}});
 assert.equal(f.run('gachaInspectItem.id'),'frost');assert.equal(f.element('#gacha-art-title').textContent,'frost');assert.equal(f.element('#gacha-art-status').textContent,f.scope.tr('cardPreviewOnly'));
 f.element('#gacha-art-close').onclick();assert.equal(f.element('#gacha-art-view').hidden,true);assert.equal(f.element('#gacha-gallery-open').focused,true);
 assert.equal(JSON.stringify(f.read()),singleState);assert.equal(f.requests.length,1);

 f.run('beginGachaReveal()');let prevented=false;f.element('#gacha-dialog').events.cancel({preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(f.run('gachaRevealPhase'),'overview');
 f.element('#gacha-gallery-open').onclick();f.element('#gacha-dialog').events.close();assert.equal(f.run('gachaRevealPhase'),'overview');assert.equal(f.run('gachaInspectItem.id'),'moon'); // An older queued close must not clear a reopened dialog.
 f.element('#gacha-dialog').open=false;f.element('#gacha-dialog').events.close();assert.equal(f.run('gachaRevealPhase'),'idle');assert.equal(f.run('gachaResults.length'),0);assert.equal(f.run('gachaInspectItem'),null);
 f.run('gachaResults=sampleResults;beginGachaReveal();openCardArtwork(sampleResults[0])');f.switchAccount();assert.equal(f.run('gachaRevealPhase'),'idle');assert.equal(f.run('gachaRevealIndex'),0);assert.equal(f.run('gachaInspectItem'),null);assert.equal(f.element('#gacha-art-view').hidden,true);

 for(const option of ['effects-disabled','reduced-motion']){
  f=fixture();f.element('#gacha-dialog').open=true;if(option==='effects-disabled')f.scope.presentationSettings.effects=false;else f.scope.matchMedia=()=>({matches:true});
  const accessible=f.run('performDraw(1)');await turn();f.requests[0].resolve({collection:f.state(['oak','arrow','moon'],59),results:[item('moon',6)]});await accessible;
  assert.equal(f.run('gachaRevealPhase'),'overview',option);assert.equal(f.element('#gacha-reveal').hidden,true,option);assert.equal(f.element('#gacha-results').hidden,false,option);
 }

 let m=musicFixture();assert.equal(m.players[0].calls.length,1);m.run('tickMusic(.05);tickMusic(.05)');assert.equal(m.players[0].calls.length,1);
 m.scope.document.hidden=true;m.events.get('visibilitychange')();await turn();assert.equal(m.run('musicFailed'),false);
 m.scope.document.hidden=false;m.events.get('visibilitychange')();assert.equal(m.players[0].calls.length,2);
 m.players[0].calls[1].resolve();await turn();assert.equal(m.players[0].paused,false);assert.equal(m.run('musicFailed'),false);

 m=musicFixture();m.element('#music-toggle').onchange({target:{checked:false}});await turn();assert.equal(m.run('musicFailed'),false);
 m.element('#music-toggle').onchange({target:{checked:true}});assert.equal(m.players[0].calls.length,2);
 m.players[0].calls[1].resolve();await turn();assert.equal(m.players[0].paused,false);

 m=musicFixture();m.scope.storyScene={index:5};m.run('tickMusic(.05)');assert.equal(m.run('musicCurrent'),'white-bell');
 m.players[0].calls[0].reject(Object.assign(new Error('late failure of outgoing track'),{name:'NotSupportedError'}));await turn();assert.equal(m.run('musicFailed'),false);
 m.players[1].calls[0].resolve();await turn();assert.equal(m.players[1].paused,false);

 m=musicFixture();m.players[0].paused=true;m.players[0].calls[0].reject(Object.assign(new Error('resource unavailable'),{name:'NotSupportedError'}));await turn();assert.equal(m.run('musicFailed'),true);
 m.scope.document.hidden=true;m.events.get('visibilitychange')();m.scope.document.hidden=false;m.events.get('visibilitychange')();
 assert.equal(m.players[0].calls.length,2);m.players[0].calls[1].resolve();await turn();assert.equal(m.run('musicFailed'),false);
 console.log('PASS: cross-account draw/refresh/exchange/equip responses ignored, originating pending key cleanup, refresh blocks draws, ambiguous network retry reuses request ID; single/ten-pull reveals, rarity treatment, skip and free gallery preserve balances without requests, close/account reset clears presentation, effects/reduced-motion skip; music pending-play deduplication, minimize/foreground and off/on recovery, outgoing-track rejection isolation and foreground error retry');
})().catch(error=>{console.error(error);process.exitCode=1;});
