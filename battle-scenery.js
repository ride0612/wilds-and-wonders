(function(global){
'use strict';
const T=global.THREE;
// Every encounter has its own location dressing; all tall props stay outside the playable ground.
const CONFIG=[
 ['street','旧书店街口','rain',0x27343b,0x142231,0xffd1a1],
 ['research','地下研究所','dust',0x35434a,0x182831,0xc3e4ed],
 ['trial','相位试验场','dust',0x3a4649,0x1a2931,0xc3e4ed],
 ['supply','紧急物资站','dust',0x3d4141,0x272f37,0xf3d2a0],
 ['crossing','首次锚定走廊','ash',0x353541,0x151d30,0xced1f2],
 ['reception','学院接待处','leaves',0x4b4d46,0x293638,0xe8dcc3],
 ['canteen','学生餐厅外','leaves',0x4d5048,0x293735,0xf6dfb2],
 ['station','空白站台','rain',0x343f43,0x162332,0xd2dbe0],
 ['shelter','雨中接驳道路','rain',0x2d3d43,0x152732,0xc7d8e2],
 ['laboratory','临时实验室','dust',0x39454b,0x1c2b34,0xcce6e4],
 ['archive','档案辅楼','dust',0x48463e,0x292d2f,0xe7d6b4],
 ['relay','临时中继站','rain',0x364449,0x1b2b36,0xc0d7e3],
 ['memory','记忆回廊','ash',0x30313c,0x161d2a,0xc4cde8],
 ['roof','学院天台','leaves',0x545852,0x34434c,0xffdfa8],
 ['exchange','信号交换层','dust',0x2d3d44,0x152631,0xb9dfe4],
 ['receiver','站台主控机房','ash',0x3b333d,0x241d2b,0xe2b5a7],
 ['returnroom','临时归航室','dust',0x41494a,0x253239,0xe4dbc1],
 ['route','返航路线','leaves',0x454c45,0x263633,0xeadab9],
 ['anchor','双向归航场','ash',0x35444a,0x1b2c38,0xc5dde1],
 ['index','旧通道出口','ash',0x342f3b,0x1b1b2c,0xdec1b6]
].map(([kind,label,weather,floor,fog,key])=>({kind,label,weather,floor,fog,key}));
function build(stage){
 const config=CONFIG[stage]||CONFIG[0],root=new T.Group();root.name='story-location';
 const geometry={box:new T.BoxGeometry(1,1,1),cylinder:new T.CylinderGeometry(.5,.5,1,12),sphere:new T.SphereGeometry(.5,12,8)},materials={},batches=new Map(),animated=[],textures=[],landmarks=[],solids=[];
 const dummy=new T.Object3D(),color=new T.Color();let staticParts=0;
 function mat(style){if(!materials[style])materials[style]=style==='lamp'?new T.MeshBasicMaterial({color:0xffffff}):new T.MeshStandardMaterial({color:0xffffff,roughness:style==='metal'?.38:style==='wet'?.23:.83,metalness:style==='metal'?.55:style==='wet'?.28:.05});return materials[style];}
 function part(type,x,y,z,w,h,d,hex,style='paint',rotation=0){
  const key=type+':'+style+':'+(h>.08);if(!batches.has(key))batches.set(key,[]);
  dummy.position.set(x,y,z);dummy.rotation.set(0,rotation,0);dummy.scale.set(w,h,d);dummy.updateMatrix();batches.get(key).push({matrix:dummy.matrix.clone(),hex});staticParts++;
  if(h>.15)solids.push({x,z,w:Math.abs(Math.cos(rotation))*w+Math.abs(Math.sin(rotation))*d,d:Math.abs(Math.sin(rotation))*w+Math.abs(Math.cos(rotation))*d});
 }
 const box=(x,y,z,w,h,d,hex,style='paint',r=0)=>part('box',x,y,z,w,h,d,hex,style,r);
 const cylinder=(x,y,z,w,h,hex,style='metal')=>part('cylinder',x,y,z,w,h,w,hex,style);
 const feature=(name,draw)=>{landmarks.push(name);draw();};
 function sign(text,x,y,z,width=2.8){
  box(x,y,z,width,.48,.055,0x17242c);landmarks.push(text);
  if(typeof document==='undefined')return;const canvas=document.createElement('canvas'),ctx=canvas.getContext?.('2d');if(!ctx?.fillText)return;
  canvas.width=512;canvas.height=96;ctx.fillStyle='#15232b';ctx.fillRect(0,0,512,96);ctx.fillStyle='#d3dfd9';ctx.font='36px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48,486);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);
  const plate=new T.Mesh(new T.PlaneGeometry(width,.48),new T.MeshBasicMaterial({map:texture}));plate.position.set(x,y,z+.031);root.add(plate);
 }
 function bench(x,z){box(x,.43,z,1.5,.09,.46,0x776448);box(x,.77,z-.21,1.5,.46,.07,0x776448);for(const dx of [-.6,.6])box(x+dx,.22,z,.07,.43,.4,0x35434b,'metal');}
 function table(x,z,w=1.4){box(x,.79,z,w,.08,.7,0x9a927c);for(const dx of [-w*.4,w*.4])for(const dz of [-.23,.23])box(x+dx,.38,z+dz,.05,.76,.05,0x697579,'metal');}
 function crate(x,z,hex=0x747b6c){box(x,.32,z,.72,.64,.55,hex);for(const dx of [-.25,.25])box(x+dx,.33,z+.28,.045,.64,.015,0xb9ae87);box(x,.65,z,.74,.035,.57,0x9b9d87);}
 function monitor(x,z,height=1.3){box(x,height,z,.7,.48,.12,0x273943,'metal');box(x,height,z+.066,.59,.36,.012,0x5d9caa,'lamp');for(let j=0;j<3;j++)box(x-.12,height+.08-j*.08,z+.075,.26+(j%2)*.14,.012,.01,0xa8d8cf,'lamp');box(x,height*.5,z,.07,height,.07,0x414b52,'metal');}
 function shelf(x,z,books=true){box(x,1.05,z,1.7,2.1,.5,0x665a48);for(let j=0;j<3;j++){box(x,.40+j*.59,z+.04,1.6,.035,.54,0xb6a786);for(let k=0;k<9;k++){const h=.22+((k+j)%3)*.07;box(x-.68+k*.17,.42+j*.59+h/2,z+.27,.13,h,.22,books?[0x826651,0x4c6565,0x777c69,0x8d7b5b][k%4]:0x9b9b8c);}}}
 function pole(x,z){cylinder(x,1.3,z,.075,2.6,0x56656d);box(x,2.62,z,.36,.07,.42,0xffe5b5,'lamp');}
 function cables(z){for(let j=0;j<3;j++)for(let k=0;k<8;k++)box(-5.8+k*1.65,.012,z+Math.sin(k*.8+j)*.09,1.7,.018,.026,[0x1d252c,0x7e6950,0x415b62][j], 'paint',Math.cos(k*.8+j)*.045);}
 function arch(x,z,hex=0x8aa3ae){box(x-1.1,1.5,z,.16,3,.24,hex,'metal');box(x+1.1,1.5,z,.16,3,.24,hex,'metal');box(x,3,z,2.35,.16,.24,hex,'metal');for(const dx of [-1.08,1.08])box(x+dx,1.5,z+.14,.035,2.6,.035,0xb2dce5,'lamp');}
 function antenna(x,z){cylinder(x,1.5,z,.10,3,0xa6b0b0);for(let j=0;j<3;j++){box(x,2+j*.25,z,1.2-j*.2,.025,.025,0xacb9b9,'metal');}cylinder(x,.11,z,.55,.22,0x52666c);}
 function windowRow(){for(let x=-5.2;x<6;x+=2.6){box(x,1.6,-7.16,1.75,1.7,.08,0x7a8b90,'metal');box(x,1.6,-7.10,1.58,1.52,.02,config.kind==='memory'?0xa78a5b:0x506975);box(x,1.6,-7.06,.055,1.52,.025,0xc0c5b3);box(x,1.6,-7.06,1.58,.045,.025,0xc0c5b3);}}
 function blinkingLamp(x,y,z){const light=new T.Mesh(new T.SphereGeometry(.055,8,6),new T.MeshBasicMaterial({color:0xf1b68b,transparent:true}));light.position.set(x,y,z);root.add(light);animated.push({kind:'lamp',object:light,phase:x});}
 // Instanced tiles, seams, gutters and edge curb. Nothing is a raised chessboard.
 const outdoor=['street','supply','station','shelter','relay','roof','route','anchor'].includes(config.kind);
 for(let z=-7.3;z<8;z+=1.55)for(let x=-8.5;x<9;x+=1.55){const tone=new T.Color(config.floor).multiplyScalar(.94+((Math.round((x+9)*10)+Math.round(z*10))%3)*.025).getHex();box(x,-.025,z,1.53,.035,1.53,tone,config.weather==='rain'?'wet':'paint');}
 for(const x of [-6.65,6.65]){box(x,.035,0,.16,.07,11.4,0x7c8580);for(let z=-5.4;z<5.5;z+=.45)box(x,.075,z,.18,.008,.025,0x35414a);}
 if(!outdoor){box(0,1.65,-7.4,18,3.3,.25,0x47535a);windowRow();for(let x=-8;x<=8;x+=4)box(x,1.6,-7.1,.22,3.2,.30,0x939c95);}
 else for(const x of [-8.6,8.6]){for(let z=-5;z<7;z+=3)pole(x,z);}
 if(config.weather==='rain')for(let i=0;i<13;i++){const x=(i*1.73%12)-6,z=(i*2.89%8)-4;box(x,.003,z,.4+(i%3)*.2,.006,.15+(i%4)*.08,0x2b424c,'wet',i*.7);}
 const k=config.kind;
 if(k==='street'){
  feature('旧书店橱窗与停电收款台',()=>{box(-2.8,1.7,-6.8,6,3.4,.75,0x6d685c);box(-2.8,1.4,-6.40,4.9,1.9,.04,0x354d55);shelf(-4.4,-6.1);shelf(-1.2,-6.1);sign('旧书店 · 今日营业',-2.8,3,-6.35,4.3);});
  feature('斑马线与撤离路口',()=>{for(let x=-2.4;x<=2.4;x+=.8)box(x,.006,2.8,.46,.008,2.8,0xadb1a5);for(const x of [-4.5,4.5])box(x,.006,0,.06,.008,8.5,0xc8b785);});
  crate(7.6,2);bench(7.5,-2);sign('地下仓库 →',4.4,1.5,-6.5,2.6);blinkingLamp(6.8,1.7,-5.8);
 }else if(['research','trial','laboratory','memory'].includes(k)){
  feature(k==='trial'?'无人机检修台':k==='laboratory'?'止鳞箔隔离样本台':k==='memory'?'伪造故乡的暗窗':'应急研究台',()=>{for(const x of [-4.5,0,4.5]){table(x,-6.1,2);monitor(x,-6.25);cylinder(x+.65,.91,-6.1,.18,.18,0xa4cbd0);}});
  for(const x of [-7.6,7.6]){box(x,.85,-2,1,1.7,.8,0x5c6d73);box(x,1.1,-1.58,.72,.32,.025,0x7ba2a9,'lamp');crate(x,2,0x7b8c87);}
  if(k==='trial'){for(let x=-5;x<6;x+=.8)box(x,.009,-4.9,.35,.012,.12,0xc3a65a,'paint',-.5);feature('安全隔离线与训练靶机',()=>{box(3,.93,-6, .55,.12,.55,0x899c9f,'metal');for(const dx of [-.35,.35])cylinder(3+dx,.95,-6,.22,.025,0x22343d);});}
  if(k==='laboratory'){box(0,1.0,-6,.48,.12,.28,0xb6bfae);for(const x of [-.1,.1])box(x,1.07,-6,.12,.008,.18,0xd6d8c0,'metal');}
  if(k==='memory'){feature('没有随画面改变的窗与投影仪',()=>{box(0,1.8,-7.04,1.5,1.2,.04,0xb29c71);box(0,1.8,-7,.04,1.2,.02,0xe8d9b5);box(7.6,1.1,2,.32,.18,.4,0x5c656e);});}
  sign(k==='trial'?'隔离试验 / 禁止接入':k==='laboratory'?'止鳞箔 · 样本 02':k==='memory'?'信号源未确认':'折页计划 / 应急电源',0,2.85,-7.02,4.6);cables(-5.2);
 }else if(k==='supply'||k==='shelter'){
  feature('医疗雨棚与担架',()=>{for(const x of [-5.2,-2.2])for(const z of [-6.9,-5.3])box(x,1.25,z,.045,2.5,.045,0xa4b5b5,'metal');box(-3.7,2.5,-6.1,3.3,.06,1.9,0x486a72);table(-3.7,-6.1,1.8);box(-3.7,.89,-6.1,1.75,.13,.58,0xb5c5bd);});
  feature('救护车辆与临时发电机',()=>{box(7.7,.8,-1,1.7,1.25,3.4,0xbfc9bd);box(7.7,1.48,-1,.32,.12,.45,0xa04b44,'lamp');for(const z of [-2,0])for(const x of [6.88,8.52])part('sphere',x,.32,z,.18,.55,.55,0x18252c);box(7.7,1.3,.72,1.36,.45,.035,0x416775);box(4,.5,-6.1,1.4,1,1,0x777e65);for(let j=0;j<5;j++)box(4,.52+j*.07,-5.58,1,.016,.02,0x303d42);});
  for(let i=0;i<4;i++)crate(-7.5,-3+i*1.6,i%2?0xa9aa8b:0x778f8a);sign(k==='supply'?'物资接电 / 病房优先':'接驳点 / 留出车道',.8,1.6,-6,3.4);cables(-5.05);
 }else if(['reception','canteen','archive','returnroom'].includes(k)){
  feature('学院公告栏',()=>{box(-4.7,1.45,-6.8,2.3,1.65,.12,0x726b53);for(let j=0;j<6;j++)box(-5.35+(j%3)*.6,1.8-Math.floor(j/3)*.65,-6.72,.45,.48,.01,j===4?0xa5c0b0:0xd3c9a7);});
  if(k==='archive'){feature('档案柜与巡查原件',()=>{shelf(-7.55,-2);shelf(7.55,-2);shelf(1,-6.6,false);shelf(4,-6.6,false);});}
  else {feature(k==='canteen'?'未收的餐盘与饮料':k==='returnroom'?'客房钥匙与返程记录':'访客登记台',()=>{for(const x of [-7.5,7.5]){table(x,-1);bench(x,1);for(let j=0;j<3;j++){box(x-.45+j*.42,.84,-1,.30,.015,.22,0xc2c7b5);cylinder(x-.4+j*.42,.92,-1,.07,.15,0xe3ddc3);}}});}
  if(k==='returnroom'){arch(2,-6.3);sign('归航核验 / 留灯',2,3.35,-6.3,3);}
  else sign(k==='archive'?'档案辅楼 / 借阅登记':k==='canteen'?'餐厅 / 请走人工疏散通道':'访客接待 / 请登记',1.8,2.7,-7,4.5);
 }else if(['station','route','receiver'].includes(k)){
  feature('废弃货运轨道与枕木',()=>{for(const x of [-.55,.55])box(x,.05,-6, .06,.10,3.1,0xa4a7a0,'metal');for(let z=-7.2;z<-4.9;z+=.35)box(0,.015,z,2.1,.06,.17,0x5b5247);});
  feature('空白时刻表',()=>{sign(k==='route'?'返程路线 / 人工确认':'临江 — — 返程待确认',-3.6,2.2,-6.1,4.3);for(const x of [-5.5,-1.7])box(x,1.05,-6.2,.09,2.1,.1,0x5c6b73);});
  bench(7.5,-2);for(let i=0;i<3;i++)crate(-7.5,i*1.4-2);pole(4.7,-6.2);blinkingLamp(4.7,2,-6.15);
  if(k==='receiver'){feature('接收主机与烧蚀管线',()=>{box(4.2,1.2,-6.4,2,2.4,1,0x4f4554);monitor(4.2,-5.85,1.8);cables(-5.05);});}
 }else if(['relay','exchange','anchor'].includes(k)){
  feature('双向信标与人工校验终端',()=>{antenna(-7.6,-2);antenna(7.6,-2);for(const x of [-4,0,4]){monitor(x,-6.1);crate(x,-6.6,0x5a777a);}});
  feature('备用电池与隔离线路',()=>{for(let i=0;i<4;i++)crate(-7.6,1.2+i*.95,0x6d7d70);cables(-5.25);});
  if(k==='exchange')for(const x of [-7.6,7.6]){box(x,1.15,-4.8,1,2.3,.8,0x42545b);for(let j=0;j<8;j++)box(x, .3+j*.24,-4.38,.72,.05,.02,j%3?0x698c96:0xa3c7bf,'lamp');}
  if(k==='anchor'){arch(0,-6.2);sign('双向校验 / 归航接收',0,3.5,-6.2,3.8);}
  else sign(k==='relay'?'人工核验 / 姓名与时间':'正常频道 / 保持连通',0,2.6,-6.3,4.2);
 }else if(k==='roof'){
  feature('天台风机与午餐盒',()=>{for(const x of [-7.6,7.6]){box(x,.45,-2,1.4,.9,1.5,0x87948f,'metal');const fan=new T.Group();fan.position.set(x,.92,-2);for(let j=0;j<4;j++){const blade=new T.Mesh(new T.BoxGeometry(.56,.018,.12),mat('metal'));blade.rotation.y=j*Math.PI/2;fan.add(blade);}root.add(fan);animated.push({kind:'fan',object:fan,phase:0});table(x,1.8);for(let j=0;j<3;j++)box(x-.4+j*.4,.86,1.8,.29,.06,.21,[0xaa8965,0xc3b18d,0xb9c1a6][j]);}});
  for(let x=-8;x<9;x+=1.3)box(x,.5,-6.6,.05,1,.05,0x7b8a8b,'metal');box(0,1,-6.6,17,.05,.05,0x9ca7a3,'metal');sign('天台 / 注意排水口',0,1.5,-6.65,3.4);
 }else if(k==='crossing'||k==='index'){
  feature(k==='crossing'?'无字书脊与锚定门':'寂蚀索引与残页',()=>{arch(0,-6.4,0x7d839a);for(const x of [-7.4,7.4])for(let i=0;i<6;i++)box(x, .8+(i%2)*.18,-4+i*1.6,.35,1.5,.9,0x5c586d,'paint',x>0?-.14:.14);});
  sign(k==='index'?'归航坐标 / 接收隔离':'归航坐标 / 已封存',0,3.45,-6.4,3.8);
  for(let i=0;i<7;i++){const paper=new T.Mesh(new T.PlaneGeometry(.23,.32),new T.MeshStandardMaterial({color:0xb9b3a6,side:T.DoubleSide,roughness:.9}));paper.position.set(-2.1+i*.7,1.5+(i%3)*.2,-6.3);root.add(paper);animated.push({kind:'paper',object:paper,phase:i*.7,base:paper.position.clone()});}
 }
 // A few narrative props are animated; the hundreds of rigid details share a small number of draw calls.
 for(const [key,list]of batches){const [type,style,shadow]=key.split(':'),inst=new T.InstancedMesh(geometry[type],mat(style),list.length);list.forEach((p,i)=>{inst.setMatrixAt(i,p.matrix);inst.setColorAt(i,color.setHex(p.hex));});inst.castShadow=shadow==='true'&&style!=='lamp';inst.receiveShadow=style!=='lamp';inst.computeBoundingSphere();root.add(inst);}
 const count=config.weather==='rain'?120:45,positions=new Float32Array(count*6),weatherGeometry=new T.BufferGeometry();weatherGeometry.setAttribute('position',new T.BufferAttribute(positions,3));
 const weather=new T.LineSegments(weatherGeometry,new T.LineBasicMaterial({color:config.weather==='ash'?0xb4abc8:0xb0c9d1,transparent:true,opacity:config.weather==='rain'?.23:.18,depthWrite:false}));root.add(weather);
 root.userData={config,landmarks,solids,staticParts,batches:batches.size};
 function update(time,quality='high',effects=true){
  weather.visible=effects&&quality!=='low';weatherGeometry.setDrawRange(0,(quality==='balanced'?Math.floor(count*.55):count)*2);
  if(weather.visible){for(let i=0;i<count;i++){const x=((i*1.718+time*.14)%18)-9,z=(i*2.437%14)-7,y=7-((i*.537+time*(config.weather==='rain'?6.4:.24))%7),len=config.weather==='rain'?.19:.025;const n=i*6;positions[n]=x;positions[n+1]=y;positions[n+2]=z;positions[n+3]=x+.025;positions[n+4]=y-len;positions[n+5]=z+.01;}weatherGeometry.attributes.position.needsUpdate=true;}
  for(const a of animated){if(a.kind==='fan')a.object.rotation.y=time*3.5;else if(a.kind==='lamp')a.object.material.opacity=.55+.35*Math.sin(time*2+a.phase);else{a.object.position.y=a.base.y+Math.sin(time*.8+a.phase)*.12;a.object.rotation.set(.25+Math.sin(time+a.phase)*.13,time*.12+a.phase,Math.sin(time*.9+a.phase)*.14);}}
 }
 let disposed=false;return{root,config,update,dispose(){if(disposed)return;disposed=true;const gs=new Set(Object.values(geometry)),ms=new Set(Object.values(materials));root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);if(o.isInstancedMesh)o.dispose();});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent();}};
}
global.BattleScenery={CONFIG,build};if(typeof module!=='undefined')module.exports=global.BattleScenery;
})(globalThis);
