(() => {
 const checks=[];
 const check=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
 try{
  // The desktop host uses a test-only WebView profile, separate from the player's save.
  language='zh';displayHero='oak';cleared=[];stage=0;unlocked=0;mode='prep';battleResult=null;
  document.querySelector('#reset').click();setLanguage('zh');showView('lobby');
  check(!$('#lobby-view').hidden&&$('#adventure-view').hidden,'boots into camp');
  check(document.querySelectorAll('.collection-card').length===8,'eight owned companions');
  const originalLineup=JSON.stringify(lineup);
  document.querySelector('[data-display=moon]').click();
  check(displayHero==='moon'&&$('#display-name').textContent==='月影猎手','select featured companion');
  check(JSON.stringify(lineup)===originalLineup,'featured companion does not change lineup');
  for(const locale of ['en','ja','zh']){
   $('#language').value=locale;$('#language').dispatchEvent(new Event('change'));
   check(document.documentElement.lang===(locale==='zh'?'zh-CN':locale),'document locale '+locale);
   check($('#display-name').textContent===heroText(def('moon')).name,'localized hero '+locale);
   check([...document.querySelectorAll('[data-i18n]')].every(e=>e.textContent===tr(e.dataset.i18n)),'static translations '+locale);
   check(!document.body.innerText.includes('undefined'),'no missing strings '+locale);
   check(document.documentElement.scrollWidth<=window.innerWidth,'no horizontal overflow '+locale);
  }
  $('#depart').click();check(currentView==='adventure'&&$('#story-dialog').open,'departure opens prologue');
  $('#story-language').value='en';$('#story-language').dispatchEvent(new Event('change'));
  check($('#story-title').textContent===STORY.en[0].before.title,'live story language switch');
  $('#story-next').click();check(!$('#story-dialog').open&&mode==='prep','prologue leads to deployment');
  check(document.querySelectorAll('.hero-card').length===8,'battle roster');
  document.querySelector('[data-toggle=oak]').click();check(lineup.length===4,'remove hero');
  document.querySelector('[data-toggle=moon]').click();check(lineup.length===5,'deploy hero');
  $('#reset').click();check(lineup[0].id==='oak','reset lineup');
  canvas.setPointerCapture=()=>{};
  const r=canvas.getBoundingClientRect(),p=center(2,3),q=center(4,4);
  canvas.dispatchEvent(new PointerEvent('pointerdown',{clientX:r.left+p.x*r.width/960,clientY:r.top+p.y*r.height/660,pointerId:1}));
  canvas.dispatchEvent(new PointerEvent('pointerup',{clientX:r.left+q.x*r.width/960,clientY:r.top+q.y*r.height/660,pointerId:1}));
  check(lineup[0].x===4&&lineup[0].y===4,'drag deployment');
  $('#start').click();check(mode==='fight','start battle');
  const hpSnapshot=JSON.stringify(units.map(u=>u.hp));setLanguage('ja');
  check(mode==='fight'&&JSON.stringify(units.map(u=>u.hp))===hpSnapshot,'language switch preserves battle');
  $('#nav-lobby').click();const beforeTime=elapsed;tick(.5);
  check(paused&&elapsed===beforeTime,'camp pauses battle');
  $('#depart').click();check(paused&&!$('#story-dialog').open,'return to paused battle');
  $('#pause').click();$('#speed').click();check(!paused&&speed===2,'resume and double speed');
  for(let i=0;i<2401&&mode==='fight';i++)tick(.05);
  check(mode==='win'&&!$('#result').hidden,'first battle victory');
  setLanguage('en');check($('#continue').textContent===tr('continueStory'),'localized victory screen');
  $('#continue').click();check(storyScene.part==='after'&&stage===0,'victory opens aftermath');
  $('#story-next').click();check(stage===1&&storyScene.part==='before','aftermath unlocks next chapter');
  $('#story-next').click();
  // Complete all chapters through their UI transitions, including the final camp return.
  for(let chapter=1;chapter<5;chapter++){
   $('#reset').click();$('#start').click();
   for(let i=0;i<2401&&mode==='fight';i++)tick(.05);
   check(mode==='win','chapter '+(chapter+1)+' victory');
   $('#continue').click();check(storyScene.index===chapter&&storyScene.part==='after','chapter '+(chapter+1)+' aftermath');
   $('#story-next').click();if(chapter<4)$('#story-next').click();
  }
  check(cleared.length===5&&currentView==='lobby','finale returns to camp');
  $('#journal-open').click();check($('#journal-dialog').open,'open journal');
  check(document.querySelectorAll('[data-journal]:disabled').length===0,'all completed story pages unlocked');
  document.querySelector('[data-journal="2"][data-part="after"]').click();
  check(storyScene.intent==='read'&&$('#story-title').textContent===STORY.en[2].after.title,'journal replay');
  const priorStage=stage;$('#story-next').click();check(stage===priorStage,'replay does not change progress');
  $('#help').click();check($('#guide').open,'guide');$('#got-it').click();check(!$('#guide').open,'close guide');
  const saved=JSON.parse(localStorage.getItem(SAVE_KEY));check(saved.displayHero==='moon'&&saved.cleared.length===5,'profile saved');
  return {passed:true,count:checks.length,checks};
 }catch(error){return {passed:false,error:error.message,stack:error.stack,checks};}
})()
