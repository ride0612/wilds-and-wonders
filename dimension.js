'use strict';
const DIMENSION_VERSION='gensokyo-01';
// 对话中的说话人：由剧情角色表生成（东方 Project 二次创作角色）
const DIMENSION_ACTORS={};
for(const [id,c] of Object.entries(STORY_CAST))DIMENSION_ACTORS[c.name]={role:c.faction[0],mark:c.name[0],color:c.tone,hero:id};
// 章末同行邀请随旧剧情一起移除；第一章剧情重写时可在此重新配置。
const RETURN_COMPANIONS={};
function freshDimensionState(){return {version:DIMENSION_VERSION,companion:null,returned:false,bookmarks:{}};}
let dimensionState=freshDimensionState(),pendingReturnCompanion=null;
function loadDimensionState(data){
 dimensionState=freshDimensionState();
 if(data?.version!==DIMENSION_VERSION)return;
 if(Object.hasOwn(RETURN_COMPANIONS,data.companion))dimensionState.companion=data.companion;
 dimensionState.returned=!!dimensionState.companion&&data.returned===true;
 for(const [key,value] of Object.entries(data.bookmarks||{}))if(/^\d+:(before|after)$/.test(key)&&Number.isInteger(value)&&value>=0&&value<200)dimensionState.bookmarks[key]=value;
}
function dimensionSpeaker(speaker){return speaker==='同行者'?(RETURN_COMPANIONS[dimensionState.companion]?.name||'同行者'):speaker==='你'?'protagonist':speaker==='抉择'?null:speaker;}
function dimensionShots(index,part){
 const route=RETURN_COMPANIONS[dimensionState.companion];
 return DIMENSION_STORY[index][part].map(line=>({speaker:dimensionSpeaker(line.speaker),choice:line.speaker==='抉择',text:line.text.replace(/\{(companion|accept|arrival|room|dinner|tomorrow)\}/g,(_,key)=>key==='companion'?(route?.name||'同行者'):(route?.[key]||'请先完成同行邀请。'))}));
}
function rememberDimensionScene(){
 if(storyScene&&cinema){dimensionState.bookmarks[storyScene.index+':'+storyScene.part]=cinema.shot;saveProfile();}
}
function dimensionActorName(id){return id==='protagonist'?tr('protagonistYou'):id||tr('cinemaNarrator');}
function showReturnCompanionPicker(){
 if(!storyScene||storyScene.index!==19||storyScene.part!=='after'||!cleared.includes(19)||dimensionState.companion)return false;
 cinema.auto=false;pendingReturnCompanion=null;renderReturnCompanionPicker();
 if(!$('#return-companion-dialog').open)$('#return-companion-dialog').showModal();
 return true;
}
function renderReturnCompanionPicker(){
 $('#return-companion-options').innerHTML=Object.entries(RETURN_COMPANIONS).map(([id,c])=>`<button type="button" data-return-companion="${id}" aria-pressed="${pendingReturnCompanion===id}"><span class="return-monogram">${DIMENSION_ACTORS[c.name].mark}</span><strong>${c.name}</strong><span>${c.summary}</span><small>${c.condition}</small></button>`).join('');
 $('#return-companion-confirm').disabled=!pendingReturnCompanion;
 $('#return-companion-preview').textContent=pendingReturnCompanion?RETURN_COMPANIONS[pendingReturnCompanion].accept:'先选择一位，阅读对方的回答，再确认邀请。确认后本存档的同行者将固定。';
}
function confirmReturnCompanion(){
 if(!storyScene||storyScene.index!==19||storyScene.part!=='after'||!cleared.includes(19)||dimensionState.companion||!Object.hasOwn(RETURN_COMPANIONS,pendingReturnCompanion))return false;
 dimensionState.companion=pendingReturnCompanion;
 // Persist the decision before closing the choice; the epilogue starts after this checkpoint.
 cinema.shot=dimensionShots(19,'after').findIndex(s=>s.choice)+1;cinema.chars=0;cinema.hold=0;cinema.auto=false;
 rememberDimensionScene();$('#return-companion-dialog').close();renderCinematic();renderDimensionArchive();return true;
}
function dimensionArchiveHtml(){
 return `<section class="dimension-archive"><small>CHAPTER 1 / STORY IN PROGRESS</small><h3>第一章档案</h3><p>第一章剧情正在编写，目前每关只有占位旁白。已通关 ${cleared.length} / ${STAGES.length} 节。</p></section>`;
}
function renderDimensionArchive(){
 const manifest=$('#dimension-manifest');if(manifest)manifest.innerHTML=dimensionArchiveHtml();
 const status=$('#dimension-status');if($('#dimension-ending'))$('#dimension-ending').disabled=!cleared.includes(19);
 if(status)status.textContent=dimensionState.returned?'已归航 · '+RETURN_COMPANIONS[dimensionState.companion].name+'同行':dimensionState.companion?'邀请已确认 · 请继续章末剧情':'第一章 · 幻想乡（剧情编写中）';
}
function initDimension(){
 $('#return-companion-options').onclick=e=>{const button=e.target.closest('[data-return-companion]');if(!button)return;pendingReturnCompanion=button.dataset.returnCompanion;renderReturnCompanionPicker();};
 $('#return-companion-confirm').onclick=confirmReturnCompanion;
 $('#return-companion-cancel').onclick=()=>$('#return-companion-dialog').close();
 $('#dimension-ending').onclick=()=>{if(!cleared.includes(19))return;closeUtilityDialogs();openStory(19,'after','read');};
 $('#cinema-log').ontoggle=()=>{if($('#cinema-log').open)renderCinematicLog();};
 renderDimensionArchive();
}
function renderCinematicLog(){
 if(!storyScene||!cinema)return;
 $('#cinema-log-lines').innerHTML=cinematicShots(storyScene.index,storyScene.part).slice(0,cinema.shot+1).map(s=>`<p><strong>${dimensionActorName(s.speaker)}</strong><span>${s.text}</span></p>`).join('');
}
// One chapter, twenty encounters, organized into four reading acts. Later worlds are not yet playable.
const DIMENSION_ACTS=[['第一幕','第 1–5 节 · 剧情待编写'],['第二幕','第 6–10 节 · 剧情待编写'],['第三幕','第 11–15 节 · 剧情待编写'],['第四幕','第 16–20 节 · 剧情待编写']];
Object.assign(TEXT,{
 brand:['绝不认书：次元回响','Never Yield: Beyond the Page','ページに屈しない：次元の残響'],
 campEyebrow:['折页计划 · 临江锚站','FOLD PROJECT · LINJIANG','折頁計画・臨江'],campTitle:['下一页，由我们出发。','The next page awaits.','次のページへ。'],campSubtitle:['穿越次元，带回希望，也带回同行的人。','Cross worlds. Bring hope and companions home.','次元を越え、希望と仲間を故郷へ。'],campSafe:['现实锚站','Reality anchor','現実の拠点'],atrium:['折页中枢','FOLD HUB','折頁中枢'],
 libraryTitle:['第一章 · 幻想乡（剧情编写中）','Chapter 1 · Gensokyo (story in progress)','第一章・幻想郷（物語制作中）'],libraryDesc:['东方 Project 二次创作 · 20 个任务节点 · 剧情正在编写，目前可直接游玩全部战斗','Touhou Project fan work · 20 encounters · Story in progress; all battles are playable','東方Project二次創作・全20戦・物語は制作中、戦闘はすべてプレイ可能'],
 chapterModes:['第一章 / 5 个任务节点 / 战前与战后对话','Chapter 1 / 5 encounters / Story scenes','第一章・5戦・戦前と戦後の会話'],chapterOne:['第一章 · 幻想乡','Chapter 1 · Gensokyo','第一章・幻想郷'],campaignTitle:['第一章 · 幻想乡（剧情编写中）','Chapter 1 · Gensokyo','第一章・幻想郷'],campaignSynopsis:['第一章剧情正在编写。','The Chapter 1 story is being written.','第一章の物語は制作中です。'],
 protagonistSubtitle:['你来自现代平行世界。故事，从一道没有被写下的门开始。','A young traveler from a parallel modern Earth.','現代の平行世界から来た若い旅人。'],protagonistRole:['折页计划 · 次元行者','Fold Project · Wayfarer','折頁計画・次元の旅人'],protagonistUniform:['行者形象','Wayfarer portrait','旅人の姿'],protagonistUniformDesc:['你的现实身份是年轻的普通人。所选形象用于大厅和剧情演出。','Your portrait represents a young civilian in the lobby and story.','若い一般人としての、ロビーと会話の表示用の姿です。'],
 storyButton:['次元远征','DIMENSION STORY','次元遠征'],completed:['第一章战斗全部完成','Chapter 1 battles cleared','第一章の戦闘をすべてクリア'],clearedCount:['第一章 {n} / 20','Chapter 1 · {n} / 20','第一章 {n} / 20'],nextChapter:['前往下一节 →','Next scene →','次の節へ →'],backCamp:['返回现实锚站 →','Return to reality →','現実の拠点へ →'],finalVictory:['第一章战斗完成','Chapter 1 complete','第一章クリア'],
 guide4:['第一章共 20 关，剧情正在编写，目前每关只有占位旁白。进度自动保存。','20 encounters. The story is being written; each stage currently has placeholder narration. Progress saves locally.','全20戦。物語は制作中で、現在は仮のナレーションのみ。進行は自動保存。'],
 ownedRoster:['幻想乡八位少女 · 全部可用','Eight Gensokyo girls · All available','幻想郷の8人・全員使用可能'],collectionSubtitle:['幻想乡的八位少女','Eight girls of Gensokyo','幻想郷の八人の少女'],relicCount:['行动记录 {n} 份','{n} records','記録{n}件'],
 allCharacters:['剧情角色','STORY CAST','物語の人物'],footer:['东方 Project 二次创作 · 非官方作品','Touhou Project fan work · Unofficial','東方Project二次創作・非公式作品']
});
DIMENSION_ACTS.forEach(([title,desc],i)=>{TEXT['dimensionAct'+i]=[title,title,title];TEXT['dimensionActDesc'+i]=[desc,desc,desc];});
CAMPAIGN_CATALOG.splice(0,CAMPAIGN_CATALOG.length,...DIMENSION_ACTS.map((_,i)=>({id:'fold-act-'+i,title:'dimensionAct'+i,subtitle:'dimensionActDesc'+i,start:i*5,stages:STAGES.slice(i*5,i*5+5),available:true,emblem:['壹','贰','叁','肆'][i]})));
STORY_RELICS.splice(0,STORY_RELICS.length);
for(let i=0;i<DIMENSION_STORY.length;i++){
 const scene=DIMENSION_STORY[i];STAGES[i].name=scene.title;STAGE_TEXT[i]=[scene.title,scene.title];
 const speaker=scene.before.find(s=>DIMENSION_ACTORS[s.speaker])?.speaker||'方晴';
 for(const locale of ['zh','en','ja'])STORY[locale][i]={speaker,goal:scene.goal,before:{title:String(i+1).padStart(2,'0')+' / '+scene.title,text:scene.before.map(s=>s.text).join(''),line:scene.before.at(-1).text},after:{title:scene.title+' / 回响',text:scene.after.map(s=>s.text).join(''),line:scene.after.at(-1).text}};
}
BOSS.name='寂蚀终端';BOSS.skill='相位震荡';
HERO_TEXT.boss[0][0]='Erosion Terminal';HERO_TEXT.boss[0][2]='Phase Shock';
HERO_TEXT.boss[1][0]='侵蝕端末';HERO_TEXT.boss[1][2]='位相振動';
