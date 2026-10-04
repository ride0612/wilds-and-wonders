(async()=>{
 const checks=[],check=(v,s)=>{if(!v)throw Error(s);checks.push(s);};
 try{
  if(accountUser)await logoutAccount();setLanguage('zh');
  check($('#account-dialog').open,'login gate opens before gameplay');
  const first='smoke_'+Date.now(),second=first+'_b',password='TestOnly-Strong42';
  $('#account-register-tab').click();$('#account-username').value=first;$('#account-password').value=password;$('#account-repeat').value='different';await submitAccount();
  check($('#account-error').textContent===tr('passwordMismatch'),'registration checks repeated password');
  $('#account-repeat').value=password;await submitAccount();
  check(accountUser.username===first&&$('#protagonist-dialog').open&&!accountName,'registration opens protagonist naming');
  $('#protagonist-female').click();$('#protagonist-name').value='<bad>';await confirmProtagonist();
  check(!accountName&&$('#protagonist-name-error').textContent===tr('nameFormat'),'unsafe name rejected before saving');
  $('#protagonist-name').value='星野';await confirmProtagonist();
  check(accountName==='星野'&&protagonist==='female'&&!$('#protagonist-dialog').open,'name and portrait confirmed');
  check(!document.cookie.includes('ww_session'),'session cookie is inaccessible to page scripts');
  cleared=[0];unlocked=1;stage=1;prepare();saveProfile();await flushAccountSave();
  const saved=await accountApi('me');check(saved.profile.name==='星野'&&saved.profile.save.stage===1,'named progress saved to server');
  openStory(0,'before','read');cinema.shot=6;renderCinematic();revealCinematic();
  check($('#story-speaker').textContent==='星野'&&$('#cinema-right').src.includes('protagonist-female'),'story uses account name and portrait');dismissCinematic();
  await logoutAccount();check(!accountUser&&$('#account-dialog').open&&cleared.length===0,'logout locks game and clears prior player state');
  $('#account-register-tab').click();$('#account-username').value=second;$('#account-password').value=password;$('#account-repeat').value=password;$('#account-import').checked=false;await submitAccount();
  check(accountUser.username===second&&stage===0&&cleared.length===0&&!accountName,'second account starts independently');
  $('#protagonist-male').click();$('#protagonist-name').value='遥川';await confirmProtagonist();await logoutAccount();
  $('#account-login-tab').click();$('#account-username').value=first;$('#account-password').value='WrongPassword42';await submitAccount();check($('#account-error').textContent===tr('invalidCredentials'),'incorrect password remains at login');
  $('#account-password').value=password;await submitAccount();check(accountName==='星野'&&protagonist==='female'&&stage===1&&cleared.length===1,'login restores the correct isolated account');
  const realFetch=window.fetch;
  window.fetch=(url,options)=>url==='/api/profile'?Promise.reject(new Error('test disconnect')):realFetch(url,options);
  try{saveProfile();await flushAccountSave();}catch{}
  finally{window.fetch=realFetch;}
  check(accountProblem==='networkError'&&accountPending!==null,'disconnection keeps unsaved progress pending');
  await flushAccountSave();check(!accountProblem&&!accountPending,'retry persists the pending save');
  await accountApi('profile','PUT',{name:accountName,avatar:protagonist,save:profileSnapshot(),revision:accountRevision});
  try{saveProfile();await flushAccountSave();}catch{}
  check(accountProblem==='saveConflict','stale window cannot overwrite a newer revision');
  acceptAccount(await accountApi('me'));check(!accountProblem&&stage===1,'reloading resolves the conflict without overwriting');
  for(const lang of ['en','ja','zh']){setLanguage(lang);check($('#account-title').textContent===tr('accountTitle'),'account locale '+lang);}
  return {passed:true,count:checks.length,checks};
 }catch(e){return {passed:false,error:e.message,stack:e.stack,checks};}
})().then(r=>window.accountSmokeResult=r);
