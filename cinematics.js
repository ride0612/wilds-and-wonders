'use strict';
// Each encounter owns a before/after cutscene. New chapters can supply the same schema.
const CINEMA_SCENES=['rain-station','night-observatory','sunken-archive','dawn-evacuation','abyss-belfry'];
const CINEMA_PARTNERS=['moon','oak','ember','arrow','knight'];
const CINEMA_EXCHANGES=[
 {before:[['你总是把邀请说得像绑架。新人，站到我身后。','You always make an invitation sound like an abduction. Newcomer, stay behind me.','勧誘がいつも誘拐みたいね。新人、私の後ろへ。'],['等天亮，我请你吃早餐。前提是这座城还在。','Breakfast is on me at dawn. Assuming the city is still here.','夜が明けたら朝食をおごるよ。この街が残っていたらね。']],after:[['照片背面有坐标。有人知道你一定会来。','There are coordinates on the back. Someone knew you would come.','写真の裏に座標がある。誰かが君の到着を確信していた。'],['那就亲自去问。至少这一次，不让他独自等。','Then we ask in person. This time, he will not wait alone.','なら、直接聞きに行こう。今度こそ、一人で待たせない。']]},
 {before:[['汤还热着。我把门守住，你们回来继续吃。','The soup is still warm. I will hold the door. Come back and finish it.','スープはまだ温かい。扉は私が守る。帰って続きを食べよう。'],['约好了。谁都不准缺席。','A promise, then. No empty seats.','約束だ。誰一人、欠けるな。']],after:[['核心稳住了。可警报用的是我们自己的密钥。','The core is stable. But the alarm used our own access key.','コアは安定した。だが警報には私たちの鍵が使われていた。'],['把密钥交给霜语。今晚的敌人，比门外那些更近。','Give the key to Frost. Tonight, the enemy is closer than the things outside.','鍵を霜語へ。今夜の敵は、外の怪物より近くにいる。']]},
 {before:[['如果它变成我，就问它昨天欠你的饭钱。','If it takes my face, ask about the meal I owe you.','私の姿になったら、昨日の食事代のことを聞いて。'],['你欠了三顿。我记得很清楚。跟紧。','Three meals. I remember perfectly. Stay close.','三食分よ。ちゃんと覚えている。離れないで。']],after:[['救一个人，还是救一座城……这种题为什么要交给你？','One person or an entire city… Why should you have to answer that?','一人か、街全体か……なぜ君が答えなければならないの？'],['因为他们以为你只剩一个人。我们会让他们算错。','Because they think you stand alone. We will prove them wrong.','君が一人だと思っているから。でも、その計算は間違いよ。']]},
 {before:[['最后一辆车还有孩子。给我三分钟。','There are children on the last bus. Give me three minutes.','最後のバスに子どもがいる。三分だけちょうだい。'],['我会让这三分钟足够长。所有人，守住撤离线。','We will make those minutes count. Everyone, hold the evacuation line.','その三分を守り抜く。全員、避難路を死守して。']],after:[['纸星星给你。那个孩子说，英雄也需要带路的光。','This paper star is yours. The child said even heroes need a guiding light.','この紙の星を。あの子が言ってた。英雄にも道しるべが必要だって。'],['那就带着它回来。下次见面，我们一起看真正的星空。','Bring it back. Next time, we will watch the real stars together.','持って帰ってきて。次はみんなで、本物の星空を見よう。']]},
 {before:[['剑已经出鞘了。无论门后是谁，我们一起面对。','My blade is drawn. Whoever waits beyond the door, we face them together.','剣は抜いた。扉の向こうに誰がいても、共に向き合う。'],['记住他的声音，不要接受他的牢笼。现在，切断共鸣！','Remember his voice. Refuse his cage. Now, break the resonance!','その声を覚えていて。だが檻は受け入れるな。今だ、共鳴を断て！']],after:[['太阳出来了。欢迎回家。','The sun is rising. Welcome home.','日が昇った。おかえり。'],['回信不必写得像英雄。写你今天活着，写有人等你。','Your reply need not sound heroic. Write that you are alive, and someone is waiting.','英雄のように書かなくていい。今日も生きていることを。待ってくれる人がいることを。']]}
];
Object.assign(TEXT,{
 cinemaNext:['下一句','Next','次へ'],cinemaSkip:['跳过过场','Skip scene','スキップ'],cinemaAuto:['自动播放','Auto','自動再生'],cinemaManual:['手动播放','Manual','手動再生'],cinemaBack:['上一句','Previous','前へ'],cinemaNarrator:['旁白','Narrator','ナレーション'],cinemaRead:['点击显示全文 · 再次点击继续','Click to reveal · Click again to continue','クリックで全文表示・もう一度で次へ'],cinemaReplay:['剧情回看','Story replay','回想']
});
let cinema=null;
function cinematicShots(index,part){
 const c=chapterText(index),s=c[part],loc=language==='en'?1:language==='ja'?2:0;
 const sentences=s.text.match(/[^。！？.!?]+[。！？.!?]?/g)||[s.text];
 const groups=Math.min(3,sentences.length),shots=[];
 for(let i=0;i<groups;i++)shots.push({speaker:null,text:sentences.slice(Math.floor(i*sentences.length/groups),Math.floor((i+1)*sentences.length/groups)).join('').trim()});
 shots.push({speaker:c.speaker,text:(ACCOUNT_ENABLED&&accountName?playerName()+(language==='en'?', ':'，'):'')+s.line},{speaker:CINEMA_PARTNERS[index],text:CINEMA_EXCHANGES[index][part][0][loc]},{speaker:c.speaker,text:CINEMA_EXCHANGES[index][part][1][loc]});
 shots.push({speaker:'protagonist',text:PROTAGONIST_LINES[index][part][loc]});
 return shots;
}
function beginCinematic(){cinema={shot:0,chars:0,hold:0,auto:false};renderCinematic();}
function cinematicEndLabel(){const {index,part,intent}=storyScene;return tr(intent==='read'?'gotIt':part==='before'?'prepareAction':index===STAGES.length-1?'backCamp':'nextChapter');}
function renderCinematic(){
 if(!storyScene||!cinema)return;
 const {index,part,intent}=storyScene,c=chapterText(index),shots=cinematicShots(index,part);
 cinema.shot=Math.min(cinema.shot,shots.length-1);const shot=shots[cinema.shot];
 const dialog=$('#story-dialog');dialog.dataset.part=part;dialog.dataset.shot=cinema.shot;
 $('#cinema-background').src='assets/scenes/'+CINEMA_SCENES[index]+'.png';
 $('#story-kicker').textContent=intent==='read'?tr('cinemaReplay'):tr(part==='before'?'beforeBattle':'afterBattle',{n:index+1,total:STAGES.length});
 $('#story-title').textContent=c[part].title;$('#story-language').value=language;
 $('#cinema-progress').textContent=String(cinema.shot+1).padStart(2,'0')+' / '+String(shots.length).padStart(2,'0');
 $('#story-speaker').textContent=shot.speaker==='protagonist'?ACCOUNT_ENABLED&&accountName?playerName():tr('protagonistYou')+' · '+protagonistName():shot.speaker?heroText(def(shot.speaker)).name:tr('cinemaNarrator');
 for(const [side,id] of [['left',c.speaker],['right',shot.speaker===CINEMA_PARTNERS[index]?CINEMA_PARTNERS[index]:'protagonist']]){
  const actor=$('#cinema-'+side);actor.src=id==='protagonist'?protagonistImage(protagonist||'male'):characterImage(id);actor.alt=id==='protagonist'?protagonistName():heroText(def(id)).name;actor.classList.toggle('speaking',shot.speaker===id);
 }
 $('#story-dialogue').textContent=shot.text.slice(0,Math.floor(cinema.chars));
 $('#story-goal').textContent=c.goal;$('#cinema-goal').hidden=cinema.shot!==shots.length-1;
 $('#story-next').textContent=cinema.shot===shots.length-1?cinematicEndLabel():tr('cinemaNext');
 $('#cinema-back').textContent=tr('cinemaBack');$('#cinema-back').disabled=cinema.shot===0;
 $('#cinema-auto').textContent=tr(cinema.auto?'cinemaManual':'cinemaAuto');$('#cinema-auto').setAttribute('aria-pressed',String(cinema.auto));
 $('#cinema-skip').textContent=tr('cinemaSkip');$('#story-dismiss').textContent=tr('close');
 $('#cinema-hint').textContent=tr('cinemaRead');
}
function revealCinematic(){if(!cinema||!storyScene)return;cinema.chars=cinematicShots(storyScene.index,storyScene.part)[cinema.shot].text.length;cinema.hold=0;renderCinematic();}
function nextCinematic(){
 if(!cinema||!storyScene)return;const shots=cinematicShots(storyScene.index,storyScene.part);
 if(cinema.chars<shots[cinema.shot].text.length){revealCinematic();return;}
 if(cinema.shot===shots.length-1){completeStory();return;}
 cinema.shot++;cinema.chars=0;cinema.hold=0;renderCinematic();
}
function tickCinematic(dt){
 if(!cinema||!storyScene||!$('#story-dialog').open||document.hidden)return;
 const shot=cinematicShots(storyScene.index,storyScene.part)[cinema.shot];
 if(cinema.chars<shot.text.length){cinema.chars=Math.min(shot.text.length,cinema.chars+dt*(language==='en'?48:24));$('#story-dialogue').textContent=shot.text.slice(0,Math.floor(cinema.chars));}
 else if(cinema.auto){cinema.hold+=dt;if(cinema.hold>Math.max(2.2,shot.text.length*(language==='en'?.025:.055)))nextCinematic();}
}
function dismissCinematic(){cinema=null;storyScene=null;$('#story-dialog').close();}
function initCinematics(){
 $('#story-next').onclick=nextCinematic;$('#cinema-text').onclick=nextCinematic;
 $('#cinema-skip').onclick=completeStory;$('#story-dismiss').onclick=dismissCinematic;
 $('#cinema-back').onclick=()=>{if(!cinema||cinema.shot===0)return;cinema.shot--;cinema.chars=0;cinema.hold=0;renderCinematic();};
 $('#cinema-auto').onclick=()=>{if(!cinema)return;cinema.auto=!cinema.auto;cinema.hold=0;renderCinematic();};
 $('#story-dialog').addEventListener('cancel',()=>{cinema=null;storyScene=null;});
 $('#story-dialog').addEventListener('keydown',e=>{if((e.code==='Space'||e.code==='ArrowRight')&&e.target.tagName!=='SELECT'&&e.target.tagName!=='BUTTON'){e.preventDefault();nextCinematic();}});
}
