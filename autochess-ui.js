/* 自走棋界面与流程：招募终端、羁绊、敌情、经济、强化、结算，以及与剧情章节的衔接。
   对外沿用主线脚本期望的全局函数：prepare / renderUI / renderLog / frame / openStory 流程。 */
'use strict';
const ACD=ACData,LI=()=>({zh:0,en:1,ja:2})[language]||0;
// 无界面测试环境里可能没有计时器，统一经由这两个函数调用
const acLater=(fn,ms)=>typeof setTimeout==='function'?setTimeout(fn,ms):0,acCancel=h=>{if(h&&typeof clearTimeout==='function')clearTimeout(h);};
let acState=new AC.State(),acBattle=null,acSimAcc=0,acHitstop=0,acLast=0,acPendingAugments=null,acHover=null,acPinned=null,acDrag=null,acDomTick=0,acResultTimer=0,acTimeoutHandles=[],acResultReady=false;

// ---------- 文案 ----------
Object.assign(TEXT,{
 acSynergy:['羁绊','Synergy','シナジー'],acIntel:['敌情侦测','Hostile Intel','敵情偵察'],acDamage:['输出统计','Damage','与ダメージ'],acRecruit:['招募终端','Recruit','募集端末'],
 acLock:['锁定','Lock','ロック'],acLocked:['已锁定','Locked','ロック中'],acXp:['经验','XP','経験'],acReroll:['刷新','Reroll','更新'],acLevel:['等级','LEVEL','レベル'],acGold:['金币','GOLD','ゴールド'],
 acInterest:['利息 +{n}','INTEREST +{n}','利息 +{n}'],acStart:['开始作战','ENGAGE','作戦開始'],acStartSub:['自动结算战斗','AUTO-RESOLVE COMBAT','オート戦闘'],acEngaged:['交战中','ENGAGED','交戦中'],
 acSpeed:['战斗速度','Speed','戦闘速度'],acIntegrity:['终端完整度','Integrity','端末耐久'],acDeploy:['部署','DEPLOY','配置'],acSellHint:['拖回此处出售 · 悬停按 E','Drag here to sell · E sells hovered','ここへドラッグで売却・Eで売却'],
 acSell:['出售 +{n} 金币','SELL +{n} GOLD','売却 +{n}G'],acFull:['部署已满 · 提升等级可增加上限','Board full · Level up for more slots','配置上限です・レベルを上げましょう'],acNoUnits:['先从招募终端购买棋子','Recruit units from the shop first','まず募集端末でユニットを入手'],
 acNoGold:['金币不足','Not enough gold','ゴールド不足'],acBenchFull:['备战席已满','Bench is full','待機席が満杯'],acWave:['第 {n} / {total} 波来袭','WAVE {n} / {total}','第{n} / {total}波'],acWaves:['分波守点 · {n} 波','DEFENSE · {n} WAVES','防衛 · {n}波'],
 acBoss:['首领','BOSS','ボス'],acAugmentTitle:['选择战术协议','Choose a Tactical Protocol','戦術プロトコルを選択'],acAugmentSub:['三选一，本存档永久生效','Pick one. It lasts for this save.','1つ選択・このセーブで永続'],
 acVictory:['作战成功','VICTORY','作戦成功'],acBreached:['防线受损','BREACHED','防衛線損傷'],acReward:['奖励 +{n} 金币','Reward +{n} gold','報酬 +{n}G'],acRelief:['重整补给 +{n} 金币 · 经验 +1','Regroup supply +{n} gold · XP +1','再編補給 +{n}G・経験+1'],
 acOverload:['终端过载：金币减半，完整度已重置','Terminal overload: gold halved, integrity restored','端末過負荷：ゴールド半減・耐久リセット'],acPractice:['重温关卡 · 不消耗完整度、不发放奖励','Replay · No rewards or integrity loss','再挑戦・報酬と損傷なし'],
 acRetry:['调整阵容再战 ↻','Regroup & retry ↻','編成して再挑戦 ↻'],acStay:['留在本关继续整备','Stay and refine','このステージで整備'],acMvp:['MVP · {name}','MVP · {name}','MVP · {name}'],acIncome:['关卡补给 +{n} 金币 · 经验 +{x}','Stage supply +{n} gold · XP +{x}','ステージ補給 +{n}G・経験+{x}'],
 acCost:['{n} 费','{n} COST','{n}コスト'],acHp:['生命','HP','HP'],acAtk:['攻击','ATK','攻撃'],acAs:['攻速','AS','攻速'],acRange:['射程','RANGE','射程'],acArmor:['护甲','ARMOR','防御'],acMana:['法力','MANA','マナ'],acSkill:['技能','SKILL','スキル'],
 acStory:['剧情协作者','STORY ALLY','物語の協力者'],acHostile:['寂蚀群','HOSTILE','寂蝕群'],acTime:['用时','TIME','時間'],acSurvive:['存活','SURVIVORS','生存'],acPhasePlan:['备战阶段','PLANNING','準備フェーズ'],acPhaseFight:['交战中','ENGAGED','交戦中'],
 acPhaseWin:['作战成功','CLEARED','クリア'],acPhaseLose:['防线受损','BREACHED','損傷'],acEngageBanner:['交战开始','ENGAGE','交戦開始'],acMerged:['升星 ★{n}','STAR UP ★{n}','スターアップ ★{n}'],acLevelUp:['等级提升 · 部署上限 {n}','Level up · {n} slots','レベルアップ・配置{n}'],
 acNoSynergy:['把棋子部署到棋盘后，这里会显示激活的羁绊。','Deploy units to see active synergies.','ユニットを配置するとシナジーが表示されます。'],acHint:['拖动棋子部署 · D 刷新 · F 经验 · 空格开战','Drag to deploy · D reroll · F XP · Space to engage','ドラッグで配置・D更新・F経験・Space開戦'],
 acEnemies:['剩余敌人','HOSTILES','残敵'],acAllies:['我方存活','ALLIES','味方'],acUnsupported:['此设备无法启用 WebGL 2 3D 战场。战斗仍会自动结算。','WebGL 2 is unavailable. Battles still auto-resolve.','WebGL 2 を利用できません。戦闘は自動で決着します。'],
 acAugmentPending:['先选择战术协议','Choose a protocol first','先にプロトコルを選択'],acBench:['备战席','BENCH','待機席'],acOdds:['招募概率','ODDS','確率'],acTier:['阶','TIER','ティア'],acStars:['星','STAR','星'],
 guide1:['招募终端每关刷新 5 名棋子。点击卡片招募到备战席，再拖到棋盘下方四行部署；部署上限等于等级。三个相同棋子自动合成更高星级。','The shop offers 5 units each stage. Buy units to the bench, then drag them onto the lower four rows. Your level is your deployment cap. Three copies merge into a higher star.','募集端末で5体が並びます。購入して待機席へ、盤面下4列へドラッグで配置。配置上限はレベルと同じ。同じユニット3体で星が上がります。'],
 guide2:['金币：每关首次进入获得 5 金币 + 利息（每 10 金币 +1，最多 5）。刷新 2 金币，购买 4 经验 4 金币。棋子普攻和受击积攒法力，满额自动施放技能。','Gold: +5 per new stage plus interest (1 per 10 gold, max 5). Reroll costs 2, 4 XP costs 4. Attacks and hits build mana; full mana casts the skill.','新ステージで5G＋利息（10Gごと+1、最大5）。更新2G、経験4で4G。攻撃と被弾でマナが溜まり、満タンでスキル発動。'],
 guide3:['羁绊按棋盘上不同棋子计数：重装、锐射、源术、迅袭、晨星、回响。八位剧情角色也会出现在招募终端里。第 2、6、10、14、18 关可选择战术协议。','Synergies count distinct units on the board. The eight story characters also appear in the shop. Stages 2, 6, 10, 14 and 18 offer a tactical protocol.','シナジーは盤上の異なるユニット数で発動。物語の8人も募集に登場。第2・6・10・14・18戦でプロトコルを選べます。'],
 guide4:['失败会扣除终端完整度，并发放重整补给后重打本关；完整度归零只会过载重置，不会删除进度。剧情、阵容、金币与星级自动保存在本机。','Losing costs integrity and grants regroup supplies before you retry. At zero integrity the terminal overloads and resets; progress is never deleted. Story, roster, gold and stars save locally.','敗北すると耐久が減り、補給を得て再挑戦。耐久0で過負荷リセット、進行は消えません。物語・編成・ゴールド・星は端末に保存。']
});
const SKILL_DESC={shield_self:['Gains {v} shield.','{v}のシールドを得る。'],shield_near:['Grants {v} shield to self and the two nearest allies.','自身と最寄りの味方2人に{v}のシールド。'],team_shield:['Grants {v} shield to every ally.','味方全員に{v}のシールド。'],
 pierce:['Fires a piercing shot that deals {v} to every enemy in a line.','直線上の敵全員に{v}ダメージ。'],aoe:['Hurls a blast that deals {v} around the target.','対象周囲に{v}の範囲ダメージ。'],nova:['Deals {v} around the target and briefly disables them.','対象周囲に{v}ダメージ＋短時間行動不能。'],
 strike:['A rapid combo on the target for {v} damage.','対象に連撃で{v}ダメージ。'],snipe:['A precision shot for {v} damage.','{v}の精密射撃。'],slam:['Slams the ground for {v} damage nearby and stuns.','周囲に{v}ダメージ＋スタン。'],multi:['Fires at the 4 nearest enemies for {v} each.','近い敵4体に各{v}ダメージ。'],
 blink:['Blinks to the weakest enemy and deals {v}.','最も弱い敵へ瞬間移動し{v}ダメージ。'],meteor:['Drops a meteor on the densest cluster for {v}.','密集地点へ隕石、{v}ダメージ。'],heal:['Heals the weakest ally for {v}, nearby allies for half.','最も弱い味方を{v}回復、周囲は半分。']};
const TRAIT_ICON={bulwark:'<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/>',marksman:'<circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 1h2v6h-2zM11 17h2v6h-2zM1 11h6v2H1zM17 11h6v2h-6z"/>',
 arcanist:'<path d="M12 1l2.6 7.4L22 11l-7.4 2.6L12 21l-2.6-7.4L2 11l7.4-2.6z"/>',striker:'<path d="M14 1 4 14h7l-2 9 11-14h-7z"/>',dawn:'<circle cx="12" cy="12" r="4.5"/><path d="M11 0h2v4h-2zM11 20h2v4h-2zM0 11h4v2H0zM20 11h4v2h-4zM3.5 5l1.4-1.4 2.8 2.8-1.4 1.4zM16.3 17.6l1.4-1.4 2.8 2.8-1.4 1.4zM3.5 19l2.8-2.8 1.4 1.4-2.8 2.8zM16.3 6.4l2.8-2.8 1.4 1.4-2.8 2.8z"/>',
 echo:'<path d="M4 9h3v6H4zM9 6h2v12H9zM13 3h2v18h-2zM17 7h3v10h-3z"/>'};
const traitSvg=t=>`<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${TRAIT_ICON[t]||''}</svg>`;

// ---------- 名称与说明 ----------
function acName(id){const u=ACD.UNITS[id];if(u)return u.story?heroText(def(id)).name:u.name[LI()];const e=ACD.ENEMIES[id];return e?e.name[LI()]:id;}
function acSkillName(id){const u=ACD.UNITS[id]||ACD.ENEMIES[id];if(!u||!u.skill)return '';if(u.story)return heroText(def(id)).skill;return u.skill.name?u.skill.name[LI()]:'';}
function acSkillDesc(id,star=1){const u=ACD.UNITS[id];if(!u)return '';const v=Math.round(u.skill.values[star]),tpl=LI()===0?u.skill.desc:SKILL_DESC[u.skill.type][LI()-1];return tpl.replace('{v}',v);}
function acTraitName(t){return ACD.TRAITS[t].name[LI()];}
function acPortrait(id){const u=ACD.UNITS[id];if(u&&u.story&&typeof characterImage==='function')return characterImage(id);return ACRender.portraits[id]||('assets/autochess/units/'+id+'.png');}
function acCardArt(id){return ACRender.portraits[id]||(ACD.UNITS[id]?.story?characterImage(id):'assets/autochess/units/'+id+'.png');}
ACRender.skillName=u=>acSkillName(u.id);ACRender.unitName=a=>acName(a.id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ---------- 阶段流程 ----------
function isDefense(){return !!ACD.ENCOUNTERS[stage]?.waves;}
function renderLog(){}
function clearAcTimers(){acTimeoutHandles.forEach(acCancel);acTimeoutHandles=[];}
function prepare(){
 clearAcTimers();mode='prep';paused=false;battleResult=null;acHitstop=0;
 if(acBattle){acBattle.clear();acBattle=null;}
 if(ACRender.active)ACRender.endCombat();
 const grant=acState.grantStage(stage);
 if(grant&&grant.income)acToast(tr('acIncome',{n:grant.income,x:grant.xp}),'gold');
 if(ACD.AUGMENT_STAGES.includes(stage)&&!acState.offered.includes(stage)){acState.offered.push(stage);acPendingAugments=acState.offerAugments();}
 $('#result').hidden=true;renderUI();saveProfile();
}
function acStartCombat(){
 if(mode!=='prep')return;
 if(acPendingAugments){acToast(tr('acAugmentPending'),'warn');return;}
 acState.autoPlaceFromBench();
 if(!acState.boardCount()){acToast(tr('acNoUnits'),'warn');renderUI();return;}
 mode='fight';paused=false;acSimAcc=0;resetUltimateBattle();acPinned=null;
 acBattle=new AC.Battle();acBattle.on(acOnBattle);
 if(ACRender.active){ACRender.syncPlanning(acState,ACD.ENCOUNTERS[stage],false);ACRender.beginCombat();}
 acBattle.start(acState,ACD.ENCOUNTERS[stage]);
 acBanner(tr('acEngageBanner'),'STAGE '+String(stage+1).padStart(2,'0')+' · '+stageName(stage),'engage');
 renderUI();
}
function acOnBattle(type,d){
 if(ACRender.active)ACRender.onBattleEvent(type,d);
 if(type==='hitstop')acHitstop=Math.max(acHitstop,d.dur);
 else if(type==='cast'&&d.u.team===0&&ACD.UNITS[d.u.id]?.story)triggerUltimate({id:d.u.id,team:'blue',cinematic:def(d.u.id).cinematic});
 else if(type==='wave')acBanner(tr('acWave',{n:d.n,total:d.total}),'HOSTILE REINFORCEMENT','wave');
 else if(type==='finish')acFinish(d);
}
function acFinish(d){
 const practice=cleared.includes(stage),enc=ACD.ENCOUNTERS[stage],res=acState.applyResult(d.won,d.surviving,!!enc.boss,practice);
 mode=d.won?'win':'lose';
 if(d.won){if(!cleared.includes(stage))cleared.push(stage);unlocked=Math.max(unlocked,Math.min(STAGES.length-1,stage+1));}
 const allies=acBattle?acBattle.alive(0).length:0;
 battleResult={win:d.won,timeout:d.timeout,time:d.time,survivors:allies,mvp:d.mvp,damage:res.damage,relief:res.relief,overload:res.overload,practice,report:acBattle?acBattle.damageReport():[]};
 if(ACRender.active)ACRender.setVictory(d.won?0:1);
 acBanner(tr(d.won?'acVictory':'acBreached'),d.won?(practice?'REPLAY CLEAR':'REWARD +1 GOLD'):'INTEGRITY -'+res.damage,d.won?'win':'lose');
 saveProfile();renderUI();
 acResultReady=false;acTimeoutHandles.push(acLater(()=>{acResultReady=true;renderResult();},1500));
}
function renderResult(){
 if(!battleResult){$('#result').hidden=true;return;}
 const r=battleResult,mvp=r.mvp?acName(r.mvp.id):'—',max=Math.max(1,...(r.report||[]).map(x=>x.dealt));
 const rows=(r.report||[]).slice(0,5).map(x=>`<div class="ac-res-row"><img src="${acPortrait(x.id)}" alt=""><span>${esc(acName(x.id))} <i>${'★'.repeat(x.star)}</i></span><div class="ac-res-bar"><b style="width:${100*x.dealt/max}%"></b></div><em>${Math.round(x.dealt)}</em></div>`).join('');
 const notes=r.win?(r.practice?tr('acPractice'):tr('acReward',{n:1})):[r.practice?tr('acPractice'):tr('acRelief',{n:r.relief}),r.overload?tr('acOverload'):''].filter(Boolean).join(' · ');
 $('#result').className='ac-result '+(r.win?'win':'lose');
 $('#result').innerHTML=`<div class="ac-res-card"><small>${r.win?'MISSION CLEARED':'DEFENSE BREACHED'} · STAGE ${String(stage+1).padStart(2,'0')}</small><h2>${tr(r.win?(stage===STAGES.length-1?'finalVictory':'acVictory'):'acBreached')}</h2>
 <div class="ac-res-stats"><div><small>${tr('acTime')}</small><b>${formatTime(r.time)}</b></div><div><small>${tr('acSurvive')}</small><b>${r.survivors}</b></div><div><small>MVP</small><b>${esc(mvp)}</b></div>${r.win?'':`<div><small>${tr('acIntegrity')}</small><b>−${r.practice?0:r.damage}</b></div>`}</div>
 <div class="ac-res-list">${rows}</div><p>${notes}</p><div class="ac-res-actions">${r.win?`<button class="ac-btn ghost" id="ac-stay">${tr('acStay')}</button><button class="ac-btn primary" id="continue">${tr('continueStory')}</button>`:`<button class="ac-btn primary" id="continue">${tr('acRetry')}</button>`}</div></div>`;
 $('#result').hidden=false;
 $('#continue').onclick=()=>{$('#result').hidden=true;if(r.win)openStory(stage,'after','advance');else prepare();};
 const stay=$('#ac-stay');if(stay)stay.onclick=()=>{$('#result').hidden=true;prepare();};
}
function formatTime(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');}

// ---------- 商店与操作 ----------
function acBuy(i){
 if(mode!=='prep')return;const id=acState.shop[i];if(!id)return;
 if(acState.gold<ACD.UNITS[id].cost){acToast(tr('acNoGold'),'warn');return;}
 const res=acState.buy(i);if(!res.ok){acToast(tr('acBenchFull'),'warn');return;}
 renderUI();
 for(const m of res.merges){if(ACRender.active)ACRender.mergeFx(m.unit.uid);acToast(acName(m.unit.id)+' · '+tr('acMerged',{n:m.unit.star}),'star');}
 saveProfile();
}
function acReroll(){if(mode!=='prep')return;if(!acState.reroll()){acToast(tr('acNoGold'),'warn');return;}document.querySelectorAll('.ac-card').forEach((c,i)=>{c.classList.remove('deal');void c.offsetWidth;c.style.animationDelay=i*.04+'s';c.classList.add('deal');});renderUI();saveProfile();}
function acBuyXp(){if(mode!=='prep')return;const r=acState.buyXp();if(!r){acToast(tr('acNoGold'),'warn');return;}if(r===2)acToast(tr('acLevelUp',{n:acState.level}),'gold');renderUI();saveProfile();}
function acSell(u){if(mode!=='prep'||!u)return;const v=acState.sell(u);if(v){acToast(tr('acSell',{n:v}),'gold');renderUI();saveProfile();}}
function acPickAugment(a){if(!acPendingAugments)return;acState.takeAugment(a);acPendingAugments=null;renderUI();saveProfile();}
function acUnitByKey(key){if(!key||key[0]!=='u')return null;const uid=+key.slice(1);return acState.bench.find(u=>u&&u.uid===uid)||Object.values(acState.board).find(u=>u.uid===uid)||null;}

// ---------- 提示 ----------
function acToast(text,kind=''){const box=$('#ac-toast');if(!box)return;const el=document.createElement('div');el.className='ac-toast-item '+kind;el.textContent=text;box.append(el);acLater(()=>el.classList.add('out'),1700);acLater(()=>el.remove(),2200);while(box.children.length>4&&box.firstChild)box.firstChild.remove();}
function acBanner(title,sub,kind){const b=$('#ac-banner');if(!b)return;b.className='ac-banner '+kind;b.innerHTML=`<div class="ac-banner-band"><small>${esc(sub)}</small><b>${esc(title)}</b></div>`;b.hidden=false;void b.offsetWidth;b.classList.add('show');acCancel(b._t);b._t=acLater(()=>{b.classList.remove('show');b.hidden=true;},kind==='engage'?1300:1900);}

// ---------- 界面渲染 ----------
function renderUI(){
 if(!$('#ac-root'))return;
 const enc=ACD.ENCOUNTERS[stage],li=LI(),root=$('#ac-root');
 root.dataset.phase=mode;root.dataset.defense=isDefense();
 $('#ac-stage-num').textContent=String(stage+1).padStart(2,'0');$('#ac-stage-total').textContent='/ '+STAGES.length;
 $('#stage-title').textContent=stageName(stage);
 const ph={prep:['PLANNING','acPhasePlan'],fight:['ENGAGED','acPhaseFight'],win:['CLEARED','acPhaseWin'],lose:['BREACHED','acPhaseLose']}[mode];
 $('#phase').textContent=ph[0];$('#ac-phase-cn').textContent=tr(ph[1]);
 $('#ac-mode-tag').textContent=enc.boss?tr('acBoss'):enc.waves?tr('acWaves',{n:enc.waves.length}):tr('modeExpedition').split('·')[0].trim();
 $('#ac-mode-tag').dataset.kind=enc.boss?'boss':enc.waves?'defense':'exp';
 // 关卡进度点
 $('#stages').innerHTML=STAGES.map((_,i)=>{const e=ACD.ENCOUNTERS[i],cls=['ac-pip',e.boss?'boss':e.waves?'def':'',cleared.includes(i)?'done':'',i===stage?'now':'',i>unlocked?'locked':''].join(' ');return `${i%5===0?`<span class="ac-pip-sep">${['Ⅰ','Ⅱ','Ⅲ','Ⅳ'][i/5]}</span>`:''}<button class="${cls}" data-stage="${i}" title="${String(i+1).padStart(2,'0')} · ${esc(stageName(i))}" ${i>unlocked||mode==='fight'?'disabled':''}></button>`;}).join('');
 $('#ac-augments').innerHTML=acState.augments.map(a=>`<span class="ac-aug" title="${esc(ACD.AUGMENTS[a].name[li]+' · '+ACD.AUGMENTS[a].desc[li])}">${ACD.AUGMENTS[a].icon}</span>`).join('')+Array(Math.max(0,3-acState.augments.length)).fill('<span class="ac-aug empty"></span>').join('');
 $('#ac-chapter').textContent=tr(CAMPAIGN_CATALOG[Math.floor(stage/5)]?.title||'chapterOne');
 // 完整度
 $('#ac-int-value').textContent=acState.hp;$('#ac-int-fill').style.width=acState.hp+'%';
 renderTraitsPanel();renderIntel();renderEcon();renderShop();renderEngage();renderAugmentPicker();
 if(typeof updateStoryBrief==='function')updateStoryBrief();
 if(mode==='prep'&&ACRender.active)ACRender.syncPlanning(acState,enc,true);
 if(ACRender.active)ACRender.setStage(stage);
 if(battleResult&&acResultReady&&(mode==='win'||mode==='lose'))renderResult();else if(mode==='prep'||mode==='fight')$('#result').hidden=true;
 if(typeof syncPresentationLayout==='function')syncPresentationLayout();
}
function renderTraitsPanel(){
 const counts=acState.traitCounts(),li=LI(),ids=Object.keys(counts).sort((a,b)=>ACD.traitLevel(b,counts[b])-ACD.traitLevel(a,counts[a])||counts[b]-counts[a]);
 const active=ids.filter(t=>ACD.traitLevel(t,counts[t])>0).length;$('#trait-count').textContent=String(active).padStart(2,'0')+' ACTIVE';
 $('#traits').innerHTML=ids.length?ids.map(t=>{const tr_=ACD.TRAITS[t],n=counts[t],lv=ACD.traitLevel(t,n),next=tr_.thresholds.find(x=>x>n),v=lv?tr_.values[lv-1]:tr_.values[0];
  return `<div class="ac-trait ${lv?'on lv'+lv:''}" title="${esc(tr_.desc[li].replace('{v}',v)+' · '+tr_.thresholds.map((x,i)=>x+': '+tr_.values[i]).join(' / '))}"><span class="ac-hex">${traitSvg(t)}</span><div class="ac-trait-txt"><small>${tr_.en}</small><b>${esc(tr_.name[li])}</b></div><div class="ac-trait-num"><b>${n}</b><span>${tr_.thresholds.map(x=>`<i class="${n>=x?'on':''}">${x}</i>`).join('<em>›</em>')}</span></div><div class="ac-trait-desc">${esc(tr_.desc[li].replace('{v}',v))}${next?` · ${next-n} → ${next}`:''}</div></div>`;}).join(''):`<p class="ac-empty">${tr('acNoSynergy')}</p>`;
}
function renderIntel(){
 const enc=ACD.ENCOUNTERS[stage],li=LI(),fighting=mode!=='prep'&&acBattle;
 $('#ac-intel').hidden=!!fighting;$('#ac-damage').hidden=!fighting;
 if(!fighting){
  const groups={};ACD.encounterEnemies(enc).forEach(([id,,,m])=>{(groups[id]||(groups[id]={id,n:0,m})).n++;});
  const rows=Object.values(groups).sort((a,b)=>(ACD.ENEMIES[b.id].boss?1:0)-(ACD.ENEMIES[a.id].boss?1:0)||b.n-a.n).map(g=>{const e=ACD.ENEMIES[g.id];return `<div class="ac-intel-row ${e.boss?'boss':''}" data-enemy="${g.id}"><span class="ac-intel-mark">${e.boss?'◆':'◇'}</span><div><small>${e.en}</small><b>${esc(e.name[li])}</b></div><em>×${g.n}</em><span class="ac-intel-stats">HP ${Math.round(e.hp*g.m)} · ATK ${Math.round(e.atk*g.m)}</span></div>`;}).join('');
  $('#ac-intel-count').textContent='×'+String(ACD.encounterEnemies(enc).length).padStart(2,'0');
  $('#ac-intel-list').innerHTML=(enc.waves?`<div class="ac-intel-waves">${tr('acWaves',{n:enc.waves.length})}</div>`:'')+rows;
 }
}
function renderDamage(){
 if(!acBattle)return;const rep=acBattle.damageReport(),max=Math.max(1,...rep.map(r=>r.dealt));
 $('#ac-damage-list').innerHTML=rep.map(r=>`<div class="ac-dmg-row ${r.alive?'':'down'}"><img src="${acPortrait(r.id)}" alt=""><div><span>${esc(acName(r.id))}<i>${'◆'.repeat(r.star)}</i></span><div class="ac-dmg-bar"><b style="width:${100*r.dealt/max}%"></b>${r.healed?`<b class="heal" style="width:${Math.min(100,100*r.healed/max)}%"></b>`:''}</div></div><em>${Math.round(r.dealt)}</em></div>`).join('');
 $('#ac-allies').textContent=acBattle.alive(0).length;$('#ac-hostiles').textContent=acBattle.enemiesLeft();
 const w=$('#ac-wave');w.hidden=acBattle.waves.length<2;w.textContent=tr('acWave',{n:acBattle.waveIdx+1,total:acBattle.waves.length});
}
function renderEcon(){
 const s=acState,need=s.xpNeeded(),pct=need?s.xp/need:1;
 $('#ac-level').textContent=String(s.level).padStart(2,'0');$('#ac-xp').textContent=s.level>=ACD.MAX_LEVEL?'MAX':s.xp+' / '+need;
 $('#ac-xp-ring').style.strokeDashoffset=String(289*(1-pct));
 $('#ac-gold').textContent=s.gold;$('#ac-interest').textContent=tr('acInterest',{n:s.interest()});
 $('#ac-interest-pips').innerHTML=Array.from({length:5},(_,i)=>`<i class="${i<s.interest()?'on':''}"></i>`).join('');
 $('#ac-btn-xp').disabled=mode!=='prep'||s.gold<ACD.XP_COST||s.level>=ACD.MAX_LEVEL;$('#ac-btn-reroll').disabled=mode!=='prep'||s.gold<ACD.REROLL_COST;
}
function renderShop(){
 const s=acState,li=LI(),odds=ACD.SHOP_ODDS[s.level];
 $('#ac-odds').innerHTML=odds.map((p,i)=>`<span style="--c:${ACD.COST_COLORS[i+1]}"><i></i>T${i+1} <b>${p}%</b></span>`).join('');
 $('#ac-lock').classList.toggle('on',s.shopLocked);$('#ac-lock span').textContent=tr(s.shopLocked?'acLocked':'acLock');
 $('#ac-cards').innerHTML=s.shop.map((id,i)=>{
  if(!id)return `<div class="ac-card empty"><span>SOLD</span></div>`;
  const u=ACD.UNITS[id],own=s.countCopies(id,1),aff=s.gold>=u.cost;
  return `<button class="ac-card t${u.cost} ${aff?'':'poor'} ${own>=2?'merge':''} ${mode!=='prep'?'dim':''}" data-buy="${i}" style="--tier:${ACD.COST_COLORS[u.cost]}" ${mode!=='prep'?'disabled':''}>
   <span class="ac-card-tier">T${u.cost}</span>${u.story?`<span class="ac-card-story">${tr('acStory')}</span>`:''}
   <span class="ac-card-art"><img src="${acCardArt(id)}" alt="" loading="lazy" class="${ACRender.portraits[id]?'r3d':'flat'}"></span>
   <span class="ac-card-traits">${u.traits.map(t=>`<i title="${esc(acTraitName(t))}">${traitSvg(t)}</i>`).join('')}</span>
   <span class="ac-card-foot"><b>${esc(acName(id))}</b><small>${u.traits.map(acTraitName).join(' / ')}</small><span class="ac-coin">${u.cost}</span></span>
   ${own?`<span class="ac-card-own">${'◆'.repeat(Math.min(own,2))}${own>=2?' ↑★':''}</span>`:''}</button>`;}).join('');
}
function renderEngage(){
 const s=acState,start=$('#start');
 $('#ac-deploy').textContent=s.boardCount()+' / '+s.boardCap();$('.ac-deploy').classList.toggle('more',mode==='prep'&&s.benchCount()>0&&s.boardCount()<s.boardCap());
 start.disabled=mode!=='prep'||(!s.boardCount()&&!s.benchCount());start.classList.toggle('engaged',mode==='fight');
 $('#ac-start-title').textContent=tr(mode==='fight'?'acEngaged':'acStart');$('#ac-start-sub').textContent='STAGE '+String(stage+1).padStart(2,'0')+' · '+stageName(stage);
 $('#speed').textContent='×'+speed;$('#speed').classList.toggle('on',speed>1);
 $('#pause').disabled=mode!=='fight';$('#pause').textContent=paused?'▶':'❚❚';$('#pause').title=tr(paused?'resume':'pause');
}
function renderAugmentPicker(){
 const box=$('#ac-augment'),li=LI();if(!box)return;
 const show=!!acPendingAugments&&mode==='prep';box.hidden=!show;if(!show)return;
 box.innerHTML=`<div class="ac-aug-head"><small>TACTICAL PROTOCOL · STAGE ${String(stage+1).padStart(2,'0')}</small><h2>${tr('acAugmentTitle')}</h2><p>${tr('acAugmentSub')}</p></div><div class="ac-aug-cards">${acPendingAugments.map((a,i)=>{const g=ACD.AUGMENTS[a];return `<button class="ac-aug-card" data-aug="${a}" style="animation-delay:${i*.08}s"><span class="ac-aug-icon">${g.icon}</span><small>${g.en}</small><b>${esc(g.name[li])}</b><p>${esc(g.desc[li])}</p></button>`;}).join('')}</div>`;
}
// 单位档案（悬停 / 点击）
function renderUnitFile(info){
 const box=$('#ac-unitfile');if(!box)return;if(!info){box.hidden=true;return;}
 const li=LI();let html='';
 if(info.enemyType){const e=ACD.ENEMIES[info.id],m=info.strength||1;
  html=`<div class="ac-uf-head enemy"><small>[ HOSTILE FILE ]</small><span>${e.code}</span></div><div class="ac-uf-title"><small>${e.en}</small><h3>${esc(e.name[li])}</h3>${e.boss?`<em class="boss">${tr('acBoss')}</em>`:''}</div>
  <div class="ac-uf-stats">${[['acHp',Math.round((info.unit?.maxHp)||e.hp*m)],['acAtk',Math.round(e.atk*m)],['acAs',e.as.toFixed(2)],['acRange',e.range],['acArmor',e.armor],['acMana',e.mana||'—']].map(([k,v])=>`<div><span>${tr(k)}</span><b>${v}</b></div>`).join('')}</div>
  ${e.skill?`<div class="ac-uf-skill"><small>${tr('acSkill')}</small><b>${esc(e.skill.name[li])}</b></div>`:''}`;}
 else{const u=ACD.UNITS[info.id],star=info.star||1,m=ACD.STAR_MULT[star];
  html=`<div class="ac-uf-head" style="--tier:${ACD.COST_COLORS[u.cost]}"><small>[ UNIT FILE ]</small><span>${u.code}</span></div><div class="ac-uf-art ${u.story?'story':''}"><img src="${u.story?characterImage(info.id):acCardArt(info.id)}" alt=""><span>T${u.cost} · ${'★'.repeat(star)}</span></div>
  <div class="ac-uf-title"><small>${u.story?tr('acStory'):'TACTICAL UNIT'}</small><h3>${esc(acName(info.id))}</h3></div><div class="ac-uf-traits">${u.traits.map(t=>`<span>${traitSvg(t)}${esc(acTraitName(t))}</span>`).join('')}</div>
  <div class="ac-uf-stats">${[['acHp',Math.round(info.unit?.maxHp||u.hp*m)],['acAtk',Math.round(u.atk*m)],['acAs',u.as.toFixed(2)],['acRange',u.range],['acArmor',u.armor],['acMana',u.mana]].map(([k,v])=>`<div><span>${tr(k)}</span><b>${v}</b></div>`).join('')}</div>
  <div class="ac-uf-skill"><small>${tr('acSkill')}</small><b>${esc(acSkillName(info.id))}</b><p>${esc(acSkillDesc(info.id,star))}</p></div>`;}
 box.innerHTML=html;box.hidden=false;
}

// ---------- 大厅信息栏与章节档案 ----------
function renderLobbyHud(){
 if(!$('#lobby-gold'))return;
 $('#lobby-gold').textContent=acState.gold;$('#lobby-hp').textContent=acState.hp;$('#lobby-cleared').textContent=cleared.length+' / '+STAGES.length;
 $('#lobby-player').textContent=typeof protagonistName==='function'?protagonistName():tr('protagonistYou');
 $('#lobby-level').textContent='LV.'+String(acState.level).padStart(2,'0')+' · '+tr('acDeploy')+' '+acState.boardCount()+'/'+acState.boardCap();
 const img=$('#lobby-avatar');const src=typeof protagonistImage==='function'&&protagonist?protagonistImage(protagonist):characterImage(displayHero);if(img.dataset.src!==src){img.dataset.src=src;img.src=src;}
}
function renderCampaignLibrary(){
 const li=LI();
 $('#chapter-cards').innerHTML=CAMPAIGN_CATALOG.map((c,ci)=>{
  const start=c.start??ci*5,accessible=start<=unlocked,done=[0,1,2,3,4].filter(j=>cleared.includes(start+j)).length,scene=typeof CINEMA_SCENES!=='undefined'?CINEMA_SCENES[start]:'';
  const list=[0,1,2,3,4].map(j=>{const i=start+j,e=ACD.ENCOUNTERS[i],st=cleared.includes(i)?'done':i===stage?'now':i>unlocked?'locked':'';return `<li class="${st} ${e.boss?'boss':e.waves?'def':''}"><span>${String(i+1).padStart(2,'0')}</span><b>${esc(stageName(i))}</b><em>${e.boss?tr('acBoss'):e.waves?tr('acWaves',{n:e.waves.length}):'EXP'}</em></li>`;}).join('');
  return `<article class="chapter-card ${accessible?'available':'unreleased'} ${Math.floor(stage/5)===ci?'current':''}" style="--scene:url('assets/scenes/${scene}.png')"><div class="chapter-emblem">${c.emblem}</div>
   <div class="chapter-main"><div class="eyebrow">ACT ${String(ci+1).padStart(2,'0')} · ${done} / 5</div><h2>${tr(c.title)}</h2><p>${tr(c.subtitle)}</p><ol class="chapter-stages">${list}</ol></div>
   <button class="${accessible?'primary':''}" data-campaign="${c.id}" ${accessible?'':'disabled'}>${tr(accessible?(done?'continueChapter':'openChapter'):'locked')}</button></article>`;}).join('');
}

// ---------- 主循环 ----------
function frame(now){
 const realDt=Math.min((now-acLast)/1000||0,.05);acLast=now;
 let scale=0;
 if(mode==='fight'&&!paused&&acBattle){
  scale=speed*(acHitstop>0?.07:1)*(ultimateActive?.18:1);acHitstop=Math.max(0,acHitstop-realDt);
  acSimAcc+=realDt*scale;let n=0;while(acSimAcc>=1/60&&n<10&&acBattle.running){acBattle.step(1/60);acSimAcc-=1/60;n++;}
 }
 tickPresentation(realDt);tickCinematic(realDt);tickMusic(realDt);
 const missionVisible=typeof currentView!=='undefined'&&currentView==='adventure'&&!$('#chapter-mission').hidden;
 if(missionVisible){
  if(!ACRender.active&&!ACRender.failed){if(ACRender.init($('#ac-viewport'))){acMeasureInsets();renderUI();}else $('#ac-viewport').classList.add('fallback');}
  if(ACRender.active){const vdt=paused?0:mode==='fight'?realDt*Math.max(.05,scale):realDt;ACRender.frame(vdt,realDt,{mode,battle:acBattle});}
  acDomTick-=realDt;if(acDomTick<=0){acDomTick=.2;if(acBattle&&mode!=='prep')renderDamage();$('#timer').textContent=formatTime(acBattle?acBattle.time:0);
   if(acPinned&&acPinned.unit&&!acPinned.unit.alive)acPinned=null;}
 }
 requestAnimationFrame(frame);
}
function acMeasureInsets(){
 const root=$('#ac-root');if(!root||!ACRender.active)return;const r=root.getBoundingClientRect(),L=$('.ac-left').getBoundingClientRect(),Rt=$('.ac-right').getBoundingClientRect(),top=$('.ac-topbar').getBoundingClientRect(),dock=$('.ac-dock').getBoundingClientRect();
 ACRender.setInsets({left:Math.max(0,L.right-r.left)+6,right:Math.max(0,r.right-Rt.left)+6,top:Math.max(0,top.bottom-r.top)+4,bottom:Math.max(0,r.bottom-dock.top)+2});
}

// ---------- 输入：拖拽部署、悬停档案、快捷键 ----------
function acInfoFromActor(a){if(!a)return null;return {id:a.id,star:a.star||1,enemyType:!!a.enemyType,unit:a.unit,strength:a.unit?.scaleMult};}
function acOverShop(x,y){const r=$('.ac-shop')?.getBoundingClientRect();return r&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
function initAutochessUI(){
 const vp=$('#ac-viewport');
 vp.addEventListener('pointermove',e=>{
  if(!ACRender.active)return;
  if(acDrag){const g=ACRender.pickGround(e.clientX,e.clientY);acDrag.moved=true;if(g){ACRender.setDrag(acDrag.key,g.point.clone().setY(.06));ACRender.setHoverCell(g.cell&&g.cell.y>=ACD.PLAYER_ROW0?g.cell:null);}
   const over=acOverShop(e.clientX,e.clientY);$('#ac-sell').hidden=false;$('#ac-sell').classList.toggle('hot',over);$('#ac-sell b').textContent=tr('acSell',{n:acState.sellValue(acDrag.unit)});return;}
  const a=ACRender.pickActor(e.clientX,e.clientY);const key=a?a.key:null;
  if(key!==acHover){acHover=key;ACRender.setHover(key);vp.style.cursor=a&&a.kind==='display'&&mode==='prep'?'grab':a?'pointer':'default';renderUnitFile(acInfoFromActor(a)||acPinned);}
 });
 vp.addEventListener('pointerleave',()=>{if(!acDrag){acHover=null;ACRender.setHover(null);renderUnitFile(acPinned);}});
 vp.addEventListener('pointerdown',e=>{
  if(!ACRender.active||e.button!==0)return;const a=ACRender.pickActor(e.clientX,e.clientY);
  if(a&&a.kind==='display'&&mode==='prep'&&!acPendingAugments){const unit=acUnitByKey(a.key);if(!unit)return;acDrag={key:a.key,unit,moved:false};ACRender.setDeploy(true);vp.setPointerCapture(e.pointerId);vp.style.cursor='grabbing';e.preventDefault();return;}
  acPinned=acInfoFromActor(a);renderUnitFile(acPinned);
 });
 const endDrag=e=>{
  if(!acDrag)return;const d=acDrag;acDrag=null;ACRender.setDrag(null);ACRender.setDeploy(false);ACRender.setHoverCell(null);$('#ac-sell').hidden=true;vp.style.cursor='default';
  if(e.type==='pointercancel'){renderUI();return;}
  if(acOverShop(e.clientX,e.clientY)){acSell(d.unit);return;}
  const g=ACRender.pickGround(e.clientX,e.clientY);let target=null;
  if(g&&g.cell&&AC.State.isPlayerCell(g.cell.x,g.cell.y))target={kind:'board',x:g.cell.x,y:g.cell.y};else if(g&&g.bench!=null)target={kind:'bench',index:g.bench};
  if(target){const before=acState.boardCount();if(acState.move(d.unit,target)){ACRender.placeFx(target.kind==='board'?target:null,target.kind==='bench'?target.index:null);saveProfile();}
   else if(target.kind==='board'&&before>=acState.boardCap())acToast(tr('acFull'),'warn');}
  renderUI();
 };
 vp.addEventListener('pointerup',endDrag);vp.addEventListener('pointercancel',endDrag);
 $('#ac-cards').addEventListener('click',e=>{const b=e.target.closest('[data-buy]');if(b)acBuy(+b.dataset.buy);});
 $('#ac-cards').addEventListener('mouseover',e=>{const b=e.target.closest('[data-buy]');if(b){const id=acState.shop[+b.dataset.buy];if(id)renderUnitFile({id,star:1});}});
 $('#ac-cards').addEventListener('mouseleave',()=>renderUnitFile(acPinned));
 $('#ac-intel-list').addEventListener('mouseover',e=>{const r=e.target.closest('[data-enemy]');if(r){const enc=ACD.encounterEnemies(ACD.ENCOUNTERS[stage]).find(x=>x[0]===r.dataset.enemy);renderUnitFile({id:r.dataset.enemy,enemyType:true,strength:enc?enc[3]:1});}});
 $('#ac-intel-list').addEventListener('mouseleave',()=>renderUnitFile(acPinned));
 $('#ac-btn-xp').onclick=acBuyXp;$('#ac-btn-reroll').onclick=acReroll;$('#start').onclick=acStartCombat;
 $('#ac-lock').onclick=()=>{if(mode!=='prep')return;acState.shopLocked=!acState.shopLocked;renderUI();saveProfile();};
 $('#speed').onclick=()=>{speed=speed===1?2:1;renderEngage();};
 $('#pause').onclick=()=>{if(mode==='fight'){paused=!paused;renderUI();}};
 $('#ac-augment').addEventListener('click',e=>{const b=e.target.closest('[data-aug]');if(b)acPickAugment(b.dataset.aug);});
 $('#stages').addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(b&&!b.disabled&&mode!=='fight'){const i=+b.dataset.stage;if(i===stage&&mode==='prep')return;stage=i;prepare();openStory(stage,'before','prepare');}});
 $('#close-help').onclick=$('#got-it').onclick=()=>$('#guide').close();
 $('#ac-help').onclick=()=>$('#guide').showModal();
 if(document.addEventListener)document.addEventListener('keydown',e=>{
  if(currentView!=='adventure'||$('#chapter-mission').hidden||document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.repeat)return;
  if(e.code==='KeyD'){acReroll();}else if(e.code==='KeyF'){acBuyXp();}else if(e.code==='Space'){e.preventDefault();if(mode==='prep')acStartCombat();else if(mode==='fight'){paused=!paused;renderUI();}}
  else if(e.code==='KeyE'&&mode==='prep'){const u=acUnitByKey(acHover);if(u)acSell(u);}
 });
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(acMeasureInsets).observe($('#ac-root'));
 if(!globalThis.WebGL2RenderingContext)$('#ac-viewport').classList.add('fallback');
 $('#ac-fallback').textContent=tr('acUnsupported');
}
