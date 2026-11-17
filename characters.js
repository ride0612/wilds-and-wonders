'use strict';
// 剧情角色：东方 Project（上海爱丽丝幻乐团）二次创作。人物设定归原作者所有；台词、简介与 3D 造型为本作原创。
// 旧存档沿用的内部 ID（warden、arrow 等）保持不变，仅替换可见身份。
const STORY_CAST={
 warden:{asset:'reimu',name:'博丽灵梦',en:'Reimu Hakurei',ja:'博麗霊夢',type:['少女','Girl','少女'],tone:'#e0525a',
  skill:'二重结界',enSkill:'Double Barrier',jaSkill:'二重結界',
  quote:'麻烦事快点解决，我还要回去喝茶。',enQuote:'Let’s wrap this up quickly. My tea is getting cold.',
  personality:['少女 · 随性 · 直觉惊人','Girl · Easygoing · Uncanny intuition','少女 · マイペース · 鋭い勘'],
  bio:['博丽神社的巫女，负责维持幻想乡与外界之间的大结界。平时懒散，香火钱永远不够；一旦出手，结界与御币便是最可靠的防线。','The Hakurei shrine maiden who keeps the Great Barrier standing. Lazy until it matters, then nothing gets past her barriers.','博麗神社の巫女。普段はのんびりだが、異変となれば結界でどんな攻撃も通さない。'],
  desc:'展开二重结界，为自身及最近两名友军施加 220 点护盾。',faction:['博丽神社','Hakurei Shrine','博麗神社']},
 arrow:{asset:'marisa',name:'雾雨魔理沙',en:'Marisa Kirisame',ja:'霧雨魔理沙',type:['少女','Girl','少女'],tone:'#f2c84a',
  skill:'极限火花',enSkill:'Master Spark',jaSkill:'マスタースパーク',
  quote:'弹幕就是火力！借来的东西，等我用完再还。',enQuote:'Firepower is everything. I’ll return what I borrowed—eventually.',
  personality:['少女 · 好胜 · 努力家','Girl · Competitive · Hard-working','少女 · 負けず嫌い · 努力家'],
  bio:['住在魔法森林的普通魔法使。骑着扫帚到处“借”书，靠不服输的练习把八卦炉的火力推到极致。','An ordinary magician of the Forest of Magic who “borrows” books and out-practices everyone to push her Mini-Hakkero to the limit.','魔法の森に住む普通の魔法使い。努力で八卦炉の火力を極めた。'],
  desc:'八卦炉全功率照射，对当前目标造成 250 点伤害。',faction:['魔法森林','Forest of Magic','魔法の森']},
 oak:{asset:'meiling',name:'红美铃',en:'Hong Meiling',ja:'紅美鈴',type:['御姐','Mature','お姉さん'],tone:'#4caf6a',
  skill:'彩光护体',enSkill:'Rainbow Guard',jaSkill:'彩光護身',
  quote:'门由我来守。……放心，这次我绝对不会打瞌睡。',enQuote:'I’ll hold the gate. And no, I won’t doze off this time.',
  personality:['御姐 · 豪爽 · 武术高手','Mature · Cheerful · Martial artist','お姉さん · 朗らか · 武術の達人'],
  bio:['红魔馆的门卫，擅长运用“气”的武术家。性格开朗随和，偶尔会在门口打盹，但站上前线时比谁都结实。','The Scarlet Devil Mansion’s gatekeeper, a cheerful martial artist who wields qi. She naps on duty, but nobody holds a line better.','紅魔館の門番。気を操る武術家で、居眠りはしても前線では誰より頼もしい。'],
  desc:'运转七彩之气，为自身及最近两名友军施加 200 点护盾。',faction:['红魔馆','Scarlet Devil Mansion','紅魔館']},
 frost:{asset:'cirno',name:'琪露诺',en:'Cirno',ja:'チルノ',type:['萝莉','Petite','ロリ'],tone:'#6ab4ff',
  skill:'完美冻结',enSkill:'Perfect Freeze',jaSkill:'パーフェクトフリーズ',
  quote:'哼哼，因为我是最强的！全部冻成冰块吧！',enQuote:'Because I’m the strongest! Everything turns to ice!',
  personality:['萝莉 · 天真 · 自称最强','Petite · Carefree · “The strongest”','ロリ · 天真爛漫 · 自称最強'],
  bio:['住在雾之湖的冰之妖精。个子小小，自信满满，总把“最强”挂在嘴边；寒气一放，整片战场都会结霜。','An ice fairy of the Misty Lake. Small, endlessly confident, and convinced she is the strongest—her chill frosts the whole field.','霧の湖に住む氷の妖精。小さな体で自信満々、冷気で戦場を凍らせる。'],
  desc:'释放冻气，对目标周围敌人造成 230 点伤害并冻结 0.5 秒。',faction:['雾之湖','Misty Lake','霧の湖']},
 knight:{asset:'youmu',name:'魂魄妖梦',en:'Youmu Konpaku',ja:'魂魄妖夢',type:['少女','Girl','少女'],tone:'#8fd0b0',
  skill:'现世斩',enSkill:'Present Life Slash',jaSkill:'現世斬',
  quote:'楼观剑斩不断的东西，几乎不存在。',enQuote:'There is little the Roukanken cannot cut.',
  personality:['少女 · 认真 · 一根筋','Girl · Earnest · Single-minded','少女 · 真面目 · 一途'],
  bio:['白玉楼的庭师兼剑术指南役，半人半灵。认真到有些死板，身边总飘着自己的半灵；双刀出鞘时快得只剩残影。','Gardener and sword instructor of Hakugyokurou, half human and half phantom. Earnest to a fault, and her twin blades leave only afterimages.','白玉楼の庭師兼剣術指南役。半人半霊。真面目すぎるが、二刀の速さは残像のみ。'],
  desc:'瞬步突进，以现世斩连斩当前目标造成 320 点伤害。',faction:['白玉楼','Hakugyokurou','白玉楼']},
 sage:{asset:'eirin',name:'八意永琳',en:'Eirin Yagokoro',ja:'八意永琳',type:['御姐','Mature','お姉さん'],tone:'#6a7ad8',
  skill:'蓬莱之药',enSkill:'Hourai Elixir',jaSkill:'蓬莱の薬',
  quote:'伤口交给我处理。药效嘛……保证是你见过最好的。',enQuote:'Leave the wounds to me. My medicine is the finest you’ll ever see.',
  personality:['御姐 · 沉着 · 天才药师','Mature · Composed · Genius pharmacist','お姉さん · 沈着 · 天才薬師'],
  bio:['永远亭的药师，月之头脑。言谈温和却深不可测，红蓝两色的衣装与长弓同样出名；没有她治不好的伤。','The pharmacist of Eientei and the brains of the Moon. Gentle in speech, unfathomable in skill—there is no wound she cannot treat.','永遠亭の薬師で月の頭脳。穏やかだが底知れない。治せない傷はない。'],
  desc:'调配蓬莱之药，治疗生命比例最低的友军 280 点，并为其周围友军恢复一半。',faction:['永远亭','Eientei','永遠亭']},
 ember:{asset:'flandre',name:'芙兰朵露·斯卡雷特',en:'Flandre Scarlet',ja:'フランドール・スカーレット',type:['萝莉','Petite','ロリ'],tone:'#e0303a',
  skill:'禁忌「莱瓦汀」',enSkill:'Taboo “Laevatein”',jaSkill:'禁忌「レーヴァテイン」',
  quote:'一起来玩吧？要是坏掉了，可不能怪我哦。',enQuote:'Want to play? Don’t blame me if something breaks.',
  personality:['萝莉 · 纯真 · 破坏力惊人','Petite · Innocent · Devastating','ロリ · 無邪気 · 破壊の力'],
  bio:['红魔馆的二小姐，外表是孩子的吸血鬼，实际已活了近五百年。好奇又天真，背后的彩晶之翼闪烁时，莱瓦汀会烧尽周围的一切。','The younger Scarlet sister: a vampire who looks like a child but has lived nearly five centuries. Curious and innocent—until Laevatein burns everything nearby.','紅魔館の妹。子供の姿の吸血鬼で五百年近く生きている。レーヴァテインは周囲を焼き尽くす。'],
  desc:'挥舞莱瓦汀，烈焰覆盖目标区域，对周围敌人造成 380 点伤害。',faction:['红魔馆','Scarlet Devil Mansion','紅魔館']},
 moon:{asset:'sakuya',name:'十六夜咲夜',en:'Sakuya Izayoi',ja:'十六夜咲夜',type:['御姐','Mature','お姉さん'],tone:'#8fb0e8',
  skill:'幻符「杀人玩偶」',enSkill:'Illusion “Killing Doll”',jaSkill:'幻符「殺人ドール」',
  quote:'时间我已经停好了。请慢慢挑选您的结局。',enQuote:'I’ve already stopped the clock. Please, take your time choosing an ending.',
  personality:['御姐 · 完美 · 冷静优雅','Mature · Flawless · Cool and elegant','お姉さん · 完璧 · 冷静で優雅'],
  bio:['红魔馆的女仆长，能够操纵时间。家务与战斗都一丝不苟；当她停下时间，银色飞刀会同时从四面八方抵达。','Head maid of the Scarlet Devil Mansion who can manipulate time. Flawless at chores and combat alike—when time stops, her silver knives arrive from every side.','紅魔館のメイド長。時間を操る。時を止めれば銀のナイフが四方から届く。'],
  desc:'停止时间布下飞刀，对生命最低的敌人造成 520 点伤害。',faction:['红魔馆','Scarlet Devil Mansion','紅魔館']}
};
const CHARACTER_DESIGNS=STORY_CAST;
for(const hero of HEROES){
 const c=STORY_CAST[hero.id];Object.assign(hero,{name:c.name,skill:c.skill,desc:c.desc,color:c.tone,stars:0,cinematic:['ember','knight','moon'].includes(hero.id)});
 ZH_QUOTES[hero.id]='「'+c.quote+'」';
 for(const [i,name,skill,quote] of [[0,c.en,c.enSkill,c.enQuote],[1,c.ja,c.jaSkill,c.quote]]){const t=HERO_TEXT[hero.id][i];t[0]=name;t[2]=skill;t[4]=quote;}
}
// 立绘：开局用本作 3D 模型实时渲染（见 autochess-ui.js renderCastPortraits）；渲染不可用时显示剪影占位。
const CAST_PORTRAITS={};
const castPlaceholder=id=>{const c=STORY_CAST[id];return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.tone}" stop-opacity=".55"/><stop offset="1" stop-color="#101218"/></linearGradient></defs><rect width="400" height="600" fill="url(#g)"/><circle cx="200" cy="190" r="78" fill="#0b0c10" opacity=".55"/><path d="M80 600c8-160 56-250 120-250s112 90 120 250z" fill="#0b0c10" opacity=".55"/><text x="200" y="540" text-anchor="middle" font-size="44" font-family="sans-serif" fill="#fff" opacity=".85">${c.name}</text></svg>`);};
const characterImage=(id,kind='portrait')=>CAST_PORTRAITS[id]||castPlaceholder(id);
const characterModel=id=>'assets/models/'+STORY_CAST[id].asset+'.glb';
const characterText=(id,key)=>CHARACTER_DESIGNS[id][key][{zh:0,en:1,ja:2}[language]];
const starText=id=>STORY_CAST[id].faction[{zh:0,en:1,ja:2}[language]];
Object.assign(TEXT,{
 atrium:['星穹中庭','CELESTIAL ATRIUM','星穹の中庭'],storyButton:['剧情','STORY','物語'],allCharacters:['全部角色','CHARACTERS','キャラクター'],warehouse:['仓库','INVENTORY','倉庫'],more:['扩展','MORE','その他'],moreTitle:['扩展菜单','More options','拡張メニュー'],collectionSubtitle:['幻想乡的八位少女','Eight girls of Gensokyo','幻想郷の八人の少女'],characterProfile:['角色档案','CHARACTER PROFILE','キャラクターファイル'],personality:['性格','PERSONALITY','性格'],featuredNow:['当前大厅展示','Featured in the atrium','ロビー展示中'],chooseDisplay:['点击头像，切换大厅展示角色','Choose a portrait to feature in the lobby','肖像を選ぶとロビーの展示が切り替わります'],
 idleMotion:['大厅动态立绘','Animated lobby portraits','ロビー立ち絵の動き'],settingsSaved:['设置自动保存在本机','Settings save on this device','設定は端末に自動保存されます'],
 relics:['剧情收藏','STORY RELICS','物語の収集品'],relicHint:['通关各幕后获得纪念物，记录你们共同走过的旅程。','Clear each act to collect a keepsake from your journey.','各幕をクリアすると、旅の記念品が手に入ります。'],relicEmpty:['尚未获得纪念物。完成第一幕后，再回来看看。','No keepsakes yet. Return after clearing the first act.','記念品はまだありません。第一幕をクリアして戻ってきましょう。'],relicCount:['已收集 {n} / 5','{n} / 5 collected','収集済み {n} / 5'],ownedSkins:['已拥有外观','OWNED APPEARANCES','所持している外見'],skinHint:['每位角色均拥有一款基础外观，可在全部角色中展示。','Each companion owns a base appearance, available in Characters.','全員の基本衣装を所持。「キャラクター」で展示できます。'],
 relicLetter:['密封的录取信','Sealed admission letter','封印された入学通知'],relicKey:['观测站密钥','Observatory key','観測所の鍵'],relicPhoto:['旧档案中的合影','Archive photograph','古い記録の集合写真'],relicStar:['孩子折的纸星星','A child’s paper star','子供が折った紙の星'],relicBell:['停摆的钟芯','Silent clockwork','止まった時計の芯'],
 relicLetterDesc:['车站留下的信，收件日期是十年前。','A station letter dated ten years ago.','十年前の日付が書かれた、駅で受け取った手紙。'],relicKeyDesc:['守住观测站后，交到你手中的银色密钥。','The silver key entrusted to you after the siege.','観測所を守った後に託された銀色の鍵。'],relicPhotoDesc:['背面写着那个从记录里消失的名字。','On its back, a name erased from history.','裏には、記録から消された名前。'],relicStarDesc:['歪歪的折痕里，藏着一个获救家庭的感谢。','Its crooked folds hold a rescued family’s gratitude.','不揃いの折り目に、救われた家族の感謝がこもる。'],relicBellDesc:['钟声停下了，但下一封来信已经在路上。','The bell fell silent. Another letter is on its way.','鐘は止まった。次の手紙は、もう届こうとしている。'],
 backToArchive:['返回剧情档案','Back to story archive','物語アーカイブへ'],portraitUnavailable:['角色资源未加载','Character artwork unavailable','キャラクター画像を読み込めません']
});

Object.assign(TEXT,{
 ownedRoster:['主角 + 幻想乡八位少女 · 全部可用','Protagonist + eight Gensokyo girls · All available','主人公＋幻想郷の8人・全員使用可能'],
 lockedCharacter:['角色资料','Character dossier','人物資料'],
 battleQuality:['战斗画质','Battle quality','戦闘画質'],qualityHigh:['高 · 软阴影','High · soft shadows','高 · ソフトシャドウ'],qualityBalanced:['均衡','Balanced','標準'],qualityLow:['流畅 · 无阴影','Low · no shadows','低 · 影なし'],battleGrid:['战斗中显示战术网格','Show tactical grid in combat','戦闘中にグリッドを表示'],
 rarityNote:['八位角色可自由编队，剧情登场以当前场景为准。人物亲自在现场作战，地面网格只是指挥标记。','Build a squad from all eight characters. Story appearances follow each scene; the ground grid is a tactical overlay.','8人から自由に編成。登場は各場面に準じます。地面のグリッドは指揮用の目印です。'],
 ultimateTalent:['行动特写 · 首次技能演出','ACTION CUT-IN · FIRST CAST','アクション演出・初回スキル'],ultimateKicker:['行动特写','ACTION CUT-IN','アクション演出'],fullEffects:['技能特写演出','Skill cinematics','スキル演出'],
 baseSkin:['剧情行动装','Story field outfit','物語の行動服'],skinHint:['立绘由战斗中的 3D 模型直接渲染，二者造型一致。','Portraits are rendered from the same 3D models used in battle.','立ち絵は戦闘用3Dモデルから直接描画されます。'],
 collectionSubtitle:['幻想乡的八位少女','Eight girls of Gensokyo','幻想郷の八人の少女']
});
for(const [id,names] of Object.entries({wild:['互助','Mutual Aid','相互支援'],arcane:['共鸣','Resonance','共鳴'],dawn:['先遣','Vanguard','先遣'],ranger:['协同','Coordination','連携'],guard:['守护','Protection','守護']})){TRAITS[id].name=names[0];TRAIT_TEXT[id][0][0]=names[1];TRAIT_TEXT[id][1][0]=names[2];}

// Runtime motion parameters for the new 2D battle miniatures.


for(const h of HEROES){
 const en=h.type==='shield'?'Deploys protective equipment, granting '+h.power+' shield to self and the two nearest allies.':h.type==='heal'?'A medical drone restores 280 HP to the lowest-health ally and 140 HP to adjacent allies.':h.type==='aoe'?'Coordinates an area strike, dealing '+h.power+' damage to the target and enemies within one tile.':'Deals '+h.power+' damage to the nearest enemy.';
 const ja=h.type==='shield'?'防護装備で自身と最寄りの味方2人に'+h.power+'の盾を付与。':h.type==='heal'?'医療ドローンが最低HPの味方を280、隣接する味方を140回復。':h.type==='aoe'?'対象と周囲1マスの敵に'+h.power+'の範囲ダメージ。':'最も近い敵に'+h.power+'のダメージ。';
 HERO_TEXT[h.id][0][3]=en;HERO_TEXT[h.id][1][3]=ja;
}
