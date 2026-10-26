const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'dimension-story.js'),'utf8'),context);
const engine=fs.readFileSync(path.join(root,'dimension.js'),'utf8');vm.runInContext(engine.slice(0,engine.indexOf('function freshDimensionState')),context);
const {scenes,routes}=vm.runInContext('({scenes:DIMENSION_STORY,routes:RETURN_COMPANIONS})',context);
const lines=['# 绝不认书：次元回响\n\n## 第一章 · 龙族世界：未写入的归航\n\n游戏当前中文正文。进入《龙族》世界的原创支线，含现实篇和三条同行尾声。\n'];
const format=(shot,route)=>{const who=shot.speaker==='同行者'?route.name:shot.speaker||'旁白';const text=shot.text.replace(/\{(companion|accept|arrival|room|dinner|tomorrow)\}/g,(_,key)=>key==='companion'?route.name:route[key]);return '**'+who+'：** '+text+'\n';};
scenes.forEach((s,i)=>{
 lines.push('## '+String(i+1).padStart(2,'0')+' · '+s.title+'\n\n'+s.location+'\n\n任务：'+s.goal+'\n\n### 战前\n');s.before.forEach(l=>lines.push(format(l)));
 lines.push('### 战后\n');const choice=s.after.findIndex(l=>l.speaker==='抉择');
 if(choice<0)s.after.forEach(l=>lines.push(format(l)));
 else{ s.after.slice(0,choice+1).forEach(l=>lines.push(format(l)));for(const route of Object.values(routes)){lines.push('### 同行分支：'+route.name+'\n');s.after.slice(choice+1).forEach(l=>lines.push(format(l,route)));}}
});
fs.writeFileSync(path.join(root,'第一章完整剧本-绝不认书.md'),lines.join('\n'));
console.log(JSON.stringify({scenes:scenes.length,dialogueScenes:scenes.length*2,shots:scenes.reduce((n,s)=>n+s.before.length+s.after.length,0),characters:scenes.reduce((n,s)=>n+[...s.before,...s.after].reduce((a,l)=>a+l.text.length,0),0),branches:Object.keys(routes).length}));
