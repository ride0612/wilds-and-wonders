'use strict';
Object.assign(TEXT,{
 chapterOne:['第一章 · 赤潮来信','CHAPTER I · LETTER FROM THE RED TIDE','第一章 · 赤潮からの手紙'],
 campaignTitle:['赤潮来信','Letter from the Red Tide','赤潮からの手紙'],
 campaignSynopsis:['一封迟到十年的录取通知，将你带入晨星行动局。与八位同伴一起，穿过雨夜与沉没的城市，寻找父亲留下的真相。','An admission letter ten years late leads you to Morningstar. Join eight companions through rainy streets and a submerged city to uncover your father’s secret.','十年遅れの入学通知に導かれ、モーニングスターへ。八人の仲間と雨の街、沈んだ都市を進み、父が残した真実を探そう。'],
 beforeBattle:['战前 · 第 {n} 幕 / 共 {total} 幕','BEFORE BATTLE · ACT {n} / {total}','戦いの前 · 第{n}幕 / 全{total}幕'],afterBattle:['战后 · 第 {n} 幕 / 共 {total} 幕','AFTERMATH · ACT {n} / {total}','戦いの後 · 第{n}幕 / 全{total}幕'],
 nextChapter:['前往下一幕 →','Next act →','次の幕へ →'],completed:['赤潮已平息 · 第一章完成','The tide is still · Chapter I complete','赤潮は静まった · 第一章クリア'],
 battleChapter:['档案 01 · 赤潮来信','FILE 01 · LETTER FROM THE RED TIDE','記録01 · 赤潮からの手紙'],
 battleTitle:['晨星行动局','MORNINGSTAR OPERATIONS','モーニングスター作戦局'],
 battleSubtitle:['血脉不是命令。你仍然可以选择站在谁的身旁。','Blood is not an order. You still choose who you stand beside.','血は命令ではない。誰の隣に立つかは、自分で選べる。'],
 modeExpedition:['外出冒险 · 自走棋','EXPEDITION · AUTO CHESS','出征 · オートチェス'],modeDefense:['基地遇袭 · 塔防','BASE UNDER ATTACK · DEFENSE','拠点襲撃 · タワーディフェンス'],
 core:['据点核心','CORE INTEGRITY','拠点コア'],wave:['敌军波次','WAVE','ウェーブ'],remaining:['本波剩余','REMAINING','残りの敵'],alliedCount:['我方存活','ALLIES','味方'],enemyCount:['敌方存活','HOSTILES','敵'],
 expeditionRules:['出征规则：下半区自由布阵，英雄自动移动接敌。消灭全部敌人获胜。','Deploy in the lower half. Heroes move and fight automatically. Eliminate all hostiles.','下半分に配置。仲間は自動で移動・戦闘。敵の全滅で勝利。'],
 defenseRules:['守城规则：拖到蓝色驻防台。英雄固定守位，优先攻击最接近核心的敌人。清空全部波次且核心存活即获胜。','Deploy on blue pads. Defenders stay in position and target enemies closest to the core. Survive every wave with the core intact.','青い台に配置。仲間は持ち場を守り、コアに近い敵を優先。全ウェーブをしのぎ、コアを守れば勝利。'],
 defenseHint:['仅可部署在蓝色驻防台 · 道路禁止布阵','Blue pads only · Keep the road clear','青い台に配置 · 道は配置不可'],defenseStart:['开始守城 →','Defend the base →','防衛開始 →'],
 defenseReach:['驻防台将近战英雄的守卫射程提高到 2.2 格。','Defense pads extend melee heroes’ reach to 2.2 tiles.','防衛台では近接英雄の射程が2.2マスになります。'],
 waveLog:['第 {n} / {total} 波敌军来袭！','Wave {n} / {total} incoming!','第{n} / {total}波、接近！'],breachLog:['敌人突破防线，核心损失 {n} 点完整度。','An enemy breached the line. Core -{n}.','敵が突破。コア耐久値 -{n}。'],
 defenseSummary:['防守成功 · 核心剩余 {core}% · 漏过 {leaks} 名敌人','Defense held · Core {core}% · {leaks} enemies breached','防衛成功 · コア {core}% · 突破 {leaks}体'],
 defenseDefeat:['核心被摧毁或守军全灭。把输出英雄布在道路转角附近，再次尝试。','The core fell or all defenders were lost. Cover the road bends with damage dealers and try again.','コア破壊、または守備隊全滅。道の曲がり角を攻撃役で守り、再挑戦しよう。'],
 spawn:['入侵入口','HOSTILE ENTRY','侵入口'],coreLabel:['晨星核心','STAR CORE','スターコア'],standby:['等待下一波','NEXT WAVE INBOUND','次のウェーブ待機'],
 guide1:['最多出战 5 人。外出冒险关在下半区拖动布阵，英雄自动寻敌、移动、攻击；基地遇袭关改为塔防，在蓝色驻防台布置英雄，保护核心。','Deploy up to 5 heroes. Expeditions use automatic movement and combat. Base attacks use tower defense: place heroes on blue pads to protect the core.','最大5人まで出撃。出征では下半分に配置して自動戦闘。拠点襲撃では青い台に配置し、コアを守ります。'],
 guide4:['剧情决定战斗模式：第 1、3、5 关外出冒险，第 2、4 关防守据点。守城英雄不移动，普攻仍回蓝并自动施法，敌人穿过道路会扣除核心耐久。回大厅暂停战斗；重启后从本关准备阶段开始。','The story selects the mode: stages 1, 3 and 5 are expeditions; 2 and 4 defend the base. Defenders stay put and still gain mana and cast skills. Leaks damage the core. Camp pauses battle; restarting returns to preparation.','物語でモードが決定。第1・3・5戦は出征、第2・4戦は防衛。防衛中は移動せず、マナをためてスキルを発動。敵の突破でコアが損傷。ロビーで一時停止、再起動は準備から。'],
 finalVictory:['黎明，仍由我们选择','We choose the dawn','夜明けは、私たちが選ぶ']
});
