'use strict';
const SAVE_KEY='wilds-and-wonders.profile.v2';
const OWNED_HEROES=ACCOUNT_ENABLED?[...GACHA_DATA.starter]:HEROES.map(h=>h.id);
// Stable appearance IDs keep saved selections compatible with future 3D or layered art.
const APPEARANCES=Object.fromEntries(HEROES.map(h=>[h.id,[{id:'base',nameKey:'baseSkin',image:characterImage(h.id)}]]));
let currentView='lobby',displayHero='oak',cleared=[],skinByHero={},storyScene=null,profileReady=false,storageAvailable=true;

function loadProfile(incoming){
 let data=incoming;try{if(arguments.length===0)data=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(error){if(error instanceof SyntaxError)return null;storageAvailable=false;return null;}
 protagonist=null;featureProtagonist=false;
 if(!data||data.version!==2)return null;
 if(PROTAGONISTS.includes(data.protagonist)){protagonist=data.protagonist;featureProtagonist=data.featureProtagonist!==false;}
 for(const key of ['effects','motion'])if(typeof data.presentation?.[key]==='boolean')presentationSettings[key]=data.presentation[key];
 cleared=[];
 if(['zh','en','ja'].includes(data.language))language=data.language;
 if(OWNED_HEROES.includes(data.displayHero))displayHero=data.displayHero;
 if(Array.isArray(data.cleared))for(let i=0;i<STAGES.length&&data.cleared.includes(i);i++)cleared.push(i);
 unlocked=Math.min(STAGES.length-1,cleared.length);
 if(Number.isInteger(data.stage)&&data.stage>=0&&data.stage<=unlocked)stage=data.stage;
 if(Array.isArray(data.lineup)&&data.lineup.length<=5){
  const ids=new Set(),cells=new Set();
  const valid=data.lineup.every(p=>p&&OWNED_HEROES.includes(p.id)&&Number.isInteger(p.x)&&p.x>=0&&p.x<8&&Number.isInteger(p.y)&&p.y>=3&&p.y<6&&!ids.has(p.id)&&!cells.has(p.x+','+p.y)&&(ids.add(p.id),cells.add(p.x+','+p.y),true));
  if(valid)lineup=data.lineup.map(({id,x,y})=>({id,x,y}));
  else if(data.lineup.some(p=>p&&OWNED_HEROES.includes(p.id)))lineup=data.lineup.filter(p=>p&&OWNED_HEROES.includes(p.id)).slice(0,5).map((p,i)=>({id:p.id,x:i,y:4})).filter((p,i,a)=>a.findIndex(q=>q.id===p.id)===i);
 }
 for(const id of OWNED_HEROES){const skin=data.skinByHero?.[id];skinByHero[id]=APPEARANCES[id].some(a=>a.id===skin)?skin:'base';}
 if(data.defensePositions&&typeof data.defensePositions==='object')for(const id of OWNED_HEROES){const p=data.defensePositions[id];if(p&&DEFENSE_PADS.some(a=>a.x===p.x&&a.y===p.y))defensePositions[id]={x:p.x,y:p.y};}
 const r=data.result;
 return r&&r.win===true&&cleared.includes(stage)&&Number.isFinite(r.time)&&r.time>=0&&r.time<=181&&Number.isInteger(r.survivors)&&r.survivors>=0&&r.survivors<=5?{win:true,timeout:false,time:r.time,survivors:r.survivors,core:Number.isFinite(r.core)?Math.max(0,Math.min(100,r.core)):100,leaks:Number.isInteger(r.leaks)?Math.max(0,r.leaks):0}:null;
}
function profileSnapshot(){return {version:2,protagonist,featureProtagonist,presentation:presentationSettings,language,displayHero,skinByHero,lineup,defensePositions,stage,cleared,result:mode==='win'?battleResult:null};}
function saveProfile(){
 if(!profileReady||(ACCOUNT_ENABLED&&(!accountUser||accountLoading||!accountReady)))return;
 const snapshot=profileSnapshot();
 try{localStorage.setItem(ACCOUNT_ENABLED?'wilds.account.cache.'+accountUser.id:SAVE_KEY,JSON.stringify(snapshot));storageAvailable=true;}
 catch{storageAvailable=false;}
 $('#storage-warning').hidden=storageAvailable;queueAccountSave(snapshot);
}
function setLanguage(locale){
 if(!['zh','en','ja'].includes(locale))return;
 language=locale;localizePage();renderUI();renderLog();renderLobby();renderJournal();renderCampaignLibrary();if(storyScene)renderStory();if($('#protagonist-dialog').open)renderProtagonistPicker();renderAccount();renderGacha();renderMusicControls();saveProfile();
}
function showView(view){
 currentView=view;
 if(view==='lobby'&&mode==='fight'){paused=true;renderUI();}
 $('#lobby-view').hidden=view!=='lobby';$('#adventure-view').hidden=view!=='adventure';
 $('#nav-lobby').classList.toggle('active',view==='lobby');$('#nav-adventure').classList.toggle('active',view==='adventure');
 $('#nav-lobby').setAttribute('aria-current',view==='lobby'?'page':'false');$('#nav-adventure').setAttribute('aria-current',view==='adventure'?'page':'false');
 renderLobby();syncPresentationLayout();if(view!=='adventure')clearUltimate();saveProfile();window.scrollTo(0,0);
}
function enterAdventure(){
 showView('adventure');
 if(mode==='fight'){openCampaign();}else showCampaignLibrary();
 // A live fight stays paused after returning from camp, until the player chooses Resume.
}
function renderLobby(){
 const h=heroText(def(displayHero)),design=CHARACTER_DESIGNS[h.id];
 $('.showcase').style.setProperty('--hero-color',design.tone);
 $('#display-role').textContent=h.role;$('#display-name').textContent=h.name;$('#display-quote').textContent=h.quote;
 $('#display-stars').textContent=starText(h.id);$('#display-stars').setAttribute('aria-label',tr('rarity',{n:h.stars}));$('#display-personality').textContent=characterText(h.id,'personality');
 const skins=APPEARANCES[h.id],skin=skins.find(s=>s.id===skinByHero[h.id])||skins[0];
 $('#skin-select').innerHTML=skins.map(s=>'<option value="'+s.id+'">'+tr(s.nameKey)+'</option>').join('');$('#skin-select').value=skin.id;
 $('#appearance-count').textContent=tr('appearanceCount',{n:skins.length});
 const art=$('#display-art');if(art.dataset.hero!==h.id){art.innerHTML='<img class="featured-portrait" src="'+skin.image+'" alt="'+h.name+'">';art.dataset.hero=h.id;}
 $('#collection-art').src=skin.image;$('#collection-art').alt=h.name;
 $('#display-profile').innerHTML='<div class="rarity-stars">'+starText(h.id)+'</div><h2>'+h.name+'</h2><p class="dossier-role">'+h.role+'</p><div class="tags">'+heroTags(h)+'</div><h3>'+characterText(h.id,'personality')+'</h3><p>'+characterText(h.id,'bio')+'</p><div class="dossier-skill"><b>✧ '+h.skill+'</b><p>'+h.desc+'</p></div>'+(h.stars===6?'<div class="six-star-note">'+tr('ultimateTalent')+'</div>':'');
 $('#destination-name').textContent=tr(CAMPAIGN_CATALOG[Math.floor(stage/5)].title);$('#hall-progress').textContent=cleared.length===STAGES.length?tr('completed'):tr('clearedCount',{n:cleared.length});
 $('#owned-count').textContent=tr('ownedRoster',{n:OWNED_HEROES.length});$('#relic-summary').textContent=tr('relicCount',{n:cleared.length});
 $('#collection').innerHTML=HEROES.map(h=>h.id).map(id=>{const hero=heroText(def(id));return '<button '+(!OWNED_HEROES.includes(id)?'disabled':'')+' class="collection-card '+(!OWNED_HEROES.includes(id)?'locked':id===displayHero?'active':'')+'" data-display="'+id+'" aria-pressed="'+(id===displayHero)+'"><span class="collection-thumb"><img src="'+characterImage(id)+'" alt=""></span><span class="collection-info"><span class="rarity-stars">'+starText(id)+'</span><strong>'+hero.name+'</strong><small>'+tr(!OWNED_HEROES.includes(id)?'lockedCharacter':id===displayHero?'displayed':'owned')+'</small></span></button>';}).join('');
 renderProtagonistLobby();renderInventory();applyPresentationSettings();
}
function updateStoryBrief(){const c=chapterText(stage);$('#objective-title').textContent=c.before.title;$('#objective-text').textContent=c.goal;$('#story-recap').disabled=mode==='fight';const title=tr(CAMPAIGN_CATALOG[Math.floor(stage/5)].title);$('#current-chapter').textContent=title;$('#battle-chapter-title').textContent=title;}
function openStory(index,part,intent='read'){
 if(index>unlocked||index<0||index>=STAGES.length||(part==='after'&&!cleared.includes(index)))return;
 if(mode==='fight'){paused=true;renderUI();}storyScene={index,part,intent};beginCinematic();if(!$('#story-dialog').open)$('#story-dialog').showModal();
}
function renderStory(){if(cinema){cinema.chars=0;cinema.hold=0;}renderCinematic();}
function completeStory(){
 if(!storyScene)return;const {index,part,intent}=storyScene;$('#story-dialog').close();storyScene=null;cinema=null;
 if(intent==='advance'&&part==='after'){
  if(index===STAGES.length-1){stage=STAGES.length-1;prepare();showView('lobby');}
  else{stage=index+1;prepare();openStory(stage,'before','prepare');}
 }
 saveProfile();
}
function renderJournal(){
 $('#journal-entries').innerHTML=STAGES.map((_,i)=>`<section class="journal-entry ${i>unlocked?'locked':''}"><strong>${String(i+1).padStart(2,'0')} · ${stageName(i)}</strong><div><button data-journal="${i}" data-part="before" ${i>unlocked?'disabled':''}>${tr(i>unlocked?'locked':'beforeLabel')}</button><button data-journal="${i}" data-part="after" ${!cleared.includes(i)?'disabled':''}>${tr('afterLabel')}</button></div></section>`).join('');
}
$('#language').onchange=e=>setLanguage(e.target.value);$('#story-language').onchange=e=>setLanguage(e.target.value);
$('#nav-lobby').onclick=$('#brand-home').onclick=()=>{closeUtilityDialogs();showView('lobby');};$('#nav-adventure').onclick=$('#depart').onclick=()=>{closeUtilityDialogs();enterAdventure();};
$('#collection').addEventListener('click',e=>{const card=e.target.closest('[data-display]');if(!card||!OWNED_HEROES.includes(card.dataset.display))return;displayHero=card.dataset.display;featureProtagonist=false;renderLobby();saveProfile();$('#collection').querySelector(`[data-display="${displayHero}"]`).focus({preventScroll:true});});
$('#skin-select').onchange=e=>{if(APPEARANCES[displayHero].some(s=>s.id===e.target.value)){skinByHero[displayHero]=e.target.value;renderLobby();saveProfile();}};
$('#story-recap').onclick=()=>openStory(stage,'before','read');$('#story-next').onclick=completeStory;
$('#story-dismiss').onclick=()=>{$('#story-dialog').close();storyScene=null;};$('#story-dialog').addEventListener('cancel',()=>{storyScene=null;});
$('#journal-open').onclick=()=>{closeUtilityDialogs();renderJournal();$('#journal-dialog').showModal();};$('#journal-close').onclick=()=>$('#journal-dialog').close();
$('#journal-entries').addEventListener('click',e=>{const button=e.target.closest('[data-journal]');if(button&&!button.disabled){$('#journal-dialog').close();openStory(Number(button.dataset.journal),button.dataset.part,'read');}});
const restoredResult=loadProfile();localizePage();prepare();
if(restoredResult){mode='win';battleResult=restoredResult;if(siege){siege.core=restoredResult.core;siege.leaks=restoredResult.leaks;siege.wave=siege.total;}renderUI();}
profileReady=true;showView('lobby');$('#storage-warning').hidden=storageAvailable;initCampaign();initPresentation();initCinematics();initProtagonist();initGacha();initMusic();if(ACCOUNT_ENABLED)initAccount();requestAnimationFrame(frame);
