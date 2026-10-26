'use strict';
// Story-specific board effects do not change combat calculations.
function emitSkillFx(u,target){
 if(!presentationSettings.effects)return;
 const duration=u.cinematic?1.65:1.1;
 const add=(x,y)=>effects.push({type:'skill',hero:u.id,x,y,sx:u.x,sy:u.y,color:u.color,life:duration,total:duration});
 if(u.type==='shield')alive(u.team).sort((a,b)=>dist(a,u)-dist(b,u)).slice(0,3).forEach(a=>add(a.x,a.y));
 else if(u.type==='heal'){const low=alive(u.team).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(low)alive(u.team).filter(a=>dist(a,low)<=1).forEach(a=>add(a.x,a.y));}
 else if(target)add(target.x,target.y);
 const skills=effects.filter(e=>e.type==='skill');if(skills.length>32){const old=new Set(skills.slice(0,skills.length-32));effects=effects.filter(e=>!old.has(e));}
}
function drawSkillFx(e,p,t){
 const x=p.x,y=p.y-26,k=Math.sin(Math.PI*t),r=20+t*55;
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.min(1,(1-t)*1.6);
 if(e.hero==='oak'||e.hero==='warden'){
  const width=e.hero==='oak'?31:25;
  polygon([{x:x-width,y:y-28*k},{x:x+width,y:y-28*k},{x:x+width,y:y+19},{x,y:y+35},{x:x-width,y:y+19}],e.color+'22',e.color,2);
  for(let i=0;i<3;i++)line([{x:x-width+5,y:y-15+i*12},{x:x+width-5,y:y-15+i*12}],e.color,1);
 }else if(e.hero==='arrow'){
  const s=center(e.sx,e.sy),q=Math.min(1,t*2),xx=s.x+(x-s.x)*q,yy=s.y-24+(y-s.y+24)*q;
  line([{x:s.x,y:s.y-24},{x:xx,y:yy}],e.color,2);
  for(let i=0;i<3;i++)ellipse(x,y,12+t*45+i*8,6+t*20,null,e.color,1.5);
 }else if(e.hero==='ember'){
  ellipse(x,y+20,r,r*.36,null,'#ffa572',Math.max(.1,3*k));
  for(let i=0;i<7;i++){const xx=x+Math.sin(i*2.4)*r*.7,yy=y+Math.cos(i)*13;polygon([{x:xx-7,y:yy+20},{x:xx+2,y:yy-12-42*k},{x:xx+10,y:yy+20}],'#ef734b90','#ffd49b',1);}
 }else if(e.hero==='sage'){
  ellipse(x,y+23,36,15,null,e.color,2);
  const dx=x+Math.cos(t*5)*28,dy=y-35+Math.sin(t*5)*8;
  ellipse(dx,dy,8,5,'#dceff0',e.color,2);line([{x:dx,y:dy+5},{x,y:y+6}],e.color,1);
  line([{x:x-10,y:y-8},{x:x+10,y:y-8}],e.color,4);line([{x,y:y-18},{x,y:y+2}],e.color,4);
 }else if(e.hero==='frost'){
  // Nono profiles movement and coordinates fire, rather than casting ice magic.
  for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]])line([{x:x+a*18,y:y+b*25},{x:x+a*30,y:y+b*25},{x:x+a*30,y:y+b*13}],e.color,2);
  line([{x:x-29,y:y-23+t*46},{x:x+29,y:y-23+t*46}],e.color,1.5);
  for(let i=0;i<3;i++)ellipse(x-14+i*14,y+6-i*8,3,3,e.color);
 }else if(e.hero==='knight'){
  ellipse(x,y+17,r*.8,r*.28,null,e.color,1);
  line([{x:x-42*k,y:y+28},{x:x-10,y:y-5},{x:x+35*k,y:y-32}],e.color,Math.max(.1,6*k));
  line([{x:x-35*k,y:y+30},{x:x+30*k,y:y-27}],'#fff1ce',Math.max(.1,2*k));
 }else if(e.hero==='moon'){
  const s=center(e.sx,e.sy);ellipse(x,y,22*(1-t)+7,22*(1-t)+7,null,e.color,2);
  line([{x:x-33,y},{x:x-12,y}],e.color,1.5);line([{x:x+12,y},{x:x+33,y}],e.color,1.5);
  line([{x,y:y-33},{x,y:y-12}],e.color,1.5);line([{x,y:y+12},{x,y:y+33}],e.color,1.5);
  if(t>.25)line([{x:s.x,y:s.y-25},{x,y}],e.color,Math.max(.1,2*(1-t)));
 }else ellipse(x,y,r,r*.5,null,e.color,4);
 ctx.restore();
}
