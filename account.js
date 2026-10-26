'use strict';
// Offline compatibility layer. All progress stays in browser storage.
const ACCOUNT_ENABLED=false;
let accountUser={id:'local'},accountGeneration=0,accountName='';
const LOCAL_COLLECTION_KEY='never-yield.fold-01.collection.v1';
function playerName(){return tr('protagonistYou');}
function renderAccount(){}
function accountErrorMessage(code){return TEXT[code]?tr(code):tr('localSaveError');}
Object.assign(TEXT,{localSaveError:['无法保存本地进度，请检查浏览器存储设置。','Cannot save locally. Check browser storage settings.','保存できません。ブラウザーの設定を確認してください。']});
function initLocalCollection(){
 let state;try{state=JSON.parse(localStorage.getItem(LOCAL_COLLECTION_KEY)||'null');}catch{}
 if(!state||!Array.isArray(state.heroes)||!state.pity||!state.weapons||!state.equipment||!Array.isArray(state.history)||!Array.isArray(state.rewards)||!Number.isFinite(state.tickets)||!Number.isFinite(state.dust))state={tickets:GACHA_DATA.initialTickets,dust:0,heroes:HEROES.map(h=>h.id),weapons:{},equipment:{},pity:Object.fromEntries(GACHA_DATA.banners.map(b=>[b.id,{six:0,five:0}])),history:[],rewards:[]};
 setCollection(state);
}
function storeLocalCollection(state){
 try{localStorage.setItem(LOCAL_COLLECTION_KEY,JSON.stringify(state));}catch{throw new Error('localSaveError');}
 setCollection(state);
}
function queueAccountSave(save){
 if(!collectionState)return;
 const state=JSON.parse(JSON.stringify(collectionState));
 for(const act of save.cleared)if(!state.rewards.includes(act)){state.rewards.push(act);state.tickets+=10;}
 try{storeLocalCollection(state);}catch{storageAvailable=false;$('#storage-warning').hidden=false;}
}
async function flushAccountSave(){}
async function accountApi(route,method='GET',body={}){
 if(route==='collection')return {collection:collectionState};
 const state=JSON.parse(JSON.stringify(collectionState)),results=[];
 if(route==='draw'){
  const banner=GACHA_DATA.banners.find(b=>b.id===body.banner);
  if(!banner||![1,10].includes(body.count))throw new Error('invalidDraw');
  if(state.lastDraw?.id===body.requestId)return {collection:state,results:state.lastDraw.results};
  if(state.tickets<body.count)throw new Error('notEnoughTickets');
  state.tickets-=body.count;
  for(let i=0;i<body.count;i++){
   const pity=state.pity[banner.id],n=Math.random(),stars=pity.six>=59||n<.02?6:pity.five>=9||n<.1?5:4;
   pity.six=stars===6?0:pity.six+1;pity.five=stars>=5?0:pity.five+1;
   const pool=banner[stars===6?'six':stars===5?'five':'four'],id=pool[Math.floor(Math.random()*pool.length)];
   const duplicate=banner.kind==='character'?state.heroes.includes(id):!!state.weapons[id],dust=duplicate?({4:10,5:50,6:200}[stars]):0;
   const item={id,stars,kind:banner.kind,duplicate,dust};state.dust+=dust;
   if(!duplicate){if(banner.kind==='character')state.heroes.push(id);else state.weapons[id]=1;}
   results.push(item);state.history.unshift({...item,banner:banner.id,time:Date.now()});
  }
  state.history=state.history.slice(0,100);state.lastDraw={id:body.requestId,results};
 }else if(route==='exchange'){
  if(state.dust<100)throw new Error('notEnoughDust');state.dust-=100;state.tickets++;
 }else if(route==='equip'){
  if(!state.heroes.includes(body.hero)||(body.weapon!==null&&!state.weapons[body.weapon]))throw new Error('invalidDraw');
  if(body.weapon)for(const hero of Object.keys(state.equipment))if(state.equipment[hero]===body.weapon)delete state.equipment[hero];
  if(body.weapon)state.equipment[body.hero]=body.weapon;else delete state.equipment[body.hero];
 }else throw new Error('invalidDraw');
 storeLocalCollection(state);return {collection:state,results};
}
