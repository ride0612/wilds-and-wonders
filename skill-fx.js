'use strict';
// Short board-space effects remain readable during repeated casts. They never alter simulation.
function emitSkillFx(u,target){
 if(!presentationSettings.effects)return;
 const duration=u.stars===6?1.65:1.1;
 const add=(x,y)=>effects.push({type:'skill',hero:u.id,x,y,sx:u.x,sy:u.y,color:u.color,life:duration,total:duration});
 if(u.type==='shield')alive(u.team).sort((a,b)=>dist(a,u)-dist(b,u)).slice(0,3).forEach(a=>add(a.x,a.y));
 else if(u.type==='heal'){const low=alive(u.team).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];alive(u.team).filter(a=>dist(a,low)<=1).forEach(a=>add(a.x,a.y));}
 else add(target.x,target.y);
 // Keep effects bounded if several fast units cast on the same simulation step.
 const skills=effects.filter(e=>e.type==='skill');if(skills.length>32){const old=new Set(skills.slice(0,skills.length-32));effects=effects.filter(e=>!old.has(e));}
}
function drawSkillFx(e,p,t){
 const x=p.x,y=p.y-26,k=Math.sin(Math.PI*t),r=20+t*55;
 ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.min(1,(1-t)*1.6);ctx.strokeStyle=e.color;ctx.fillStyle=e.color;
 if(e.hero==='oak'){
  // Roots climb a living shield; leaf pairs distinguish it from arcane protection.
  ellipse(x,y+22,30+k*8,15,null,'#c4e7a0',2);
  for(let i=0;i<5;i++){const xx=x-27+i*13;line([{x:xx,y:y+27},{x:xx-8*Math.sin(i),y:y-12-40*k},{x:xx+3,y:y-30-40*k}],'#b2d883',2);ellipse(xx,y-10-30*k,7,3,'#d8eaa3');}
 }else if(e.hero==='arrow'){
  const s=center(e.sx,e.sy);for(let i=-1;i<=1;i++){const xx=s.x+(x-s.x)*Math.min(1,t*2),yy=s.y-30+(y-s.y+30)*Math.min(1,t*2)+i*10;line([{x:xx-24,y:yy+10},{x:xx,y:yy},{x:xx-10,y:yy-1}],'#b4f3bd',3);}
  for(let i=0;i<3;i++)ellipse(x,y,12+t*65+i*10,6+t*20,null,'#8defc1',1.5);
 }else if(e.hero==='ember'){
  for(let i=0;i<5;i++){const a=i*2.4,xx=x+Math.cos(a)*45,yy=y+Math.sin(a)*18-140*Math.max(0,1-t*2);line([{x:xx-20,y:yy-55},{x:xx,y:yy}],'#ff9863',4);glow(xx,yy,14+k*16,'#fc7848b0');}
  ellipse(x,y+15,r,r*.4,null,'#ffc080',5*k);
 }else if(e.hero==='sage'){
  for(let i=0;i<8;i++){const a=i*Math.PI/4+t*2;ctx.save();ctx.translate(x+Math.cos(a)*30,y+20-t*75+Math.sin(a)*12);ctx.rotate(a);ellipse(0,0,9*k,4*k,'#bff5c9');ctx.restore();}
  line([{x:x-12,y:y-20-t*20},{x:x+12,y:y-20-t*20}],'#e1ffd4',4);line([{x,y:y-32-t*20},{x,y:y-8-t*20}],'#e1ffd4',4);ellipse(x,y+25,35,16,null,'#8fdfb0',2);
 }else if(e.hero==='frost'){
  for(let i=0;i<6;i++){const a=i*Math.PI/3,xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r*.45;line([{x,y},{x:xx,y:yy}],'#acf0ff',2);polygon([{x:xx,y:yy-12-25*k},{x:xx+8*k,y:yy},{x:xx,y:yy+8},{x:xx-8*k,y:yy}],'#a7dfff80','#e2faff',1);}
 }else if(e.hero==='warden'){
  const points=Array.from({length:6},(_,i)=>({x:x+Math.cos(i*Math.PI/3+Math.PI/6)*(31+k*8),y:y+Math.sin(i*Math.PI/3+Math.PI/6)*(40+k*10)}));polygon(points,'#b8a3ee18','#d8c6ff',2);
  for(let i=0;i<6;i++){const a=i*Math.PI/3-t,xx=x+Math.cos(a)*50,yy=y+Math.sin(a)*45;line([{x:xx-4,y:yy},{x:xx,y:yy-7},{x:xx+4,y:yy},{x:xx,y:yy+7},{x:xx-4,y:yy}],'#d3b7ff',1.5);}
 }else if(e.hero==='knight'){
  glow(x,y,100*k,'#fff2b76b');const s=160*Math.max(0,1-t*2);line([{x:x-65,y:y-145-s},{x:x+40,y:y+40-s}],'#ffe4a0',12*k);line([{x:x-65,y:y-145-s},{x:x+40,y:y+40-s}],'#fffdf1',3);
  for(let i=0;i<3;i++)ellipse(x,y+28,30+t*95+i*10,12+t*35+i*5,null,'#f5d48c',2);
  for(let i=0;i<14;i++){const a=i*2.399;ellipse(x+Math.cos(a)*t*110,y+Math.sin(a)*t*70-t*35,2+k*2,2+k*2,'#fff5c8');}
 }else if(e.hero==='moon'){
  glow(x,y-20,90*k,'#d5acff5c');ctx.save();ctx.translate(x,y-20);ctx.rotate(-.8+t);ctx.beginPath();ctx.arc(0,0,30+k*45,-2.4,.9);ctx.strokeStyle='#f3dcff';ctx.lineWidth=10*k;ctx.stroke();ctx.restore();
  for(let i=0;i<12;i++){const a=i*Math.PI/6+t*2,xx=x+Math.cos(a)*(25+t*90),yy=y+Math.sin(a)*(12+t*45);line([{x:xx-5,y:yy},{x:xx+5,y:yy}],'#deb8ff',2);line([{x:xx,y:yy-5},{x:xx,y:yy+5}],'#f8efff',2);}
  ellipse(x,y+22,35+t*65,14+t*25,null,'#c5a8ff',3);
 }else{ellipse(x,y,r,r*.5,null,e.color,4);}
}
