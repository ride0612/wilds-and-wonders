'use strict';
const presentationSettings={effects:true,motion:true};
const STORY_RELICS=[['relicLetter','relicLetterDesc','✉'],['relicKey','relicKeyDesc','⚿'],['relicPhoto','relicPhotoDesc','▧'],['relicStar','relicStarDesc','✧'],['relicBell','relicBellDesc','◷']];
let ultimateQueue=[],ultimateActive=null;
const ultimateSeen=new Set();
function resetUltimateBattle(){clearUltimate();ultimateSeen.clear();}
function closeUtilityDialogs(){for(const id of ['extensions-dialog','collection-dialog','inventory-dialog','gacha-dialog'])if($('#'+id).open)$('#'+id).close();}
function openUtilityDialog(id){closeUtilityDialogs();$('#'+id).showModal();}
function renderInventory(){
 renderWeapons();
 $('#inventory-items').innerHTML=cleared.length?STAGES.map((s,i)=>{if(!cleared.includes(i))return '';const relic=STORY_RELICS[i];return `<article class="relic-card"><span>${relic?relic[2]:s.icon}</span><small>ACT ${String(i+1).padStart(2,'0')}</small><h3>${relic?tr(relic[0]):stageName(i)}</h3><p>${relic?tr(relic[1]):chapterText(i).after.line}</p></article>`;}).join(''):`<p class="inventory-empty">${tr('relicEmpty')}</p>`;
 $('#inventory-skins').innerHTML=OWNED_HEROES.map(id=>`<div class="owned-skin"><img src="${characterImage(id)}" alt=""><span>${heroText(def(id)).name}<small>${tr('baseSkin')}</small></span></div>`).join('');
}
function applyPresentationSettings(){
 if(document.body){document.body.classList.toggle('still-portraits',!presentationSettings.motion);document.body.classList.toggle('fx-paused',paused);}
 $('#effects-toggle').checked=presentationSettings.effects;$('#motion-toggle').checked=presentationSettings.motion;
 if(ultimateActive)renderUltimateText();
}
function syncPresentationLayout(){
 if(!document.body)return;
 document.body.dataset.view=currentView;
 const focused=currentView==='adventure'&&!$('#chapter-mission').hidden&&mode!=='prep',entering=focused&&!document.body.classList.contains('battle-focus');
 document.body.classList.toggle('battle-focus',focused);if(entering)window.scrollTo(0,0);
 document.body.classList.toggle('fx-paused',paused);
}
function clearUltimate(){ultimateQueue=[];ultimateActive=null;$('#ultimate-overlay').hidden=true;$('#ultimate-overlay').classList.remove('playing');}
function renderUltimateText(){
 const h=heroText(def(ultimateActive.id));$('#ultimate-name').textContent=(ultimateActive.team==='red'?tr('enemies')+' · ':'')+h.name;$('#ultimate-skill').textContent=h.skill;
}
function startNextUltimate(){
 if(ultimateActive||!ultimateQueue.length)return;
 ultimateActive={...ultimateQueue.shift(),time:0,duration:3.2};
 const h=def(ultimateActive.id),overlay=$('#ultimate-overlay');
 overlay.style.setProperty('--ultimate-color',CHARACTER_DESIGNS[h.id].tone);overlay.dataset.hero=h.id;
 $('#ultimate-portrait').src=characterImage(h.id,'ultimate');renderUltimateText();overlay.hidden=false;
 overlay.classList.remove('playing');void overlay.offsetWidth;overlay.classList.add('playing');
}
function triggerUltimate(u){
 if(u.stars!==6||!presentationSettings.effects||typeof currentView==='undefined'||currentView!=='adventure')return;
 // Only the first cast of each character and team in this encounter gets a cut-in.
 const key=u.team+':'+u.id;if(ultimateSeen.has(key))return;ultimateSeen.add(key);
 ultimateQueue.push({id:u.id,team:u.team});startNextUltimate();
}
function tickPresentation(dt){
 if(paused||!ultimateActive)return;
 ultimateActive.time+=dt;
 if(ultimateActive.time>=ultimateActive.duration){ultimateActive=null;$('#ultimate-overlay').hidden=true;$('#ultimate-overlay').classList.remove('playing');startNextUltimate();}
}
function initPresentation(){
 $('#extensions-toggle').onclick=()=>openUtilityDialog('extensions-dialog');
 $('#collection-open').onclick=()=>openUtilityDialog('collection-dialog');
 $('#inventory-open').onclick=()=>{renderInventory();openUtilityDialog('inventory-dialog');};
 document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>$('#'+button.dataset.close).close());
 $('#help').onclick=()=>{closeUtilityDialogs();$('#guide').showModal();};
 $('#battle-back').onclick=()=>{clearUltimate();showCampaignLibrary();syncPresentationLayout();};
 $('#effects-toggle').onchange=e=>{presentationSettings.effects=e.target.checked;if(!presentationSettings.effects)clearUltimate();saveProfile();};
 $('#motion-toggle').onchange=e=>{presentationSettings.motion=e.target.checked;applyPresentationSettings();saveProfile();};
 $('#lobby-view').addEventListener('pointermove',e=>{if(!presentationSettings.motion)return;const r=$('#lobby-view').getBoundingClientRect();$('#lobby-view').style.setProperty('--look-x',((e.clientX-r.left)/r.width-.5)*12+'px');$('#lobby-view').style.setProperty('--look-y',((e.clientY-r.top)/r.height-.5)*8+'px');});
 $('#lobby-view').addEventListener('pointerleave',()=>{$('#lobby-view').style.setProperty('--look-x','0px');$('#lobby-view').style.setProperty('--look-y','0px');});
 applyPresentationSettings();syncPresentationLayout();
}
