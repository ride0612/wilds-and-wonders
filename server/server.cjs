'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {randomBytes,randomUUID,scrypt,timingSafeEqual,createHash}=require('node:crypto');
const {promisify}=require('node:util');
const {createGacha}=require('./gacha.cjs');
const derive=promisify(scrypt),hash=s=>createHash('sha256').update(s).digest('hex');
const HEROES=['oak','arrow','ember','sage','knight','frost','warden','moon'];
const FILES=new Set(['index.html','style.css','lobby.css','battle.css','portrait-ui.css','cinematics.css','protagonist.css','account.css','localization.js','combat-text.js','story.js','game.js','characters.js','defense.js','arena.js','campaign.js','presentation.js','cinematics.js','protagonist.js','account.js','lobby.js']);
const fail=(status,code)=>{throw Object.assign(new Error(code),{status,code});};
function validName(value){return typeof value==='string'&&[...value.trim()].length>=2&&[...value.trim()].length<=16&&/^[\p{L}\p{N} _·・-]+$/u.test(value.trim());}
function cleanSave(s){
 if(!s||s.version!==2||!['zh','en','ja'].includes(s.language)||!HEROES.includes(s.displayHero)||!Array.isArray(s.cleared)||!Array.isArray(s.lineup)||s.lineup.length>5)fail(400,'invalidSave');
 if(s.cleared.length>20||s.cleared.some((n,i)=>n!==i)||!Number.isInteger(s.stage)||s.stage<0||s.stage>Math.min(19,s.cleared.length))fail(400,'invalidSave');
 const ids=new Set(),cells=new Set();
 const lineup=s.lineup.map(p=>{if(!p||!HEROES.includes(p.id)||!Number.isInteger(p.x)||p.x<0||p.x>7||!Number.isInteger(p.y)||p.y<3||p.y>5||ids.has(p.id)||cells.has(p.x+','+p.y))fail(400,'invalidSave');ids.add(p.id);cells.add(p.x+','+p.y);return {id:p.id,x:p.x,y:p.y};});
 const defensePositions={};for(const id of HEROES){const p=s.defensePositions?.[id];if(p&&Number.isInteger(p.x)&&p.x>=0&&p.x<8&&Number.isInteger(p.y)&&p.y>=0&&p.y<6)defensePositions[id]={x:p.x,y:p.y};}
 const r=s.result;const result=r&&r.win===true&&s.cleared.includes(s.stage)&&Number.isFinite(r.time)&&r.time>=0&&r.time<=181&&Number.isInteger(r.survivors)&&r.survivors>=0&&r.survivors<=5?{win:true,timeout:false,time:r.time,survivors:r.survivors,core:Number.isFinite(r.core)?Math.max(0,Math.min(100,r.core)):100,leaks:Number.isInteger(r.leaks)?Math.max(0,r.leaks):0}:null;
 return {version:2,protagonist:['male','female'].includes(s.protagonist)?s.protagonist:null,featureProtagonist:!!s.featureProtagonist,language:s.language,displayHero:s.displayHero,lineup,defensePositions,stage:s.stage,cleared:s.cleared,skinByHero:Object.fromEntries(HEROES.map(id=>[id,'base'])),presentation:{effects:s.presentation?.effects!==false,motion:s.presentation?.motion!==false},result};
}
function createGameServer({dataDir,gameDir,port=18765,sessionMs=30*86400000}={}){
 dataDir=path.resolve(dataDir||path.join(process.env.LOCALAPPDATA||process.cwd(),'WildsAndWonders','Server'));gameDir=path.resolve(gameDir||path.join(__dirname,'../game'));
 fs.mkdirSync(dataDir,{recursive:true});const db=new DatabaseSync(path.join(dataDir,'accounts.sqlite'),{timeout:5000});
 db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,password_hash TEXT NOT NULL,created INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS profiles(user_id TEXT PRIMARY KEY REFERENCES users(id),name TEXT,avatar TEXT,save TEXT,revision INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);');
 const gacha=createGacha(db);for(const u of db.prepare('SELECT id FROM users').all())gacha.get(u.id);
 for(const file of ['gacha-data.js','gacha.js','gacha.css','campaign-expansion.js','music.js','skill-fx.js'])FILES.add(file);
 let actualPort=port,activeHashes=0;const attempts=new Map();
 function json(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));}
 async function readBody(req){if(!req.headers['content-type']?.startsWith('application/json'))fail(415,'jsonRequired');let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>65536)fail(413,'tooLarge');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail(400,'invalidJson');}}
 function userFor(req){const cookie=req.headers.cookie||'',token=cookie.match(/(?:^|;\s*)ww_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)fail(401,'unauthorized');const row=db.prepare('SELECT users.id,users.username FROM sessions JOIN users ON sessions.user_id=users.id WHERE token_hash=? AND expires>?').get(hash(token),Date.now());if(!row)fail(401,'unauthorized');return row;}
 function publicProfile(user){const p=db.prepare('SELECT * FROM profiles WHERE user_id=?').get(user.id);return {user:{id:user.id,username:user.username},profile:{name:p.name,avatar:p.avatar,save:p.save?JSON.parse(p.save):null,revision:p.revision},collection:gacha.get(user.id)};}
 function loginCookie(res,id){const token=randomBytes(32).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash(token),id,Date.now()+sessionMs);res.setHeader('Set-Cookie',`ww_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(sessionMs/1000)}`);}
 async function passwordHash(password,salt){if(activeHashes>=4)fail(429,'rateLimited');activeHashes++;try{return await derive(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024});}finally{activeHashes--;}}
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  try{
   const origin=`http://127.0.0.1:${actualPort}`;
   if(req.headers.host!==`127.0.0.1:${actualPort}`)fail(403,'originDenied');
   if(req.headers.origin&&req.headers.origin!==origin)fail(403,'originDenied');
   if(req.headers['sec-fetch-site']==='cross-site')fail(403,'originDenied');
   const url=new URL(req.url,origin);
   if(url.pathname==='/api/health'&&req.method==='GET')return json(res,200,{service:'wilds-and-wonders',api:1,version:'0.9.0',gameDir});
   if(url.pathname.startsWith('/api/')){
    if(req.method!=='GET'&&req.headers.origin!==origin)fail(403,'originDenied');
    if(req.method==='POST'&&['/api/register','/api/login'].includes(url.pathname)){
     const key=req.socket.remoteAddress,now=Date.now();let a=attempts.get(key);if(!a||now-a.start>900000){a={start:now,count:0};attempts.set(key,a);}if(++a.count>30)fail(429,'rateLimited');
     const b=await readBody(req),username=typeof b.username==='string'?b.username.trim().toLowerCase():'';
     if(!/^[a-z0-9_]{4,32}$/.test(username)||typeof b.password!=='string'||b.password.length<10||b.password.length>128)fail(400,'credentialsFormat');
     let user=db.prepare('SELECT * FROM users WHERE username=?').get(username);
     if(url.pathname==='/api/register'){
      if(user)fail(409,'accountExists');const salt=randomBytes(16).toString('hex'),derived=await passwordHash(b.password,salt);const id=randomUUID();
      db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run(id,username,salt,derived.toString('hex'),Date.now());db.prepare('INSERT INTO profiles(user_id) VALUES (?)').run(id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');if(String(e.message).includes('UNIQUE'))fail(409,'accountExists');throw e;}user={id,username};
     }else{
      const derived=await passwordHash(b.password,user?.salt||'00000000000000000000000000000000');const expected=user?Buffer.from(user.password_hash,'hex'):Buffer.alloc(64);
      if(!timingSafeEqual(derived,expected)||!user)fail(401,'invalidCredentials');
     }
     loginCookie(res,user.id);return json(res,200,publicProfile(user));
    }
    if(req.method==='GET'&&url.pathname==='/api/me')return json(res,200,publicProfile(userFor(req)));
    if(req.method==='GET'&&url.pathname==='/api/collection')return json(res,200,{collection:gacha.get(userFor(req).id)});
    if(req.method==='POST'&&url.pathname==='/api/draw')return json(res,200,gacha.pull(userFor(req).id,await readBody(req)));
    if(req.method==='POST'&&url.pathname==='/api/equip')return json(res,200,gacha.equip(userFor(req).id,await readBody(req)));
    if(req.method==='POST'&&url.pathname==='/api/exchange')return json(res,200,gacha.exchange(userFor(req).id));
    if(req.method==='POST'&&url.pathname==='/api/logout'){
     userFor(req);const token=req.headers.cookie.match(/(?:^|;\s*)ww_session=([a-f0-9]{64})(?:;|$)/)[1];db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));res.setHeader('Set-Cookie','ww_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});
    }
    if(req.method==='PUT'&&url.pathname==='/api/profile'){
     const user=userFor(req),b=await readBody(req);if(!validName(b.name)||!['male','female'].includes(b.avatar))fail(400,'nameFormat');if(!Number.isInteger(b.revision)||b.revision<0)fail(400,'invalidSave');const save=cleanSave(b.save);save.protagonist=b.avatar;
     const collection=gacha.transaction(()=>{const owned=gacha.get(user.id).heroes;if(save.lineup.some(p=>!owned.includes(p.id))||!owned.includes(save.displayHero))fail(400,'heroLocked');
      const result=db.prepare('UPDATE profiles SET name=?,avatar=?,save=?,revision=revision+1 WHERE user_id=? AND revision=?').run(b.name.trim(),b.avatar,JSON.stringify(save),user.id,b.revision);
      if(!result.changes)fail(409,'saveConflict');return gacha.reward(user.id,save.cleared);});return json(res,200,{revision:b.revision+1,collection});
    }
    fail(404,'notFound');
   }
   if(!['GET','HEAD'].includes(req.method))fail(405,'methodDenied');
   let relative;try{relative=decodeURIComponent(url.pathname).slice(1)||'index.html';}catch{fail(400,'notFound');}
   if(!FILES.has(relative)&&!/^assets\/(characters|scenes|cards)\/[a-z0-9-]+\.png$/.test(relative)&&!/^assets\/music\/[a-z0-9-]+\.wav$/.test(relative))fail(404,'notFound');
   const file=path.join(gameDir,relative);if(!fs.existsSync(file))fail(404,'notFound');
   const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.wav':'audio/wav'}[path.extname(file)];
   res.writeHead(200,{'Content-Type':type,'Content-Length':fs.statSync(file).size,'Cache-Control':'no-cache'});if(req.method==='HEAD')return res.end();
   const stream=fs.createReadStream(file);res.once('close',()=>stream.destroy());stream.on('error',()=>res.destroy()).pipe(res);
  }catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.code||'serverError'});else res.destroy();}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;
 return {server,db,dataDir,start:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{actualPort=server.address().port;resolve(actualPort);});}),close:()=>new Promise(resolve=>server.close(()=>{db.close();resolve();}))};
}
module.exports={createGameServer,validName,cleanSave};
if(require.main===module){const args=process.argv.slice(2),value=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};const app=createGameServer({port:Number(value('--port','18765')),dataDir:value('--data-dir',undefined),gameDir:value('--game-dir',undefined)});app.start().then(port=>console.log(`Wilds & Wonders server: http://127.0.0.1:${port}`)).catch(e=>{console.error(e.code||e.message);process.exit(1);});for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit()));}
