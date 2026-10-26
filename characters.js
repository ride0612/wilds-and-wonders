'use strict';
// Legacy IDs retain existing save positions; all visible identities use this story cast.
const STORY_CAST={
  "oak": {
    "asset": "fingel",
    "name": "芬格尔",
    "en": "Fingel",
    "ja": "フィンゲル",
    "tone": "#b9b6a1",
    "skill": "可靠的后手",
    "enSkill": "Contingency Plan",
    "jaSkill": "最後の備え",
    "quote": "吐槽归吐槽，人我一定给你带回来。",
    "enQuote": "I can complain and still get everyone home.",
    "personality": [
      "懒散外表 · 敏锐情报 · 关键时刻可靠",
      "Irreverent · Resourceful · Dependable",
      "飄々 · 情報通 · 頼れる"
    ],
    "bio": [
      "学院里的情报熟手。总能把紧张局面说得像欠了一顿饭，却会先替队伍找好撤离路线。宽松制服、旧挎包和终端记录着他不肯明说的认真。",
      "An academy information specialist whose jokes conceal careful evacuation plans.",
      "冗談の裏で退路を確保する、学院の情報通。"
    ],
    "desc": "启动预置掩护装置，为自身及最近两名友军施加 200 点护盾。",
    "faction": "学院协作"
  },
  "arrow": {
    "asset": "fangqing",
    "name": "方晴",
    "en": "Fang Qing",
    "ja": "方晴",
    "tone": "#efaa63",
    "skill": "信标定向",
    "enSkill": "Beacon Lock",
    "jaSkill": "ビーコン照準",
    "quote": "信号还在。我听着呢，你继续说。",
    "enQuote": "The signal is here. I am listening.",
    "personality": [
      "直率 · 机敏 · 记得你的日常",
      "Candid · Quick-thinking · Caring",
      "率直 · 機転 · 気配り"
    ],
    "bio": [
      "现实世界的通信员，也是主角的老朋友。橙色工装、耳麦和信标是她的工作装备；她既会校准跨界链路，也会追问你是否按时吃饭。",
      "Your old friend and communications specialist on Earth, carrying a radio and signal beacon.",
      "現実世界の通信員で、主人公の旧友。通信と日々の暮らしを支える。"
    ],
    "desc": "用信标锁定敌方信号，定向脉冲对最近敌人造成 250 点伤害。",
    "faction": "现实支援"
  },
  "ember": {
    "asset": "chuzihang",
    "name": "楚子航",
    "en": "Chu Zihang",
    "ja": "楚子航",
    "tone": "#d58667",
    "skill": "君焰",
    "enSkill": "Royal Flame",
    "jaSkill": "君焔",
    "quote": "先确认退路。剩下的，我来处理。",
    "enQuote": "Confirm the escape route. I will handle the rest.",
    "personality": [
      "寡言 · 自律 · 责任感强",
      "Reserved · Disciplined · Responsible",
      "寡黙 · 自律 · 責任感"
    ],
    "bio": [
      "卡塞尔学院的行动协作者。黑发、金色眼睛与收束的黑色制服构成冷静的轮廓。村雨与君焰用于守住撤离窗口；他更关心任务结束后是否所有人都能交接、休息。",
      "A disciplined academy field operative. His blade and fire hold the evacuation window open.",
      "黒髪と金色の瞳を持つ行動協力者。村雨と君焔で仲間の退路を守る。"
    ],
    "desc": "控制君焰覆盖目标区域，对目标及周围一格敌人造成 185 点伤害。",
    "faction": "学院协作"
  },
  "sage": {
    "asset": "shenlan",
    "name": "沈岚",
    "en": "Shen Lan",
    "ja": "沈嵐",
    "tone": "#81cbd0",
    "skill": "应急稳态",
    "enSkill": "Emergency Stabilization",
    "jaSkill": "緊急安定化",
    "quote": "成功的数据要记录，承担的风险也一样。",
    "enQuote": "Record the success, and the risks we accepted.",
    "personality": [
      "理性 · 克制 · 对风险负责",
      "Analytical · Measured · Accountable",
      "理性的 · 慎重 · 責任を負う"
    ],
    "bio": [
      "折页计划的研究负责人。眼镜、白色研究外套与青色监测设备服务于现场观察。她不会把穿越者当作可替换的参数，优先维持生命信号与撤离条件。",
      "The Fold Project lead researcher, responsible for the traveler rather than just the experiment.",
      "折頁計画の研究責任者。実験の結果より、参加者の安全と帰還を重視する。"
    ],
    "desc": "派出医疗无人机，治疗生命比例最低的友军 280 点及相邻友军 140 点。",
    "faction": "现实支援"
  },
  "knight": {
    "asset": "caesar",
    "name": "凯撒",
    "en": "Caesar Gattuso",
    "ja": "シーザー",
    "tone": "#e3c78c",
    "skill": "猎刀突进",
    "enSkill": "Hunting Blade",
    "jaSkill": "狩猟刃の突進",
    "quote": "既然由我带队，就不会留下任何人。",
    "enQuote": "If I lead this team, no one is left behind.",
    "personality": [
      "骄傲 · 果断 · 重视伙伴",
      "Proud · Decisive · Protective",
      "誇り · 決断力 · 仲間思い"
    ],
    "bio": [
      "卡塞尔学院的行动领队。金发、蓝眼与白色作战礼装体现鲜明的自信。狄克推多配合听觉定位使用；他的指挥既要求效率，也接受同伴指出计划中的漏洞。",
      "An academy leader with a proud bearing, a hunting blade, and a willingness to answer for his plans.",
      "金髪と青い瞳の行動指揮者。自信に満ち、仲間の指摘にも耳を傾ける。"
    ],
    "desc": "根据听觉定位发起猎刀突进，对最近敌人造成 230 点伤害。",
    "faction": "学院协作"
  },
  "frost": {
    "asset": "nono",
    "name": "诺诺",
    "en": "Nono",
    "ja": "ノノ",
    "tone": "#dd8c7b",
    "skill": "侧写协同",
    "enSkill": "Profiling Coordination",
    "jaSkill": "プロファイル連携",
    "quote": "先别急着相信答案。把你漏看的那一处告诉我。",
    "enQuote": "Before accepting an answer, show me what you missed.",
    "personality": [
      "敏锐 · 洒脱 · 独立判断",
      "Perceptive · Unconventional · Independent",
      "鋭敏 · 自由 · 自分で判断"
    ],
    "bio": [
      "参与空白站台调查的协作者。红发、四叶草耳饰与学院制服保留轻快又锐利的气质。她用侧写寻找破绽，再指引队友集火；并不施放冰系魔法。",
      "An independent investigator who uses profiling to identify openings and coordinate a team.",
      "赤髪と四つ葉の耳飾りが印象的な調査協力者。側写で突破口を見つける。"
    ],
    "desc": "侧写敌方移动规律，指引协同火力对目标及周围一格造成 170 点伤害。",
    "faction": "学院协作"
  },
  "warden": {
    "asset": "lumingfei",
    "name": "路明非",
    "en": "Lu Mingfei",
    "ja": "路明非",
    "tone": "#8fbaa5",
    "skill": "别落下一个人",
    "enSkill": "Leave No One Behind",
    "jaSkill": "誰も置いていかない",
    "quote": "我可能会害怕，但我记得你还没回来。",
    "enQuote": "I may be scared, but I know you are still out there.",
    "personality": [
      "爱吐槽 · 会犹豫 · 在意普通人",
      "Self-deprecating · Hesitant · Kind",
      "自嘲 · ためらい · 優しさ"
    ],
    "bio": [
      "穿着略显凌乱的学院制服，背着旧挎包的年轻学生。他会紧张，也会说冷笑话，却常常最先注意到掉队的人。战斗中的护盾来自本作应急装备，不是原著能力设定。",
      "An awkward student whose humor and hesitation do not stop him noticing those left behind. His shield is game-specific equipment.",
      "少し着崩した制服の学生。怖がりながらも、取り残された人を見捨てない。盾は本作の装備。"
    ],
    "desc": "打开应急掩护设备，为自身及最近两名友军施加 220 点护盾。",
    "faction": "学院协作"
  },
  "moon": {
    "asset": "zero",
    "name": "零",
    "en": "Zero",
    "ja": "零",
    "tone": "#bbd1df",
    "skill": "精确复现",
    "enSkill": "Precision Replay",
    "jaSkill": "精密再現",
    "quote": "坐标确认。给我一个清晰的窗口。",
    "enQuote": "Coordinates confirmed. Give me a clear window.",
    "personality": [
      "冷静 · 简洁 · 执行精确",
      "Calm · Concise · Precise",
      "冷静 · 簡潔 · 精確"
    ],
    "bio": [
      "在外围观察点协助校准信号的学院行动人员。浅金短发、冰蓝眼睛与白色外套形成清晰轮廓。言语简短，行动细致，用精密射击与记录复核支持小队。",
      "A precise observer supporting the perimeter with measured shots and carefully verified records.",
      "浅金色の髪と青い瞳の観測協力者。精密射撃と丁寧な照合で小隊を支える。"
    ],
    "desc": "复核目标轨迹后进行精密射击，对最近敌人造成 290 点伤害。",
    "faction": "学院协作"
  }
};
const CHARACTER_DESIGNS=STORY_CAST;
for(const hero of HEROES){
 const c=STORY_CAST[hero.id];Object.assign(hero,{name:c.name,skill:c.skill,desc:c.desc,color:c.tone,stars:0,cinematic:['ember','knight','moon'].includes(hero.id)});
 ZH_QUOTES[hero.id]='「'+c.quote+'」';
 for(const [i,name,skill,quote] of [[0,c.en,c.enSkill,c.enQuote],[1,c.ja,c.jaSkill,c.quote]]){const t=HERO_TEXT[hero.id][i];t[0]=name;t[2]=skill;t[4]=quote;}
}
const characterImage=(id,kind='portrait')=>'assets/cast/'+STORY_CAST[id].asset+'-portrait.png';
const characterModel=id=>'assets/models/'+STORY_CAST[id].asset+'.glb';
const characterText=(id,key)=>CHARACTER_DESIGNS[id][key][{zh:0,en:1,ja:2}[language]];
const starText=id=>language==='zh'?STORY_CAST[id].faction:language==='en'?(STORY_CAST[id].faction==='现实支援'?'EARTH SUPPORT':'ACADEMY ALLY'):(STORY_CAST[id].faction==='现实支援'?'現実支援':'学院協力');
Object.assign(TEXT,{
 atrium:['星穹中庭','CELESTIAL ATRIUM','星穹の中庭'],storyButton:['剧情','STORY','物語'],allCharacters:['全部角色','CHARACTERS','キャラクター'],warehouse:['仓库','INVENTORY','倉庫'],more:['扩展','MORE','その他'],moreTitle:['扩展菜单','More options','拡張メニュー'],collectionSubtitle:['与你同行的八位同伴','Eight companions by your side','共に歩む八人の仲間'],characterProfile:['角色档案','CHARACTER PROFILE','キャラクターファイル'],personality:['性格','PERSONALITY','性格'],featuredNow:['当前大厅展示','Featured in the atrium','ロビー展示中'],chooseDisplay:['点击头像，切换大厅展示角色','Choose a portrait to feature in the lobby','肖像を選ぶとロビーの展示が切り替わります'],
 idleMotion:['大厅动态立绘','Animated lobby portraits','ロビー立ち絵の動き'],settingsSaved:['设置自动保存在本机','Settings save on this device','設定は端末に自動保存されます'],
 relics:['剧情收藏','STORY RELICS','物語の収集品'],relicHint:['通关各幕后获得纪念物，记录你们共同走过的旅程。','Clear each act to collect a keepsake from your journey.','各幕をクリアすると、旅の記念品が手に入ります。'],relicEmpty:['尚未获得纪念物。完成第一幕后，再回来看看。','No keepsakes yet. Return after clearing the first act.','記念品はまだありません。第一幕をクリアして戻ってきましょう。'],relicCount:['已收集 {n} / 5','{n} / 5 collected','収集済み {n} / 5'],ownedSkins:['已拥有外观','OWNED APPEARANCES','所持している外見'],skinHint:['每位角色均拥有一款基础外观，可在全部角色中展示。','Each companion owns a base appearance, available in Characters.','全員の基本衣装を所持。「キャラクター」で展示できます。'],
 relicLetter:['密封的录取信','Sealed admission letter','封印された入学通知'],relicKey:['观测站密钥','Observatory key','観測所の鍵'],relicPhoto:['旧档案中的合影','Archive photograph','古い記録の集合写真'],relicStar:['孩子折的纸星星','A child’s paper star','子供が折った紙の星'],relicBell:['停摆的钟芯','Silent clockwork','止まった時計の芯'],
 relicLetterDesc:['车站留下的信，收件日期是十年前。','A station letter dated ten years ago.','十年前の日付が書かれた、駅で受け取った手紙。'],relicKeyDesc:['守住观测站后，交到你手中的银色密钥。','The silver key entrusted to you after the siege.','観測所を守った後に託された銀色の鍵。'],relicPhotoDesc:['背面写着那个从记录里消失的名字。','On its back, a name erased from history.','裏には、記録から消された名前。'],relicStarDesc:['歪歪的折痕里，藏着一个获救家庭的感谢。','Its crooked folds hold a rescued family’s gratitude.','不揃いの折り目に、救われた家族の感謝がこもる。'],relicBellDesc:['钟声停下了，但下一封来信已经在路上。','The bell fell silent. Another letter is on its way.','鐘は止まった。次の手紙は、もう届こうとしている。'],
 backToArchive:['返回剧情档案','Back to story archive','物語アーカイブへ'],portraitUnavailable:['角色资源未加载','Character artwork unavailable','キャラクター画像を読み込めません']
});

Object.assign(TEXT,{
 ownedRoster:['主角 + 八位剧情角色 · 全部可用','Protagonist + eight story characters · All available','主人公＋物語の8人・全員使用可能'],
 lockedCharacter:['角色资料','Character dossier','人物資料'],
 battleQuality:['战斗画质','Battle quality','戦闘画質'],qualityHigh:['高 · 软阴影','High · soft shadows','高 · ソフトシャドウ'],qualityBalanced:['均衡','Balanced','標準'],qualityLow:['流畅 · 无阴影','Low · no shadows','低 · 影なし'],battleGrid:['战斗中显示战术网格','Show tactical grid in combat','戦闘中にグリッドを表示'],
 rarityNote:['八位角色可自由编队，剧情登场以当前场景为准。人物亲自在现场作战，地面网格只是指挥标记。','Build a squad from all eight characters. Story appearances follow each scene; the ground grid is a tactical overlay.','8人から自由に編成。登場は各場面に準じます。地面のグリッドは指揮用の目印です。'],
 ultimateTalent:['行动特写 · 首次技能演出','ACTION CUT-IN · FIRST CAST','アクション演出・初回スキル'],ultimateKicker:['行动特写','ACTION CUT-IN','アクション演出'],fullEffects:['技能特写演出','Skill cinematics','スキル演出'],
 baseSkin:['剧情行动装','Story field outfit','物語の行動服'],skinHint:['人物档案、剧情立绘与战斗形象使用同一套设计。','Dossiers, dialogue portraits and battle miniatures share each character design.','人物資料・立ち絵・戦闘ミニチュアは同じ設定を使用。'],
 collectionSubtitle:['现实与次元世界的八位协作者','Eight allies across two worlds','二つの世界の8人の協力者']
});
for(const [id,names] of Object.entries({wild:['互助','Mutual Aid','相互支援'],arcane:['共鸣','Resonance','共鳴'],dawn:['先遣','Vanguard','先遣'],ranger:['协同','Coordination','連携'],guard:['守护','Protection','守護']})){TRAITS[id].name=names[0];TRAIT_TEXT[id][0][0]=names[1];TRAIT_TEXT[id][1][0]=names[2];}

// Runtime motion parameters for the new 2D battle miniatures.


for(const h of HEROES){
 const en=h.type==='shield'?'Deploys protective equipment, granting '+h.power+' shield to self and the two nearest allies.':h.type==='heal'?'A medical drone restores 280 HP to the lowest-health ally and 140 HP to adjacent allies.':h.type==='aoe'?'Coordinates an area strike, dealing '+h.power+' damage to the target and enemies within one tile.':'Deals '+h.power+' damage to the nearest enemy.';
 const ja=h.type==='shield'?'防護装備で自身と最寄りの味方2人に'+h.power+'の盾を付与。':h.type==='heal'?'医療ドローンが最低HPの味方を280、隣接する味方を140回復。':h.type==='aoe'?'対象と周囲1マスの敵に'+h.power+'の範囲ダメージ。':'最も近い敵に'+h.power+'のダメージ。';
 HERO_TEXT[h.id][0][3]=en;HERO_TEXT[h.id][1][3]=ja;
}
