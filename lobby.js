'use strict';
const SAVE_KEY='wilds-and-wonders.profile.v2';
const OWNED_HEROES=HEROES.map(h=>h.id);
// Add portraits/skins here later. image is a relative asset path; null uses the hero's emblem.
const APPEARANCES=Object.fromEntries(HEROES.map(h=>[h.id,[{id:'base',nameKey:'baseSkin',image:null}]]));
let currentView='lobby',displayHero='oak',cleared=[],skinByHero={},storyScene=null,profileReady=false,storageAvailable=true;

function loadProfile(){
 let data;try{data=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(error){if(error instanceof SyntaxError)return null;storageAvailable=false;return null;}
 if(!data||data.version!==2)return null;
 cleared=[];
 if(['zh','en','ja'].includes(data.language))language=data.language;
 if(OWNED_HEROES.includes(data.displayHero))displayHero=data.displayHero;
 if(Array.isArray(data.cleared))for(let i=0;i<5&&data.cleared.includes(i);i++)cleared.push(i);
 unlocked=Math.min(4,cleared.length);
 if(Number.isInteger(data.stage)&&data.stage>=0&&data.stage<=unlocked)stage=data.stage;
 if(Array.isArray(data.lineup)&&data.lineup.length<=5){
  const ids=new Set(),cells=new Set();
  const valid=data.lineup.every(p=>p&&OWNED_HEROES.includes(p.id)&&Number.isInteger(p.x)&&p.x>=0&&p.x<8&&Number.isInteger(p.y)&&p.y>=3&&p.y<6&&!ids.has(p.id)&&!cells.has(p.x+','+p.y)&&(ids.add(p.id),cells.add(p.x+','+p.y),true));
  if(valid)lineup=data.lineup.map(({id,x,y})=>({id,x,y}));
 }
 for(const id of OWNED_HEROES){const skin=data.skinByHero?.[id];skinByHero[id]=APPEARANCES[id].some(a=>a.id===skin)?skin:'base';}
 const r=data.result;
 return r&&r.win===true&&cleared.includes(stage)&&Number.isFinite(r.time)&&r.time>=0&&r.time<=121&&Number.isInteger(r.survivors)&&r.survivors>=0&&r.survivors<=5?{win:true,timeout:false,time:r.time,survivors:r.survivors}:null;
}
function saveProfile(){
 if(!profileReady)return;
 try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:2,language,displayHero,skinByHero,lineup,stage,cleared,result:mode==='win'?battleResult:null}));storageAvailable=true;}
 catch{storageAvailable=false;}
 $('#storage-warning').hidden=storageAvailable;
}
function setLanguage(locale){
 if(!['zh','en','ja'].includes(locale))return;
 language=locale;localizePage();renderUI();renderLog();renderLobby();renderJournal();if(storyScene)renderStory();saveProfile();
}
function showView(view){
 currentView=view;
 if(view==='lobby'&&mode==='fight'){paused=true;renderUI();}
 $('#lobby-view').hidden=view!=='lobby';$('#adventure-view').hidden=view!=='adventure';
 $('#nav-lobby').classList.toggle('active',view==='lobby');$('#nav-adventure').classList.toggle('active',view==='adventure');
 $('#nav-lobby').setAttribute('aria-current',view==='lobby'?'page':'false');$('#nav-adventure').setAttribute('aria-current',view==='adventure'?'page':'false');
 renderLobby();saveProfile();window.scrollTo(0,0);
}
function enterAdventure(){
 showView('adventure');
 if(mode==='prep')openStory(stage,'before','prepare');
 // A live fight stays paused after returning from camp, until the player chooses Resume.
}
function renderLobby(){
 const h=heroText(def(displayHero));
 $('.showcase').style.setProperty('--hero-color',h.color);$('.showcase').style.setProperty('--hero-bg',h.bg);
 $('#display-number').textContent=String(OWNED_HEROES.indexOf(displayHero)+1).padStart(2,'0')+' / 08';
 $('#display-role').textContent=h.role;$('#display-name').textContent=h.name;$('#display-quote').textContent=h.quote;
 const skins=APPEARANCES[h.id],skin=skins.find(s=>s.id===skinByHero[h.id])||skins[0];
 $('#skin-select').innerHTML=skins.map(s=>`<option value="${s.id}">${tr(s.nameKey)}</option>`).join('');$('#skin-select').value=skin.id;
 $('#appearance-count').textContent=tr('appearanceCount',{n:skins.length});
 const art=$('#display-art');art.innerHTML='';
 const emblem=()=>{art.innerHTML='';const span=document.createElement('span');span.className='display-glyph';span.textContent=h.icon;art.append(span);};
 if(skin.image){const img=document.createElement('img');img.src=skin.image;img.alt=h.name;img.onerror=emblem;art.append(img);}else emblem();
 $('#display-profile').innerHTML=`<div class="tags">${heroTags(h)}</div><b>✧ ${h.skill}</b><p>${h.desc}</p>`;
 $('#campaign-progress').innerHTML=`<div class="progress-segments">${STAGES.map((_,i)=>`<span class="${cleared.includes(i)?'complete':''}"></span>`).join('')}</div><small>${cleared.length===5?tr('completed'):tr('clearedCount',{n:cleared.length})}</small>`;
 $('#destination-name').textContent=stageName(stage);
 $('#depart').textContent=tr(mode==='fight'?'returnBattle':cleared.length===5?'revisit':cleared.length||mode==='win'?'resumeJourney':'depart');
 $('#owned-count').textContent=tr('ownedCount',{n:OWNED_HEROES.length});
 $('#collection').innerHTML=OWNED_HEROES.map(id=>{const hero=heroText(def(id));return `<button class="collection-card ${id===displayHero?'active':''}" data-display="${id}" aria-pressed="${id===displayHero}" style="--hero-bg:${hero.bg};--hero-color:${hero.color}"><span class="hero-art"><span class="glyph">${hero.icon}</span></span><span class="collection-info"><strong>${hero.name}</strong><small>${tr(id===displayHero?'displayed':'owned')}</small></span></button>`;}).join('');
}
function updateStoryBrief(){const c=chapterText(stage);$('#objective-title').textContent=c.before.title;$('#objective-text').textContent=c.goal;$('#story-recap').disabled=mode==='fight';}
function openStory(index,part,intent='read'){
 if(index>unlocked||index<0||index>4||(part==='after'&&!cleared.includes(index)))return;
 storyScene={index,part,intent};renderStory();if(!$('#story-dialog').open)$('#story-dialog').showModal();
}
function renderStory(){
 if(!storyScene)return;const {index,part,intent}=storyScene,c=chapterText(index),s=c[part];
 $('#story-kicker').textContent=tr(part==='before'?'beforeBattle':'afterBattle',{n:index+1});
 $('#story-dialog-art').textContent=STAGES[index].icon;$('#story-title').textContent=s.title;$('#story-narration').textContent=s.text;
 $('#story-speaker').textContent=heroText(def(c.speaker)).name;$('#story-dialogue').textContent=s.line;$('#story-goal').textContent=c.goal;
 $('#story-next').textContent=tr(intent==='read'?'gotIt':part==='before'?'prepareAction':index===4?'backCamp':'nextChapter');
 $('#story-dismiss').hidden=intent==='read';
}
function completeStory(){
 if(!storyScene)return;const {index,part,intent}=storyScene;$('#story-dialog').close();storyScene=null;
 if(intent==='advance'&&part==='after'){
  if(index===4){stage=4;prepare();showView('lobby');}
  else{stage=index+1;prepare();openStory(stage,'before','prepare');}
 }
 saveProfile();
}
function renderJournal(){
 $('#journal-entries').innerHTML=STAGES.map((_,i)=>`<section class="journal-entry ${i>unlocked?'locked':''}"><strong>${String(i+1).padStart(2,'0')} · ${stageName(i)}</strong><div><button data-journal="${i}" data-part="before" ${i>unlocked?'disabled':''}>${tr(i>unlocked?'locked':'beforeLabel')}</button><button data-journal="${i}" data-part="after" ${!cleared.includes(i)?'disabled':''}>${tr('afterLabel')}</button></div></section>`).join('');
}
$('#language').onchange=e=>setLanguage(e.target.value);$('#story-language').onchange=e=>setLanguage(e.target.value);
$('#nav-lobby').onclick=$('#brand-home').onclick=()=>showView('lobby');$('#nav-adventure').onclick=$('#depart').onclick=enterAdventure;
$('#collection').addEventListener('click',e=>{const card=e.target.closest('[data-display]');if(!card||!OWNED_HEROES.includes(card.dataset.display))return;displayHero=card.dataset.display;renderLobby();saveProfile();$('#collection').querySelector(`[data-display="${displayHero}"]`).focus({preventScroll:true});});
$('#skin-select').onchange=e=>{if(APPEARANCES[displayHero].some(s=>s.id===e.target.value)){skinByHero[displayHero]=e.target.value;renderLobby();saveProfile();}};
$('#story-recap').onclick=()=>openStory(stage,'before','read');$('#story-next').onclick=completeStory;
$('#story-dismiss').onclick=()=>{$('#story-dialog').close();storyScene=null;};$('#story-dialog').addEventListener('cancel',()=>{storyScene=null;});
$('#journal-open').onclick=()=>{renderJournal();$('#journal-dialog').showModal();};$('#journal-close').onclick=()=>$('#journal-dialog').close();
$('#journal-entries').addEventListener('click',e=>{const button=e.target.closest('[data-journal]');if(button&&!button.disabled){$('#journal-dialog').close();openStory(Number(button.dataset.journal),button.dataset.part,'read');}});
const restoredResult=loadProfile();localizePage();prepare();
if(restoredResult){mode='win';battleResult=restoredResult;renderUI();}
profileReady=true;showView('lobby');$('#storage-warning').hidden=storageAvailable;requestAnimationFrame(frame);
