/* 自走棋 3D 战场：悬浮平台棋盘、备战席、城市远景与天气、泛光后期、技能特效、血条与跳字 HUD、拾取与拖拽。
   规则全部在 autochess-core.js；这里只读取单位状态并播放画面。 */
(function(global){
'use strict';
const T=global.THREE,HM=global.HeroModels,D=global.ACData;
const CELL=1.3,COLS=7,ROWS=8,BENCH_Z=ROWS/2*CELL+1.5,BENCH_STEP=1.12;
const toWorld=(gx,gy,h=0,out=new T.Vector3())=>out.set((gx-COLS/2)*CELL,h,(gy-ROWS/2)*CELL);
const benchWorld=(i,out=new T.Vector3())=>out.set((i-4)*BENCH_STEP,0,BENCH_Z);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const hex=c=>'#'+new T.Color(c).getHexString();

// 四个篇章的场景氛围：天空渐变、雾、灯光、强调色、天气
const THEMES=[
 {label:['第一幕 · 夜雨','Act I · Night Rain','第一幕・夜雨'],sky:[0x04060c,0x18223a,0x3c3550],fog:0x121a28,hemi:[0x9ab2d8,0x3a302c,.9],key:[0xffd8b4,2.5],rim:[0x5ab8ff,2.2],accent:0xff9a3a,ally:0x5fe3ff,enemy:0xff3b4e,weather:'rain',city:0x0c1119,windows:0xffb070,floor:0x1e252f},
 {label:['第二幕 · 暮色','Act II · Dusk','第二幕・黄昏'],sky:[0x100a1c,0x4a2840,0xe0915e],fog:0x3a2634,hemi:[0xffd6c0,0x40303a,.95],key:[0xffd2a0,2.6],rim:[0xff9a6a,1.8],accent:0xffc46a,ally:0x7fe8ff,enemy:0xff3b4e,weather:'motes',city:0x1c1420,windows:0xffcf7a,floor:0x2a2530},
 {label:['第三幕 · 结界层','Act III · Barrier Layer','第三幕・結界層'],sky:[0x020c14,0x0b3040,0x2a8088],fog:0x0c2630,hemi:[0x9ff0ff,0x203238,.9],key:[0xd8fff8,2.3],rim:[0x46f2e0,2.4],accent:0x46f2e0,ally:0x7fe8ff,enemy:0xff3b4e,weather:'data',city:0x081820,windows:0x46f2e0,floor:0x18262c},
 {label:['第四幕 · 赤雾','Act IV · Scarlet Mist','第四幕・紅霧'],sky:[0x0a0205,0x380a14,0xb03444],fog:0x260810,hemi:[0xffb0b0,0x301418,.85],key:[0xffc8b0,2.4],rim:[0xff4a6a,2.4],accent:0xff4a5a,ally:0x7fe8ff,enemy:0xff9a3a,weather:'embers',city:0x1a080c,windows:0xff6a5a,floor:0x2a1c22}
];

// ---------- 泛光后期 ----------
const QUAD_VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';
class Post{
 constructor(r){
  this.r=r;const hf={type:T.HalfFloatType,depthBuffer:false};
  this.main=new T.WebGLRenderTarget(4,4,{type:T.HalfFloatType,samples:4});
  this.mips=[0,1,2,3].map(()=>[new T.WebGLRenderTarget(4,4,hf),new T.WebGLRenderTarget(4,4,hf)]);
  this.cam=new T.OrthographicCamera(-1,1,1,-1,0,1);this.scene=new T.Scene();this.quad=new T.Mesh(new T.PlaneGeometry(2,2));this.quad.frustumCulled=false;this.scene.add(this.quad);
  this.bright=new T.ShaderMaterial({uniforms:{tDiffuse:{value:null},texel:{value:new T.Vector2()},threshold:{value:1.05}},vertexShader:QUAD_VS,depthTest:false,depthWrite:false,
   fragmentShader:'uniform sampler2D tDiffuse;uniform vec2 texel;uniform float threshold;varying vec2 vUv;void main(){vec3 c=(texture2D(tDiffuse,vUv+texel*vec2(-1.,-1.)).rgb+texture2D(tDiffuse,vUv+texel*vec2(1.,-1.)).rgb+texture2D(tDiffuse,vUv+texel*vec2(-1.,1.)).rgb+texture2D(tDiffuse,vUv+texel*vec2(1.,1.)).rgb)*.25;float l=max(c.r,max(c.g,c.b));float k=smoothstep(threshold,threshold+.9,l);gl_FragColor=vec4(min(c*k,vec3(24.)),1.);}'});
  this.blur=new T.ShaderMaterial({uniforms:{tDiffuse:{value:null},dir:{value:new T.Vector2()}},vertexShader:QUAD_VS,depthTest:false,depthWrite:false,
   fragmentShader:'uniform sampler2D tDiffuse;uniform vec2 dir;varying vec2 vUv;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb*.227;c+=(texture2D(tDiffuse,vUv+dir*1.385).rgb+texture2D(tDiffuse,vUv-dir*1.385).rgb)*.316;c+=(texture2D(tDiffuse,vUv+dir*3.23).rgb+texture2D(tDiffuse,vUv-dir*3.23).rgb)*.07;gl_FragColor=vec4(c,1.);}'});
  this.down=new T.ShaderMaterial({uniforms:{tDiffuse:{value:null},texel:{value:new T.Vector2()}},vertexShader:QUAD_VS,depthTest:false,depthWrite:false,
   fragmentShader:'uniform sampler2D tDiffuse;uniform vec2 texel;varying vec2 vUv;void main(){vec3 c=(texture2D(tDiffuse,vUv+texel*vec2(-1.,-1.)).rgb+texture2D(tDiffuse,vUv+texel*vec2(1.,-1.)).rgb+texture2D(tDiffuse,vUv+texel*vec2(-1.,1.)).rgb+texture2D(tDiffuse,vUv+texel*vec2(1.,1.)).rgb)*.25;gl_FragColor=vec4(c,1.);}'});
  this.comp=new T.ShaderMaterial({uniforms:{tScene:{value:null},b0:{value:null},b1:{value:null},b2:{value:null},b3:{value:null},strength:{value:.85},exposure:{value:1.05},vignette:{value:.32},time:{value:0},grade:{value:new T.Color(1,1,1)}},vertexShader:QUAD_VS,depthTest:false,depthWrite:false,
   fragmentShader:`uniform sampler2D tScene,b0,b1,b2,b3;uniform float strength,exposure,vignette,time;uniform vec3 grade;varying vec2 vUv;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+time)*43758.5453);}
void main(){vec3 c=texture2D(tScene,vUv).rgb;vec3 b=texture2D(b0,vUv).rgb*.42+texture2D(b1,vUv).rgb*.34+texture2D(b2,vUv).rgb*.26+texture2D(b3,vUv).rgb*.2;
c+=b*strength;c*=exposure*grade;c=aces(c);float d=distance(vUv,vec2(.5,.46));c*=1.-vignette*smoothstep(.35,.95,d);c=srgb(c);c+=(hash(vUv*800.)-.5)*.012;gl_FragColor=vec4(c,1.);}`});
 }
 setSize(w,h){
  this.main.setSize(w,h);let mw=Math.max(1,w>>1),mh=Math.max(1,h>>1);
  for(const [a,b] of this.mips){a.setSize(mw,mh);b.setSize(mw,mh);mw=Math.max(1,mw>>1);mh=Math.max(1,mh>>1);}
  this.w=w;this.h=h;
 }
 pass(mat,target){this.quad.material=mat;this.r.setRenderTarget(target);this.r.render(this.scene,this.cam);}
 render(scene,camera,time){
  const r=this.r;r.setRenderTarget(this.main);r.render(scene,camera);
  this.bright.uniforms.tDiffuse.value=this.main.texture;this.bright.uniforms.texel.value.set(1/this.w,1/this.h);this.pass(this.bright,this.mips[0][0]);
  for(let i=0;i<this.mips.length;i++){
   const [a,b]=this.mips[i];
   if(i>0){this.down.uniforms.tDiffuse.value=this.mips[i-1][0].texture;this.down.uniforms.texel.value.set(1/this.mips[i-1][0].width,1/this.mips[i-1][0].height);this.pass(this.down,a);}
   this.blur.uniforms.tDiffuse.value=a.texture;this.blur.uniforms.dir.value.set(1/a.width,0);this.pass(this.blur,b);
   this.blur.uniforms.tDiffuse.value=b.texture;this.blur.uniforms.dir.value.set(0,1/a.height);this.pass(this.blur,a);
  }
  const u=this.comp.uniforms;u.tScene.value=this.main.texture;u.b0.value=this.mips[0][0].texture;u.b1.value=this.mips[1][0].texture;u.b2.value=this.mips[2][0].texture;u.b3.value=this.mips[3][0].texture;u.time.value=time%10;
  this.pass(this.comp,null);
 }
}

// ---------- 通用贴图 ----------
let spriteTex=null;
function softSprite(){
 if(spriteTex)return spriteTex;const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);
 g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.85)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);
 spriteTex=new T.CanvasTexture(c);return spriteTex;
}
function gradientTex(stops,vertical=true){const c=document.createElement('canvas');c.width=vertical?4:128;c.height=vertical?128:4;const x=c.getContext('2d'),g=vertical?x.createLinearGradient(0,0,0,128):x.createLinearGradient(0,0,128,0);stops.forEach(([o,col])=>g.addColorStop(o,col));x.fillStyle=g;x.fillRect(0,0,c.width,c.height);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
const addMat=(color,opacity=1,extra={})=>new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(extra.boost??1),transparent:true,opacity,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false,...(({boost,...r})=>r)(extra)});

// ---------- 渲染器 ----------
const R={active:false,failed:false,portraits:{},THEMES,CELL,COLS,ROWS};
let renderer,scene,camera,post,hud,hctx,container,stageWrap;
let hemi,key,rim,castLights=[],sky,env,board,gridMat,benchGroup,weather,themeIdx=-1,quality='';
let W=1,H=1,dpr=1,time=0,shake=0,camBase=new T.Vector3(),camTarget=new T.Vector3(),fieldK=0,zoomK=0;
const actors=new Map(),fx=[],texts=[],projs=new Map(),proxies=[];
const ray=new T.Raycaster(),groundPlane=new T.Plane(new T.Vector3(0,1,0),-.06),tmpV=new T.Vector3(),tmpV2=new T.Vector3(),ndc=new T.Vector2();
const ui={hoverKey:null,dragKey:null,dragPoint:null,hoverCell:null,deploy:false,insets:{left:0,right:0,top:0,bottom:0}};

R.init=function(el){
 if(renderer)return true;if(R.failed||!T||!HM)return false;
 try{
  container=el;stageWrap=document.createElement('div');stageWrap.className='ac-gl';el.prepend(stageWrap);
  renderer=new T.WebGLRenderer({antialias:false,powerPreference:'high-performance',alpha:false});
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  stageWrap.append(renderer.domElement);renderer.domElement.className='ac-gl-canvas';
  hud=document.createElement('canvas');hud.className='ac-hud-canvas';stageWrap.append(hud);hctx=hud.getContext('2d');
  scene=new T.Scene();scene.fog=new T.Fog(0x121a28,30,95);
  camera=new T.PerspectiveCamera(30,1,.1,400);
  hemi=new T.HemisphereLight(0xffffff,0x333333,1);scene.add(hemi);
  key=new T.DirectionalLight(0xffffff,2.4);key.position.set(-7,14,8);key.castShadow=true;key.shadow.bias=-.0004;key.shadow.normalBias=.035;
  Object.assign(key.shadow.camera,{left:-8,right:8,top:9,bottom:-9,near:1,far:45});key.shadow.mapSize.set(2048,2048);scene.add(key);scene.add(key.target);
  rim=new T.DirectionalLight(0x5ab8ff,2);rim.position.set(6,6,-10);scene.add(rim);
  castLights=[0,1,2].map(()=>{const l=new T.PointLight(0xffffff,0,7,2);scene.add(l);return l;});
  post=new Post(renderer);
  buildBoard();
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();R.failed=true;R.active=false;});
  try{R.portraits=HM.renderPortraits(renderer,Object.keys(D.UNITS));}catch(err){console.warn('portrait render failed',err);}
  new ResizeObserver(()=>R.resize()).observe(el);R.resize();R.active=true;return true;
 }catch(err){console.warn('3D 战场初始化失败',err);R.failed=true;return false;}
};
R.setInsets=function(ins){Object.assign(ui.insets,ins);R.resize(true);};
R.resize=function(force){
 if(!renderer)return;const rect=container.getBoundingClientRect();if(rect.width<2||rect.height<2)return;
 const q=(global.presentationSettings&&presentationSettings.quality)||'high';
 const want=Math.min(global.devicePixelRatio||1,q==='high'?1.75:q==='balanced'?1.25:1);
 if(!force&&rect.width===W&&rect.height===H&&want===dpr&&q===quality)return;
 W=rect.width;H=rect.height;dpr=want;
 if(q!==quality){quality=q;renderer.shadowMap.enabled=q!=='low';key.shadow.mapSize.setScalar(q==='high'?2048:1024);key.shadow.map?.dispose();key.shadow.map=null;scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});}
 renderer.setPixelRatio(dpr);renderer.setSize(W,H,false);post.setSize(Math.round(W*dpr),Math.round(H*dpr));
 hud.width=Math.round(W*dpr);hud.height=Math.round(H*dpr);
 fitCamera();
};
// 让棋盘与备战席落在左右面板与底部商店之间的可用区域内
function fitCamera(){
 const ins=ui.insets,aw=Math.max(200,W-ins.left-ins.right),ah=Math.max(200,H-ins.top-ins.bottom);
 camera.aspect=aw/ah;camera.fov=30;camera.clearViewOffset();camera.updateProjectionMatrix();
 const pitch=.84,dir=new T.Vector3(0,Math.sin(pitch),Math.cos(pitch)),target=new T.Vector3(0,0,.95);
 const pts=[toWorld(-.15,-.4,0),toWorld(COLS+.15,-.4,0),toWorld(-.15,-.2,2.4),toWorld(COLS+.15,-.2,2.4),toWorld(-.2,ROWS,0),toWorld(COLS+.2,ROWS,0),new T.Vector3(-5.2,0,BENCH_Z+.6),new T.Vector3(5.2,0,BENCH_Z+.6),new T.Vector3(-5.2,1.4,BENCH_Z)];
 let lo=6,hi=60;
 for(let i=0;i<28;i++){const d=(lo+hi)/2;camera.position.copy(target).addScaledVector(dir,d);camera.lookAt(target);camera.updateMatrixWorld();
  let ok=true;for(const p of pts){tmpV.copy(p).project(camera);if(Math.abs(tmpV.x)>.96||tmpV.y>.94||tmpV.y<-.97){ok=false;break;}}if(ok)hi=d;else lo=d;}
 camera.position.copy(target).addScaledVector(dir,hi);camera.lookAt(target);camBase.copy(camera.position);camTarget.copy(target);
 camera.setViewOffset(aw,ah,-ins.left,-ins.top,W,H);camera.updateProjectionMatrix();
}

// ---------- 棋盘、备战席与场景 ----------
function buildBoard(){
 board=new T.Group();scene.add(board);
 const bw=COLS*CELL,bd=ROWS*CELL,metal=new T.MeshStandardMaterial({color:0x1b2129,roughness:.55,metalness:.55});
 // 平台主体与斜切边
 const base=new T.Mesh(new T.BoxGeometry(bw+1.6,.9,bd+1.4),metal);base.position.y=-.47;base.receiveShadow=true;board.add(base);
 const lip=new T.Mesh(new T.BoxGeometry(bw+2.2,.25,bd+2),new T.MeshStandardMaterial({color:0x12161c,roughness:.6,metalness:.6}));lip.position.y=-.95;board.add(lip);
 const under=new T.Mesh(new T.CylinderGeometry(4.5,2.2,40,8,1,true),new T.MeshStandardMaterial({color:0x0e1218,roughness:.8,metalness:.4}));under.position.y=-21;board.add(under);
 // 地砖（实例化）
 const tileGeo=new T.BoxGeometry(CELL*.95,.1,CELL*.95),tileMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.62,metalness:.35});
 const tiles=new T.InstancedMesh(tileGeo,tileMat,COLS*ROWS);let k=0;const m4=new T.Matrix4();
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){m4.makeTranslation(...toWorld(x+.5,y+.5,-.05).toArray());tiles.setMatrixAt(k,m4);
  const player=y>=ROWS/2,c=new T.Color(player?((x+y)%2?0x2b3440:0x313b48):((x+y)%2?0x33282f:0x3a2d35));tiles.setColorAt(k++,c);}
 tiles.receiveShadow=true;board.add(tiles);R.tiles=tiles;
 // 战术网格（着色器叠加层）
 gridMat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
  uniforms:{uTime:{value:0},uDrag:{value:0},uField:{value:0},uHover:{value:new T.Vector2(-9,-9)},cAlly:{value:new T.Color(0x5fe3ff)},cEnemy:{value:new T.Color(0xff3b4e)},cAccent:{value:new T.Color(0xffd23a)}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec2 vUv;uniform float uTime,uDrag,uField;uniform vec2 uHover;uniform vec3 cAlly,cEnemy,cAccent;
void main(){vec2 g=vec2(vUv.x*${COLS}.0,(1.0-vUv.y)*${ROWS}.0);vec2 f=fract(g),id=floor(g);
float e=min(min(f.x,1.-f.x),min(f.y,1.-f.y));float line=1.-smoothstep(0.,.03,e);
vec2 c=abs(f-.5);float cross=(1.-smoothstep(0.,.014,min(c.x,c.y)))*step(max(c.x,c.y),.075);
float corner=step(e,.06)*step(.36,max(c.x,c.y))*step(abs(c.x-c.y),.14);
bool player=id.y>=${ROWS/2}.0;vec3 col=player?cAlly:cEnemy;
float a=line*(.12+.14*uField)+cross*.3+corner*.32;
if(player)a+=uDrag*(.08+.12*(1.-smoothstep(0.,.5,e)));
if(abs(id.x-uHover.x)<.5&&abs(id.y-uHover.y)<.5){a+=.6*(1.-smoothstep(.0,.48,e))+.25;col=mix(col,cAccent,.85);}
float s=fract(uTime*.11);float scan=exp(-pow(((1.-vUv.y)-s)*26.,2.))*(.1+.06*uField);a+=scan;
float dv=1.-smoothstep(0.,.035,abs(g.y-${ROWS/2}.0));float dash=step(.45,fract(g.x*3.));a+=dv*dash*.9;col=mix(col,cAccent,dv);
gl_FragColor=vec4(col*a*.85,1.);}`});
 const grid=new T.Mesh(new T.PlaneGeometry(bw,bd),gridMat);grid.rotation.x=-Math.PI/2;grid.position.y=.012;grid.renderOrder=2;board.add(grid);
 // 边框发光线与 L 形角标
 const edgeMat=addMat(0xffffff,.8,{boost:.7});R.edgeMat=edgeMat;
 for(const [w,d,x,z] of [[bw+.3,.05,0,-bd/2-.15],[bw+.3,.05,0,bd/2+.15],[.05,bd+.3,-bw/2-.15,0],[.05,bd+.3,bw/2+.15,0]]){const e=new T.Mesh(new T.BoxGeometry(w,.03,d),edgeMat);e.position.set(x,.02,z);board.add(e);}
 const cornerMat=addMat(0xffd23a,1,{boost:1.25});R.cornerMat=cornerMat;
 for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const cx=sx*(bw/2+.45),cz=sz*(bd/2+.42);
  const a=new T.Mesh(new T.BoxGeometry(1.1,.04,.08),cornerMat);a.position.set(cx-sx*.51,.03,cz);board.add(a);
  const b=new T.Mesh(new T.BoxGeometry(.08,.04,.9),cornerMat);b.position.set(cx,.03,cz-sz*.41);board.add(b);}
 // 角柱与信标
 const pylonMat=new T.MeshStandardMaterial({color:0x252c35,roughness:.5,metalness:.7});R.beaconMat=addMat(0xff9a3a,1,{boost:1.8});
 for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const p=new T.Group();p.position.set(sx*(bw/2+.9),0,sz*(bd/2+.75));
  const col=new T.Mesh(new T.BoxGeometry(.32,1.6,.32),pylonMat);col.position.y=.3;col.castShadow=true;p.add(col);
  const cap=new T.Mesh(new T.BoxGeometry(.4,.08,.4),R.beaconMat);cap.position.y=1.12;p.add(cap);
  const strip=new T.Mesh(new T.BoxGeometry(.03,1.1,.33),R.beaconMat);strip.position.set(sx*-.17,.3,0);p.add(strip);board.add(p);}
 // 备战席：九个六边形底座
 benchGroup=new T.Group();board.add(benchGroup);R.benchPads=[];
 const padTop=new T.MeshStandardMaterial({color:0x232a33,roughness:.5,metalness:.6});
 for(let i=0;i<9;i++){const g=new T.Group();benchWorld(i,g.position);
  const pad=new T.Mesh(new T.CylinderGeometry(.5,.56,.14,6),padTop);pad.position.y=-.02;pad.receiveShadow=true;g.add(pad);
  const ring=new T.Mesh(new T.RingGeometry(.44,.48,6),addMat(0x5fe3ff,.55,{boost:.9}));ring.rotation.x=-Math.PI/2;ring.rotation.z=Math.PI/6;ring.position.y=.06;g.add(ring);
  g.userData.ring=ring;benchGroup.add(g);R.benchPads.push(g);}
 const benchBar=new T.Mesh(new T.BoxGeometry(9*BENCH_STEP+.4,.2,1.3),metal);benchBar.position.set(0,-.18,BENCH_Z);benchBar.receiveShadow=true;board.add(benchBar);
 // 天空
 sky=new T.Mesh(new T.SphereGeometry(200,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,
  uniforms:{c0:{value:new T.Color()},c1:{value:new T.Color()},c2:{value:new T.Color()},sun:{value:new T.Vector3(-.3,.25,-1).normalize()},sunC:{value:new T.Color()}},
  vertexShader:'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec3 vDir;uniform vec3 c0,c1,c2,sun,sunC;float h(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
void main(){float y=vDir.y;vec3 c=y>0.?mix(c1,c0,pow(clamp(y*1.6,0.,1.),.7)):mix(c1,c2*.35,clamp(-y*3.,0.,1.));
c=mix(c,c2,exp(-abs(y-.02)*9.)*.85);float s=max(dot(vDir,sun),0.);c+=sunC*(pow(s,40.)*2.+pow(s,6.)*.25);
vec3 q=floor(vDir*260.);float st=step(.9965,h(q))*smoothstep(.05,.5,y);c+=vec3(st)*.9;gl_FragColor=vec4(c,1.);}`}));
 scene.add(sky);
}
function buildEnvironment(th,stage){
 if(env){env.traverse(o=>{o.geometry?.dispose();if(o.material&&o.material!==gridMat)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});env.removeFromParent();}
 env=new T.Group();scene.add(env);const rnd=(()=>{let s=1000+stage*97;return()=>(s=s*16807%2147483647)/2147483647;})();
 // 远景城市：高楼剪影与发光窗带
 const n=170,blocks=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:th.city,roughness:.9,metalness:.2}),n);
 const winN=420,wins=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:new T.Color(th.windows).multiplyScalar(1.6),toneMapped:false,fog:true}),winN);
 const m=new T.Matrix4(),q=new T.Quaternion(),s=new T.Vector3(),p=new T.Vector3();let wi=0;
 for(let i=0;i<n;i++){
  const a=-Math.PI*1.05+rnd()*Math.PI*1.1+(i%2?Math.PI*.0:0),r=26+rnd()*70,w=2+rnd()*5,d=2+rnd()*5,h=6+rnd()*rnd()*44,y=-34+rnd()*14+h/2;
  p.set(Math.cos(a)*r,y,Math.sin(a)*r-6);if(p.z>14&&Math.abs(p.x)<30)p.z=-p.z;q.setFromEuler(new T.Euler((rnd()-.5)*.05,rnd()*3,(rnd()-.5)*(i%7===0?.4:.04)));s.set(w,h,d);
  m.compose(p,q,s);blocks.setMatrixAt(i,m);
  for(let k=0;k<3&&wi<winN;k++){const wy=y-h/2+rnd()*h;const off=new T.Vector3((rnd()-.5)*w,0,d/2+.03).applyQuaternion(q);
   m.compose(new T.Vector3(p.x+off.x,wy,p.z+off.z),q,new T.Vector3(w*(.3+rnd()*.6),.18+rnd()*.25,.05));wins.setMatrixAt(wi++,m);}
 }
 wins.count=wi;env.add(blocks,wins);
 // 浮空碎块
 const debrisMat=new T.MeshStandardMaterial({color:0x1d222a,roughness:.7,metalness:.4});R.debris=[];
 for(let i=0;i<14;i++){const g=new T.Mesh(new T.DodecahedronGeometry(.2+rnd()*.45,0),debrisMat);const a=-Math.PI*(.1+rnd()*.8),r=12+rnd()*10;g.position.set(Math.cos(a)*r,-3+rnd()*6,Math.sin(a)*r-2);g.userData.spin=(rnd()-.5)*.4;g.userData.bob=rnd()*6;env.add(g);R.debris.push(g);}
 // 体积光柱
 const shaftTex=gradientTex([[0,'rgba(255,255,255,0)'],[.35,'rgba(255,255,255,.55)'],[1,'rgba(255,255,255,0)']],false);R.shafts=[];
 for(let i=0;i<5;i++){const sh=new T.Mesh(new T.PlaneGeometry(3+rnd()*3,40),new T.MeshBasicMaterial({map:shaftTex,color:new T.Color(th.rim[0]).multiplyScalar(.16),transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}));
  sh.position.set(-24+i*12+rnd()*4,6,-30-rnd()*15);sh.rotation.z=.35;env.add(sh);R.shafts.push(sh);}
 // 天气粒子
 weather=null;const box={x:22,y:16,z:22};
 if(th.weather==='rain'){
  const N=1400,pos=new Float32Array(N*6);for(let i=0;i<N;i++){const x=(rnd()-.5)*box.x*2,y=rnd()*box.y,z=(rnd()-.5)*box.z*2-4;pos.set([x,y,z,x-.05,y-.55,z],i*6);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));
  weather=new T.LineSegments(g,new T.LineBasicMaterial({color:new T.Color(0x9fc4e8).multiplyScalar(.7),transparent:true,opacity:.22,depthWrite:false}));weather.userData={type:'rain',N,box};
 }else{
  const N=th.weather==='data'?260:200,pos=new Float32Array(N*3),seed=new Float32Array(N);for(let i=0;i<N;i++){pos.set([(rnd()-.5)*box.x*1.4,rnd()*box.y*.7,(rnd()-.5)*box.z*1.2-2],i*3);seed[i]=rnd()*10;}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));
  const col=th.weather==='embers'?0xff7a3a:th.weather==='data'?0x46f2e0:0xffe0a0;
  weather=new T.Points(g,new T.PointsMaterial({map:softSprite(),color:new T.Color(col).multiplyScalar(2),size:th.weather==='data'?.09:.12,transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));weather.userData={type:th.weather,N,seed,box};
 }
 env.add(weather);
}
R.setStage=function(stage){
 if(!renderer)return;const th=THEMES[Math.min(3,Math.floor(stage/5))],idx=stage;if(themeIdx===idx)return;themeIdx=idx;R.theme=th;
 scene.fog.color.set(th.fog);scene.fog.near=34;scene.fog.far=110;scene.background=null;
 sky.material.uniforms.c0.value.set(th.sky[0]);sky.material.uniforms.c1.value.set(th.sky[1]);sky.material.uniforms.c2.value.set(th.sky[2]);sky.material.uniforms.sunC.value.set(th.sky[2]).multiplyScalar(.6);
 hemi.color.set(th.hemi[0]);hemi.groundColor.set(th.hemi[1]);hemi.intensity=th.hemi[2];key.color.set(th.key[0]);key.intensity=th.key[1];rim.color.set(th.rim[0]);rim.intensity=th.rim[1];
 gridMat.uniforms.cAlly.value.set(th.ally);gridMat.uniforms.cEnemy.value.set(th.enemy);R.beaconMat.color.set(th.accent).multiplyScalar(1.8);
 const defense=!!D.ENCOUNTERS[stage]?.waves;R.edgeMat.color.set(defense?0xff8a5a:0xcfe9ff).multiplyScalar(.7);
 buildEnvironment(th,stage);
};

// 护盾：菲涅尔边缘发光 + 六边形能量纹
function shieldMaterial(color){return new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,uniforms:{color:{value:new T.Color(color)},opacity:{value:0},time:{value:0}},
 vertexShader:'varying vec3 vN,vV,vP;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vP=position;gl_Position=projectionMatrix*mv;}',
 fragmentShader:'uniform vec3 color;uniform float opacity,time;varying vec3 vN,vV,vP;void main(){float f=pow(1.0-abs(dot(vN,vV)),2.4);vec2 h=vec2(atan(vP.z,vP.x)*3.0,vP.y*9.0);vec2 g=abs(fract(h+vec2(0.0,time*.4))-.5);float hex=smoothstep(.44,.5,max(g.x,g.y));float a=(f*1.3+hex*.18*f+.03)*opacity;gl_FragColor=vec4(color*a*1.6,1.0);}'});}

// ---------- 角色（演员） ----------
const TEAM_RING={0:0x5fe3ff,1:0xff3b4e};
function makeActor(key,spec){
 // spec: {kind:'display'|'preview'|'combat', id, star, team, enemyType, unit}
 const def=spec.enemyType?D.ENEMIES[spec.id]:D.UNITS[spec.id];
 let inst;
 if(spec.enemyType)inst=HM.createEnemy(spec.id,{mimicOf:['ember','knight','warden','frost'][(spec.serial||0)%4]});
 else inst=HM.createHero(spec.id);
 if(quality==='low')inst.root.traverse(o=>{if(o.material&&o.material.side===T.BackSide)o.visible=false;});
 const g=new T.Group();g.add(inst.root);scene.add(g);
 const starScale=spec.enemyType?1.06:[1,1.12,1.2,1.3][spec.star||1];inst.root.scale.multiplyScalar(starScale);
 // 脚下阵营圈
 const r=spec.enemyType?(def.boss?1.05:.45*(def.size||1)):.46;
 const ringMat=addMat(spec.team===0?TEAM_RING[0]:TEAM_RING[1],.85,{boost:1.1});
 const ring=new T.Mesh(new T.RingGeometry(r*.86,r,48),ringMat);ring.rotation.x=-Math.PI/2;ring.position.y=.03;g.add(ring);
 const disc=new T.Mesh(new T.CircleGeometry(r*.86,40),new T.MeshBasicMaterial({color:spec.team===0?0x0a2a34:0x340a12,transparent:true,opacity:.35,depthWrite:false}));disc.rotation.x=-Math.PI/2;disc.position.y=.025;g.add(disc);
 // 星级光环
 let starRing=null;if(!spec.enemyType&&spec.star>1){starRing=new T.Mesh(new T.RingGeometry(r*1.05,r*1.13,6),addMat(D.STAR_COLORS[spec.star],.9,{boost:2.2}));starRing.rotation.x=-Math.PI/2;starRing.position.y=.035;g.add(starRing);}
 // 护盾泡
 const bubble=new T.Mesh(new T.SphereGeometry(.62,28,18),shieldMaterial(spec.team===0?0x8fe6ff:0xff7a8a));
 bubble.scale.set(1,inst.height/1.2,1);bubble.position.y=inst.height*.5;g.add(bubble);
 // 眩晕标记
 const stun=new T.Group();for(let i=0;i<3;i++){const s=new T.Mesh(new T.OctahedronGeometry(.06,0),addMat(0xffe26a,1,{boost:2.5}));s.position.set(Math.cos(i*2.1)*.22,0,Math.sin(i*2.1)*.22);stun.add(s);}stun.position.y=inst.height+.12;stun.visible=false;g.add(stun);
 // 拾取代理
 const proxy=new T.Mesh(new T.CylinderGeometry(r*1.05,r*1.05,inst.height,8),new T.MeshBasicMaterial());proxy.position.y=inst.height/2;proxy.visible=false;g.add(proxy);proxy.userData.key=key;proxies.push(proxy);
 const a={key,...spec,def,inst,group:g,ring,disc,starRing,bubble,stun,proxy,pos:new T.Vector3(),angle:spec.team===0?Math.PI:0,spawnT:0,deadT:-1,lastAttackT:9,serial:0,victory:0,hover:0,removed:false,lastDist:0};
 actors.set(key,a);return a;
}
function removeActor(key){
 const a=actors.get(key);if(!a)return;a.inst.dispose();a.group.traverse(o=>{if(o!==a.inst.root&&o.geometry)o.geometry.dispose();if(o.material&&!a.inst.materials.includes(o.material))o.material.dispose?.();});a.group.removeFromParent();
 const i=proxies.indexOf(a.proxy);if(i>=0)proxies.splice(i,1);actors.delete(key);
}
R.clearActors=function(filter=()=>true){for(const [k,a] of [...actors])if(filter(a))removeActor(k);};

// 备战阶段：同步棋盘/备战席上的单位与敌方预览
R.syncPlanning=function(state,encounter,show=true){
 if(!renderer)return;const seen=new Set();
 const place=(u,pos,bench)=>{const key='u'+u.uid;seen.add(key);let a=actors.get(key);
  if(a&&(a.star!==u.star)){removeActor(key);a=null;}
  if(!a){a=makeActor(key,{kind:'display',id:u.id,star:u.star,team:0,uid:u.uid});a.pos.copy(pos);a.spawnT=0;}
  a.home=pos.clone();a.bench=bench;a.visible=show||bench;};
 state.bench.forEach((u,i)=>{if(u)place(u,benchWorld(i,new T.Vector3()),true);});
 for(const {x,y,unit} of state.boardUnits())place(unit,toWorld(x+.5,y+.5),false);
 const first=encounter?(encounter.waves?encounter.waves[0]:encounter.enemies):[];
 first.forEach(([id,c,r],i)=>{const key='p'+i+id;seen.add(key);let a=actors.get(key);if(!a){a=makeActor(key,{kind:'preview',id,team:1,enemyType:true,serial:i});a.pos.copy(toWorld(c+.5,r+.5));}a.home=toWorld(c+.5,r+.5);a.visible=show;});
 for(const [k,a] of [...actors])if((a.kind==='display'||a.kind==='preview')&&!seen.has(k))removeActor(k);
};
R.setDisplayVisible=function(boardVisible){for(const a of actors.values()){if(a.kind==='display'&&!a.bench)a.visible=boardVisible;if(a.kind==='preview')a.visible=boardVisible;}};
R.beginCombat=function(){
 R.clearActors(a=>a.kind==='combat'||a.kind==='preview');for(const a of actors.values())if(a.kind==='display'&&!a.bench)a.visible=false;
 clearFx();
};
R.endCombat=function(){R.clearActors(a=>a.kind==='combat');clearFx();for(const a of actors.values())if(a.kind==='display')a.visible=true;};
R.setVictory=function(team){for(const a of actors.values())if(a.kind==='combat'&&a.team===team&&a.unit?.alive)a.victoryOn=true;};

// ---------- 战斗事件 ----------
R.onBattleEvent=function(type,d){
 if(!renderer)return;
 if(type==='spawn'){const u=d.u,key='c'+u.serial,a=makeActor(key,{kind:'combat',id:u.id,star:u.star,team:u.team,enemyType:u.enemyType,unit:u,serial:u.serial});u._actor=key;toWorld(u.gpos.x,u.gpos.y,0,a.pos);a.spawnT=u.team===1?0:.4;}
 else if(type==='fx')spawnFx(d);
 else if(type==='projectile')spawnProjectile(d.p);
 else if(type==='damage'){
  const t=d.tgt,crit=d.crit,skill=d.kind==='skill';let col=t.team===1?(crit?'#ffe24a':skill?'#7fe6ff':'#ffffff'):'#ff6b78';
  addText(t,String(Math.round(d.raw))+(crit?'!':''),col,crit?30:skill?24:t.team===1?19:17,crit||skill);
  if(d.absorbed>0&&t.team===0)addText(t,'-'+Math.round(d.absorbed),'#9fe6ff',14,false,.5);
  spawnFx({kind:'burst',at:t.gpos,lift:Math.min(1.1,(actors.get(t._actor)?.inst.height||1.6)*.6),color:t.team===1?0xffd6a0:0xff6070,count:crit?12:6,speed:crit?3:2,size:.05,life:.35});
 }
 else if(type==='heal')addText(d.tgt,'+'+Math.round(d.amount),'#8dffc0',20,true);
 else if(type==='shield')addText(d.u,'盾 +'+Math.round(d.amount),'#9fe6ff',16,false);
 else if(type==='kill'){const a=actors.get(d.u._actor);if(a){a.deadT=0;spawnFx({kind:'burst',at:d.u.gpos,lift:.8,color:d.u.team===1?0xff3b4e:0xcfe9ff,count:d.u.boss?60:22,speed:d.u.boss?5:3.2,size:.07,life:d.u.boss?1.2:.8,up:1.2});spawnFx({kind:'ring',at:d.u.gpos,lift:.05,color:d.u.team===1?0xff3b4e:0xcfe9ff,r0:.2,r1:d.u.boss?3.4:1.2,life:.6,width:.08});}shake=Math.max(shake,d.u.boss?.5:.12);}
 else if(type==='shake')shake=Math.max(shake,d.v*.02);
 else if(type==='cast'){const u=d.u,a=actors.get(u._actor);if(a){a.castFlash=1;const nm=skillName(u);if(nm)addText(u,nm,u.team===0?'#ffffff':'#ff9aa8',20,true,1.2,true);}}
 else if(type==='blink'){const a=actors.get(d.u._actor);if(a){toWorld(d.u.gpos.x,d.u.gpos.y,0,a.pos);}}
 else if(type==='stun'){addText(d.u,d.fx==='frost'?'冻结':'眩晕','#cfe9ff',15,false,.8);}
 else if(type==='wave'){for(const a of actors.values())if(a.kind==='combat'&&a.team===1&&a.spawnT<.05)spawnFx({kind:'pillar',at:a.unit.gpos,color:0xff3b4e,radius:.5,life:.7});}
};
function skillName(u){return R.skillName?R.skillName(u):'';}

// ---------- 特效 ----------
function clearFx(){for(const f of fx)f.dispose();fx.length=0;for(const p of projs.values())p.dispose();projs.clear();texts.length=0;}
function spawnFx(d){
 if(!renderer||(global.presentationSettings&&presentationSettings.effects===false&&d.kind!=='ring'))return;
 const col=new T.Color(d.color??0xffffff),life=d.life??.5;let obj,update;
 const at=d.at?toWorld(d.at.x,d.at.y,d.lift??0):null;
 if(d.kind==='ring'){
  const filled=!!d.filled,g=new T.Group(),ringMat=addMat(col,1,{boost:2.2}),ring=new T.Mesh(new T.RingGeometry(.92,1,64),ringMat);ring.rotation.x=-Math.PI/2;g.add(ring);
  let fill=null;if(filled){fill=new T.Mesh(new T.CircleGeometry(1,48),addMat(col,.25,{boost:1.2}));fill.rotation.x=-Math.PI/2;g.add(fill);}
  g.position.copy(at);obj=g;update=t=>{const e=1-Math.pow(1-t,3),r=lerp(d.r0??.1,d.r1??1,e);g.scale.setScalar(r);ringMat.opacity=1-t;if(fill)fill.material.opacity=.25*(1-t);};
 }else if(d.kind==='burst'){
  const n=d.count??10,pos=new Float32Array(n*3),vel=[];for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,e=(Math.random()-.2)*1.2,sp=(d.speed??2)*(.35+Math.random()*.65);vel.push(new T.Vector3(Math.cos(a)*Math.cos(e)*sp,Math.sin(e)*sp+(d.up??.5),Math.sin(a)*Math.cos(e)*sp));}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));const m=new T.PointsMaterial({map:softSprite(),color:col.clone().multiplyScalar(2.6),size:(d.size??.05)*3.2,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
  obj=new T.Points(g,m);obj.position.copy(at);const P=[...Array(n)].map(()=>new T.Vector3());
  update=(t,dt)=>{for(let i=0;i<n;i++){vel[i].y-=6*dt;vel[i].multiplyScalar(1-2.2*dt);P[i].addScaledVector(vel[i],dt);pos.set([P[i].x,P[i].y,P[i].z],i*3);}g.attributes.position.needsUpdate=true;m.opacity=1-t*t;m.size=(d.size??.05)*3.2*(1-t*.5);};
 }else if(d.kind==='slash'){
  const g=new T.Group(),m=addMat(col,1,{boost:2.8}),arc=new T.Mesh(new T.RingGeometry(.62,1,32,1,0,Math.PI*1.1),m);g.add(arc);
  const core=new T.Mesh(new T.RingGeometry(.9,.96,32,1,0,Math.PI*1.1),addMat(0xffffff,1,{boost:3}));g.add(core);
  g.position.copy(at);const ang=d.angle??0;g.rotation.set(-.9,-(ang)+Math.PI/2,.3);const R0=(d.radius??.5);
  obj=g;update=t=>{const sw=Math.min(1,t*3.2);g.scale.setScalar(R0*(.8+sw*.4));arc.rotation.z=-sw*1.4;core.rotation.z=arc.rotation.z;m.opacity=1-t;core.material.opacity=(1-t)*.9;};
 }else if(d.kind==='beam'){
  const a=toWorld(d.from[0],d.from[1],d.from[2]),b=toWorld(d.to[0],d.to[1],d.to[2]),len=a.distanceTo(b)||.01,g=new T.Group();
  const outer=new T.Mesh(new T.CylinderGeometry(1,1,1,10,1,true),addMat(col,.8,{boost:2.4})),inner=new T.Mesh(new T.CylinderGeometry(1,1,1,8,1,true),addMat(0xffffff,1,{boost:3}));g.add(outer,inner);
  g.position.copy(a).add(b).multiplyScalar(.5);g.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),tmpV.copy(b).sub(a).normalize());const w=d.width??.1;
  obj=g;update=t=>{const k=1-t;outer.scale.set(w*k,len,w*k);inner.scale.set(w*.32*k,len,w*.32*k);outer.material.opacity=.8*k;inner.material.opacity=k;};
 }else if(d.kind==='telegraph'){
  const g=new T.Group(),fill=new T.Mesh(new T.CircleGeometry(1,48),addMat(col,.18,{boost:1})),ring=new T.Mesh(new T.RingGeometry(.95,1,64),addMat(col,.9,{boost:2})),grow=new T.Mesh(new T.RingGeometry(.9,1,64),addMat(col,.9,{boost:2.4}));
  [fill,ring,grow].forEach(o=>{o.rotation.x=-Math.PI/2;g.add(o);});g.position.copy(at).setY(.04);g.scale.setScalar(d.radius??1);
  obj=g;update=t=>{if(d.follow&&d.follow.alive)toWorld(d.follow.gpos.x,d.follow.gpos.y,.04,g.position);grow.scale.setScalar(Math.max(.01,t));fill.material.opacity=.12+.2*t;ring.material.opacity=.9*(1-t*.3);};
 }else if(d.kind==='pillar'){
  const tex=gradientTex([[0,'rgba(255,255,255,0)'],[.25,'rgba(255,255,255,.8)'],[1,'rgba(255,255,255,1)']]),m=new T.MeshBasicMaterial({map:tex,color:col.clone().multiplyScalar(2.2),transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false});
  obj=new T.Mesh(new T.CylinderGeometry(1,1,1,24,1,true),m);obj.position.copy(at).setY(0);const r0=d.radius??.6;
  update=t=>{const h=lerp(.5,3.2,Math.min(1,t*2.5));obj.scale.set(r0*(1-t*.4),h,r0*(1-t*.4));obj.position.y=h/2;m.opacity=1-t;};
 }else return;
 scene.add(obj);fx.push({t:0,life,update,dispose(){obj.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});obj.removeFromParent();}});
}
function spawnProjectile(p){
 const col=new T.Color(p.color??0xffffff),g=new T.Group();
 const head=new T.Mesh(new T.SphereGeometry(1,10,8),addMat(col,1,{boost:3}));head.scale.setScalar((p.size||.05)*1.4);g.add(head);
 const glow=new T.Sprite(new T.SpriteMaterial({map:softSprite(),color:col.clone().multiplyScalar(2.2),transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));glow.scale.setScalar((p.size||.05)*9);g.add(glow);
 const N=10,trailPos=new Float32Array(N*3),tg=new T.BufferGeometry();tg.setAttribute('position',new T.BufferAttribute(trailPos,3));
 const trail=new T.Line(tg,new T.LineBasicMaterial({color:col.clone().multiplyScalar(2),transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));
 scene.add(g,trail);const hist=[];
 projs.set(p,{p,g,trail,hist,update(){const arc=Math.sin(p.k*Math.PI)*(p.arc||0)*2.2;toWorld(p.pos.x,p.pos.y,(p.lift??1)*1.05+arc,g.position);hist.unshift(g.position.clone());if(hist.length>N)hist.pop();for(let i=0;i<N;i++){const h=hist[Math.min(i,hist.length-1)];trailPos.set([h.x,h.y,h.z],i*3);}tg.attributes.position.needsUpdate=true;},
  dispose(){[g,trail].forEach(o=>o.traverse(x=>{x.geometry?.dispose();x.material?.dispose();}));g.removeFromParent();trail.removeFromParent();}});
}
function addText(u,text,color,size,big=false,life=.85,label=false){
 if(!u)return;const a=actors.get(u._actor);const h=a?a.inst.height:1.6;
 texts.push({x:u.gpos.x,y:u.gpos.y,h:h*(label?1.15:.85),text,color,size,big,t:0,life,vx:(Math.random()-.5)*30,label});
 if(texts.length>80)texts.shift();
}
R.placeFx=function(cell,bench){spawnFx({kind:'ring',at:bench!=null?{x:(bench-4)*BENCH_STEP/CELL+COLS/2,y:BENCH_Z/CELL+ROWS/2}:{x:cell.x+.5,y:cell.y+.5},lift:.05,color:0xffd23a,r0:.1,r1:.7,life:.35,width:.06});};
R.mergeFx=function(uid){const a=actors.get('u'+uid);if(!a)return;const gx=a.pos.x/CELL+COLS/2,gy=a.pos.z/CELL+ROWS/2;spawnFx({kind:'pillar',at:{x:gx,y:gy},color:0xffd23a,radius:.55,life:.8});spawnFx({kind:'ring',at:{x:gx,y:gy},lift:.05,color:0xffe26a,r0:.2,r1:1.4,life:.6,width:.1,filled:true});spawnFx({kind:'burst',at:{x:gx,y:gy},lift:.9,color:0xffe26a,count:30,speed:3,size:.06,life:.9,up:2});};

// ---------- 拾取 ----------
function setRay(clientX,clientY){const r=renderer.domElement.getBoundingClientRect();ndc.set((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);}
R.pickActor=function(clientX,clientY,filter=()=>true){
 if(!renderer)return null;setRay(clientX,clientY);
 const list=proxies.filter(p=>{const a=actors.get(p.userData.key);return a&&a.group.visible&&a.deadT<0&&filter(a);});
 const hit=ray.intersectObjects(list,false)[0];return hit?actors.get(hit.object.userData.key):null;
};
R.pickGround=function(clientX,clientY){
 if(!renderer)return null;setRay(clientX,clientY);const p=ray.ray.intersectPlane(groundPlane,tmpV2);if(!p)return null;
 const gx=p.x/CELL+COLS/2,gy=p.z/CELL+ROWS/2,out={point:p.clone()};
 if(gx>=0&&gx<COLS&&gy>=0&&gy<ROWS)out.cell={x:Math.floor(gx),y:Math.floor(gy)};
 if(Math.abs(p.z-BENCH_Z)<.75){const i=Math.round(p.x/BENCH_STEP+4);if(i>=0&&i<9&&Math.abs(p.x-(i-4)*BENCH_STEP)<.56)out.bench=i;}
 return out;
};
R.setHover=k=>{ui.hoverKey=k;};R.setDrag=(k,point)=>{ui.dragKey=k;ui.dragPoint=point||null;};
R.setHoverCell=c=>{ui.hoverCell=c;};R.setDeploy=v=>{ui.deploy=v;};
R.screenOf=function(gx,gy,h=0){toWorld(gx,gy,h,tmpV).project(camera);return {x:(tmpV.x+1)/2*W,y:(1-tmpV.y)/2*H};};
R.actorScreen=function(key){const a=actors.get(key);if(!a)return null;tmpV.copy(a.pos).setY(a.inst.height+.3).project(camera);return {x:(tmpV.x+1)/2*W,y:(1-tmpV.y)/2*H};};

// ---------- 每帧 ----------
R.frame=function(dt,simDt,ctx){
 if(!renderer||R.failed)return false;R.resize();
 time+=dt;const fighting=ctx.mode==='fight';fieldK=lerp(fieldK,fighting?1:0,1-Math.exp(-dt*3));zoomK=lerp(zoomK,fighting?1:0,1-Math.exp(-dt*1.5));
 gridMat.uniforms.uTime.value=time;gridMat.uniforms.uField.value=fieldK;gridMat.uniforms.uDrag.value=lerp(gridMat.uniforms.uDrag.value,ui.deploy?1:0,1-Math.exp(-dt*10));
 gridMat.uniforms.uHover.value.set(ui.hoverCell?ui.hoverCell.x:-9,ui.hoverCell?ui.hoverCell.y:-9);
 R.cornerMat.opacity=.75+.25*Math.sin(time*2);
 for(const p of R.benchPads)p.userData.ring.material.opacity=ui.deploy?.9:.4;
 // 环境动画
 if(R.debris)for(const d of R.debris){d.rotation.y+=d.userData.spin*dt;d.rotation.x+=d.userData.spin*.5*dt;d.position.y+=Math.sin(time*.6+d.userData.bob)*.002;}
 if(R.shafts)R.shafts.forEach((s,i)=>{s.material.opacity=.35+.25*Math.sin(time*.3+i*1.7);});
 if(weather){const u=weather.userData,pos=weather.geometry.attributes.position;
  if(u.type==='rain'){for(let i=0;i<u.N;i++){let y=pos.getY(i*2)-dt*16;if(y<-1)y+=u.box.y;const x=pos.getX(i*2),z=pos.getZ(i*2);pos.setXYZ(i*2,x,y,z);pos.setXYZ(i*2+1,x-.05,y-.55,z);}}
  else for(let i=0;i<u.N;i++){let y=pos.getY(i)+dt*(u.type==='embers'?.9:u.type==='data'?.6:.25);if(y>u.box.y*.7)y=0;pos.setY(i,y);pos.setX(i,pos.getX(i)+Math.sin(time*.5+u.seed[i])*dt*.15);}
  pos.needsUpdate=true;}
 // 演员
 const casters=[];
 for(const [k,a] of [...actors]){
  const u=a.unit,g=a.group;g.visible=a.visible!==false;
  a.spawnT+=dt;
  let target=a.home||a.pos,moving=0,face=null;
  if(a.kind==='combat'&&u){target=toWorld(u.gpos.x,u.gpos.y,0,tmpV2).clone();face=u.face;}
  if(ui.dragKey===k&&ui.dragPoint){target=ui.dragPoint.clone();}
  const prev=a.pos.clone(),follow=a.kind==='combat'?1-Math.exp(-dt*18):1-Math.exp(-dt*14);
  if(a.pos.distanceTo(target)>CELL*2.2&&a.kind==='combat')a.pos.copy(target);else a.pos.lerp(target,follow);
  const moved=a.pos.distanceTo(prev);moving=a.kind==='combat'&&u?.moving?1:clamp(moved/Math.max(dt,1e-3)/2.2);
  g.position.copy(a.pos);if(ui.dragKey===k)g.position.y=.35;
  // 朝向
  let wanted=a.angle;
  if(face&&(Math.abs(face.x)+Math.abs(face.y))>.01)wanted=Math.atan2(face.x,face.y);
  else if(a.kind!=='combat')wanted=a.team===0?Math.PI:0;
  const diff=Math.atan2(Math.sin(wanted-a.angle),Math.cos(wanted-a.angle));a.angle+=diff*(1-Math.exp(-dt*10));a.inst.root.rotation.y=a.angle;
  // 动作输入
  const appear=clamp(a.spawnT/.25);g.scale.setScalar(.6+.4*appear);
  let attackT=9,castT=9,hit=0,stun=false;
  if(u){if(u.attackT<a.lastAttackT)a.serial++;a.lastAttackT=u.attackT;attackT=u.attackT;castT=u.castT;hit=u.flash;stun=u.stun>0&&u.alive;}
  if(a.victoryOn)a.victory=Math.min(1,a.victory+dt*2);
  if(a.deadT>=0)a.deadT+=dt;
  HM.animate(a.inst,{time:time+a.key.length,move:moving,distance:moved,attackT,castT,attackSerial:a.serial,hit,stun,dead:a.deadT>=0?a.deadT:0,victory:a.victory,idleMotion:!global.presentationSettings||presentationSettings.motion!==false},dt);
  // 受击闪光、施法自发光增强
  const body=a.inst.materials[0];if(body&&body.emissive){const f=hit*.55+(a.hover?.12:0)+(ui.dragKey===k?.18:0);body.emissive.setRGB(f,f*.95,f*.9);}
  if(a.inst.glow)a.inst.glow.material.color.setScalar(1+a.inst.glowBoost*1.6);
  if(a.kind!=='combat'&&a.inst.kind!=='hero')a.inst.glowBoost=0;
  a.ring.material.opacity=(.6+.3*Math.sin(time*3+a.pos.x))*(a.deadT>=0?Math.max(0,1-a.deadT*2):1)+(ui.hoverKey===k?.4:0);
  if(a.starRing)a.starRing.rotation.z+=dt*.8;
  const bu=a.bubble.material.uniforms;bu.opacity.value=lerp(bu.opacity.value,u&&u.shield>0&&u.alive?.8+hit*1.2:0,1-Math.exp(-dt*10));bu.time.value=time;a.bubble.visible=bu.opacity.value>.01;
  a.stun.visible=stun;if(stun)a.stun.rotation.y+=dt*4;
  a.hover=lerp(a.hover,ui.hoverKey===k?1:0,1-Math.exp(-dt*12));
  if(a.deadT>=0){const f=Math.max(0,1-(a.deadT-.6)/.6);for(const m of a.inst.materials){m.transparent=true;m.opacity=f;}if(a.deadT>1.25)removeActor(k);}
  if(u&&u.alive&&u.castT<.6)casters.push(a);
 }
 // 施法补光
 casters.sort((x,y)=>x.unit.castT-y.unit.castT);
 castLights.forEach((l,i)=>{const a=casters[i];l.intensity=a&&quality!=='low'?(1-a.unit.castT/.6)*14:0;if(a){l.color.copy(new T.Color(HM.SPECS[a.id]?.glow??0xff4a5a));l.position.copy(a.pos).setY(1.4);}});
 // 弹道与特效
 for(const [p,v] of [...projs]){if(ctx.battle&&!ctx.battle.projectiles.includes(p)){v.dispose();projs.delete(p);continue;}v.update();}
 for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.t+=dt;const k=clamp(f.t/f.life);f.update(k,dt);if(f.t>=f.life){f.dispose();fx.splice(i,1);}}
 // 镜头：交战时轻微推近；震屏
 shake=Math.max(0,shake-dt*1.8);
 camera.position.copy(camBase).lerp(camTarget,zoomK*.06);
 if(shake>0){camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(Math.random()-.5)*shake*.6;}
 camera.lookAt(camTarget);
 // 渲染
 if(quality==='low'){renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.setRenderTarget(null);renderer.render(scene,camera);}
 else{renderer.toneMapping=T.NoToneMapping;post.comp.uniforms.strength.value=quality==='high'?.75:.6;post.render(scene,camera,time);}
 drawHud(dt,ctx);
 return true;
};

// ---------- HUD：血条、法力、星级、跳字 ----------
function drawHud(dt,ctx){
 const c=hctx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
 const proj=(p,h)=>{tmpV.copy(p).setY(h).project(camera);return {x:(tmpV.x+1)/2*W,y:(1-tmpV.y)/2*H,z:tmpV.z};};
 const skew=(x,y,w,h,col,sk=3)=>{if(w<.5)return;c.beginPath();c.moveTo(x+sk,y);c.lineTo(x+w+sk,y);c.lineTo(x+w,y+h);c.lineTo(x,y+h);c.closePath();c.fillStyle=col;c.fill();};
 const list=[...actors.values()].filter(a=>a.group.visible&&a.deadT<0).sort((a,b)=>a.pos.z-b.pos.z);
 for(const a of list){
  const u=a.unit,p=proj(a.pos,a.inst.height*a.inst.root.scale.y/(a.inst.kind==='hero'?1:1)+.28);if(p.z>1)continue;
  const boss=a.def.boss,w=boss?150:a.bench?44:62,x0=p.x-w/2,y=p.y;
  if(!a.enemyType){const star=a.star||1,sc=D.STAR_COLORS[star];for(let i=0;i<star;i++){const cx=p.x+(i-(star-1)/2)*13,cy=y-(a.kind==='combat'?11:2);c.beginPath();c.moveTo(cx,cy-6);c.lineTo(cx+6,cy);c.lineTo(cx,cy+6);c.lineTo(cx-6,cy);c.closePath();c.fillStyle='rgba(8,10,14,.92)';c.fill();c.beginPath();c.moveTo(cx,cy-4);c.lineTo(cx+4,cy);c.lineTo(cx,cy+4);c.lineTo(cx-4,cy);c.closePath();c.fillStyle=sc;c.fill();}}
  if(a.kind==='display')continue;
  const hp=u?u.hp:a.def.hp,maxHp=u?u.maxHp:a.def.hp,sh=u?u.shield:0,total=Math.max(maxHp,hp+sh),bh=boss?9:6;
  skew(x0-2,y-2,w+4,bh+(u&&u.maxMana>0?7:4),'rgba(6,8,12,.9)');
  skew(x0,y,w*clamp(hp/total),bh,a.team===0?'#eef6f8':'#ff3b4e');
  if(sh>.5)skew(x0+w*hp/total,y,w*sh/total,bh,'#7fe0ff');
  const tick=maxHp<4000?300:1000;c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=1;for(let i=1;i*tick<total;i++){const xx=x0+w*i*tick/total;c.beginPath();c.moveTo(xx+2,y);c.lineTo(xx+1,y+bh*.6);c.stroke();}
  if(u&&u.maxMana>0){const full=u.mana>=u.maxMana;skew(x0-1,y+bh+2,w*clamp(u.mana/u.maxMana),3,full?'#ffffff':'#46d5f2',1);}
  if(boss){c.font='700 13px "Noto Sans SC","Microsoft YaHei",sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='rgba(0,0,0,.85)';c.fillStyle='#ffd0d6';const n=R.unitName?R.unitName(a):'';c.strokeText(n,p.x,y-8);c.fillText(n,p.x,y-8);}
 }
 // 备战席编号
 if(ctx.mode!=='fight'||true){c.font='500 10px "JetBrains Mono",monospace';c.fillStyle='rgba(220,235,245,.55)';c.textAlign='center';for(let i=0;i<9;i++){const p=proj(benchWorld(i,tmpV2),0);c.fillText(String(i+1).padStart(2,'0'),p.x,p.y+(H*.028));}}
 // 跳字
 for(let i=texts.length-1;i>=0;i--){const t=texts[i];t.t+=dt;if(t.t>t.life){texts.splice(i,1);continue;}
  const k=t.t/t.life,p=proj(toWorld(t.x,t.y,0,tmpV2),t.h),rise=t.label?k*22:k*46,pop=1+(t.big?.5:.25)*Math.max(0,1-t.t*8),alpha=k<.6?1:1-(k-.6)/.4;
  c.save();c.globalAlpha=alpha;c.translate(p.x+t.vx*k*(t.label?0:1),p.y-rise);c.scale(pop,pop);
  c.font=(t.label?'700 ':'800 ')+t.size+'px '+(t.label?'"Noto Sans SC","Microsoft YaHei",sans-serif':'"Barlow Condensed","Noto Sans SC",sans-serif');c.textAlign='center';c.lineJoin='round';
  c.lineWidth=t.label?5:4;c.strokeStyle='rgba(5,6,10,.9)';c.strokeText(t.text,0,0);c.fillStyle=t.color;c.fillText(t.text,0,0);c.restore();}
}
R.stats=()=>renderer?{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,actors:actors.size,fx:fx.length,quality}:null;
R.actors=actors;
global.ACRender=R;
})(globalThis);
