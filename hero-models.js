/* 高精度角色模型：程序生成的蒙皮网格（单角色约 4 个绘制批次），卡通分层光照 + 背面描边 + 边缘光 + 自发光线条。
   角色比例约 7.5 头身；每位角色拥有独立的发型、服装、配件与武器，以及待机/奔跑/攻击/施法/受击/阵亡/胜利动作。
   敌方“寂蚀”单位使用独立的刚体模型与裂纹自发光。 */
(function(global){
'use strict';
const T=global.THREE;if(!T)return;
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const M=(x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1)=>new T.Matrix4().compose(V(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),V(sx,sy,sz));
const Md=(x,y,z,dx,dy,dz,s=1)=>new T.Matrix4().compose(V(x,y,z),new T.Quaternion().setFromUnitVectors(V(0,1,0),V(dx,dy,dz).normalize()),V(s,s,s));
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const prng=seed=>{let s=seed%2147483647||1;return()=>(s=s*16807%2147483647)/2147483647;};

// ---------- 材质 ----------
let gradientTex=null;
function gradientMap(){
 if(gradientTex)return gradientTex;
 const d=new Uint8Array([92,92,92,255,150,150,150,255,206,206,206,255,255,255,255,255]);
 gradientTex=new T.DataTexture(d,4,1,T.RGBAFormat);gradientTex.minFilter=gradientTex.magFilter=T.NearestFilter;gradientTex.generateMipmaps=false;gradientTex.needsUpdate=true;return gradientTex;
}
function toon({rim=0xa9dcff,rimStrength=.55,...params}={}){
 const m=new T.MeshToonMaterial({gradientMap:gradientMap(),...params});
 m.userData.rimColor={value:new T.Color(rim)};m.userData.rimStrength={value:rimStrength};
 m.onBeforeCompile=sh=>{
  sh.uniforms.rimColor=m.userData.rimColor;sh.uniforms.rimStrength=m.userData.rimStrength;
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 rimColor;uniform float rimStrength;')
   .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n{float rd=1.0-max(dot(normalize(vViewPosition),normal),0.0);totalEmissiveRadiance+=rimColor*smoothstep(0.58,0.98,rd)*rimStrength;}');
 };
 m.customProgramCacheKey=()=>'toon-rim';return m;
}
function outlineMat(width=.0016,color=0x07080c){
 const m=new T.MeshBasicMaterial({color,side:T.BackSide});m.userData.w={value:width};
 m.onBeforeCompile=sh=>{
  sh.uniforms.outlineW=m.userData.w;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float outlineW;')
   .replace('#include <project_vertex>','{float od=clamp(-(modelViewMatrix*vec4(transformed,1.0)).z,0.5,60.0)*outlineW;\n#ifdef USE_SKINNING\ntransformed+=normalize(objectNormal)*od;\n#else\ntransformed+=normalize(normal)*od;\n#endif\n}\n#include <project_vertex>');
 };
 m.customProgramCacheKey=()=>'outline';return m;
}
const glowMat=(params={})=>new T.MeshBasicMaterial({toneMapped:false,...params});

// ---------- 几何 ----------
const G={
 oval:(rx,ry,rz,w=18,h=12)=>new T.SphereGeometry(1,w,h).scale(rx,ry,rz),
 part:(r,w,h,ps,pl,ts,tl)=>new T.SphereGeometry(r,w,h,ps,pl,ts,tl),
 lathe:(prof,seg=18,sx=1,sz=1,ps=0,pl=Math.PI*2)=>new T.LatheGeometry(prof.map(([r,y])=>new T.Vector2(Math.max(r,.0004),y)),seg,ps,pl).scale(sx,1,sz),
 cyl:(rt,rb,h,s=14,open=false)=>new T.CylinderGeometry(rt,rb,h,s,1,open),
 box:(w,h,d)=>new T.BoxGeometry(w,h,d),
 cone:(r,h,s=8)=>new T.ConeGeometry(r,h,s),
 torus:(r,t,rs=6,ts=24,arc=Math.PI*2)=>new T.TorusGeometry(r,t,rs,ts,arc),
 oct:(r)=>new T.OctahedronGeometry(r,0),
 ico:(r,d=1)=>new T.IcosahedronGeometry(r,d),
 plate(w,h,d,c=.22){ // 斜切角装甲板
  const x=w/2,y=h/2,k=Math.min(w,h)*c,s=new T.Shape();
  s.moveTo(-x+k,-y);s.lineTo(x,-y);s.lineTo(x,y-k);s.lineTo(x-k,y);s.lineTo(-x,y);s.lineTo(-x,-y+k);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:d*.3,bevelSize:Math.min(d*.35,k*.5),bevelSegments:1,curveSegments:1});
  g.translate(0,0,-d/2);return g;
 },
 blade(len,w,d,tip=.18){ // 单刃刀身，沿 +Z
  const s=new T.Shape();s.moveTo(0,0);s.lineTo(w,0);s.lineTo(w*.92,len*(1-tip));s.lineTo(0,len);s.lineTo(-w*.12,len*.55);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:d*.4,bevelSize:d*.3,bevelSegments:1,curveSegments:1});
  g.translate(-w*.45,0,-d/2);g.rotateX(Math.PI/2);g.rotateZ(Math.PI/2);return g;
 },
 vplate(w,h,d){ // 倒三角衬里（V 领）
  const s=new T.Shape();s.moveTo(-w/2,h/2);s.lineTo(w/2,h/2);s.lineTo(w*.06,-h/2);s.lineTo(-w*.06,-h/2);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:false});g.translate(0,0,-d/2);return g;
 },
 strand(pts,r0,r1,{seg=10,rad=6,pow=1}={}){ // 渐细发束
  const curve=new T.CatmullRomCurve3(pts.map(p=>V(...p)));
  const g=new T.TubeGeometry(curve,seg,1,rad,false),pos=g.attributes.position,P=V(),O=V();
  for(let i=0;i<=seg;i++){curve.getPointAt(i/seg,P);const N=g.normals[i],B=g.binormals[i],r=r0+(r1-r0)*Math.pow(i/seg,pow);
   for(let j=0;j<=rad;j++){const k=i*(rad+1)+j;O.fromBufferAttribute(pos,k).sub(P);const a=O.dot(N),b=O.dot(B);pos.setXYZ(k,P.x+(N.x*a+B.x*b)*r,P.y+(N.y*a+B.y*b)*r,P.z+(N.z*a+B.z*b)*r);}}
  g.computeVertexNormals();return g;
 },
 shellPanel(prof,ps,pl,seg=12,sx=1,sz=1,inner=false){ // 外套/披风面板；inner 时反向作为内衬
  const p=inner?[...prof].reverse().map(([r,y])=>[r-.007,y]):prof;
  return G.lathe(p,seg,sx,sz,ps,pl);
 }
};

// 动漫头型：在单位球上收窄下颌、拉长脸颊并让下巴略向前，面部贴片用同一变形以贴合
function animeHead(k=1,geo=new T.SphereGeometry(1,30,22)){
 const p=geo.attributes.position;
 for(let i=0;i<p.count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  if(y<0){const j=Math.pow(-y,1.25),front=smooth(-.2,.9,z);x*=1-.4*j;z*=1-.1*j*(1-front)+.04*j*front;y*=1.12;}
  if(z<0)z*=1.04;
  p.setXYZ(i,x*.098*k,y*.11*k,z*.1*k);
 }
 geo.computeVertexNormals();return geo;
}

// ---------- 骨架与网格合并 ----------
class Rig{
 constructor(){this.bones=[];this.map={};this.body=[];this.glow=[];}
 bone(n,p,x,y,z){const b=new T.Bone();b.name=n;b.position.set(x,y,z);if(p)this.map[p].add(b);this.bones.push(b);this.map[n]=b;return b;}
 idx(n){return this.bones.indexOf(this.map[n]);}
 add(bone,geo,color,o={}){
  if(!this.map[bone])bone='chest';
  if(o.m)geo.applyMatrix4(o.m);
  const bi=this.idx(bone),pos=geo.attributes.position,n=pos.count,si=new Uint16Array(n*4),sw=new Float32Array(n*4);
  for(let i=0;i<n;i++){
   const w=o.w?o.w(pos.getX(i),pos.getY(i),pos.getZ(i)):null;
   if(!w){si[i*4]=bi;sw[i*4]=1;continue;}
   let total=0;w.forEach(([name,wt],k)=>{si[i*4+k]=this.idx(name);sw[i*4+k]=wt;total+=wt;});
   if(total<=0){si[i*4]=bi;sw[i*4]=1;}else for(let k=0;k<4;k++)sw[i*4+k]/=total;
  }
  geo.applyMatrix4(this.map[bone].matrixWorld);
  if(!geo.attributes.normal)geo.computeVertexNormals();
  const idx=geo.index?Array.from(geo.index.array):Array.from({length:n},(_,i)=>i);
  const c=new T.Color(color);if(o.glow)c.multiplyScalar(o.i??2.6);
  (o.glow?this.glow:this.body).push({pos:geo.attributes.position.array.slice(),nor:geo.attributes.normal.array.slice(),idx,n,c,si,sw});
  geo.dispose();
 }
}
function merge(list,scale){
 if(!list.length)return null;let nv=0,ni=0;for(const p of list){nv+=p.n;ni+=p.idx.length;}
 const pos=new Float32Array(nv*3),nor=new Float32Array(nv*3),col=new Float32Array(nv*3),si=new Uint16Array(nv*4),sw=new Float32Array(nv*4),idx=new Uint32Array(ni);let v=0,k=0;
 for(const p of list){
  for(let i=0;i<p.n*3;i++)pos[v*3+i]=p.pos[i]*scale;nor.set(p.nor,v*3);
  for(let i=0;i<p.n;i++){col[(v+i)*3]=p.c.r;col[(v+i)*3+1]=p.c.g;col[(v+i)*3+2]=p.c.b;}
  si.set(p.si,v*4);sw.set(p.sw,v*4);for(let i=0;i<p.idx.length;i++)idx[k+i]=p.idx[i]+v;v+=p.n;k+=p.idx.length;
 }
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('normal',new T.BufferAttribute(nor,3));g.setAttribute('color',new T.BufferAttribute(col,3));
 g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));
 g.setIndex(new T.BufferAttribute(idx,1));g.computeBoundingSphere();return g;
}
// 沿局部 y 轴在两根骨骼间平滑过渡的蒙皮权重
const blendY=(upper,lower,yTop,yBot)=>(x,y)=>{const t=smooth(yBot,yTop,y);return [[upper,t],[lower,1-t]];};
const chainY=(names,ys)=>(x,y)=>{for(let i=0;i<ys.length;i++)if(y>ys[i]){if(i===0)return [[names[0],1]];const t=smooth(ys[i],ys[i-1],y);return [[names[i-1],t],[names[i],1-t]];}return [[names[names.length-1],1]];};

// ---------- 角色设定 ----------
// 颜色：skin 肤色 hair 发色 eye 瞳色 top 上衣 top2 衬里/副色 inner 内衬 pants 下装 boots 鞋 trim 饰边 glow 自发光
const SPECS={
 warden:{h:1.77,skin:0xf2ccb2,hair:0x23222a,eye:0x6b5848,style:'messy',top:'jacket',topC:0x2b4a40,top2:0x1c2a26,inner:0xe9ecea,pants:0x30353c,boots:0x1b1e24,trim:0x96b9a2,glow:0x7fffd0,tie:0x3a5a4c,coatLen:0,acc:['satchel'],weapon:'shield',shield:'riot'},
 arrow:{h:1.66,female:true,skin:0xf3cdb6,hair:0x3a2620,eye:0xd9913a,style:'bob',top:'jacket',topC:0xd06e22,top2:0x2a2f36,inner:0x262b31,pants:0x30373f,boots:0x22262c,trim:0xffc070,glow:0xffb84a,coatLen:.12,acc:['headset'],weapon:'beacon'},
 oak:{h:1.9,build:'heavy',skin:0xe2c0a2,hair:0xa49a7c,eye:0x5d7066,style:'messy',top:'jacket',topC:0x33473c,top2:0x25332c,inner:0xd8d6c6,pants:0x353a3e,boots:0x24262a,trim:0xcfc19a,glow:0xffe08a,coatLen:.22,acc:['satchel','terminal'],weapon:'shield',shield:'tower'},
 frost:{h:1.7,female:true,skin:0xf5d0bc,hair:0xb23a26,eye:0x5aa07a,style:'ponytail',top:'jacket',topC:0x24443a,top2:0x18241f,inner:0xf0eeea,pants:0x1f2730,skirt:0x2a2f3a,boots:0x1d2026,trim:0xe2b07a,glow:0xff8c7a,tie:0x9c2e2a,coatLen:0,acc:['clover','visor'],weapon:'pistol'},
 knight:{h:1.9,skin:0xf3cbb0,hair:0xe6c06a,eye:0x3c86d6,style:'long',top:'coat',topC:0xeee8d6,top2:0x2c3442,inner:0x2a303a,pants:0x232a33,boots:0x1e2128,trim:0xd8ae58,glow:0xffd07a,coatLen:.58,acc:['pauldron'],weapon:'hunt'},
 sage:{h:1.72,female:true,skin:0xf4d0bc,hair:0x232c33,eye:0x4c8a8a,style:'long',top:'coat',topC:0xeef2f3,top2:0xbfe6e6,inner:0x2e3b44,pants:0x2f3d47,boots:0x252b31,trim:0x63c4c7,glow:0x63f0f2,coatLen:.62,acc:['glasses'],weapon:'tablet'},
 ember:{h:1.82,skin:0xf3cdb4,hair:0x16181e,eye:0xffb238,style:'short',top:'coat',topC:0x17191f,top2:0x8e1c22,inner:0xeceeee,pants:0x1c1f25,boots:0x111317,trim:0xb88a4a,glow:0xff5a32,tie:0x1a1c22,coatLen:.68,acc:['harness'],weapon:'katana'},
 moon:{h:1.62,female:true,skin:0xf6d6c4,hair:0xebe2cc,eye:0x8ed8ff,style:'bob',top:'coat',topC:0xe9ecef,top2:0x2b3540,inner:0x2a313b,pants:0x232b35,boots:0x1f242b,trim:0x9ec7df,glow:0x9fe6ff,coatLen:.5,acc:['earpiece'],weapon:'sniper'},
 anvil:{h:1.62,female:true,skin:0xf6d8c6,hair:0xff7a2a,eye:0xff9a2a,style:'messy',top:'armor',topC:0x8c9097,top2:0x2b2e33,inner:0x2a2c30,pants:0x24262b,boots:0x2a2d32,trim:0xffd23a,glow:0xffd23a,coatLen:.3,acc:['goggles','pauldron'],weapon:'shield',shield:'tower'},
 reed:{h:1.72,skin:0xf0d6c2,hair:0x24242a,eye:0x9ab060,style:'hood',top:'hoodie',topC:0x4f5f2e,top2:0x9ba3a6,inner:0x1c1d20,pants:0x1e1f22,boots:0x26282b,trim:0xd2ff4a,glow:0xd8ff5a,coatLen:.18,acc:['headphones'],weapon:'crossbow'},
 mote:{h:1.58,female:true,skin:0xf8e2d6,hair:0xcfccdc,eye:0x9a7bff,style:'twin',top:'coat',topC:0xf1f1f4,top2:0x26262e,inner:0x1f1f26,pants:0x1c1c22,skirt:0x23232b,boots:0xe8e8ee,trim:0xb28cff,glow:0xb28cff,coatLen:.48,acc:['star'],weapon:'wand'},
 flick:{h:1.72,skin:0xf2dccb,hair:0xdedfe4,eye:0xd23a44,style:'spiky',top:'tactical',topC:0x1d1e23,top2:0x6c7078,inner:0x111216,pants:0x1b1c20,boots:0x24252a,trim:0x8e93a0,glow:0xb15cff,coatLen:0,acc:['scarf'],weapon:'daggers'},
 basalt:{h:1.92,build:'heavy',skin:0x7a523a,hair:0x16120f,eye:0xd28a3a,style:'curly',top:'jacket',topC:0x5c3c28,top2:0x2b2622,inner:0x2a2522,pants:0x2d2925,boots:0x231f1c,trim:0xd2a060,glow:0xff9a3a,coatLen:.2,acc:['pauldron'],weapon:'gauntlet'},
 bell:{h:1.66,female:true,skin:0xf6e0d6,hair:0xa8c8ff,eye:0x5ab0ff,style:'long',top:'coat',topC:0xf2f6fb,top2:0x3a5ea8,inner:0x2c4278,pants:0x23304f,skirt:0x2c4278,boots:0xeef2f8,trim:0x8fdcff,glow:0x8fdcff,coatLen:.4,acc:['ribbon'],weapon:'bellstaff'},
 kestrel:{h:1.68,female:true,skin:0xf4d6c4,hair:0x8e2a22,eye:0xd84a3a,style:'ponytail',top:'jacket',topC:0xb3262c,top2:0x1c1d22,inner:0x1d1e22,pants:0x1a1b20,boots:0x24252a,trim:0xffb070,glow:0xff6a4a,coatLen:.1,acc:['goggles'],weapon:'rifle'},
 umbra:{h:1.74,skin:0xeed4c4,hair:0x1c1626,eye:0xa070ff,style:'short',top:'tactical',topC:0x17151d,top2:0x3a2f4a,inner:0x101015,pants:0x15141a,boots:0x1d1c22,trim:0x6a5a8a,glow:0xa867ff,coatLen:.4,acc:['mask','scarf'],weapon:'katana'},
 solace:{h:1.64,female:true,skin:0xf8e4d4,hair:0xf6d26e,eye:0xf2a63a,style:'braid',top:'robe',topC:0xf6f3ec,top2:0xd8b04a,inner:0xf0ece2,pants:0xe8e2d4,skirt:0xf3efe6,boots:0xf2efe8,trim:0xe0b040,glow:0xffd35a,coatLen:.74,acc:['halo'],weapon:'sunstaff'},
 helion:{h:1.8,skin:0xf0d6c4,hair:0x18181c,eye:0xffd23a,style:'messy',top:'coat',topC:0x18191d,top2:0xd8b200,inner:0x111214,pants:0x16171a,boots:0x1f2023,trim:0xffd000,glow:0x5ad0ff,coatLen:.55,acc:['harness'],weapon:'railgun'},
 aegis:{h:1.76,female:true,skin:0xf6e0d4,hair:0xd8dbe2,eye:0x7aa6c8,style:'ponytail',top:'armor',topC:0xe8ebef,top2:0x1f2a33,inner:0x222b33,pants:0x1e252c,skirt:0xe8ebef,boots:0xdfe3e8,trim:0x46d5f2,glow:0x46d5f2,coatLen:.46,acc:['pauldron'],weapon:'sword',shield:'hex'}
};
const WEAPON_CLASS={katana:'blade',hunt:'blade',sword:'blade',daggers:'dual',gauntlet:'heavy',rifle:'gun',sniper:'gun',railgun:'gun',crossbow:'gun',pistol:'gun',wand:'staff',sunstaff:'staff',bellstaff:'staff',shield:'shield',tablet:'support',beacon:'support'};

// ---------- 面部贴图 ----------
const css=c=>'#'+new T.Color(c).getHexString();
function tone(hex,k){const c=new T.Color(hex);const h={};c.getHSL(h);c.setHSL(h.h,h.s,clamp(h.l+k));return '#'+c.getHexString();}
function faceTexture(spec,corrupt){
 if(typeof document==='undefined')return null;
 const cv=document.createElement('canvas');cv.width=cv.height=256;const x=cv.getContext('2d');
 const eye=corrupt?'#ff3050':css(spec.eye),line=corrupt?'#1a0a12':tone(spec.hair,-.35);
 for(const s of [-1,1]){
  // 眼睛：s=-1 为画面左侧（角色右眼）。女性眼型更圆、更大
  const fe=spec.female?1.1:1,cx=128+s*47,cy=142,ew=25*fe,eh=(spec.female?19:15.5);
  x.save();x.beginPath();x.moveTo(cx-ew,cy+2);x.bezierCurveTo(cx-ew*.6,cy-eh,cx+ew*.6,cy-eh*1.05,cx+ew,cy-eh*.15);x.bezierCurveTo(cx+ew*.7,cy+eh*.95,cx-ew*.6,cy+eh*1.05,cx-ew,cy+2);
  x.fillStyle=corrupt?'#2a0f18':'#fbf8f7';x.fill();x.clip();
  const g=x.createLinearGradient(0,cy-eh,0,cy+eh);g.addColorStop(0,tone(eye,-.42));g.addColorStop(.45,eye);g.addColorStop(1,tone(eye,.3));
  x.fillStyle=g;x.beginPath();x.ellipse(cx+s*2,cy+2,ew*.58,eh*1.05,0,0,Math.PI*2);x.fill();
  x.fillStyle=tone(eye,-.58);x.beginPath();x.ellipse(cx+s*2,cy+3,ew*.24,eh*.55,0,0,Math.PI*2);x.fill();
  x.strokeStyle=tone(eye,-.5);x.lineWidth=2;x.beginPath();x.ellipse(cx+s*2,cy+2,ew*.58,eh*1.05,0,0,Math.PI*2);x.stroke();
  x.fillStyle='rgba(255,255,255,.95)';x.beginPath();x.ellipse(cx-ew*.2,cy-eh*.4,ew*.17,eh*.22,-.4,0,7);x.fill();x.beginPath();x.arc(cx+ew*.22,cy+eh*.38,ew*.08,0,7);x.fill();
  x.fillStyle='rgba(20,10,20,.22)';x.fillRect(cx-ew,cy-eh*1.1,ew*2,eh*.42);
  x.restore();
  // 上眼线（粗）、眼尾上挑、下眼线（淡）
  x.strokeStyle=line;x.lineCap='round';x.lineJoin='round';x.lineWidth=5.2;
  x.beginPath();x.moveTo(cx-s*ew*1.0,cy+3);x.bezierCurveTo(cx-s*ew*.6,cy-eh*1.02,cx+s*ew*.55,cy-eh*1.1,cx+s*ew*1.04,cy-eh*.2);x.lineTo(cx+s*ew*1.22,cy-eh*.05+(spec.female?-3:0));x.stroke();
  x.lineWidth=1.8;x.globalAlpha=.6;x.beginPath();x.moveTo(cx-s*ew*.55,cy+eh*.98);x.quadraticCurveTo(cx+s*ew*.15,cy+eh*1.12,cx+s*ew*.82,cy+eh*.62);x.stroke();x.globalAlpha=1;
  // 眉
  x.lineWidth=spec.female?2.6:3.8;x.beginPath();x.moveTo(cx-s*ew*.8,cy-eh-14);x.quadraticCurveTo(cx+s*ew*.05,cy-eh-21+(spec.female?0:3),cx+s*ew*.95,cy-eh-14+(spec.female?0:2));x.stroke();
 }
 x.strokeStyle='rgba(160,90,80,.42)';x.lineWidth=1.8;x.beginPath();x.moveTo(130,176);x.lineTo(127,186);x.lineTo(131,187);x.stroke();
 if(!(spec.acc||[]).includes('mask')){x.strokeStyle=corrupt?'#ff3050':'#a3524c';x.lineWidth=2.4;x.beginPath();x.moveTo(121,207);x.quadraticCurveTo(128,210,136,206);x.stroke();}
 if(!corrupt){for(const s of [-1,1]){const g=x.createRadialGradient(128+s*54,180,2,128+s*54,180,18);g.addColorStop(0,`rgba(255,110,110,${spec.female?.3:.12})`);g.addColorStop(1,'rgba(255,110,110,0)');x.fillStyle=g;x.fillRect(128+s*54-20,160,40,40);}}
 const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
}

// ---------- 骨架 ----------
function skeleton(R,s){
 const f=!!s.female,heavy=s.build==='heavy',sw=(f?.165:.195)*(heavy?1.16:1);
 R.bone('root',null,0,0,0);R.bone('hips','root',0,.95,0);R.bone('spine','hips',0,.11,0);R.bone('chest','spine',0,.2,0);
 R.bone('neck','chest',0,.22,0);R.bone('head','neck',0,.07,0);
 for(const sg of [1,-1]){const t=sg>0?'L':'R';
  R.bone('shoulder'+t,'chest',sg*.07,.17,0);R.bone('arm'+t,'shoulder'+t,sg*(sw-.07),0,0);R.bone('fore'+t,'arm'+t,0,-.29,0);R.bone('hand'+t,'fore'+t,0,-.26,0);
  R.bone('thigh'+t,'hips',sg*.095*(f?1.06:1)*(heavy?1.12:1),-.06,0);R.bone('shin'+t,'thigh'+t,0,-.43,0);R.bone('foot'+t,'shin'+t,0,-.39,0);
  R.bone('coat'+t,'hips',0,.02,0);
  if(s.style==='twin'){R.bone('twin'+t+'1','head',sg*.115,.16,-.035);R.bone('twin'+t+'2','twin'+t+'1',sg*.03,-.22,-.02);}
 }
 R.bone('coatB','hips',0,.02,0);R.bone('hairB','head',0,.13,-.07);
 if(['ponytail','braid'].includes(s.style)){R.bone('tail1','head',0,.2,-.105);R.bone('tail2','tail1',0,-.17,-.03);R.bone('tail3','tail2',0,-.17,0);}
 R.bone('scarf','chest',0,.2,-.08);R.bone('drone','root',.42,1.42,.1);
 R.map.root.updateMatrixWorld(true);
}

// ---------- 身体 ----------
function body(R,s){
 const f=!!s.female,heavy=s.build==='heavy',bw=heavy?1.17:1,skin=s.skin,top=s.topC,sleeve=s.top==='robe'?s.topC:top;
 const gloved=s.gloves!==undefined||['armor','tactical'].includes(s.top)||['gauntlet','katana','daggers','sniper','rifle','railgun','hunt'].includes(s.weapon),gl=gloved?(s.gloves??0x1b1d22):skin;
 // 骨盆与躯干
 R.add('hips',G.oval((f?.165:.155)*bw,.12,.118),s.pants,{m:M(0,-.02,0)});
 R.add('spine',G.lathe([[.0,-.14],[.148*bw,-.13],[(f?.118:.132)*bw,-.02],[(f?.125:.138)*bw,.1],[(f?.13:.15)*bw,.21]],20,1,.74),top,{w:blendY('chest','spine',.16,.05)});
 R.add('chest',G.lathe([[(f?.13:.15)*bw,-.04],[(f?.15:.175)*bw,.06],[(f?.155:.185)*bw,.13],[(f?.14:.16)*bw,.2],[.08,.245],[.0,.25]],20,1,f?.6:.64),top);
 if(f)for(const sg of [-1,1])R.add('chest',G.oval(.064,.06,.055),top,{m:M(sg*.058,.07,.058)});
 R.add('neck',G.cyl(.046,.052,.13,12),skin,{m:M(0,.03,0)});
 // 手臂（肘部双骨骼平滑过渡）
 for(const sg of [1,-1]){const t=sg>0?'L':'R',arm='arm'+t,fore='fore'+t,hand='hand'+t;
  R.add(arm,G.oval(.064*bw,.07,.068*bw),sleeve,{m:M(0,-.01,0)});
  R.add(arm,G.lathe([[.044*bw,-.3],[.05*bw,-.2],[.056*bw,-.06],[.062*bw,.02]],14),sleeve,{w:blendY(arm,fore,-.22,-.31)});
  const bare=s.top==='robe';
  R.add(fore,G.lathe([[.035,-.25],[.041,-.17],[.046*bw,-.06],[.047*bw,.03]],14),bare?skin:sleeve,{w:blendY(arm,fore,.04,-.05)});
  if(s.top==='robe')R.add(fore,G.lathe([[.1,-.22],[.075,-.12],[.05,.02]],16),s.topC,{m:M(0,-.02,.01)}); // 宽袖
  else R.add(fore,G.cyl(.05,.05,.04,14),s.trim,{m:M(0,-.21,0)});
  R.add(hand,G.oval(.03,.052,.022),gl,{m:M(0,-.045,.005)});R.add(hand,G.oval(.027,.038,.019),gl,{m:M(0,-.095,.012,.25)});R.add(hand,G.oval(.012,.03,.012),gl,{m:M(sg*.026,-.04,.022,0,0,sg*.4)});
 }
 // 腿（膝部双骨骼平滑过渡）
 for(const sg of [1,-1]){const t=sg>0?'L':'R',th='thigh'+t,sh='shin'+t,ft='foot'+t;
  R.add(th,G.lathe([[.056,-.44],[.068,-.32],[(f?.084:.08)*bw,-.14],[(f?.09:.086)*bw,.03],[.04,.07]],16),s.pants,{w:blendY(th,sh,-.36,-.45)});
  R.add(sh,G.oval(.052,.058,.056),s.pants,{m:M(0,0,.008)});
  R.add(sh,G.lathe([[.039,-.33],[.05,-.2],[.054,-.1],[.05,.03]],14),s.pants,{w:blendY(th,sh,.04,-.05)});
  // 靴
  R.add(sh,G.lathe([[.048,-.4],[.052,-.3],[.057,-.2],[.06,-.16]],16),s.boots,{m:M(0,0,.004)});
  R.add(ft,G.oval(.05,.048,.115),s.boots,{m:M(0,-.026,.05)});R.add(ft,G.box(.1,.022,.25),0x15171b,{m:M(0,-.065,.045)});
  R.add(sh,G.box(.008,.16,.012),s.glow,{m:M(sg*.056,-.28,.012),glow:true,i:2});
 }
}

// ---------- 头部与发型 ----------
function head(R,s,rand){
 const skin=s.skin,hair=s.hair;
 R.add('head',animeHead(1),skin,{m:M(0,.108,-.004)});
 for(const sg of [-1,1])R.add('head',G.oval(.014,.026,.018),skin,{m:M(sg*.1,.1,-.004)});
 const style=s.style;
 if(style==='curly'){
  R.add('head',G.oval(.118,.11,.12),hair,{m:M(0,.165,-.02)});
  for(let i=0;i<34;i++){const a=rand()*Math.PI*2,b=rand()*1.2,r=.115;R.add('head',G.oval(.036,.032,.034,8,6),hair,{m:M(Math.cos(a)*Math.sin(b+.3)*r,.17+Math.cos(b)*.07,Math.sin(a)*Math.sin(b+.3)*r-.02)});}
  return;
 }
 const cap=style==='hood'?.115:.112;
 R.add('head',G.part(1,22,12,0,Math.PI*2,0,1.2).scale(cap*1.02,cap*1.13,cap*1.08),hair,{m:M(0,.11,-.008)});
 R.add('head',G.part(1,18,10,Math.PI,Math.PI,.8,1.35).scale(cap*1.04,cap*1.12,cap*1.09),hair,{m:M(0,.11,-.012)});
 const lock=(pts,r0,r1,bone='head',w)=>R.add(bone,G.strand(pts,r0,r1,{seg:9,rad:6,pow:.8}),hair,w?{w}:{});
 // 刘海
 const bangN=style==='spiky'?7:6;
 for(let i=0;i<bangN;i++){const u=(i/(bangN-1)-.5)*2,x=u*.075,len=style==='bob'||style==='twin'?.085:style==='short'?.06:.075;
  lock([[x*.6,.215,.03],[x,.19,.098],[x*1.15,.14+rand()*.012,.118],[x*1.2+(rand()-.5)*.02,.215-len-rand()*.02,.118]],.028,.003);}
 // 侧发
 const side=style==='bob'||style==='long'||style==='twin'||style==='braid'?.2:style==='ponytail'?.13:.07;
 for(const sg of [-1,1])for(let k=0;k<2;k++){const z=.05-k*.05;lock([[sg*.1,.17,z],[sg*.116,.11,z+.01],[sg*.112,.11-side*.6,z+.005],[sg*.1,.11-side,z-.005]],.026,.004);}
 if(['messy','spiky','short','hood'].includes(style)){
  const n=style==='short'?12:16,spread=style==='spiky'?1.5:style==='messy'?1:.6;
  for(let i=0;i<n;i++){const a=Math.PI*.15+i/n*Math.PI*1.7,cx=Math.cos(a+Math.PI/2),cz=-Math.abs(Math.sin(a+Math.PI/2))*1-.1,len=(style==='short'?.045:.07)+rand()*.04*spread;
   lock([[cx*.06,.21,cz*.05],[cx*.1,.19,cz*.09],[cx*(.118+.02*spread),.18-len*.4+rand()*.02*spread,cz*(.112+.015*spread)],[cx*(.125+.04*spread),.17-len+rand()*.04*spread,cz*(.12+.025*spread)]],.026,.002);}
  if(style!=='short')for(let i=0;i<5;i++){const x=(rand()-.5)*.12;lock([[x,.2,-.02],[x*1.2,.25,.0],[x*1.6+(rand()-.5)*.06,.27+rand()*.03*spread,.03+rand()*.04]],.026,.003);}
 }
 if(style==='bob'||style==='long'||style==='twin'||style==='braid'){
  for(let i=0;i<9;i++){const a=Math.PI*.2+i/8*Math.PI*.6,cx=Math.cos(a),cz=-Math.sin(a),long=style==='long'?.32:style==='braid'?.26:0;
   lock([[cx*.09,.2,cz*.09],[cx*.12,.12,cz*.125],[cx*.12,.02-long*.4,cz*.12],[cx*.11,-.04-long,cz*.1]],.034,.006,'head',long?chainY(['head','hairB'],[.08,-.05]):null);}
 }
 if(style==='ponytail'||style==='braid'){
  R.add('tail1',G.torus(.026,.012,6,14),s.trim,{m:M(0,0,0,Math.PI/2)});
  const w=chainY(['tail1','tail2','tail3'],[-.02,-.17,-.34]);
  if(style==='braid')for(let i=0;i<9;i++)R.add('tail1',G.oval(.036-i*.002,.04,.034,10,8),hair,{m:M(Math.sin(i*1.4)*.008,-.02-i*.052,-.012),w});
  else for(let i=0;i<5;i++){const ox=(i-2)*.012;lock([[ox,0,0],[ox*1.5,-.08,-.04],[ox*2,-.26,-.04],[ox*1.4,-.44,-.0],[ox,-.52,.02]],.042,.004,'tail1',w);}
 }
 if(style==='twin')for(const sg of [1,-1]){const t=sg>0?'L':'R',w=chainY(['twin'+t+'1','twin'+t+'2'],[-.04,-.2]);
  R.add('twin'+t+'1',G.oval(.03,.025,.03),s.trim,{});
  for(let i=0;i<4;i++){const o=(i-1.5)*.012;lock([[0,0,o],[sg*.05,-.08,o],[sg*.07,-.26,o-.02],[sg*.05,-.46,o-.02]],.04,.004,'twin'+t+'1',w);}
 }
 if(style==='hood'){
  R.add('head',G.part(1,22,14,Math.PI/2+1.0,Math.PI*2-2.0,0,2.1).scale(.135,.15,.14),s.topC,{m:M(0,.11,-.015)});
  R.add('head',G.torus(.122,.012,6,24,Math.PI*1.3),s.trim,{m:M(0,.13,.04,Math.PI/2-.25,0,-Math.PI*.15)});
 }
}

// ---------- 服装 ----------
function outfit(R,s,rand){
 const f=!!s.female,top=s.topC;
 // 衣领、前襟、腰带
 R.add('chest',G.torus(.07,.018,8,20,Math.PI*1.4),s.top==='armor'?s.top2:top,{m:M(0,.235,-.005,Math.PI/2,0,Math.PI*.8)});
 if(['jacket','coat','robe'].includes(s.top)){
  R.add('chest',G.vplate(.12,.25,.012),s.inner,{m:M(0,.11,f?.094:.104,-.13)});
  if(s.tie)R.add('chest',G.plate(.026,.19,.008,.3),s.tie,{m:M(0,.09,f?.103:.113,-.13)});
  for(const sg of [-1,1])R.add('chest',G.plate(.034,.27,.014,.6),s.top2===0xd8b200?s.top2:tone(top,.06)&&top,{m:M(sg*.05,.1,f?.1:.11,-.13,0,-sg*.24)});
 }
 if(s.top==='hoodie'){R.add('chest',G.box(.012,.3,.008),s.trim,{m:M(0,.06,f?.096:.108),glow:true,i:1.6});R.add('spine',G.box(.22,.06,.02),s.top2,{m:M(0,.02,.11)});}
 if(s.top==='tactical'||s.top==='armor'){
  R.add('chest',G.plate(.24,.2,.05,.25),s.top==='armor'?top:s.top2,{m:M(0,.1,f?.08:.09,-.08)});
  R.add('chest',G.box(.13,.008,.006),s.glow,{m:M(0,.15,f?.112:.122,-.08),glow:true});
  R.add('chest',G.box(.006,.09,.006),s.glow,{m:M(0,.06,f?.114:.124,-.08),glow:true});
  R.add('spine',G.plate(.2,.12,.04,.3),s.top==='armor'?top:s.top2,{m:M(0,.06,f?.085:.1)});
 }
 R.add('spine',G.torus((f?.128:.14)*(s.build==='heavy'?1.17:1),.017,6,26),0x1a1c21,{m:M(0,-.1,0,Math.PI/2,0,0,1,.74,1)});
 R.add('spine',G.plate(.05,.035,.012,.3),s.trim,{m:M(0,-.1,f?.098:.11)});
 R.add('spine',G.box(.03,.006,.004),s.glow,{m:M(0,-.1,f?.106:.118),glow:true});
 // 背部装甲脊线（战双式机能细节）
 R.add('chest',G.plate(.1,.18,.03,.35),s.top2,{m:M(0,.1,f?-.085:-.1)});
 R.add('chest',G.box(.006,.13,.006),s.glow,{m:M(0,.1,f?-.103:-.118),glow:true,i:1.8});
 // 外套下摆：前左、前右、后片三块，分别挂在独立骨骼上做布料摆动
 const L=s.coatLen;
 if(L>0){
  const wide=s.top==='robe'?1.25:1,wf=(f?.17:.165)*wide*(s.build==='heavy'?1.15:1),prof=[[wf+.06*L/.6,-L],[wf+.025,-L*.55],[wf,-.05],[wf-.01,.06]];
  const gap=s.top==='robe'?.16:.36;
  for(const bone of ['coatL','coatB','coatR']){
   const start=bone==='coatL'?gap:bone==='coatR'?2*Math.PI-1.76:1.76,len=bone==='coatB'?2*Math.PI-3.52:1.76-gap;
   const w=blendY('hips',bone,-.02,-.16);
   R.add(bone,G.shellPanel(prof,start,len,10,1,.82),top,{w});
   R.add(bone,G.shellPanel(prof,start,len,10,1,.82,true),s.top2,{w});
   R.add(bone,G.lathe([[prof[0][0]+.003,-L-.01],[prof[0][0]+.002,-L+.012]],10,1,.82,start,len),s.glow,{w,glow:true,i:1.7});
  }
 }
 if(s.skirt!==undefined&&(f||s.top==='robe')){
  const pleat=[];for(let i=0;i<=8;i++){const y=-.24+i*.03;pleat.push([.17-.06*(i/8),y]);}
  R.add('hips',G.lathe([[.2,-.26],[.185,-.18],[.165,-.06],[.155,.04]],28,1,.85),s.skirt,{w:(x,y,z)=>[['hips',1-smooth(-.02,-.26,y)*.5],[z>0?(x>0?'thighL':'thighR'):'hips',smooth(-.02,-.26,y)*.5]]});
  R.add('hips',G.lathe([[.202,-.262],[.2,-.245]],28,1,.85),s.trim,{});
 }
 // 配件
 const acc=s.acc||[];
 if(acc.includes('pauldron'))for(const sg of [-1,1])R.add('arm'+(sg>0?'L':'R'),G.part(1,14,8,0,Math.PI*2,0,1.3).scale(.085,.075,.085),s.top==='armor'?s.topC:s.trim,{m:M(sg*.01,.0,0,0,0,sg*.25)});
 if(acc.includes('pauldron'))for(const sg of [-1,1])R.add('arm'+(sg>0?'L':'R'),G.box(.004,.004,.1),s.glow,{m:M(sg*.06,-.03,0,0,0,sg*.4),glow:true});
 if(acc.includes('harness')){for(const sg of [-1,1])R.add('chest',G.box(.022,.33,.008),0x101114,{m:M(sg*.03,.08,f?.1:.112,-.12,0,sg*.55)});R.add('chest',G.torus(.017,.004,4,10),s.trim,{m:M(0,.06,.125)});}
 if(acc.includes('satchel')){R.add('spine',G.plate(.16,.13,.06,.2),0x6a5a42,{m:M(-.17,-.12,.02,0,Math.PI/2)});R.add('chest',G.box(.025,.42,.006),0x3a3228,{m:M(.0,.07,.112,0,0,.75)});}
 if(acc.includes('terminal'))R.add('spine',G.box(.06,.09,.02),0x222428,{m:M(.15,-.12,.08,0,.5)});
 if(acc.includes('scarf')){
  R.add('neck',G.torus(.065,.03,8,18),s.top2===0x6c7078?0x16161a:s.top2,{m:M(0,.0,0,Math.PI/2)});
  for(const o of [-.03,.04])R.add('scarf',G.strand([[o,0,0],[o*1.4,-.05,-.08],[o*2,-.1,-.22],[o*2.6,-.12,-.38]],.032,.02,{seg:8,rad:4}),0x18181d,{w:(x,y,z)=>[['chest',smooth(-.2,0,z)],['scarf',1-smooth(-.2,0,z)]]});
 }
 if(acc.includes('goggles')){R.add('head',G.torus(.112,.012,6,26),0x2a2b30,{m:M(0,.19,0,Math.PI/2-.35)});for(const sg of [-1,1]){R.add('head',G.cyl(.032,.034,.03,14),0x34363c,{m:M(sg*.045,.215,.085,1.2)});R.add('head',G.cyl(.024,.024,.005,14),s.glow,{m:M(sg*.045,.226,.1,1.2),glow:true,i:1.4});}}
 if(acc.includes('headphones')||acc.includes('headset')){for(const sg of [-1,1]){R.add('head',G.cyl(.04,.04,.03,16),0x1e2024,{m:M(sg*.115,.11,0,0,0,Math.PI/2)});R.add('head',G.cyl(.026,.026,.006,16),s.glow,{m:M(sg*.132,.11,0,0,0,Math.PI/2),glow:true,i:1.5});}
  if(acc.includes('headphones'))R.add('head',G.torus(.12,.01,6,20,Math.PI),0x1e2024,{m:M(0,.12,0)});else R.add('head',G.strand([[-.12,.09,.02],[-.1,.04,.08],[-.04,.04,.11]],.006,.004,{seg:6,rad:4}),0x1e2024,{});}
 if(acc.includes('earpiece')){R.add('head',G.oval(.016,.022,.016),0x2a3038,{m:M(-.112,.1,.0)});R.add('head',G.box(.004,.004,.04),s.glow,{m:M(-.12,.1,.025),glow:true});}
 if(acc.includes('glasses'))for(const sg of [-1,1]){R.add('head',G.torus(.024,.003,4,16),0x2a2f35,{m:M(sg*.042,.105,.112,0,0,0,1,.72,1)});R.add('head',G.box(.026,.003,.003),0x2a2f35,{m:M(0,.108,.114)});}
 if(acc.includes('visor'))R.add('head',G.part(1,18,3,Math.PI*.2,Math.PI*.6,1.4,.07).scale(.116,.118,.12),s.glow,{m:M(0,.105,.008),glow:true,i:1.2});
 if(acc.includes('mask'))R.add('head',G.part(1,18,8,Math.PI*.08,Math.PI*.84,1.68,.8).scale(.106,.12,.114),0x111116,{m:M(0,.105,0)});
 if(acc.includes('clover'))R.add('head',G.oval(.01,.01,.004),0x5ad07a,{m:M(.104,.06,.01),glow:true,i:1.3});
 if(acc.includes('ribbon'))for(const sg of [-1,1])R.add('head',G.oval(.04,.022,.012),s.trim,{m:M(sg*.06,.2,-.08,0,sg*.6,sg*.4)});
 if(acc.includes('star')){R.add('head',G.oct(.022).scale(1,1.4,.4),s.glow,{m:M(.085,.19,.06),glow:true,i:2});}
 if(acc.includes('halo')){
  R.add('head',G.torus(.19,.012,6,40),0xd8dce2,{m:M(0,.31,-.08,Math.PI/2-.3)});
  R.add('head',G.torus(.17,.007,4,40),s.glow,{m:M(0,.31,-.08,Math.PI/2-.3),glow:true,i:2.6});
  const ct=Math.cos(Math.PI/2-.3),st=Math.sin(Math.PI/2-.3);for(let i=0;i<8;i++){const a=i/8*Math.PI*2,dx=Math.cos(a),dy=Math.sin(a)*ct,dz=Math.sin(a)*st;R.add('head',G.cone(.013,.07,4),s.trim,{m:Md(dx*.225,.31+dy*.225,-.08+dz*.225,dx,dy,dz)});}
 }
}

// ---------- 武器 ----------
function weapon(R,s){
 const g=s.glow,dark=0x15171c,metal=0xb9c3cc,gun=0x23262c,w=s.weapon;
 const hand='handR',off='handL';
 if(w==='katana'||w==='hunt'||w==='sword'){
  const len=w==='katana'?.86:w==='sword'?.78:.5,wid=w==='sword'?.055:w==='hunt'?.05:.032;
  R.add(hand,G.cyl(.016,.016,.2,10),dark,{m:M(0,-.07,.03,Math.PI/2)});
  R.add(hand,w==='katana'?G.cyl(.04,.04,.01,16):G.plate(.13,.03,.03,.3),s.trim,{m:M(0,-.07,.13,w==='katana'?Math.PI/2:0)});
  R.add(hand,G.blade(len,wid,.01),metal,{m:M(0,-.07,.13)});
  R.add(hand,G.box(.004,.004,len*.85),g,{m:M(0,-.07+wid*.5,.14+len*.42),glow:true,i:3});
  if(w==='katana')R.add('hips',G.cyl(.022,.022,.8,10),dark,{m:M(.17,-.05,-.08,.4,0,-.25)});
 }
 if(w==='daggers')for(const h of ['handR','handL']){R.add(h,G.cyl(.014,.014,.1,8),dark,{m:M(0,-.07,.0,Math.PI/2)});R.add(h,G.blade(.26,.04,.012,.35),0x3a2a52,{m:M(0,-.07,.05)});R.add(h,G.box(.004,.004,.22),g,{m:M(0,-.07+.018,.17),glow:true,i:3.2});}
 if(w==='gauntlet')for(const sg of [1,-1]){const t=sg>0?'L':'R';
  R.add('fore'+t,G.plate(.12,.2,.12,.25),0x3a3532,{m:M(0,-.15,0,0,0,0)});R.add('hand'+t,G.oval(.065,.07,.06),0x4a423c,{m:M(0,-.07,.012)});
  R.add('hand'+t,G.box(.09,.012,.012),g,{m:M(0,-.09,.07),glow:true,i:2.6});R.add('fore'+t,G.box(.008,.15,.008),g,{m:M(sg*.064,-.15,.0),glow:true,i:2});}
 if(w==='rifle'||w==='sniper'||w==='railgun'||w==='crossbow'||w==='pistol'){
  // 枪械沿局部 -Y（手臂延长线）向前；瞄准姿态时手臂水平前伸
  if(w==='pistol'){R.add(hand,G.box(.035,.18,.07),gun,{m:M(0,-.1,.0)});R.add(hand,G.box(.006,.12,.006),g,{m:M(.02,-.12,.02),glow:true,i:2.2});}
  else{
   const L=w==='railgun'?1.15:w==='sniper'?1.18:w==='crossbow'?.62:.86;
   R.add(hand,G.plate(.06,L*.55,.11,.2),gun,{m:M(0,-.05-L*.12,.02)});
   R.add(hand,G.cyl(.016,.016,L*.55,10),0x31343a,{m:M(0,-.1-L*.55,.035)});
   R.add(hand,G.plate(.05,.26,.09,.3),gun,{m:M(0,.16,.0)});
   R.add(hand,G.box(.006,L*.5,.006),g,{m:M(.032,-.1-L*.2,.04),glow:true,i:2.4});
   if(w==='sniper'){R.add(hand,G.cyl(.022,.022,.2,12),dark,{m:M(0,-.22,.1)});R.add(hand,G.cyl(.018,.018,.004,12),g,{m:M(0,-.32,.1),glow:true,i:2});}
   if(w==='railgun'){for(let i=0;i<4;i++)R.add(hand,G.torus(.05,.012,6,16),i%2?0x2c3036:s.trim,{m:M(0,-.3-i*.14,.035,Math.PI/2)});R.add(hand,G.cyl(.035,.035,.5,12),g,{m:M(0,-.5,.035),glow:true,i:2.2});R.add(hand,G.plate(.12,.5,.03,.3),s.top2,{m:M(0,-.3,.09)});}
   if(w==='crossbow'){R.add(hand,G.strand([[-.32,-.52,0],[-.16,-.45,.02],[0,-.48,.035],[.16,-.45,.02],[.32,-.52,0]],.012,.012,{seg:12,rad:5}),0x2a2d24,{});R.add(hand,G.box(.62,.004,.004),g,{m:M(0,-.5,.035),glow:true,i:1.8});}
  }
 }
 if(w==='wand'||w==='sunstaff'||w==='bellstaff'){
  // 法杖沿局部 +Z（前臂前伸时竖直）
  const L=w==='wand'?.42:1.45,base=w==='wand'?-.05:-.62;
  R.add(hand,G.cyl(.013,.013,L,10),w==='sunstaff'?0x2a2620:0x2c3240,{m:M(0,-.07,base+L/2,Math.PI/2)});
  for(let i=0;i<3;i++)R.add(hand,G.cyl(.019,.019,.03,10),s.trim,{m:M(0,-.07,base+L*(.3+i*.2),Math.PI/2)});
  const top=base+L;
  if(w==='wand'){R.add(hand,G.oct(.05).scale(1,.4,1.3),s.glow,{m:M(0,-.07,top+.04,Math.PI/2),glow:true,i:3});R.add(hand,G.torus(.06,.006,4,20),s.trim,{m:M(0,-.07,top+.04)});}
  if(w==='sunstaff'){R.add(hand,G.ico(.06,1),s.glow,{m:M(0,-.07,top+.08),glow:true,i:3.4});R.add(hand,G.torus(.12,.012,6,28),s.trim,{m:M(0,-.07,top+.08,Math.PI/2)});
   for(let i=0;i<8;i++){const a=i/8*Math.PI*2;R.add(hand,G.cone(.018,.11,4),s.trim,{m:Md(Math.cos(a)*.17,-.07,top+.08+Math.sin(a)*.17,Math.cos(a),0,Math.sin(a))});}}
  if(w==='bellstaff'){R.add(hand,G.lathe([[.0,-.07],[.05,-.06],[.075,.0],[.06,.05],[.02,.08],[0,.08]],16),0xd8ecff,{m:M(0,-.07,top+.02,-Math.PI/2)});R.add(hand,G.oval(.03,.03,.03),s.glow,{m:M(0,-.07,top-.06),glow:true,i:3});
   for(let i=0;i<3;i++)R.add(hand,G.oct(.04).scale(.5,1.5,.5),s.glow,{m:M(Math.cos(i*2.1)*.11,-.07+Math.sin(i*2.1)*.11,top+.04,0,0,i*2.1),glow:true,i:2});}
 }
 if(w==='shield'||s.shield){
  // 盾牌挂在左前臂，前臂前伸时盾面朝前（局部 -Y）
  const type=s.shield||'riot',H=type==='tower'?.78:type==='hex'?.6:.55,Wd=type==='tower'?.5:type==='hex'?.46:.44;
  R.add('foreL',G.plate(Wd,H,.05,type==='hex'?.42:.15).rotateX(Math.PI/2),type==='hex'?0xe6eaee:0x3a3e45,{m:M(.02,-.2,.12)});
  R.add('foreL',G.plate(Wd*.7,H*.55,.012,type==='hex'?.42:.2).rotateX(Math.PI/2),type==='riot'?0x8fb6c8:0x22262c,{m:M(.02,-.232,.15)});
  R.add('foreL',G.box(Wd*.8,.006,.008),s.glow,{m:M(.02,-.24,.15+H*.32),glow:true,i:2.4});
  R.add('foreL',G.box(.008,.006,H*.6),s.glow,{m:M(.02,-.24,.12),glow:true,i:type==='hex'?3:1.8});
  if(w==='shield'){R.add(hand,G.cyl(.018,.018,.38,10),0x2a2d33,{m:M(0,-.07,.14,Math.PI/2)});R.add(hand,G.box(.006,.006,.3),s.glow,{m:M(.02,-.07,.17),glow:true,i:2});}
 }
 if(w==='tablet'){
  R.add(off,G.plate(.2,.27,.016,.12).rotateX(-Math.PI/2+.4),0x1d232a,{m:M(0,-.1,.09)});
  R.add(off,G.plate(.17,.22,.004,.1).rotateX(-Math.PI/2+.4),s.glow,{m:M(0,-.09,.093),glow:true,i:1.2});
  R.add('drone',G.oval(.085,.06,.085),0xe8eef0,{});R.add('drone',G.oval(.035,.035,.015),s.glow,{m:M(0,0,.08),glow:true,i:2.4});
  for(const sg of [-1,1]){R.add('drone',G.box(.12,.016,.03),0x2a3038,{m:M(sg*.1,.02,0)});R.add('drone',G.cyl(.05,.05,.006,16),s.glow,{m:M(sg*.16,.035,0),glow:true,i:1.4});}
 }
 if(w==='beacon'){R.add(hand,G.cyl(.03,.035,.16,12),0x2a2f36,{m:M(0,-.1,.0)});R.add(hand,G.oval(.034,.034,.034),s.glow,{m:M(0,-.2,.0),glow:true,i:3});R.add(hand,G.cyl(.004,.004,.18,6),0x8a8f96,{m:M(.02,-.02,.03)});
  R.add(off,G.plate(.12,.16,.02,.2).rotateX(-Math.PI/2+.4),0x2a2f36,{m:M(0,-.1,.07)});R.add(off,G.box(.1,.004,.12),s.glow,{m:M(0,-.09,.083,.4),glow:true,i:1.2});}
}

// ---------- 模板缓存与实例 ----------
const templates={};
function template(id,corrupt=false){
 const key=id+(corrupt?':x':'');if(templates[key])return templates[key];
 const s=SPECS[id]||SPECS.warden,R=new Rig(),rand=prng(id.split('').reduce((a,c)=>a*31+c.charCodeAt(0),7));
 skeleton(R,s);body(R,s);head(R,s,rand);outfit(R,s,rand);weapon(R,s);
 const k=s.h/1.75,defs=R.bones.map(b=>({name:b.name,parent:b.parent&&b.parent.isBone?b.parent.name:null,pos:b.position.clone().multiplyScalar(k)}));
 const faceGeo=animeHead(1.018,G.part(1,26,18,Math.PI/2-.95,1.9,1.0,1.15)).translate(0,.108,-.004).scale(k,k,k);
 return templates[key]={id,spec:s,cls:WEAPON_CLASS[s.weapon]||'blade',body:merge(R.body,k),glow:merge(R.glow,k),defs,faceGeo,face:faceTexture(s,corrupt),height:s.h};
}
const sharedOutline=outlineMat();
function createHero(id,opts={}){
 const t=template(id,!!opts.corrupt),bones=[],map={};
 for(const d of t.defs){const b=new T.Bone();b.name=d.name;b.position.copy(d.pos);if(d.parent)map[d.parent].add(b);bones.push(b);map[d.name]=b;}
 bones[0].updateMatrixWorld(true);const skel=new T.Skeleton(bones);
 const root=new T.Group(),corrupt=!!opts.corrupt;
 const mat=toon({vertexColors:true,rim:opts.rim??(corrupt?0xff2a4a:0xbfe8ff),rimStrength:corrupt?.9:.5});
 if(corrupt)mat.color.setHex(0x55405a);
 const body=new T.SkinnedMesh(t.body,mat);body.add(bones[0]);root.add(body);body.bind(skel);body.castShadow=true;body.receiveShadow=true;body.frustumCulled=false;
 const outline=new T.SkinnedMesh(t.body,opts.outline===false?sharedOutline:outlineMat());root.add(outline);outline.bind(skel,body.bindMatrix);outline.frustumCulled=false;
 if(opts.outline===false)outline.visible=false;
 let glow=null;if(t.glow){const gm=glowMat({vertexColors:true});if(corrupt)gm.color.setRGB(1.4,.25,.35);glow=new T.SkinnedMesh(t.glow,gm);root.add(glow);glow.bind(skel,body.bindMatrix);glow.frustumCulled=false;}
 const faceMat=toon({map:t.face,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,rimStrength:0});
 const face=new T.Mesh(t.faceGeo,faceMat);map.head.add(face);
 const materials=[mat,faceMat,outline.material];if(glow)materials.push(glow.material);
 const inst={kind:'hero',id,root,bones:map,body,outline,glow,face,materials,cls:t.cls,spec:t.spec,height:t.height*1.04,corrupt,
  sec:{coat:0,coatV:0,hair:0,hairV:0,tail:[0,0,0],tailV:[0,0,0]},phase:0,flip:false,lastAttack:-1,glowBoost:0,
  dispose(){for(const m of materials)m.dispose();root.removeFromParent();}};
 poseHero(inst,{time:0},0);return inst;
}

// ---------- 动作 ----------
function poseHero(I,s,dt){
 const b=I.bones,t=s.time||0,m=clamp(s.move||0),cls=I.cls,f=!!I.spec.female;
 for(const k in b)b[k].rotation.set(0,0,0);
 b.hips.position.y=I.bones.hips.userData.y0??(I.bones.hips.userData.y0=b.hips.position.y);
 const y0=b.hips.userData.y0,breathe=Math.sin(t*2.1+(I.spec.h*7)),idle=s.idleMotion===false?0:1;
 // 攻击/施法曲线
 const at=s.attackT??9,ct=s.castT??9;
 const wind=smooth(0,.09,at)*(1-smooth(.09,.17,at)),swing=smooth(.08,.18,at)*(1-smooth(.32,.62,at)),kick=at<.4?Math.exp(-at*14)*smooth(0,.03,at):0;
 const cast=smooth(0,.12,ct)*(1-smooth(.5,.85,ct)),hit=clamp(s.hit||0),dead=clamp(s.dead||0),win=clamp(s.victory||0),stun=s.stun?1:0;
 if(at<.02&&I.lastAttack!==s.attackSerial){I.lastAttack=s.attackSerial;I.flip=!I.flip;}
 // 奔跑步态（按实际位移推进相位）
 I.phase+=(s.distance||0)*Math.PI*2/1.55;const ph=I.phase,st=Math.sin(ph);
 b.thighL.rotation.x=-st*.75*m;b.thighR.rotation.x=st*.75*m;
 b.shinL.rotation.x=(Math.max(0,Math.sin(ph+.9))*1.15+.12)*m;b.shinR.rotation.x=(Math.max(0,Math.sin(ph+.9+Math.PI))*1.15+.12)*m;
 b.footL.rotation.x=-Math.max(0,-st)*.3*m;b.footR.rotation.x=-Math.max(0,st)*.3*m;
 b.hips.position.y=y0-Math.abs(Math.cos(ph))*.035*m+breathe*.004*idle;b.hips.rotation.y=st*.12*m;
 b.spine.rotation.x=.04+.2*m+breathe*.012*idle;b.chest.rotation.y=-st*.16*m;b.chest.rotation.x=breathe*.015*idle;
 b.head.rotation.x=-.04-.12*m;b.neck.rotation.x=.02;
 b.armL.rotation.z=.1+(f?.04:0);b.armR.rotation.z=-.1-(f?.04:0);
 b.armL.rotation.x=st*.65*m;b.armR.rotation.x=-st*.65*m;b.foreL.rotation.x=-.18-.75*m;b.foreR.rotation.x=-.18-.75*m;
 b.thighL.rotation.z=.035;b.thighR.rotation.z=-.035;
 // 职业姿态
 const R=(bone,x,y,z,w=1)=>{bone.rotation.x=lerp(bone.rotation.x,x,w);bone.rotation.y=lerp(bone.rotation.y,y,w);bone.rotation.z=lerp(bone.rotation.z,z,w);};
 if(cls==='blade'){
  R(b.armR,-.35,0,-.18,1-m*.5);R(b.foreR,-.75,0,0,1-m*.4);
  if(wind>0||swing>0){R(b.armR,-2.35,.2,-.45,wind);R(b.foreR,-.55,0,0,wind);b.chest.rotation.y+=.45*wind;b.spine.rotation.x-=.12*wind;
   R(b.armR,-.25,-.3,.55,swing);R(b.foreR,-.15,0,0,swing);b.chest.rotation.y-=.55*swing;b.spine.rotation.x+=.22*swing;b.thighR.rotation.x-=.45*swing;b.shinR.rotation.x+=.35*swing;b.hips.position.y-=.04*swing;}
  if(I.spec.shield){R(b.armL,-.45,0,-.15);R(b.foreL,-1.25,0,0);}
 }else if(cls==='dual'){
  R(b.armR,-.4,0,-.25,1-m*.4);R(b.foreR,-.9,0,0,1-m*.4);R(b.armL,-.4,0,.25,1-m*.4);R(b.foreL,-.9,0,0,1-m*.4);
  const A=I.flip?b.armR:b.armL,F=I.flip?b.foreR:b.foreL,sg=I.flip?1:-1;
  R(A,-1.9,0,-.5*sg,wind);R(A,-.6,0,.6*sg,swing);R(F,-.2,0,0,swing);b.chest.rotation.y+=(.4*wind-.5*swing)*sg;b.spine.rotation.x+=.25*swing;
 }else if(cls==='heavy'){
  R(b.armR,-.45,0,-.25);R(b.foreR,-1.5,0,0);R(b.armL,-.45,0,.25);R(b.foreL,-1.5,0,0);b.spine.rotation.x+=.08;
  const A=I.flip?b.armR:b.armL,F=I.flip?b.foreR:b.foreL,sg=I.flip?1:-1;
  R(A,.35,0,-.2*sg,wind);R(F,-2,0,0,wind);R(A,-1.55,0,.08*sg,swing);R(F,-.05,0,0,swing);b.chest.rotation.y+=(.35*wind-.5*swing)*sg;b.spine.rotation.x+=.2*swing;
 }else if(cls==='gun'){
  const aim=1-m*.55;
  R(b.armR,-1.38,0,.12,aim);R(b.foreR,-.18,0,0,aim);R(b.armL,-1.18,0,-.55,aim);R(b.foreL,-.55,0,0,aim);
  if(I.spec.weapon==='pistol'){R(b.armL,-.2,0,.15,aim);R(b.foreL,-.4,0,0,aim);}
  b.chest.rotation.y+=.22*aim;b.head.rotation.y-=.2*aim;
  b.armR.rotation.x+=.32*kick;b.armL.rotation.x+=.2*kick;b.spine.rotation.x-=.07*kick;
 }else if(cls==='staff'){
  R(b.armR,-.32,0,-.12,1-m*.3);R(b.foreR,-1.15,0,0,1-m*.3);
  R(b.armR,-1.5,0,-.05,swing);R(b.foreR,-.35,0,0,swing);R(b.armL,-1.3,0,-.2,swing);R(b.foreL,-.2,0,0,swing);b.spine.rotation.x+=.1*swing;
 }else if(cls==='shield'){
  R(b.armL,-.5,0,-.18,1-m*.3);R(b.foreL,-1.28,0,0,1-m*.3);R(b.armR,-.3,0,-.2);R(b.foreR,-.7,0,0);
  R(b.armL,-1.0,0,-.25,wind+swing);R(b.foreL,-.75,0,0,swing);R(b.armR,-1.9,0,-.3,wind);R(b.armR,-.4,-.2,.4,swing);b.spine.rotation.x+=.15*swing;b.thighL.rotation.x-=.35*swing;
 }else if(cls==='support'){
  R(b.armL,-.62,0,-.15);R(b.foreL,-1.3,0,0);R(b.armR,-.25,0,-.12,1-m*.5);R(b.foreR,-.5,0,0,1-m*.5);
  R(b.armR,-1.45,0,.05,swing+wind*.5);R(b.foreR,-.1,0,0,swing);
 }
 // 施法：高举武器并后仰
 if(cast>0){
  if(cls==='gun'){b.armR.rotation.x+=.45*kick;b.spine.rotation.x-=.1*cast;b.hips.position.y-=.05*cast;b.thighL.rotation.x-=.3*cast;b.shinL.rotation.x+=.4*cast;b.shinR.rotation.x+=.4*cast;}
  else{R(b.armR,-2.75,0,-.15,cast);R(b.foreR,-.2,0,0,cast);if(cls!=='shield'&&cls!=='support'){R(b.armL,-.6,0,.55,cast);R(b.foreL,-.4,0,0,cast);}else R(b.armL,-1.25,0,-.2,cast);
   b.spine.rotation.x-=.14*cast;b.head.rotation.x-=.15*cast;b.hips.position.y-=.03*cast;}
 }
 I.glowBoost=cast;
 if(hit>0){b.spine.rotation.x-=.2*hit;b.head.rotation.x-=.15*hit;b.chest.rotation.z+=.06*hit;}
 if(stun){b.spine.rotation.x+=.25;b.head.rotation.x+=.3;b.head.rotation.z=Math.sin(t*5)*.18;b.armL.rotation.x=.1;b.armR.rotation.x=.1;b.foreL.rotation.x=-.2;b.foreR.rotation.x=-.2;}
 if(win>0&&!dead){R(b.armR,-2.9,0,-.2,win);R(b.foreR,-.1,0,0,win);b.spine.rotation.x-=.1*win;b.head.rotation.x-=.15*win;}
 if(dead>0){const d=smooth(0,.55,dead);R(b.thighL,-1.2,0,.1,d);R(b.thighR,-1.0,0,-.1,d);R(b.shinL,2.0,0,0,d);R(b.shinR,1.8,0,0,d);b.hips.position.y=lerp(b.hips.position.y,y0*.42,d);
  R(b.spine,.55,0,0,d);R(b.head,.4,0,.2,d);R(b.armL,.15,0,.3,d);R(b.armR,.15,0,-.3,d);R(b.foreL,-.3,0,0,d);R(b.foreR,-.3,0,0,d);}
 // 布料与头发的二阶摆动
 const sp=I.sec,k=dt>0?1-Math.exp(-dt*9):1;
 const coatT=.06+m*.55+hit*.2+Math.sin(t*2.6)*.02*idle,hairT=.05+m*.4+Math.sin(t*2.1+1)*.03*idle;
 sp.coat+=(coatT-sp.coat)*k;sp.hair+=(hairT-sp.hair)*k;
 b.coatB.rotation.x=sp.coat;b.coatL.rotation.x=sp.coat*.7;b.coatR.rotation.x=sp.coat*.7;b.coatL.rotation.z=sp.coat*.25;b.coatR.rotation.z=-sp.coat*.25;
 b.coatL.rotation.x-=Math.max(0,st)*.25*m;b.coatR.rotation.x-=Math.max(0,-st)*.25*m;
 b.hairB.rotation.x=sp.hair*.8;
 if(b.tail1){b.tail1.rotation.x=sp.hair*.9;b.tail2.rotation.x=sp.hair*.6+Math.sin(t*3)*.05*idle;b.tail3.rotation.x=sp.hair*.5;b.tail1.rotation.z=Math.sin(ph*.5)*.12*m;}
 for(const tw of ['twinL1','twinR1'])if(b[tw]){b[tw].rotation.x=sp.hair;b[tw].rotation.z=(tw==='twinL1'?1:-1)*(.08+sp.hair*.3);}
 if(b.scarf)b.scarf.rotation.x=sp.coat*1.2;
 if(b.drone){b.drone.position.y=1.42*I.spec.h/1.75+Math.sin(t*2.4)*.05;b.drone.rotation.y=Math.sin(t*.7)*.5;}
}

// ---------- 寂蚀敌人（刚体模型） ----------
const ENEMY_COL={shell:0x1c1820,shell2:0x2c2430,crack:0xff2f4a,core:0xff4a5a,void:0xb04aff};
function createEnemy(id,opts={}){
 if(id==='mimic'){const I=createHero(opts.mimicOf||'ember',{corrupt:true});I.kind='mimic';I.height*=1.0;I.root.scale.setScalar(1.12);return I;}
 const root=new T.Group(),parts={},mats=[],size=opts.size||1;
 const shellM=toon({color:ENEMY_COL.shell,rim:0xff2a45,rimStrength:.85});const shell2=toon({color:ENEMY_COL.shell2,rim:0xff2a45,rimStrength:.7});
 const glowM=glowMat({color:new T.Color(ENEMY_COL.crack).multiplyScalar(2.6)}),coreM=glowMat({color:new T.Color(ENEMY_COL.core).multiplyScalar(3.4)}),voidM=glowMat({color:new T.Color(ENEMY_COL.void).multiplyScalar(2.6)});
 const olM=outlineMat(.002,0x0a0306);mats.push(shellM,shell2,glowM,coreM,voidM,olM);
 const add=(parent,geo,mat,m,outline=true)=>{const o=new T.Mesh(geo,mat);if(m)o.applyMatrix4(m);o.castShadow=mat!==glowM&&mat!==coreM&&mat!==voidM;parent.add(o);if(outline&&o.castShadow){const l=new T.Mesh(geo,olM);o.add(l);}return o;};
 const grp=(parent,name,x=0,y=0,z=0)=>{const g=new T.Group();g.position.set(x,y,z);parent.add(g);parts[name]=g;return g;};
 const crystals=(parent,n,r,y,h=.3,seed=3)=>{const rnd=prng(seed);for(let i=0;i<n;i++){const a=rnd()*Math.PI*2,c=add(parent,G.cone(.045+rnd()*.03,h*(.6+rnd()*.7),5),glowM,M(Math.cos(a)*r*rnd(),y,Math.sin(a)*r*rnd()-.05,(rnd()-.5)*.8,0,(rnd()-.5)*.8),false);c.castShadow=false;}};
 let height=1;
 if(id==='crawler'){
  const b=grp(root,'body',0,.32,0);add(b,G.oval(.36,.17,.44,16,10),shellM);add(b,G.oval(.22,.12,.26,12,8),shell2,M(0,.1,-.08));
  add(b,G.oval(.16,.11,.16),shellM,M(0,.02,.38));add(b,G.oval(.05,.04,.03),coreM,M(0,.05,.52),false);crystals(b,6,.25,.15,.3,5);
  for(let i=0;i<6;i++){const sg=i<3?1:-1,z=(i%3-1)*.24,leg=grp(b,'leg'+i,sg*.28,0,z);add(leg,G.cyl(.026,.03,.32,6),shell2,M(sg*.14,.05,0,0,0,sg*1.1));const low=grp(leg,'low'+i,sg*.27,.12,0);add(low,G.cone(.03,.42,6),shellM,M(sg*.03,-.2,0,Math.PI,0,-sg*.25));}
  height=.7;
 }else if(id==='spitter'){
  const b=grp(root,'body',0,1.05,0);add(b,G.oct(.32).scale(1,1.5,1),shellM);add(b,G.ico(.11,1),coreM,null,false);
  const ring=grp(b,'ring');add(ring,G.torus(.42,.018,6,32),glowM,M(0,0,0,Math.PI/2),false);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;add(b,G.oct(.08).scale(.6,1.6,.6),shell2,M(Math.cos(a)*.48,0,Math.sin(a)*.48));}
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;add(b,G.strand([[Math.cos(a)*.12,-.35,Math.sin(a)*.12],[Math.cos(a)*.2,-.6,Math.sin(a)*.2],[Math.cos(a)*.14,-.85,Math.sin(a)*.14]],.03,.004,{seg:8,rad:5}),shell2);}
  height=1.5;
 }else if(id==='drone'){
  const b=grp(root,'body',0,1.1,0);add(b,G.plate(.36,.12,.36,.3).rotateX(Math.PI/2),shellM);add(b,G.oval(.09,.06,.09),coreM,M(0,-.05,.16),false);
  for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,arm=grp(b,'arm'+i,Math.cos(a)*.3,0,Math.sin(a)*.3);add(arm,G.box(.32,.04,.05),shell2,M(-Math.cos(a)*.14,0,-Math.sin(a)*.14,0,-a));const rot=grp(arm,'rot'+i,0,.05,0);add(rot,G.box(.34,.008,.05),glowM,null,false);add(rot,G.box(.05,.008,.34),glowM,null,false);}
  crystals(b,4,.14,.08,.22,9);height=1.35;
 }else if(id==='brute'){
  const b=grp(root,'body',0,.95,0);add(b,G.plate(.9,.8,.62,.25),shellM,M(0,.25,0));add(b,G.oval(.32,.26,.3),shell2,M(0,-.2,0));
  const hd=grp(b,'head',0,.68,.18);add(hd,G.plate(.28,.22,.26,.3),shellM);add(hd,G.box(.2,.03,.02),coreM,M(0,.0,.14),false);
  for(const sg of [-1,1]){const arm=grp(b,sg>0?'armL':'armR',sg*.56,.45,0);add(arm,G.ico(.24,1),shell2);add(arm,G.plate(.26,.62,.26,.3),shellM,M(sg*.05,-.42,.0));add(arm,G.plate(.34,.3,.32,.3),shell2,M(sg*.06,-.82,.04));add(arm,G.box(.04,.5,.02),glowM,M(sg*.12,-.45,.14),false);
   const leg=grp(b,sg>0?'legL':'legR',sg*.24,-.35,0);add(leg,G.plate(.24,.55,.26,.3),shellM,M(0,-.28,0));}
  crystals(b,9,.35,.65,.5,11);add(b,G.box(.03,.5,.02),glowM,M(.12,.25,.32,0,0,.4),false);add(b,G.box(.03,.4,.02),glowM,M(-.15,.2,.32,0,0,-.3),false);height=2.2;
 }else if(id==='shade'){
  const b=grp(root,'body',0,.75,0);
  add(b,G.lathe([[.0,-.7],[.34,-.68],[.3,-.4],[.22,-.05],[.18,.3],[.14,.48],[0,.6]],18),shellM);
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;add(b,G.strand([[Math.cos(a)*.26,-.5,Math.sin(a)*.26],[Math.cos(a)*.38,-.72,Math.sin(a)*.38],[Math.cos(a)*.3,-.86,Math.sin(a)*.3]],.07,.004,{seg:6,rad:4}),shell2);}
  for(const sg of [-1,1]){add(b,G.oval(.03,.012,.01),voidM,M(sg*.05,.42,.13),false);const arm=grp(b,sg>0?'armL':'armR',sg*.2,.2,0);add(arm,G.strand([[0,0,0],[sg*.1,-.2,.15],[sg*.08,-.42,.32]],.05,.005,{seg:6,rad:4}),shellM);add(arm,G.cone(.02,.2,4),voidM,M(sg*.08,-.48,.38,1.2),false);}
  height=1.55;
 }else{ // 首领
  height=3;
  if(id==='gatekeeper'){
   const b=grp(root,'body',0,1.6,0);add(b,G.plate(.7,1.4,.5,.3),shellM);add(b,G.ico(.2,1),coreM,M(0,.15,.28),false);
   const ring=grp(b,'ring');add(ring,G.torus(1.05,.09,6,6),shell2);add(ring,G.torus(.98,.02,4,6),glowM,null,false);
   for(let i=0;i<6;i++){const a=i/6*Math.PI*2;add(ring,G.oct(.16).scale(.6,1.6,.6),shellM,M(Math.cos(a)*1.05,Math.sin(a)*1.05,0,0,0,a));}
   for(const sg of [-1,1]){const arm=grp(b,sg>0?'armL':'armR',sg*.62,.4,0);add(arm,G.plate(.32,1.1,.32,.3),shellM,M(0,-.55,0));add(arm,G.cone(.16,.5,5),glowM,M(0,-1.25,0,Math.PI),false);}
   const legs=grp(root,'legs',0,0,0);for(const sg of [-1,1])add(legs,G.plate(.32,1,.34,.3),shell2,M(sg*.3,.5,0));
   crystals(b,10,.4,.7,.7,13);height=3.4;
  }else if(id==='amalgam'){
   const b=grp(root,'body',0,1.05,0),g=G.ico(.9,3),p=g.attributes.position,rnd=prng(21);for(let i=0;i<p.count;i++){const v=V(p.getX(i),p.getY(i),p.getZ(i)),n=1+Math.sin(v.x*6)*.08+Math.sin(v.y*7+1)*.07+Math.sin(v.z*5+2)*.06;p.setXYZ(i,v.x*n,v.y*n*.8,v.z*n);}g.computeVertexNormals();
   add(b,g,shellM);for(let i=0;i<7;i++){const a=rnd()*Math.PI*2,y=rnd()*.6-.1;add(b,G.oval(.09,.09,.05),coreM,M(Math.cos(a)*.78,y,Math.sin(a)*.78,0,-a+Math.PI/2),false);}
   for(let i=0;i<8;i++){const a=i/8*Math.PI*2,t=grp(b,'t'+i,Math.cos(a)*.6,-.3,Math.sin(a)*.6);add(t,G.strand([[0,0,0],[Math.cos(a)*.4,-.2,Math.sin(a)*.4],[Math.cos(a)*.8,-.6,Math.sin(a)*.8],[Math.cos(a)*1.0,-.75,Math.sin(a)*1.0]],.12,.01,{seg:10,rad:6}),shell2);}
   crystals(b,12,.6,.55,.6,23);height=2.5;
  }else if(id==='shell'){
   const b=grp(root,'body',0,1.75,0);add(b,G.plate(1.2,1.0,.8,.25),shellM,M(0,.2,0));add(b,G.plate(.7,.5,.6,.3),shell2,M(0,-.45,0));
   const hd=grp(b,'head',0,.9,.15);add(hd,G.plate(.4,.3,.4,.35),shellM);add(hd,G.box(.34,.04,.02),coreM,M(0,0,.21),false);
   for(const sg of [-1,1]){add(b,G.plate(.55,.4,.7,.3),shell2,M(sg*.78,.55,0,0,0,sg*.25));const arm=grp(b,sg>0?'armL':'armR',sg*.82,.3,0);add(arm,G.plate(.3,.9,.3,.3),shellM,M(0,-.5,0));add(arm,G.blade(.9,.12,.04),shell2,M(0,-.95,.1,-Math.PI/2+.2));add(arm,G.box(.02,.02,.8),glowM,M(0,-1.1,.5,.2),false);
    const leg=grp(root,sg>0?'legL':'legR',sg*.4,1.0,0);add(leg,G.plate(.36,1.0,.42,.3),shellM,M(0,-.5,0));}
   add(b,G.box(.6,.03,.02),glowM,M(0,.35,.42),false);add(b,G.box(.03,.5,.02),glowM,M(0,.0,.42),false);height=3.3;
  }else{ // core 寂蚀索引终端
   const b=grp(root,'body',0,2,0);add(b,G.oct(.6).scale(.7,2.1,.7),shellM);add(b,G.ico(.22,1),coreM,null,false);
   for(let i=0;i<3;i++){const r=grp(b,'ring'+i);add(r,G.torus(.95+i*.28,.035,6,48),i===1?voidM:glowM,M(0,0,0,Math.PI/2+i*.35,i*.6),false);}
   const orb=grp(b,'orbit');for(let i=0;i<6;i++){const a=i/6*Math.PI*2;add(orb,G.box(.16,.16,.16),shell2,M(Math.cos(a)*1.55,Math.sin(i*1.7)*.4,Math.sin(a)*1.55,a,a));}
   crystals(b,8,.3,-1.1,.8,31);height=3.6;
  }
 }
 const shadowProxy=null;root.scale.setScalar(size);
 const inst={kind:'enemy',id,root,parts,materials:mats,height:height*size,size,glowBoost:0,phase:0,lastAttack:-1,flip:false,shadowProxy,
  dispose(){for(const m of mats)m.dispose();root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});root.removeFromParent();}};
 return inst;
}
function poseEnemy(I,s,dt){
 const p=I.parts,t=s.time||0,m=clamp(s.move||0),at=s.attackT??9,ct=s.castT??9;
 const swing=smooth(.06,.16,at)*(1-smooth(.3,.6,at)),wind=smooth(0,.08,at)*(1-smooth(.08,.16,at)),cast=smooth(0,.15,ct)*(1-smooth(.5,.9,ct)),hit=clamp(s.hit||0),dead=clamp(s.dead||0);
 I.phase+=(s.distance||0)*Math.PI*2/1.2;const ph=I.phase;
 const b=p.body;if(!b)return;
 if(I.id==='crawler'){b.position.y=.32+Math.abs(Math.sin(ph))*.04*m;b.rotation.x=-.25*swing+.15*wind;for(let i=0;i<6;i++){const l=p['leg'+i];if(l){l.rotation.y=Math.sin(ph+i*1.6)*.35*m;l.rotation.z=(i<3?1:-1)*Math.max(0,Math.sin(ph+i*1.6))*.3*m;}}}
 else if(I.id==='spitter'){b.position.y=1.05+Math.sin(t*2.2)*.08;b.rotation.y=t*.8;p.ring.rotation.x=Math.sin(t*1.3)*.4;p.ring.rotation.z=t*1.5;b.scale.setScalar(1+.12*swing+.2*cast);}
 else if(I.id==='drone'){b.position.y=1.1+Math.sin(t*3)*.06;b.rotation.x=m*.3-.4*swing;for(let i=0;i<4;i++)if(p['rot'+i])p['rot'+i].rotation.y=t*30+i;}
 else if(I.id==='brute'||I.id==='shell'){
  b.position.y=(I.id==='brute'?.95:1.75)+Math.abs(Math.sin(ph))*.05*m;b.rotation.x=.08*m+.2*swing-.15*wind-.12*cast;
  const A=I.flip?p.armR:p.armL;if(at<.02&&I.lastAttack!==s.attackSerial){I.lastAttack=s.attackSerial;I.flip=!I.flip;}
  if(p.armL){p.armL.rotation.x=Math.sin(ph)*.4*m;p.armR.rotation.x=-Math.sin(ph)*.4*m;}if(A){A.rotation.x+=-2.2*wind+1.2*swing;}
  if(cast>0&&p.armL){p.armL.rotation.x-=2.4*cast;p.armR.rotation.x-=2.4*cast;}
  if(p.legL){p.legL.rotation.x=Math.sin(ph)*.5*m;p.legR.rotation.x=-Math.sin(ph)*.5*m;}
 }else if(I.id==='shade'){b.position.y=.75+Math.sin(t*2.6)*.06;b.rotation.x=.25*m+.35*swing;if(p.armL){p.armL.rotation.x=-1.4*swing+Math.sin(t*3)*.1;p.armR.rotation.x=-1.4*swing+Math.sin(t*3+1)*.1;}}
 else if(I.id==='gatekeeper'){b.position.y=1.6+Math.sin(t*1.4)*.05;p.ring.rotation.z=t*.6;p.ring.scale.setScalar(1+.15*cast);if(p.armL){p.armL.rotation.x=-2*wind+1.4*swing-1.5*cast;p.armR.rotation.x=-2*wind+1.4*swing-1.5*cast;}}
 else if(I.id==='amalgam'){b.scale.set(1+Math.sin(t*2)*.04+.12*cast,1-Math.sin(t*2)*.04-.1*swing,1+Math.sin(t*2)*.04+.12*cast);for(let i=0;i<8;i++)if(p['t'+i]){p['t'+i].rotation.z=Math.sin(t*1.8+i)*.25;p['t'+i].rotation.x=Math.cos(t*1.5+i)*.2-.5*swing;}}
 else if(I.id==='core'){b.position.y=2+Math.sin(t*1.2)*.12;b.rotation.y=t*.3;for(let i=0;i<3;i++)if(p['ring'+i])p['ring'+i].rotation.y=t*(.6+i*.4)*(i%2?-1:1);if(p.orbit)p.orbit.rotation.y=-t*.5;b.scale.setScalar(1+.15*cast);}
 if(hit>0)b.rotation.z=Math.sin(t*40)*.05*hit;else b.rotation.z=0;
 if(dead>0){const d=smooth(0,.6,dead);b.scale.multiplyScalar(1-d*.35);b.position.y*=1-d*.6;b.rotation.x+=d*.6;}
 I.glowBoost=cast;
}
function animate(I,s,dt){if(I.kind==='enemy')poseEnemy(I,s,dt);else poseHero(I,s,dt);}

// ---------- 卡面头像：用实际模型渲染半身像 ----------
// 渲染目标输出的是线性光，读回后用查找表做 ACES 色调映射与 sRGB 编码
const LUT=new Uint8Array(256).map((_,i)=>{const x=i/255*1.2,a=(x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),c=clamp(a);return Math.round(255*(c<=.0031308?c*12.92:1.055*Math.pow(c,1/2.4)-.055));});
function renderPortraits(renderer,ids,w=240,h=240){
 const out={};if(!renderer)return out;
 const scene=new T.Scene(),cam=new T.PerspectiveCamera(24,w/h,.05,20);
 scene.add(new T.HemisphereLight(0xdfe8ff,0x3a3440,1.6));const key=new T.DirectionalLight(0xfff2e0,2.6);key.position.set(-1.2,2.2,2.4);scene.add(key);
 const rim=new T.DirectionalLight(0x9fd8ff,2.4);rim.position.set(1.8,1.6,-2);scene.add(rim);
 const rt=new T.WebGLRenderTarget(w,h,{samples:4});const pixels=new Uint8Array(w*h*4),cv=document.createElement('canvas');cv.width=w;cv.height=h;const cx=cv.getContext('2d'),img=cx.createImageData(w,h);
 const prevTarget=renderer.getRenderTarget(),prevTone=renderer.toneMapping,prevClear=renderer.getClearAlpha(),prevColor=renderer.getClearColor(new T.Color());
 renderer.setClearColor(0x000000,0);
 for(const id of ids){
  const I=createHero(id);scene.add(I.root);poseHero(I,{time:.6,idleMotion:true},0);I.root.rotation.y=-.38;I.root.updateMatrixWorld(true);
  const hh=I.height;cam.position.set(.42*hh/1.75,hh*.9,1.45*hh/1.75);cam.lookAt(0,hh*.82,0);cam.updateMatrixWorld();
  renderer.setRenderTarget(rt);renderer.clear();renderer.render(scene,cam);renderer.readRenderTargetPixels(rt,0,0,w,h,pixels);
  for(let y=0;y<h;y++)for(let x=0;x<w*4;x++){const v=pixels[(h-1-y)*w*4+x];img.data[y*w*4+x]=(x&3)===3?v:LUT[v];}
  cx.putImageData(img,0,0);out[id]=cv.toDataURL('image/png');I.dispose();
 }
 renderer.setRenderTarget(prevTarget);renderer.setClearColor(prevColor,prevClear);renderer.toneMapping=prevTone;rt.dispose();
 return out;
}

global.HeroModels={SPECS,WEAPON_CLASS,createHero,createEnemy,animate,renderPortraits,toon,outlineMat,glowMat,G,M};
if(typeof module!=='undefined')module.exports=global.HeroModels;
})(globalThis);
