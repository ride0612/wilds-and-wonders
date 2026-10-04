'use strict';
const ACCOUNT_ENABLED=typeof fetch==='function';
let accountUser=null,accountName='',accountRevision=0,accountLoading=true,accountReady=false,accountPending=null,accountSaving=null,accountTimer=null,accountProblem='',accountFormMode='login',accountBusy=false;
let accountGeneration=0;
const ACCOUNT_DEFAULT_LINEUP=lineup.map(p=>({...p}));
Object.assign(TEXT,{
 accountTitle:['欢迎回到远境','Welcome to the Wilds','遠境へようこそ'],accountIntro:['登录你的账号，续写属于你的冒险。','Sign in and continue your own adventure.','ログインして、あなたの冒険の続きを。'],accountLogin:['登录','Sign in','ログイン'],accountRegister:['注册账号','Create account','新規登録'],accountUsername:['账号','Username','アカウント'],accountPassword:['密码','Password','パスワード'],accountRepeat:['确认密码','Confirm password','パスワード確認'],accountRules:['账号：4–32 位英文字母、数字或下划线；密码：10–128 位。','Username: 4–32 letters, digits or underscores. Password: 10–128 characters.','ID：英数字・_の4～32文字。パスワード：10～128文字。'],accountLocal:['本机服务器 · 账号和进度保存在这台电脑','Local server · Accounts and progress stay on this computer','ローカルサーバー・アカウントと進行はこのPCに保存'],accountImport:['将旧版本的本地进度导入这个新账号','Import the previous local progress into this new account','旧バージョンの進行状況をこの新規アカウントに引き継ぐ'],accountLogout:['保存并退出账号','Save and sign out','保存してログアウト'],accountRetry:['重试连接 / 同步','Retry connection / sync','再接続・同期'],accountReload:['重新载入账号进度','Reload account progress','アカウントの進行を再読込'],accountSaved:['账号进度已保存','Account progress saved','進行状況を保存しました'],accountSaving:['正在保存账号进度…','Saving progress…','進行状況を保存中…'],accountWorking:['正在连接…','Connecting…','接続中…'],accountNameLabel:['主角名字','Protagonist name','主人公の名前'],accountNameHint:['2–16 个文字，可使用中文、英文或日文；这个名字将出现在剧情中。','2–16 characters. Chinese, English and Japanese are supported. This name appears in the story.','2～16文字。日本語・中国語・英語に対応。物語にこの名前が登場します。'],
 credentialsFormat:['请检查账号和密码长度。','Check the username and password format.','IDとパスワードの形式を確認してください。'],accountExists:['这个账号已存在，请登录或换一个账号。','This account exists. Sign in or choose another username.','既存のIDです。ログインするか別のIDを選んでください。'],invalidCredentials:['账号或密码不正确。','Incorrect username or password.','IDまたはパスワードが違います。'],passwordMismatch:['两次输入的密码不一致。','The passwords do not match.','パスワードが一致しません。'],nameFormat:['名字需为 2–16 个文字，只能包含文字、数字、空格、下划线、短横线或中点。','Use 2–16 letters, digits, spaces, underscores, hyphens or middle dots.','名前は2～16文字の文字・数字・空白・_・ハイフン・中点で入力してください。'],rateLimited:['尝试次数较多，请稍后重试。','Too many attempts. Please try again later.','試行回数が多すぎます。しばらくしてからお試しください。'],networkError:['无法连接本机服务器。请重试，或重新启动游戏。','Cannot reach the local server. Retry or restart the game.','ローカルサーバーに接続できません。再試行するかゲームを再起動してください。'],unauthorized:['登录已过期，请重新登录。','Your session expired. Please sign in again.','ログインの有効期限が切れました。再ログインしてください。'],saveConflict:['另一个窗口已更新进度。请重新载入，避免覆盖存档。','Another window updated this account. Reload to avoid overwriting progress.','別の画面で進行が更新されました。上書きを避けるため再読込してください。'],serverError:['服务器暂时无法处理，请重试。','The server could not complete this request. Please retry.','サーバーが処理できませんでした。再試行してください。'],invalidSave:['进度格式无效，尚未写入服务器。','Invalid progress data; nothing was written.','進行データが無効なため保存されませんでした。']
});
function validPlayerName(s){return typeof s==='string'&&[...s.trim()].length>=2&&[...s.trim()].length<=16&&/^[\p{L}\p{N} _·・-]+$/u.test(s.trim());}
function playerName(){return accountName||tr('protagonistYou');}
async function accountApi(route,method='GET',body){
 let res;try{res=await fetch('/api/'+route,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});}catch{throw new Error('networkError');}
 let data;try{data=await res.json();}catch{throw new Error('networkError');}if(!res.ok)throw new Error(data.error||'serverError');return data;
}
function accountErrorMessage(code){return tr(TEXT[code]?code:'serverError');}
function renderAccount(){
 if(!ACCOUNT_ENABLED)return;$('#account-language').value=language;
 $('#account-login-tab').setAttribute('aria-pressed',String(accountFormMode==='login'));$('#account-register-tab').setAttribute('aria-pressed',String(accountFormMode==='register'));
 $('#account-repeat-row').hidden=accountFormMode!=='register';$('#account-repeat').required=accountFormMode==='register';
 $('#account-import-row').hidden=accountFormMode!=='register'||!legacyAccountSave();
 $('#account-password').autocomplete=accountFormMode==='login'?'current-password':'new-password';
 $('#account-submit').disabled=accountBusy;$('#account-submit').textContent=tr(accountBusy?'accountWorking':accountFormMode==='login'?'accountLogin':'accountRegister');
 $('#account-identity').textContent=accountUser?accountUser.username+(accountName?' · '+accountName:''):'';
 $('#account-sync').textContent=accountProblem?accountErrorMessage(accountProblem):tr(accountSaving||accountPending?'accountSaving':'accountSaved');
 $('#account-retry').hidden=!accountProblem;$('#account-retry').textContent=tr(accountProblem==='saveConflict'?'accountReload':'accountRetry');
}
function legacyAccountSave(){try{const s=JSON.parse(localStorage.getItem('wilds.legacy.v2')||localStorage.getItem(SAVE_KEY)||'null');return s?.version===2&&Array.isArray(s.cleared)?s:null;}catch{return null;}}
function showAccountGate(error=''){
 paused=true;closeUtilityDialogs();dismissCinematic();if($('#protagonist-dialog').open)$('#protagonist-dialog').close();
 $('#account-error').textContent=error?accountErrorMessage(error):'';renderAccount();if(!$('#account-dialog').open)$('#account-dialog').showModal();
}
function resetAccountGame(save){
 profileReady=false;protagonist=null;featureProtagonist=false;displayHero='oak';skinByHero={};cleared=[];unlocked=0;stage=0;selected='oak';lineup=ACCOUNT_DEFAULT_LINEUP.filter(p=>OWNED_HEROES.includes(p.id)).map(p=>({...p}));defensePositions={};logs=[];battleResult=null;presentationSettings.effects=true;presentationSettings.motion=true;
 const restored=loadProfile(save||{version:2,language});localizePage();prepare();
 if(restored){mode='win';battleResult=restored;if(siege){siege.core=restored.core;siege.leaks=restored.leaks;siege.wave=siege.total;}renderUI();}
 profileReady=true;showView('lobby');
}
function acceptAccount(data,importSave=null){
 accountGeneration++;resetGachaSession();
 accountLoading=true;accountReady=false;accountPending=null;clearTimeout(accountTimer);accountUser=data.user;accountRevision=data.profile.revision;accountName=data.profile.name||'';accountProblem='';
 setCollection(data.collection);const save=data.profile.save||importSave;resetAccountGame(save);if(data.profile.avatar){protagonist=data.profile.avatar;renderLobby();}
 accountLoading=false;accountReady=true;$('#account-dialog').close();$('#account-password').value='';$('#account-repeat').value='';$('#account-import').checked=false;renderAccount();
 if(!protagonist||!accountName)openProtagonistPicker();
}
async function submitAccount(event){
 if(event)event.preventDefault();if(accountBusy)return;
 if(accountFormMode==='register'&&$('#account-password').value!==$('#account-repeat').value){$('#account-error').textContent=tr('passwordMismatch');return;}
 const importing=accountFormMode==='register'&&$('#account-import').checked?legacyAccountSave():null;
 accountBusy=true;renderAccount();$('#account-error').textContent='';
 try{acceptAccount(await accountApi(accountFormMode==='register'?'register':'login','POST',{username:$('#account-username').value,password:$('#account-password').value}),importing);}catch(e){$('#account-error').textContent=accountErrorMessage(e.message);}finally{accountBusy=false;renderAccount();}
}
function queueAccountSave(save){
 if(!ACCOUNT_ENABLED||!accountReady||accountLoading||!accountUser||!accountName||!protagonist)return;
 accountPending={name:accountName,avatar:protagonist,save};clearTimeout(accountTimer);if(!accountProblem)accountTimer=setTimeout(()=>flushAccountSave().catch(()=>{}),350);renderAccount();
}
async function flushAccountSave(){
 clearTimeout(accountTimer);if(accountSaving){await accountSaving;if(accountPending)return flushAccountSave();return;}
 if(!accountPending||!accountUser)return;if(accountProblem==='saveConflict')throw new Error(accountProblem);
 accountSaving=(async()=>{
  while(accountPending){const pending=accountPending;accountPending=null;
   try{const result=await accountApi('profile','PUT',{...pending,revision:accountRevision});accountRevision=result.revision;if(result.collection)setCollection(result.collection);accountProblem='';}
   catch(e){if(!accountPending)accountPending=pending;accountProblem=e.message;if(e.message==='unauthorized')showAccountGate(e.message);throw e;}
  }
 })();renderAccount();try{await accountSaving;}finally{accountSaving=null;renderAccount();}
}
async function confirmAccountProtagonist(){
 if(accountBusy||!accountUser||!PROTAGONISTS.includes(pendingProtagonist))return;
 const name=$('#protagonist-name').value.trim();if(!validPlayerName(name)){$('#protagonist-name-error').textContent=tr('nameFormat');return;}
 accountBusy=true;$('#protagonist-confirm').disabled=true;$('#protagonist-name-error').textContent='';
 const previous={protagonist,accountName,featureProtagonist};
 try{await flushAccountSave();protagonist=pendingProtagonist;accountName=name;featureProtagonist=true;saveProfile();await flushAccountSave();$('#protagonist-dialog').close();renderLobby();renderAccount();}
 catch(e){protagonist=previous.protagonist;accountName=previous.accountName;featureProtagonist=previous.featureProtagonist;accountPending=null;$('#protagonist-name-error').textContent=accountErrorMessage(e.message);}
 finally{accountBusy=false;renderProtagonistPicker();}
}
async function logoutAccount(){
 if(accountBusy)return;accountBusy=true;paused=true;
 try{saveProfile();await flushAccountSave();await accountApi('logout','POST');accountGeneration++;resetGachaSession();accountReady=false;collectionState=null;OWNED_HEROES.splice(0,OWNED_HEROES.length,...GACHA_DATA.starter);accountUser=null;accountName='';accountPending=null;accountLoading=true;resetAccountGame(null);accountLoading=false;showAccountGate();}
 catch(e){accountProblem=e.message;renderAccount();}finally{accountBusy=false;}
}
async function initAccount(){
 if(!ACCOUNT_ENABLED)return;
 $('#account-form').onsubmit=submitAccount;$('#account-dialog').addEventListener('cancel',e=>e.preventDefault());
 $('#account-language').onchange=e=>setLanguage(e.target.value);
 for(const tab of ['login','register'])$('#account-'+tab+'-tab').onclick=()=>{if(accountBusy)return;accountFormMode=tab;$('#account-error').textContent='';renderAccount();};
 $('#account-logout').onclick=logoutAccount;
 $('#account-retry').onclick=async()=>{try{if(accountProblem==='saveConflict')acceptAccount(await accountApi('me'));else{accountProblem='';await flushAccountSave();}}catch(e){accountProblem=e.message;renderAccount();}};
 $('#account-connect').onclick=()=>initAccount();
 try{if(window.legacyProfile&&!localStorage.getItem('wilds.legacy.v2'))localStorage.setItem('wilds.legacy.v2',window.legacyProfile);}catch{}
 showAccountGate();try{acceptAccount(await accountApi('me'));}catch(e){accountLoading=false;showAccountGate(e.message==='unauthorized'?'':e.message);}
}
