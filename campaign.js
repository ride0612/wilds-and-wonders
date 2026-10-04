'use strict';
// New releases can add chapters to this catalog. Unreleased entries never expose battle actions.
const CAMPAIGN_CATALOG=[
 {id:'red-tide',title:'chapterRedTide',subtitle:'chapterRedTideDesc',available:true,stages:STAGES,story:STORY,emblem:'◈'},
 {id:'unannounced-02',title:'chapterTwo',subtitle:'chapterPending',available:false,emblem:'Ⅱ'},
 {id:'unannounced-03',title:'chapterThree',subtitle:'chapterPending',available:false,emblem:'Ⅲ'}
];
Object.assign(TEXT,{
 storyLibrary:['剧情档案','STORY ARCHIVE','ストーリーアーカイブ'],libraryTitle:['每一次选择，都留下回响。','Every choice leaves an echo.','選択は、残響となる。'],libraryDesc:['选择章节，在同一个剧情窗口中完成阅读、布阵与战斗。','Choose a chapter. Read, deploy and fight within its campaign window.','章を選び、物語・編成・戦闘を一つの画面で進めよう。'],
 chapterRedTide:['第一章 · 赤潮来信','CHAPTER I · LETTER FROM THE RED TIDE','第一章 · 赤潮からの手紙'],chapterRedTideDesc:['一封迟到十年的录取通知，一群拥有行动代号的年轻人。龙血苏醒之夜，你选择的是命运，还是同伴？','An admission letter ten years late. Eight young operatives. When draconic blood wakes, will you choose destiny or your companions?','十年遅れの入学通知。八人の若き仲間。竜血が目覚める夜、運命と仲間のどちらを選ぶ？'],
 chapterTwo:['第二章 · 未公开','CHAPTER II · UNANNOUNCED','第二章 · 未公開'],chapterThree:['第三章 · 未公开','CHAPTER III · UNANNOUNCED','第三章 · 未公開'],chapterPending:['后续章节正在筹备','More stories to come','続く物語は準備中'],chapterModes:['5 幕剧情 / 3 场出征 / 2 场守城','5 acts / 3 expeditions / 2 defenses','全5幕 / 出征3戦 / 防衛2戦'],
 openChapter:['进入章节 →','Enter chapter →','章へ進む →'],continueChapter:['继续章节 →','Continue chapter →','章を続ける →'],backChapters:['‹ 返回剧情档案','‹ Story archive','‹ アーカイブへ'],currentAct:['第 {n} 幕','ACT {n}','第{n}幕']
});
function renderCampaignLibrary(){
 $('#chapter-cards').innerHTML=CAMPAIGN_CATALOG.map(c=>`<article class="chapter-card ${c.available?'available':'unreleased'}"><div class="chapter-emblem">${c.emblem}</div><div><div class="eyebrow">${c.available?tr('chapterModes'):tr('chapterPending')}</div><h2>${tr(c.title)}</h2><p>${tr(c.subtitle)}</p>${c.available?`<div class="chapter-progress">${STAGES.map((_,i)=>`<span class="${cleared.includes(i)?'done':''}">${i+1}</span>`).join('')}<small>${tr('clearedCount',{n:cleared.length})}</small></div>`:''}</div><button class="${c.available?'primary':''}" data-campaign="${c.id}" ${c.available?'':'disabled'}>${tr(c.available?(cleared.length||mode!=='prep'?'continueChapter':'openChapter'):'chapterPending')}</button></article>`).join('');
}
function showCampaignLibrary(){
 if(mode==='fight'){paused=true;renderUI();}
 $('#chapter-library').hidden=false;$('#chapter-mission').hidden=true;renderCampaignLibrary();clearUltimate();syncPresentationLayout();window.scrollTo(0,0);
}
function openCampaign(id='red-tide'){
 const campaign=CAMPAIGN_CATALOG.find(c=>c.id===id);if(!campaign?.available)return false;
 $('#chapter-library').hidden=true;$('#chapter-mission').hidden=false;
 if(mode==='prep')openStory(stage,'before','prepare');syncPresentationLayout();return true;
}
function initCampaign(){
 $('#back-chapters').onclick=showCampaignLibrary;
 $('#chapter-cards').addEventListener('click',e=>{const button=e.target.closest('[data-campaign]');if(button&&!button.disabled)openCampaign(button.dataset.campaign);});
 renderCampaignLibrary();
}
