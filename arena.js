'use strict';
// Original vector arena. A shared projection keeps drawing, picking and dragging aligned.
let visualTime=0,hoverCell=null;
function project(x,y){return {x:480+(x-4)*(67+y*4),y:105+y*66};}
function center(x,y){return project(x+.5,y+.5);}
function boardCell(p){const gy=(p.y-105)/66;return {x:Math.floor((p.x-480)/(67+gy*4)+4),y:Math.floor(gy)};}
function polygon(points,fill,stroke,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}}
function ellipse(x,y,rx,ry,fill,stroke,width=1){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function line(points,color,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function crystal(x,y,size,color){glow(x,y,size*2,color+'35');polygon([{x,y:y-size},{x:x+size*.4,y:y-size*.35},{x:x+size*.26,y:y+size*.2},{x,y:y+size*.4},{x:x-size*.33,y:y-size*.1}],color,'#e0faff80');polygon([{x,y:y-size},{x:x+size*.4,y:y-size*.35},{x,y:y+size*.4}],color==='#84e1ef'?'#45a8c6':'#aa6a7e');line([{x,y:y-size*.8},{x:x-size*.2,y:y-size*.1}], '#ffffffb0',2);}
function drawSceneBackdrop(){
 if(stage%5===0){
  // Rainbound station: lit platform canopy, signal posts and slanting rain.
  polygon([{x:255,y:100},{x:290,y:50},{x:670,y:50},{x:705,y:100}],'#263644','#79989766');
  for(let x=290;x<=670;x+=76){line([{x,y:60},{x,y:109}],'#73908f66',3);roundRect(x+15,72,31,6,2,'#d6b57899');}
  for(const x of [145,815]){line([{x,y:80},{x,y:220}],'#4a5962',4);glow(x,91,25,'#e5c98c40');ellipse(x,91,5,5,'#efcf91');}
  for(let i=0;i<55;i++){const x=(i*137+visualTime*24)%960,y=(i*47+visualTime*180)%510;line([{x,y},{x:x-5,y:y+14}],'#99c8dc21');}
 }else if(stage%5===1){
  ellipse(480,132,172,102,'#172c3b','#4a6e8166',2);ellipse(480,132,116,102,null,'#4a6e8144',1);ellipse(480,132,49,102,null,'#4a6e8144',1);
  line([{x:308,y:132},{x:652,y:132}],'#4a6e8166',2);line([{x:480,y:28},{x:480,y:135}],'#4a6e8144');
  for(let i=0;i<9;i++)ellipse(385+i*23,65+(i*17)%44,2,2,'#cae4dd80');
 }else if(stage%5===2){
  for(const x of [125,760]){roundRect(x,45,70,188,18,'#163b46','#477c8055');roundRect(x+16,63,38,170,13,'#10232f');line([{x:x+7,y:51},{x:x+32,y:46},{x:x+46,y:53}],'#84b1ab55',2);}
  for(let i=0;i<18;i++){const y=160+i*24;line([{x:15,y},{x:100+Math.sin(visualTime+i)*12,y:y-2},{x:191,y}], '#6fb9c72b',2);line([{x:785,y},{x:840,y:y+2},{x:953,y}],'#6fb9c72b',2);}
  for(let i=0;i<14;i++){const y=500-(i*39+visualTime*18)%450;ellipse(80+i%3*32,y,3,4,null,'#93d9d637');}
 }else if(stage%5===3){
  glow(720,60,260,'#d19a5745');
  for(const x of [79,865]){line([{x,y:20},{x,y:445}],'#3c5362',9);line([{x:x-30,y:30},{x:x+30,y:150},{x:x-30,y:270},{x:x+30,y:390}],'#465a63',3);}
  line([{x:25,y:63},{x:935,y:63}],'#53636d',5);
  for(const x of [100,835]){roundRect(x,435,42,30,3,'#6d6750');for(let k=0;k<3;k++)line([{x:x+k*15,y:436},{x:x+k*15+9,y:464}],'#c0a26888',5);glow(x+20,431,18,'#eab37344');}
 }else{
  glow(480,65,225,'#bc69833b');ellipse(480,68,77,77,'#242d3b','#a7886866',3);ellipse(480,68,65,65,null,'#c6a87655',1);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;line([{x:480+Math.cos(a)*57,y:68+Math.sin(a)*57},{x:480+Math.cos(a)*64,y:68+Math.sin(a)*64}],'#d8bd8580',2);}
  line([{x:460,y:34},{x:480,y:68},{x:516,y:43}],'#e4c09099',3);
  for(const x of [130,830]){line([{x,y:0},{x:x-14,y:87},{x:x+8,y:164}],'#735d6770',3);crystal(x+8,171,17,'#d49aaa');}
 }
}
function drawArena(){
 const defense=isDefense();
 const bg=ctx.createLinearGradient(0,0,0,660);bg.addColorStop(0,'#10192b');bg.addColorStop(.6,defense?'#282630':'#173039');bg.addColorStop(1,'#070e1b');ctx.fillStyle=bg;ctx.fillRect(0,0,960,660);
 // Distant city spires and mountains create depth beyond the suspended platform.
 for(let i=0;i<16;i++){const x=i*67-30,h=45+(i*37)%84;polygon([{x,y:230},{x:x+17,y:230-h},{x:x+29,y:210-h},{x:x+44,y:230-h},{x:x+60,y:230}],i%2?'#18283c':'#122336');}
 drawSceneBackdrop();
 for(let i=0;i<70;i++){const x=(i*137+41)%960,y=(i*53+19)%330;ctx.globalAlpha=.12+.18*Math.sin(visualTime*.6+i);ellipse(x,y,1,1,'#9cdae4');}ctx.globalAlpha=1;
 glow(470,150,350,'#507d8050');ellipse(480,557,378,75,'#00000050');
 const a=project(-.45,-.4),b=project(8.45,-.4),c=project(8.45,6.45),d=project(-.45,6.45);
 polygon([d,c,{x:c.x-35,y:c.y+43},{x:d.x+35,y:d.y+43}],'#182a34','#344c56',2);
 polygon([a,d,{x:d.x+35,y:d.y+43},{x:a.x+10,y:a.y+31}],'#182732','#42606a');
 polygon([b,c,{x:c.x-35,y:c.y+43},{x:b.x-10,y:b.y+31}],'#0c1a27','#334b57');
 polygon([a,b,c,d],'#425558','#9c9d78',3);
 polygon([project(-.16,-.14),project(8.16,-.14),project(8.16,6.13),project(-.16,6.13)],defense?'#313d42':'#354c48','#b5a16a',2);
 for(let y=0;y<6;y++)for(let x=0;x<8;x++){
  const road=defense&&DEFENSE_PATH.some(p=>p.x===x&&p.y===y),pad=defense&&DEFENSE_PADS.some(p=>p.x===x&&p.y===y);
  const allowed=mode==='prep'&&deployable(x,y),hover=drag&&hoverCell&&hoverCell.x===x&&hoverCell.y===y;
  const tileColors=[['#3b514a','#344943'],['#3b4b53','#34424a'],['#34575a','#2f494f'],['#53504a','#444b49'],['#4b4553','#3f3d4c']][stage%5]||['#3b514a','#344943'];
  const fill=hover?(allowed?'#5b9093':'#7b4146'):road?'#8a7456':pad?'#304e5a':tileColors[(x+y)%2];
  polygon([project(x+.025,y+.025),project(x+.975,y+.025),project(x+.975,y+.975),project(x+.025,y+.975)],fill,hover?'#eae8ae':pad?'#72bccc66':allowed?'#8ca7a33d':'#9dba9f17',hover?2:1);
  const p=center(x,y);
  if(pad){ellipse(p.x,p.y,23,12,'#183746','#76cad270',1);ellipse(p.x,p.y,16,8,null,'#9bdde133');}
  else if(allowed){ellipse(p.x,p.y,2,1.4,'#b1d4cd70');}
  else if(!road){line([project(x+.12,y+.75),project(x+.35,y+.69),project(x+.58,y+.76)],'#91a69710');}
  if(road){line([project(x+.1,y+.1),project(x+.35,y+.18),project(x+.55,y+.15)],'#c0a97840');}
 }
 if(!defense){
  ctx.save();ctx.setLineDash([5,10]);line([project(0,3),project(8,3)],'#d3c89750',1.5);ctx.restore();
  const m=project(4,3);ellipse(m.x,m.y,58,31,null,'#adb68f23',2);polygon([{x:m.x,y:m.y-25},{x:m.x+41,y:m.y},{x:m.x,y:m.y+25},{x:m.x-41,y:m.y}],null,'#c2b58325');
 }else{
  for(let i=1;i<DEFENSE_PATH.length-1;i++){
   const p=center(DEFENSE_PATH[i].x,DEFENSE_PATH[i].y),q=center(DEFENSE_PATH[i+1].x,DEFENSE_PATH[i+1].y);const t=.45;
   const px=p.x+(q.x-p.x)*t,py=p.y+(q.y-p.y)*t,angle=Math.atan2(q.y-p.y,q.x-p.x);
   ctx.save();ctx.translate(px,py);ctx.rotate(angle);line([{x:-4,y:-4},{x:2,y:0},{x:-4,y:4}],'#f4dc9b70',1.5);ctx.restore();
  }
 }
 // Four hand-built stone pylons, crystals, and hanging roots.
 for(const [x,y,red] of [[a.x,a.y,false],[b.x,b.y,true],[d.x+5,d.y-5,false],[c.x-5,c.y-5,true]]){
  polygon([{x:x-20,y:y-3},{x:x+20,y:y-3},{x:x+15,y:y+16},{x:x-15,y:y+16}],'#263943','#a4966c',1);
  polygon([{x:x-13,y:y-10},{x:x+13,y:y-10},{x:x+10,y:y+1},{x:x-10,y:y+1}],'#64777a','#abb59a');
  crystal(x,y-15,27,red?'#d49aaa':'#84e1ef');
 }
 for(let i=0;i<8;i++){const x=d.x+50+i*91;line([{x,y:d.y+29},{x:x+7,y:d.y+40},{x:x-2,y:d.y+52+i%3*7}],'#244c45',3);}
 if(defense){drawCore();const p=center(-1,1);glow(p.x,p.y-18,45,'#d9869650');ellipse(p.x,p.y-15,17,34,null,'#f3a2a0',3);ellipse(p.x,p.y-15,11,27,'#441e32','#ae657d');ctx.fillStyle='#e9b9a9';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText(tr('spawn'),p.x,p.y-62,110);}
 // Foreground runic trim and drifting motes.
 for(let i=0;i<9;i++){const x=210+i*67;ctx.fillStyle=i%2?'#9ac8c455':'#d9bd7166';ctx.font='15px Georgia';ctx.textAlign='center';ctx.fillText(i%2?'⋄':'·',x,571);}
 for(let i=0;i<18;i++){const x=(i*127+visualTime*(2+i%3))%940,y=80+(i*37)%475+Math.sin(visualTime+i)*7;ellipse(x,y,1.2,1.2,i%3?'#a1eddf55':'#f7d6a466');}
}
function drawCore(){const p=center(8,5),pulse=Math.sin(visualTime*2)*3;ellipse(p.x,p.y+8,30,12,'#0b1e29','#8db6b4',2);crystal(p.x,p.y-32,42+pulse,siege&&siege.core<35?'#d49aaa':'#84e1ef');ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillStyle='#c8e9ee';ctx.fillText(tr('coreLabel'),p.x,p.y+33,105);}
function drawMiniature(u,p){
 const sprite=CHARACTER_SPRITES[u.id];
 if(sprite&&sprite.complete&&sprite.naturalWidth){
  const s=.83+u.py*.045,moving=Math.abs(u.x-u.px)+Math.abs(u.y-u.py)>.05;
  const bounce=moving?Math.sin(visualTime*19+u.x)*3:Math.sin(visualTime*2.1+u.x)*.8;
  const attack=u.action>0?Math.sin(u.action*13)*4:0;
  ctx.save();ctx.translate(p.x+attack,p.y-bounce+5);ctx.rotate(attack*.009);
  if(u.team==='red')ctx.filter='drop-shadow(0 0 2px #ef7e87)';
  if(u.hitFlash>0)ctx.filter='brightness(1.5)';
  ctx.drawImage(sprite,-49*s,-94*s,98*s,98*s);ctx.restore();return;
 }
 const s=(.83+u.py*.045)*(u.id==='boss'?1.3:1),hit=u.hitFlash>0;
 const accent=hit?'#fff3d6':u.color,body=u.team==='red'?'#524756':u.bg,edge=u.team==='red'?'#da9d98':'#b4dce2';
 const motion=u.action>0?Math.sin(u.action*12)*5:Math.sin(visualTime*2+u.x)*1.2;
 ctx.save();ctx.translate(p.x,p.y-3);ctx.scale(s,s);ctx.translate(0,-Math.abs(motion)*.35);
 // Boots, shaded coat, shoulders, collar and a face rather than an icon disc.
 roundRect(-13,-7,10,12,3,'#16202b');roundRect(4,-7,10,12,3,'#16202b');
 polygon([{x:-12,y:-39},{x:13,y:-39},{x:22,y:-6},{x:0,y:0},{x:-20,y:-7}],body,'#0b1722',2);
 polygon([{x:0,y:-36},{x:13,y:-36},{x:22,y:-6},{x:2,y:-1}],'#0d1c2944');
 polygon([{x:-12,y:-36},{x:0,y:-29},{x:13,y:-36},{x:9,y:-43},{x:-8,y:-43}],accent,'#0b1722');
 roundRect(-10,-55,20,18,6,u.id==='warden'||u.id==='boss'?'#9aa7ab':'#d7b79a','#152332');
 if(['oak','knight','warden','boss'].includes(u.id)){
  polygon([{x:-12,y:-47},{x:-12,y:-58},{x:-5,y:-62},{x:6,y:-62},{x:13,y:-55},{x:12,y:-46},{x:6,y:-52},{x:-7,y:-52}],accent,'#26333c');
  line([{x:-5,y:-46},{x:5,y:-46}],u.team==='red'?'#ffaaaa':'#9ef0ff',2);
 }else{
  polygon([{x:-13,y:-44},{x:-13,y:-57},{x:0,y:-66},{x:13,y:-57},{x:13,y:-44},{x:8,y:-54},{x:-6,y:-55}],body,accent,1.2);
  line([{x:-5,y:-46},{x:-1,y:-46}], '#182532',1.4);line([{x:4,y:-46},{x:7,y:-46}], '#182532',1.4);
 }
 line([{x:-4,y:-26},{x:0,y:-21},{x:5,y:-27}],accent,2);roundRect(-12,-14,25,4,1,'#bba77c');
 if(u.type==='shield'){
  polygon([{x:-24,y:-39},{x:-7,y:-33},{x:-9,y:-12},{x:-18,y:-4},{x:-28,y:-18}],accent,'#172e3d',2);
  polygon([{x:-20,y:-32},{x:-13,y:-28},{x:-15,y:-15},{x:-19,y:-12},{x:-23,y:-20}],body,'#e4dc9c');
  line([{x:17,y:-12},{x:20,y:-47}], '#adbcb9',4);
 }else if(u.id==='knight'||u.id==='boss'){
  ctx.save();ctx.translate(22,-24);ctx.rotate(-.25+motion*.03);polygon([{x:-3,y:10},{x:-3,y:-37},{x:1,y:-47},{x:5,y:-37},{x:4,y:10}],'#c3dce2','#6c98ad');line([{x:-9,y:2},{x:11,y:2}], '#e1bc73',4);ctx.restore();
 }else if(u.id==='arrow'||u.id==='moon'){
  ctx.beginPath();ctx.ellipse(21,-27,12,24,.15,-Math.PI/2,Math.PI/2);ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.stroke();line([{x:23,y:-51},{x:23,y:-3}], '#c2d3b5',1);line([{x:7,y:-25},{x:36+motion,y:-25}], '#e2d3a2',2);
 }else{
  line([{x:23,y:-2},{x:23,y:-56}], '#b9a17b',4);glow(23,-58,13,u.color+'60');
  if(u.id==='sage'){ellipse(23,-60,8,8,accent);line([{x:17,y:-60},{x:29,y:-60}], '#fff9c6',2);line([{x:23,y:-66},{x:23,y:-54}], '#fff9c6',2);}
  else{polygon([{x:23,y:-74},{x:31,y:-59},{x:23,y:-49},{x:15,y:-59}],accent,'#ecf8ef');}
 }
 ctx.restore();
}
function drawUnit(u,override){
 const p=override||center(u.px,u.py),s=.83+u.py*.045;
 ellipse(p.x,p.y+4,27*s,12*s,'#06101880');
 const color=u.team==='blue'?'#83d5ec':'#e39492';ellipse(p.x,p.y,25*s,11*s,u.team==='blue'?'#39b9da16':'#fa76761a',u.id===selected?'#f4d684':color,2);
 if(u.id===selected){ellipse(p.x,p.y,30*s,14*s,null,'#f4d68455');}
 if(u.defender){ellipse(p.x,p.y,34*s,17*s,null,'#80bcd150');}
 drawMiniature(u,p);
 if(u.shield>0){ctx.save();ctx.globalAlpha=.3;ellipse(p.x,p.y-30*s,30*s,43*s,'#95cbda25','#e9d297',2);ctx.restore();}
 const barY=p.y-(CHARACTER_SPRITES[u.id]?.naturalWidth?96:77)*s,w=u.id==='boss'?80:56;
 roundRect(p.x-w/2-2,barY-2,w+4,14,3,'#07101be8');roundRect(p.x-w/2,barY,w,6,1,'#263b3f');
 roundRect(p.x-w/2,barY,w*Math.max(0,u.hp/u.maxHp),6,1,u.team==='blue'?'#91e4ac':'#e68d87');
 for(let i=1;i<Math.ceil(u.maxHp/300);i++){const x=p.x-w/2+w*i*300/u.maxHp;if(x<p.x+w/2)line([{x,y:barY},{x,y:barY+6}],'#163126aa',1);}
 roundRect(p.x-w/2,barY+8,w*u.mana/100,3,1,'#68ccff');
 ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e2eaf0';ctx.fillText(heroText(u).name,p.x,barY-5,90);
 if(u.castFlash>0){glow(p.x,p.y-32,44,u.color+'55');ctx.font='bold 11px sans-serif';ctx.fillStyle=u.color;ctx.fillText(heroText(u).skill,p.x,barY-20,110);}
}
function drawEffects(){
 for(const e of effects){const p=center(e.x,e.y),t=1-e.life/e.total;ctx.save();ctx.globalAlpha=Math.max(0,e.life/e.total);
  if(e.type==='skill'){drawSkillFx(e,p,t);}else if(e.type==='text'){ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillStyle=e.color;ctx.strokeStyle='#0c1528';ctx.lineWidth=3;const yy=p.y-74-t*33;ctx.strokeText(e.text,p.x,yy);ctx.fillText(e.text,p.x,yy);}
  else if(e.type==='beam'){const end=center(e.tx,e.ty),x=p.x+(end.x-p.x)*t,y=p.y-35+(end.y-p.y)*t-Math.sin(t*Math.PI)*18;line([{x:p.x+(end.x-p.x)*Math.max(0,t-.18),y:p.y-35+(end.y-p.y)*Math.max(0,t-.18)-Math.sin(Math.max(0,t-.18)*Math.PI)*18},{x,y}],e.color,3);glow(x,y,12,e.color+'80');ellipse(x,y,3,3,'#fffbe5');}
  else if(e.type==='slash'){const q=center(e.tx,e.ty);ctx.translate(q.x,q.y-28);ctx.rotate(-.5+t);ctx.beginPath();ctx.arc(0,0,15+t*22,-1.8,.7);ctx.strokeStyle=e.color;ctx.lineWidth=7*(1-t);ctx.stroke();}
  else{ellipse(p.x,p.y,20+t*44,10+t*22,e.color+'16',e.color,3);for(let i=0;i<6;i++){const a=i*Math.PI/3;line([{x:p.x+Math.cos(a)*(15+t*30),y:p.y+Math.sin(a)*(8+t*15)},{x:p.x+Math.cos(a)*(22+t*32),y:p.y+Math.sin(a)*(10+t*16)-15*t}],e.color,2);}}
  ctx.restore();
 }
}
function draw(){
 if(typeof currentView!=='undefined'&&(currentView!=='adventure'||$('#chapter-mission').hidden))return;
 ctx.clearRect(0,0,960,660);drawArena();
 units.filter(u=>u.hp>0).sort((a,b)=>a.py-b.py).forEach(u=>{if(!drag||drag.id!==u.id||u.team!=='blue')drawUnit(u);});
 if(drag){const u=units.find(u=>u.id===drag.id&&u.team==='blue');if(u)drawUnit(u,drag.pos);}
 drawEffects();$('#timer').textContent=formatTime(elapsed);renderCombatHud();
}
