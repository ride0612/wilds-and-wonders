(async()=>{
 const checks=[],check=(v,label)=>{if(!v)throw Error(label);checks.push(label);};
 try{
  if(accountUser)await logoutAccount();acceptAccount(await accountApi('register','POST',{username:'v8_'+Date.now(),password:'OnlyFor-Smoke-123'}));
  $('#protagonist-female').click();$('#protagonist-name').value='星野';await confirmProtagonist();
  check(accountReady&&accountName==='星野','named account ready');check(OWNED_HEROES.join(',')==='oak,arrow'&&lineup.length===2,'fresh account owns only two story companions');check(collectionState.tickets===60,'60 initial tickets');
  $('#collection-open').click();check(document.querySelectorAll('.collection-card:disabled').length===6,'six locked companions visible');$('#collection-dialog').close();
  const initial=JSON.stringify(lineup);toggleHero('moon');check(JSON.stringify(lineup)===initial,'locked deployment blocked');
  await openGacha();check($('#gacha-dialog').open&&document.querySelectorAll('#gacha-tabs [role="tab"][data-banner]').length===4,'four pool tabs');
  // Simulate a response lost after the server committed. Retry must recover, not charge twice.
  const realApi=accountApi;let lost=false;accountApi=async(...args)=>{const data=await realApi(...args);if(args[0]==='draw'&&!lost){lost=true;throw Error('networkError');}return data;};
  await performDraw(10);check(!!gachaPending&&gachaError==='networkError','uncertain result retained for recovery');accountApi=realApi;
  await performDraw(10);check(collectionState.tickets===50&&gachaResults.length===10&&!gachaPending,'recovery spends once');
  check(['sealed','overview'].includes(gachaRevealPhase),'server results start presentation or accessible overview');
  const firstDraw=JSON.stringify(gachaResults),firstCollection=JSON.stringify(collectionState);beginGachaReveal();check(gachaRevealPhase==='sealed'&&gachaRevealIndex===0&&$('#gacha-results').hidden,'ten-pull begins with sealed card');
  $('#gacha-reveal-card').click();check(gachaRevealPhase==='revealed'&&$('#gacha-reveal-card .draw-card').classList.contains('rarity-'+gachaResults[0].stars),'card click reveals actual rarity');
  $('#gacha-reveal-next').click();check(gachaRevealPhase==='sealed'&&gachaRevealIndex===1,'next card advances in server order');
  $('#gacha-reveal-skip').click();check(gachaRevealPhase==='overview'&&!$('#gacha-results').hidden&&document.activeElement===$('#gacha-result-close'),'skip enters focused overview');
  check(JSON.stringify(collectionState)===firstCollection&&JSON.stringify(gachaResults)===firstDraw,'reveal and skip preserve results, tickets and pity');
  check(document.querySelectorAll('#gacha-results [data-card-index]').length===10,'overview preserves all ten cards');
  const firstCard=$('#gacha-results [data-card-index="0"]');firstCard.click();check(!$('#gacha-art-view').hidden&&gachaInspectItem.id===gachaResults[0].id&&$('#gacha-result').inert,'result card opens artwork with background inert');
  $('#gacha-art-close').click();check($('#gacha-art-view').hidden&&document.activeElement===firstCard,'artwork close restores result card focus');
  $('#gacha-result-close').click();check(gachaRevealPhase==='idle'&&!gachaResults.length&&!$('#gacha-dialog .gacha-layout').inert,'accept returns to recruitment');
  const galleryCollection=JSON.stringify(collectionState);let galleryRequests=0;accountApi=(...args)=>{galleryRequests++;return realApi(...args);};
  try{
   $('#gacha-gallery-open').click();check(!$('#gacha-art-view').hidden&&document.querySelectorAll('[data-gallery-id]').length===8,'free gallery includes all eight companions');
   for(const id of ['moon','knight','frost','ember']){document.querySelector('[data-gallery-id="'+id+'"]').click();check(gachaInspectItem.id===id&&$('#gacha-art-display img').getAttribute('src')===CARD_DESIGNS[id].art,'dedicated illustrated card '+id);}
   $('#gacha-art-close').click();check(document.activeElement===$('#gacha-gallery-open'),'gallery returns focus to entry');
  }finally{accountApi=realApi;}
  check(galleryRequests===0&&JSON.stringify(collectionState)===galleryCollection,'free artwork browsing makes no account request and costs nothing');
  for(let i=0;i<5;i++){await performDraw(10);skipGachaReveal();if(i<4)$('#gacha-result-close').click();}
  check(collectionState.tickets===0&&OWNED_HEROES.includes('moon'),'60 pulls guarantee featured six-star');check(collectionState.history.length===60,'server draw history');check(collectionState.pity['standard-character'].six===0,'banner pity is independent');
  check(gachaResults.length===10&&document.querySelectorAll('#gacha-results .draw-card').length===10,'ten-pull results rendered');
  const paidResults=gachaResults,rarityItems=[collectionState.history.find(x=>x.kind==='character'&&x.stars===6),collectionState.history.find(x=>x.kind==='character'&&x.stars===5)].filter(Boolean),rarityCollection=JSON.stringify(collectionState);
  for(const item of rarityItems){gachaResults=[item];beginGachaReveal();advanceGachaReveal();check($('#gacha-reveal').dataset.rarity===String(item.stars)&&$('#gacha-reveal-kicker').textContent===tr(item.stars===6?'cardSixArrival':'drawResults'),'rarity-specific reveal '+item.stars);}
  gachaResults=paidResults;skipGachaReveal();check(JSON.stringify(collectionState)===rarityCollection,'reviewing rarity presentations does not alter account');
  $('#gacha-result-close').click();$('#gacha-dialog').close();
  for(const locale of ['zh','en','ja']){setLanguage(locale);check([...document.querySelectorAll('[data-i18n]')].every(e=>e.textContent===tr(e.dataset.i18n)),'translations '+locale);}
  setLanguage('zh');const five=OWNED_HEROES.find(id=>def(id).stars===5);check(!!five,'recruited party has five-star companion');
  lineup=[{id:'oak',x:2,y:3},{id:five,x:5,y:4},{id:'arrow',x:1,y:5},{id:'moon',x:3,y:5}];defensePositions={};cleared=[];unlocked=0;showView('adventure');$('#chapter-library').hidden=true;$('#chapter-mission').hidden=false;
  for(let i=0;i<20;i++){
   stage=i;prepare();openStory(i,'before','prepare');check($('#story-dialog').open&&cinematicShots(i,'before').some(s=>s.speaker==='protagonist'),'before cutscene '+(i+1));$('#cinema-skip').click();$('#start').click();
   for(let k=0;k<3601&&mode==='fight';k++)tick(.05);check(mode==='win','playable battle '+(i+1));openStory(i,'after','advance');check(chapterText(i).after.text.length>30,'aftermath '+(i+1));completeStory();if(storyScene)dismissCinematic();
  }
  await flushAccountSave();check(cleared.length===20&&currentView==='lobby','20-stage finale returns home');check(collectionState.tickets===200,'all twenty rewards issued once');
  saveProfile();await flushAccountSave();check(collectionState.tickets===200,'replayed save does not duplicate reward');
  await openGacha();gachaBanner='limited-weapon';await performDraw(1);check(gachaResults.length===1&&collectionState.tickets===199,'single recruitment spends one ticket');beginGachaReveal();advanceGachaReveal();check(gachaRevealPhase==='revealed'&&!!$('#gacha-reveal-card svg.weapon-card-art'),'single weapon reveal uses illustrated emblem');advanceGachaReveal();check(gachaRevealPhase==='overview'&&document.querySelectorAll('#gacha-results .draw-card').length===1,'single reveal ends with one result');$('#gacha-result-close').click();
  for(let i=0;i<6;i++){await performDraw(10);skipGachaReveal();$('#gacha-result-close').click();}check(collectionState.weapons.crescent===1,'weapon hard pity');gachaResults=[];$('#gacha-dialog').close();
  setCollection((await accountApi('equip','POST',{hero:'arrow',weapon:'crescent'})).collection);const armed=createUnit('arrow','blue',0,0);check(armed.atk===def('arrow').atk+24&&armed.power===def('arrow').power+60,'weapon modifies deployed stats');
  renderInventory();check(document.querySelectorAll('.weapon-card').length>0,'weapon inventory renders');check(document.querySelectorAll('.relic-card').length===20,'all twenty mission records appear in inventory');
  for(const hero of HEROES){effects=[];units=[createUnit(hero.id,'blue',2,3),createUnit('oak','red',3,2)];emitSkillFx(units[0],units[1]);const fx=effects.find(e=>e.type==='skill');check(fx&&fx.hero===hero.id,'unique skill event '+hero.id);drawEffects();}
  effects=[];presentationSettings.effects=false;emitSkillFx(units[0],units[1]);check(!effects.length,'effects setting suppresses board effects');presentationSettings.effects=true;
  for(const [id] of Object.entries(MUSIC_TRACKS)){const audio=new Audio('assets/music/'+id+'.wav');await new Promise((resolve,reject)=>{audio.onloadedmetadata=resolve;audio.onerror=()=>reject(Error('Music decode '+id));setTimeout(()=>reject(Error('Music timeout '+id)),8000);});check(audio.duration>30&&audio.duration<60,'decoded soundtrack '+id);audio.src='';}
  musicVolume=0;musicEnabled=true;musicUnlocked=true;musicFailed=false;stage=19;prepare();showView('lobby');tickMusic(1.3);check(musicCurrent==='lobby','lobby music chosen');await new Promise(r=>setTimeout(r,500));check(!musicFailed&&musicPlayers.some(p=>p.active&&!p.audio.paused&&p.audio.currentTime>0),'native music playback advances');openStory(19,'before','read');tickMusic(1.3);check(musicCurrent==='starlit-return','chapter music chosen');dismissCinematic();showView('adventure');$('#chapter-mission').hidden=false;$('#chapter-library').hidden=true;mode='fight';tickMusic(1.3);check(musicCurrent==='battle-boss','boss music chosen');
  paused=true;mode='prep';showView('lobby');featureProtagonist=true;saveProfile();await flushAccountSave();window.smokeV8Result={passed:true,checks};
 }catch(e){window.smokeV8Result={passed:false,error:e.stack,checks};}
})();
