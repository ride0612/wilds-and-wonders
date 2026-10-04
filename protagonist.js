'use strict';
const PROTAGONISTS=['male','female'];
let protagonist=null,pendingProtagonist=null,featureProtagonist=false;
const protagonistImage=(id=protagonist)=>'assets/characters/protagonist-'+id+'-v2.png';
function protagonistName(id=protagonist){return tr(id==='female'?'protagonistFemale':'protagonistMale');}
Object.assign(TEXT,{
 protagonistTitle:['选择你的主角','Choose your protagonist','主人公を選択'],protagonistSubtitle:['故事，从你的回信开始。','Your story begins with a reply.','物語は、あなたの返事から始まる。'],
 protagonistMale:['男主角','Male protagonist','男性主人公'],protagonistFemale:['女主角','Female protagonist','女性主人公'],
 protagonistRole:['星穹学院 · 新任行者','Morningstar Academy · New Wayfarer','星穹学院・新たな旅人'],
 protagonistUniform:['星穹行装','Morningstar field uniform','星穹の旅装'],
 protagonistUniformDesc:['象牙白长衣、午夜蓝内衬、金色星徽与酒红领结。来自同一套学院制服设计。','Ivory coats, midnight-blue lining, gold star insignia and burgundy ribbons. Two versions of the same academy uniform.','象牙色のコート、紺の裏地、金の星章とワイン色のリボン。同じ学院制服を纏う二人。'],
 protagonistHint:['选择影响主角立绘，大厅与剧情会使用所选形象。可在「扩展」中更换，进度不受影响。','Your choice sets your portrait in the lobby and story. Change it in More at any time without losing progress.','選んだ姿がロビーと物語に登場します。「その他」で変更でき、進行状況は維持されます。'],
 protagonistConfirm:['以此身份启程','Begin your journey','この姿で旅立つ'],protagonistApply:['保存并展示','Save and feature','保存して展示'],protagonistChoose:['请选择一个形象','Select a portrait to continue','姿を選んでください'],protagonistEdit:['主角形象','Protagonist','主人公の姿'],protagonistYou:['你','You','あなた']
});
const PROTAGONIST_LINES=[
 {before:['我不知道这封信为什么选中我。但我想亲自找到答案。','I do not know why this letter chose me. But I want to find the answer myself.','なぜこの手紙が私を選んだのか。答えは、自分で見つけたい。'],after:['这是父亲留下的线索。明天，我和你们一起走。','My father left this clue. Tomorrow, I am coming with you.','父が残した手がかりだ。明日は、みんなと一緒に行く。']},
 {before:['核心交给我。等警报结束，我们再把那碗面吃完。','Leave the core to me. When the alarm stops, we will finish those noodles.','コアは任せて。警報が止まったら、あの麺の続きを食べよう。'],after:['有人用父亲的名字打开了门。那我就走进去看看。','Someone opened a door in my father’s name. Then I will see what lies beyond it.','誰かが父の名で扉を開いた。なら、その先を確かめる。']},
 {before:['如果我也听见自己的声音，记得把我叫醒。','If I hear my own voice down there, promise you will wake me.','自分の声が聞こえたら、必ず呼び戻して。'],after:['我想救他。但不能让整座城替我的愿望付出代价。','I want to save him. But this city cannot pay the price for my wish.','父を救いたい。でも、その願いの代償を街に払わせることはできない。']},
 {before:['钟楼可以再等。先让最后一辆车安全通过。','The clock tower can wait. First, we get the last bus across.','時計塔は後でいい。まず、最後のバスを無事に通そう。'],after:['我会回来。到时候，这颗星星还给那个孩子。','I will come back. Then we can return this star to that child.','必ず戻る。その時、この星をあの子に返そう。']},
 {before:['父亲，如果你还听得见——这一次，让我自己选择。','Father, if you can still hear me—this time, let me choose.','父さん、まだ聞こえるなら——今度は、自分で選ばせて。'],after:['我会写下今天，也会写下你们。我们的故事，才刚刚开始。','I will write about today, and about all of you. Our story is only beginning.','今日のことも、みんなのことも書こう。私たちの物語は、まだ始まったばかりだ。']}
];
function renderProtagonistPicker(){
 $('#protagonist-language').value=language;
 for(const id of PROTAGONISTS){const button=$('#protagonist-'+id);button.classList.toggle('selected',pendingProtagonist===id);button.setAttribute('aria-pressed',String(pendingProtagonist===id));}
 $('#protagonist-confirm').disabled=!PROTAGONISTS.includes(pendingProtagonist)||(ACCOUNT_ENABLED&&(accountBusy||!validPlayerName($('#protagonist-name').value)));
 $('#protagonist-name-row').hidden=!ACCOUNT_ENABLED;$('#protagonist-dialog').classList.toggle('naming',ACCOUNT_ENABLED);
 $('#protagonist-confirm').textContent=tr(protagonist?'protagonistApply':'protagonistConfirm');
 $('#protagonist-selection').textContent=pendingProtagonist?protagonistName(pendingProtagonist):tr('protagonistChoose');
 $('#protagonist-close').hidden=!protagonist||(ACCOUNT_ENABLED&&!accountName);
}
function openProtagonistPicker(){
 if(mode==='fight'){paused=true;renderUI();}
 closeUtilityDialogs();if(ACCOUNT_ENABLED){$('#protagonist-name').value=accountName;$('#protagonist-name-error').textContent='';}pendingProtagonist=protagonist;renderProtagonistPicker();
 if(!$('#protagonist-dialog').open)$('#protagonist-dialog').showModal();
}
function confirmProtagonist(){
 if(ACCOUNT_ENABLED)return confirmAccountProtagonist();
 if(!PROTAGONISTS.includes(pendingProtagonist))return;
 protagonist=pendingProtagonist;featureProtagonist=true;$('#protagonist-dialog').close();renderLobby();saveProfile();
}
function renderProtagonistLobby(){
 if(!protagonist||!featureProtagonist)return;
 const art=$('#display-art'),key='protagonist-'+protagonist;
 if(art.dataset.hero!==key){art.innerHTML='<img class="featured-portrait" src="'+protagonistImage()+'" alt="'+protagonistName()+'">';art.dataset.hero=key;}
}
function initProtagonist(){
 for(const id of PROTAGONISTS)$('#protagonist-'+id).onclick=()=>{pendingProtagonist=id;renderProtagonistPicker();};
 $('#protagonist-confirm').onclick=confirmProtagonist;
 $('#protagonist-open').onclick=openProtagonistPicker;
 $('#protagonist-close').onclick=()=>{if(protagonist&&(!ACCOUNT_ENABLED||accountName))$('#protagonist-dialog').close();};
 $('#protagonist-dialog').addEventListener('cancel',e=>{if(!protagonist||(ACCOUNT_ENABLED&&!accountName))e.preventDefault();});
 $('#protagonist-language').onchange=e=>setLanguage(e.target.value);
 $('#protagonist-name').oninput=renderProtagonistPicker;
 if(!ACCOUNT_ENABLED&&!protagonist)openProtagonistPicker();
}
