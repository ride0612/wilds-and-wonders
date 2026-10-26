'use strict';
const DIMENSION_VERSION='fold-01';
const DIMENSION_ACTORS={
 '方晴':{role:'现实 · 通信员 / 你的老朋友',mark:'晴',color:'#e3b97c'},
 '沈岚':{role:'现实 · 折页计划研究负责人',mark:'岚',color:'#8ed5df'},
 '路明非':{role:'龙族世界 · 卡塞尔学院学生',mark:'路',color:'#a6cbb3'},
 '诺诺':{role:'龙族世界 · 调查协作者',mark:'诺',color:'#e49b91'},
 '楚子航':{role:'龙族世界 · 行动协作者',mark:'楚',color:'#d4b782'},
 '芬格尔':{role:'龙族世界 · 情报协作者',mark:'芬',color:'#b8acd8'},
 '凯撒':{role:'龙族世界 · 外围行动领队',mark:'凯',color:'#e3c78c'},
 '零':{role:'龙族世界 · 观测与精密支援',mark:'零',color:'#bbd1df'},
 '回声':{role:'寂蚀群 · 伪造信号',mark:'∅',color:'#b4b4c0'}
};
for(const [id,c] of Object.entries(STORY_CAST))if(DIMENSION_ACTORS[c.name])DIMENSION_ACTORS[c.name].hero=id;
const RETURN_COMPANIONS={
 lmingfei:{name:'路明非',summary:'愿意来看看另一个世界；不安会说出口，也会留意身边被忽略的人。',condition:'固定休息、独立生活、可以拒绝任务、保留返程。',
 accept:'去啊。都说到这儿了，再说不去，显得我前面那些问题像在替芬格尔做市场调查。不过你得走慢一点，我第一次出这么远的门，腿有点不听使唤。',
 arrival:'确认完是不是就能吃饭？我不是催，我只是觉得，跨过两个世界以后还能正常问一句晚饭吃什么，挺让人放心的。',
 room:'这间给我？比照片里还亮一点。我能把窗帘拉开吗？刚才总觉得脚下还在晃……没事了。树没动，是我自己还没缓过来。',
 dinner:'我没什么讲究，能吃饱就行。还有，多放一双筷子。我看门外那位值守员到现在还没换班，他应该也没吃。',
 tomorrow:'那明天叫上我吧。很厉害的事我不敢答应，听录音、认名字、帮忙搬东西总可以。至少你忙起来的时候，我会提醒你还有一顿饭没吃。'},
 nono:{name:'诺诺',summary:'带着自己的判断参与调查；会追问技术用途，也会直接指出你的逃避。',condition:'私人数据可查、任务另行同意、原世界生活与通信权保留。',
 accept:'愿意。你这一路把临江讲得快能画地图了，我得去看看你有没有夸张。箱子给我一个，别什么都往自己身上挂。先说好，到了那边，你也得听我的问题。',
 arrival:'知道，先检查。那边第二张表给我一份，我想知道数据留在哪里。还有，方晴，你比频道里听起来年轻。原来这家伙每次被你催着吃饭，面对的就是这个表情。',
 room:'窗边那个是测空气的？行。窗户果然能打开，方晴还特地替我试过吧。你看，纸杯下面压着便签——她连风大会把门吹上都写了。这个欢迎礼不错。',
 dinner:'不吃香菜，谢谢。你问得比有些研究员具体多了。等吃完饭，给我讲讲他平时是什么样的人——不是任务报告里的那种版本。',
 tomorrow:'先把今晚的误差记下来，别让一次成功把问题盖住。明天我陪你去看实际使用的人，他们的抱怨，往往比我们自己写的结论更有用。'},
 chuzihang:{name:'楚子航',summary:'以有限期协作为前提来访；重视实际准备、撤离方案与能交接的防线。',condition:'任务边界、轮值与补休、双向归航、明确的协作期限。',
 accept:'好。这里已经交接，返程时间也确认了。你的手在抖，箱子给我。过门的时候看前面，我就在旁边。',
 arrival:'好。请把紧急联系号码给我。方晴，你的手背擦伤了，检查时一起处理。饭可以再热，伤口先洗干净。',
 room:'谢谢。备用钥匙在值班室，对吗？知道了。行李我自己收，你去给家里回电话。刚才在通道里，我听见你念了两次号码。',
 dinner:'都可以。值班室那份留了吗？好。你的汤快凉了，先喝，别一直给我介绍菜。这些我认识。',
 tomorrow:'明早我和你去。带两份记录，一份留给车上的人。要是他们能自己处理，下次我们就能去更远的地方。'}
};
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
 const returned=dimensionState.returned,companion=RETURN_COMPANIONS[dimensionState.companion];
 const samples=[{stage:9,name:'止鳞箔',desc:'局部屏蔽伪造语音；归航后用于现实通信测试。'},{stage:12,name:'相位校准片',desc:'辨认真伪坐标；用于受控的返航与设备验证。'},{stage:15,name:'归航芯与共同研究记录',desc:'稳定路径的研究样本；不能直接复制全部穿越能力。'}];
 return `<section class="dimension-archive"><small>FOLD / CROSSING MANIFEST</small><h3>跨界携行档案</h3><p>${returned?'归航完成 · 成果已带回现实':companion?'邀请已确认 · 继续章末剧情完成归航':'携行舱待命 · 章末可邀请一位同行者'}</p><div class="dimension-cargo">${samples.map(s=>`<article><b>${s.name}</b><span>${cleared.includes(s.stage)?returned?'已带回现实':'已封装 · 等待归航':'尚未取得'}</span><p>${s.desc}</p></article>`).join('')}</div><h4>${companion?'同行者：'+companion.name:'同行者：尚未邀请'}</h4><p>${companion?companion.summary:'完成第 20 关并阅读战后剧情，可在路明非、诺诺、楚子航中邀请一位。'}</p><small>同行邀请影响本章结尾与现实档案。战斗可自由编队，剧情出场以当前场景为准；人物在现场移动，网格只用于报位。</small></section>`;
}
function renderDimensionArchive(){
 const manifest=$('#dimension-manifest');if(manifest)manifest.innerHTML=dimensionArchiveHtml();
 const status=$('#dimension-status');if($('#dimension-ending'))$('#dimension-ending').disabled=!cleared.includes(19);
 if(status)status.textContent=dimensionState.returned?'已归航 · '+RETURN_COMPANIONS[dimensionState.companion].name+'同行':dimensionState.companion?'邀请已确认 · 请继续章末剧情':'第一章 · 龙族世界：未写入的归航';
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
const DIMENSION_ACTS=[['现实篇 · 门从何处来','临江遭袭，加入折页计划，完成首次穿越。'],['相遇篇 · 书页之外的人','接触卡塞尔学院，调查空白站台，取得屏蔽材料。'],['并肩篇 · 两个世界的名字','跨界协作、核验真实消息，拒绝被伪造的答案。'],['归航篇 · 绝不认书','清除最后的通道污染，邀请同行者，带着成果回到现实。']];
Object.assign(TEXT,{
 brand:['绝不认书：次元回响','Never Yield: Beyond the Page','ページに屈しない：次元の残響'],
 campEyebrow:['折页计划 · 临江锚站','FOLD PROJECT · LINJIANG','折頁計画・臨江'],campTitle:['下一页，由我们出发。','The next page awaits.','次のページへ。'],campSubtitle:['穿越次元，带回希望，也带回同行的人。','Cross worlds. Bring hope and companions home.','次元を越え、希望と仲間を故郷へ。'],campSafe:['现实锚站','Reality anchor','現実の拠点'],atrium:['折页中枢','FOLD HUB','折頁中枢'],
 libraryTitle:['第一章 · 龙族世界：未写入的归航','Chapter 1 · An Unwritten Return','第一章・書かれなかった帰還'],libraryDesc:['现代现实与龙族世界交错的原创支线 · 20 个任务节点 · 长篇中文剧情 · 章末同行邀请','Original crossover · 20 encounters · Chinese story text · Choose a companion at the end','オリジナル外伝・全20戦・本文は中国語・章末に同行者を選択'],
 chapterModes:['第一章 / 5 个任务节点 / 战前与战后对话','Chapter 1 / 5 encounters / Story scenes','第一章・5戦・戦前と戦後の会話'],chapterOne:['第一章 · 未写入的归航','Chapter 1 · An Unwritten Return','第一章・書かれなかった帰還'],campaignTitle:['第一章 · 龙族世界：未写入的归航','An Unwritten Return','書かれなかった帰還'],campaignSynopsis:['为了守护遭到寂蚀群入侵的地球，你进入龙族世界调查一条被污染的归航路线。','Investigate a corrupted route home to help defend Earth.','地球を守るため、汚染された帰還路を調査する。'],
 protagonistSubtitle:['你来自现代平行世界。故事，从一道没有被写下的门开始。','A young traveler from a parallel modern Earth.','現代の平行世界から来た若い旅人。'],protagonistRole:['折页计划 · 次元行者','Fold Project · Wayfarer','折頁計画・次元の旅人'],protagonistUniform:['行者形象','Wayfarer portrait','旅人の姿'],protagonistUniformDesc:['你的现实身份是年轻的普通人。所选形象用于大厅和剧情演出。','Your portrait represents a young civilian in the lobby and story.','若い一般人としての、ロビーと会話の表示用の姿です。'],
 storyButton:['次元远征','DIMENSION STORY','次元遠征'],completed:['第一章任务完成 · 可回看归航结尾','Chapter 1 cleared · Replay the return','第一章クリア・帰還の結末を再生'],clearedCount:['第一章 {n} / 20','Chapter 1 · {n} / 20','第一章 {n} / 20'],nextChapter:['前往下一节 →','Next scene →','次の節へ →'],backCamp:['返回现实锚站 →','Return to reality →','現実の拠点へ →'],finalVictory:['归航之路已开启','The way home is open','帰還の道が開いた'],
 guide4:['第一章含现实救援与龙族世界原创调查，共 20 关。战前战后可阅读长篇中文对话、查看台词记录；章末邀请一位同行者并归航。进度与阅读位置自动保存。','20 encounters with Chinese story scenes, reading checkpoints and a final companion choice. Progress saves locally.','全20戦。中国語の長編会話、読書位置の保存、章末の同行者選択に対応。'],
 ownedRoster:['八位剧情角色 · 全部可用','Eight story characters · All available','物語の8人・全員使用可能'],collectionSubtitle:['现实与次元世界的协作者','Allies across two worlds','二つの世界の協力者'],relicCount:['行动记录 {n} 份 · 查看携行舱','{n} records · Crossing manifest','記録{n}件・携行品'],
 allCharacters:['剧情角色','STORY CAST','物語の人物'],footer:['读过故事，仍要亲自选择。','Read the story. Make your own choices.','物語を読み、自分で選ぶ。']
});
DIMENSION_ACTS.forEach(([title,desc],i)=>{TEXT['dimensionAct'+i]=[title,title,title];TEXT['dimensionActDesc'+i]=[desc,desc,desc];});
CAMPAIGN_CATALOG.splice(0,CAMPAIGN_CATALOG.length,...DIMENSION_ACTS.map((_,i)=>({id:'fold-act-'+i,title:'dimensionAct'+i,subtitle:'dimensionActDesc'+i,start:i*5,stages:STAGES.slice(i*5,i*5+5),available:true,emblem:['序','遇','证','归'][i]})));
STORY_RELICS.splice(0,STORY_RELICS.length);
for(let i=0;i<DIMENSION_STORY.length;i++){
 const scene=DIMENSION_STORY[i];STAGES[i].name=scene.title;STAGE_TEXT[i]=[scene.title,scene.title];
 const speaker=scene.before.find(s=>DIMENSION_ACTORS[s.speaker])?.speaker||'方晴';
 for(const locale of ['zh','en','ja'])STORY[locale][i]={speaker,goal:scene.goal,before:{title:String(i+1).padStart(2,'0')+' / '+scene.title,text:scene.before.map(s=>s.text).join(''),line:scene.before.at(-1).text},after:{title:scene.title+' / 回响',text:scene.after.map(s=>s.text).join(''),line:scene.after.at(-1).text}};
}
BOSS.name='寂蚀终端';BOSS.skill='相位震荡';
HERO_TEXT.boss[0][0]='Erosion Terminal';HERO_TEXT.boss[0][2]='Phase Shock';
HERO_TEXT.boss[1][0]='侵蝕端末';HERO_TEXT.boss[1][2]='位相振動';
