'use strict';
const MUSIC_TRACKS={lobby:['星穹中庭','Celestial Atrium','星穹の中庭'],'red-tide':['雨中的来信','A Letter in the Rain','雨の手紙'],'white-bell':['借来的明天','Borrowed Tomorrows','借りた明日'],'nameless-court':['被擦去的名字','Erased Names','消された名前'],'starlit-return':['一起归航','Home Together','共に帰る'],'battle-expedition':['星轨出征','Starbound Expedition','星軌の出征'],'battle-defense':['守到黎明','Hold Until Dawn','夜明けまで守る'],'battle-boss':['回信的重量','The Weight of a Reply','返事の重さ']};
let musicEnabled=true,musicVolume=.35,musicPlayers=[],musicCurrent='',musicUnlocked=false,musicFailed=false;
Object.assign(TEXT,{musicEnabled:['背景音乐','Background music','BGM'],musicVolume:['音乐音量','Music volume','音量'],musicWait:['首次点击后开始播放','Music starts after your first click','最初の操作で再生開始'],musicNow:['正在播放：{name}','Now playing: {name}','再生中：{name}'],musicOff:['音乐已关闭','Music off','BGMオフ'],musicFailed:['音乐文件无法播放，请检查资源完整性。','Music could not play. Check the game files.','音楽を再生できません。ファイルを確認してください。']});
function wantedMusic(){if(storyScene)return ['red-tide','white-bell','nameless-court','starlit-return'][Math.floor(storyScene.index/5)];if(currentView==='adventure'&&!$('#chapter-mission').hidden){if(mode==='fight')return STAGES[stage].enemies.includes('boss')?'battle-boss':isDefense()?'battle-defense':'battle-expedition';return ['red-tide','white-bell','nameless-court','starlit-return'][Math.floor(stage/5)];}return 'lobby';}
function renderMusicControls(){const box=$('#music-toggle');if(!box)return;box.checked=musicEnabled;$('#music-volume').value=Math.round(musicVolume*100);$('#music-now').textContent=tr(musicFailed?'musicFailed':!musicEnabled?'musicOff':!musicUnlocked?'musicWait':'musicNow',{name:gachaLoc(MUSIC_TRACKS[musicCurrent]||MUSIC_TRACKS.lobby)});}
function ensureMusicPlay(p){
 if(p.playing||!p.active||!p.audio.paused||document.hidden||!musicEnabled)return;
 const attempt=++p.attempt,key=p.key;p.playing=true;
 p.audio.play().then(()=>{if(p.attempt===attempt&&p.key===key&&p.active){musicFailed=false;renderMusicControls();}}).catch(error=>{
  if(p.attempt!==attempt||p.key!==key||!p.active||error.name==='AbortError'||document.hidden||!musicEnabled)return;
  musicFailed=true;renderMusicControls();
 }).finally(()=>{if(p.attempt===attempt)p.playing=false;});
}
function tickMusic(dt){
 if(!musicPlayers.length||!musicUnlocked)return;
 if(document.hidden||!musicEnabled){for(const p of musicPlayers){p.audio.pause();p.gain=0;p.audio.volume=0;}return;}
 const key=wantedMusic();if(key!==musicCurrent){musicCurrent=key;musicFailed=false;const p=musicPlayers.find(p=>!p.active)||musicPlayers[0];for(const other of musicPlayers)other.active=false;p.active=true;p.key=key;p.gain=0;p.attempt++;p.playing=false;p.audio.pause();p.audio.src='assets/music/'+key+'.wav';p.audio.currentTime=0;p.audio.volume=0;ensureMusicPlay(p);renderMusicControls();}
 for(const p of musicPlayers){p.gain=Math.max(0,Math.min(1,p.gain+(p.active?dt:-dt)/1.2));p.audio.volume=p.gain*musicVolume;if(!p.active&&p.gain===0)p.audio.pause();else if(p.active&&!musicFailed)ensureMusicPlay(p);}
}
function initMusic(){
 if(typeof Audio==='undefined')return;
 try{const s=JSON.parse(localStorage.getItem('wilds.music')||'null');if(s){musicEnabled=s.enabled!==false;musicVolume=Number.isFinite(s.volume)?Math.min(1,Math.max(0,s.volume)):.35;}}catch{}
 musicPlayers=[0,1].map(()=>{const audio=new Audio();audio.loop=true;audio.preload='none';return {audio,gain:0,active:false,playing:false,attempt:0};});
 const unlock=()=>{musicUnlocked=true;musicFailed=false;tickMusic(.05);renderMusicControls();};document.addEventListener('pointerdown',unlock,{once:true});document.addEventListener('keydown',unlock,{once:true});
 const save=()=>{try{localStorage.setItem('wilds.music',JSON.stringify({enabled:musicEnabled,volume:musicVolume}));}catch{}renderMusicControls();};
 $('#music-toggle').onchange=e=>{musicEnabled=e.target.checked;musicFailed=false;save();tickMusic(.05);};$('#music-volume').oninput=e=>{musicVolume=Number(e.target.value)/100;save();};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)musicFailed=false;tickMusic(.05);});window.addEventListener('pagehide',()=>musicPlayers.forEach(p=>p.audio.pause()));renderMusicControls();
}
