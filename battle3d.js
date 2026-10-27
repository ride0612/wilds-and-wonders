'use strict';
// A real-time 3D battlefield. The original 2D canvas remains the pointer/HUD layer.
const Battle3D=(()=>{
 const T=globalThis.THREE,CELL=1.55,W=960,H=660,actors=new Map(),fxNodes=new Map(),retiredUnits=new WeakSet();
 let renderer,scene,camera,ground,grid,props,preview,core,keyLight,rimLight,castLights,quality='',theme=-1,lastWidth=0,lastHeight=0,failed=false,active=false;
 let ray,plane,hit,screen,clock=0,weather,weatherPositions;
 const palettes=[{floor:0x26363e,fog:0x121f2e,key:0xe7cba0,accent:0x87b9d2},{floor:0x2a3943,fog:0x172431,key:0xd2e7ed,accent:0x70cbd6},{floor:0x283b3c,fog:0x132729,key:0xc8dce5,accent:0xaabfac},{floor:0x414247,fog:0x252c35,key:0xf4d6a5,accent:0xe0aa6d},{floor:0x31313d,fog:0x161c30,key:0xd4d6e6,accent:0xb78ea3}];
 const world=(x,y,height=0)=>new T.Vector3((x-3.5)*CELL,height,(y-2.5)*CELL);
 function material(color,rough=.7,metal=.1){return new T.MeshStandardMaterial({color,roughness:rough,metalness:metal});}
 function mesh(g,m,parent,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(parent,x,y,z,w,h,d,color,rough=.7){return mesh(new T.BoxGeometry(w,h,d),material(color,rough),parent,x,y,z);}
 function disposeTree(root){root.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});root.removeFromParent();}
 function start(){
  if(failed)return false;if(renderer)return true;if(!T||typeof window==='undefined'||!document.createElement)return false;
  try{
   const surface=document.createElement('canvas');surface.className='battle3d-surface';surface.setAttribute('aria-hidden','true');
   renderer=new T.WebGLRenderer({canvas:surface,antialias:true,alpha:false,powerPreference:'high-performance'});
   renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
   renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
   canvas.parentElement.insertBefore(surface,canvas);canvas.classList.add('battle-hud');
   scene=new T.Scene();scene.background=new T.Color(0x172432);scene.fog=new T.Fog(0x172432,20,42);
   camera=new T.PerspectiveCamera(35,W/H,.1,80);camera.position.set(2.8,16.8,15.2);camera.lookAt(0,0,0);
   scene.add(new T.HemisphereLight(0xc2dcef,0x4d4a40,2.05));
   keyLight=new T.DirectionalLight(0xffe8c2,3.15);keyLight.position.set(-7,12,5);keyLight.castShadow=true;
   Object.assign(keyLight.shadow.camera,{left:-10,right:10,top:9,bottom:-9,near:.5,far:35});keyLight.shadow.bias=-.0004;keyLight.shadow.normalBias=.025;scene.add(keyLight);
   rimLight=new T.DirectionalLight(0x739bc8,1.7);rimLight.position.set(6,5,-8);scene.add(rimLight);
   castLights=[new T.PointLight(0xff7744,0,5,2),new T.PointLight(0x66ddff,0,4,2)];castLights.forEach(l=>scene.add(l));
   ground=new T.Group();scene.add(ground);box(ground,0,-.17,0,19,.3,16,0x242d36);
   props=new T.Group();scene.add(props);grid=new T.Group();scene.add(grid);preview=new T.Group();scene.add(preview);
   for(let x=0;x<=8;x++){const a=world(x-.5,-.5,.012),b=world(x-.5,5.5,.012);grid.add(new T.Line(new T.BufferGeometry().setFromPoints([a,b]),new T.LineBasicMaterial({color:0x8aa4ad,transparent:true,opacity:.2})));}
   for(let y=0;y<=6;y++){const a=world(-.5,y-.5,.012),b=world(7.5,y-.5,.012);grid.add(new T.Line(new T.BufferGeometry().setFromPoints([a,b]),new T.LineBasicMaterial({color:0x8aa4ad,transparent:true,opacity:.2})));}
   ray=new T.Raycaster();plane=new T.Plane(new T.Vector3(0,1,0),0);hit=new T.Vector3();screen=new T.Vector3();
   weatherPositions=new Float32Array(100*3);for(let i=0;i<100;i++){weatherPositions[i*3]=(i*1.71%18)-9;weatherPositions[i*3+1]=(i*.37%7);weatherPositions[i*3+2]=(i*2.57%14)-7;}
   const wg=new T.BufferGeometry();wg.setAttribute('position',new T.BufferAttribute(weatherPositions,3));weather=new T.Points(wg,new T.PointsMaterial({color:0xafcbd4,size:.025,transparent:true,opacity:.4,depthWrite:false}));scene.add(weather);
   surface.addEventListener('webglcontextlost',e=>{e.preventDefault();active=false;failed=true;surface.hidden=true;document.body.dataset.battleRenderer='fallback';});
   active=true;document.body.dataset.battleRenderer='3d';return true;
  }catch(error){failed=true;active=false;if(renderer){renderer.domElement.remove();renderer.dispose();renderer=null;}console.warn('3D rendering unavailable; using normal-proportion compatibility view.',error);return false;}
 }
 function resize(){
  const rect=canvas.getBoundingClientRect(),parent=canvas.parentElement.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const setting=presentationSettings.quality||'high';
  if(quality!==setting){quality=setting;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,setting==='high'?2:setting==='balanced'?1.5:1));renderer.shadowMap.enabled=setting!=='low';keyLight.shadow.mapSize.setScalar(setting==='high'?2048:1024);keyLight.shadow.map?.dispose();keyLight.shadow.map=null;lastWidth=0;}
  const surface=renderer.domElement;surface.style.left=(rect.left-parent.left)+'px';surface.style.top=(rect.top-parent.top)+'px';surface.style.width=rect.width+'px';surface.style.height=rect.height+'px';
  if(lastWidth!==rect.width||lastHeight!==rect.height){lastWidth=rect.width;lastHeight=rect.height;renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();}
 }
 function setTheme(){
  if(theme===stage)return;theme=stage;for(const c of [...props.children])disposeTree(c);
  const p=palettes[stage%5];scene.background.set(p.fog);scene.fog.color.set(p.fog);keyLight.color.set(p.key);ground.children[0].material.color.set(p.floor);
  // Actual paving and service equipment: the tactical grid is an overlay, not a raised game board.
   for(let z=-7;z<=7;z+=2.2)for(let x=-9;x<=9;x+=2.2){box(props,x,-.012,z,2.17,.025,2.17,p.floor,stage%5===0?.32:.78).castShadow=false;}
  for(const x of [-7.4,7.4]){
   for(let z=-5.5;z<6;z+=2.75){box(props,x,.34,z,.24,.68,2.4,0x3b4850);box(props,x,.71,z,.32,.065,2.46,0x7a8788);}
   for(const z of [-6.3,6.3]){box(props,x,1.35,z,.13,2.7,.13,0x3a434b);mesh(new T.BoxGeometry(.28,.10,.45),new T.MeshBasicMaterial({color:p.accent}),props,x,2.65,z);}
  }
  for(let i=0;i<5;i++){const x=-5+i*2.3;box(props,x,.30,-6.5,.9,.60,.5,i%2?0x4c5556:0x62615a);box(props,x,.62,-6.5,.94,.05,.54,0x87928b);}
  if(stage%5===1||stage%5===2)for(const x of [-8.5,8.5])for(let i=0;i<3;i++){box(props,x,.65,-3+i*3,.75,1.3,1.1,0x2c3c48);mesh(new T.PlaneGeometry(.54,.35),new T.MeshBasicMaterial({color:0x6dabae}),props,x,.90,-2.44+i*3);}
  for(const c of [...preview.children])disposeTree(c);
  if(isDefense()){
   for(const pad of DEFENSE_PADS){const c=world(pad.x,pad.y,.025);const m=mesh(new T.PlaneGeometry(1.18,1.18),new T.MeshBasicMaterial({color:0x6db5c6,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide}),preview,c.x,c.y,c.z);m.rotation.x=-Math.PI/2;}
   const coords=DEFENSE_PATH.map(p=>world(p.x,p.y,.027));preview.add(new T.Line(new T.BufferGeometry().setFromPoints(coords),new T.LineDashedMaterial({color:0xd7af72,dashSize:.12,gapSize:.12,transparent:true,opacity:.55})));preview.children.at(-1).computeLineDistances();
  }
  core=new T.Group();props.add(core);core.position.copy(world(8,5));
  box(core,0,.22,0,.62,.44,.62,0x30444a);mesh(new T.CylinderGeometry(.16,.23,.65,12),material(0xa5cad3,.28,.6),core,0,.70,0);
  mesh(new T.SphereGeometry(.14,14,10),new T.MeshBasicMaterial({color:0x87e2e2}),core,0,1.10,0);core.visible=isDefense();
 }
 function project(gx,gy,height=0){
  if(!active)return null;screen.set((gx-4)*CELL,height,(gy-3)*CELL).project(camera);return{x:(screen.x+1)*W/2,y:(1-screen.y)*H/2};
 }
 function pick(p){
  if(!active)return null;ray.setFromCamera(new T.Vector2(p.x/W*2-1,1-p.y/H*2),camera);const v=ray.ray.intersectPlane(plane,hit);return v?{x:Math.floor(v.x/CELL+4),y:Math.floor(v.z/CELL+3)}:{x:-99,y:-99};
 }
 function pickUnit(p){
  if(!active||failed)return null;
  ray.setFromCamera(new T.Vector2(p.x/W*2-1,1-p.y/H*2),camera);
  const roots=[];for(const u of units){const a=actors.get(u.uid);if(a&&u.hp>0)roots.push(a.root);}
  const result=ray.intersectObjects(roots,true)[0];if(!result)return null;
  let root=result.object;while(root.parent&&root.parent!==scene)root=root.parent;
  return units.find(u=>actors.get(u.uid)?.root===root)||null;
 }
 function selectionMarker(color){const mat=new T.MeshBasicMaterial({color,transparent:true,opacity:.5,side:T.DoubleSide,depthWrite:false});const m=new T.Mesh(new T.RingGeometry(.28,.30,32),mat);m.rotation.x=-Math.PI/2;m.position.y=.03;return m;}
 function protectionField(u){
  const field=new T.Group();field.name='protection-'+u.uid;
  const color=u.team==='blue'?0x9ad4db:0xcb849d;
  const shell=new T.Mesh(new T.SphereGeometry(.43,16,12),new T.MeshBasicMaterial({color,transparent:true,opacity:.045,depthWrite:false,side:T.FrontSide}));shell.scale.y=1.8;field.add(shell);
  const arc=new T.Mesh(new T.TorusGeometry(.43,.005,4,28,Math.PI*1.25),new T.MeshBasicMaterial({color,transparent:true,opacity:.35,depthWrite:false}));arc.scale.y=1.8;field.add(arc);scene.add(field);return field;
 }
 function releaseActor(a){a.dispose();a.root.removeFromParent();disposeTree(a.mark);disposeTree(a.protection);}
 function updateActors(dt){
  const present=new Set();
  for(const u of units){
   if(retiredUnits.has(u))continue;
   let a=actors.get(u.uid);if(a&&a.unit!==u){releaseActor(a);actors.delete(u.uid);a=null;}
   if(u.hp<=0&&!a)continue;present.add(u.uid);
   if(!a){const model=StoryModels.build(u.id,u.team==='red');const mark=selectionMarker(u.team==='blue'?0xb6d9d0:0xc9858c);scene.add(model.root);scene.add(mark);a={...model,unit:u,mark,protection:protectionField(u),angle:u.team==='blue'?Math.PI:0,deadTime:0};actors.set(u.uid,a);}
   if(u.hp<=0){a.deadTime+=dt;a.root.rotation.z=Math.min(1.48,a.deadTime*3.5);a.root.position.y=-Math.min(.10,a.deadTime*.1);a.mark.visible=false;a.protection.visible=false;if(a.deadTime>.65){releaseActor(a);actors.delete(u.uid);retiredUnits.add(u);}continue;}
   const moving=Math.hypot(u.x-u.px,u.y-u.py)>.035,dirX=u.faceX??(u.team==='blue'?0:0),dirY=u.faceY??(u.team==='blue'?-1:1);
   const dx=moving?u.x-u.px:dirX,dy=moving?u.y-u.py:dirY;
   if(Math.abs(dx)+Math.abs(dy)>.001){const wanted=Math.atan2(dx,dy),diff=Math.atan2(Math.sin(wanted-a.angle),Math.cos(wanted-a.angle));a.angle+=diff*Math.min(1,dt*15);}
   a.root.position.copy(world(u.px,u.py,.025));a.root.rotation.set(0,a.angle,0);
   const swing=u.action>0?Math.sin((1-u.action/.28)*Math.PI):0,cast=Math.max(0,u.castFlash||0);
   StoryModels.pose(a,presentationSettings.motion?clock:0,moving?1:0,Math.max(0,swing),cast,u.hitFlash>0?1:0);
   a.mark.position.copy(world(u.px,u.py,.028));a.mark.visible=mode==='prep'||(u.id===selected&&u.team==='blue');
   a.protection.position.copy(world(u.px,u.py,a.spec.height*.49));a.protection.rotation.y=a.angle;
   a.protection.visible=u.shield>0&&mode!=='prep'&&presentationSettings.effects;
   a.protection.children[0].material.opacity=u.hitFlash>0?.16:.045;
   if(drag?.id===u.id&&u.team==='blue'){const cell=pick(drag.pos);if(cell&&deployable(cell.x,cell.y)){a.root.position.copy(world(cell.x,cell.y,.025));a.mark.position.copy(world(cell.x,cell.y,.028));}}
   for(const mat of a.materials){if(mat.userData.baseEmissive===undefined){mat.userData.baseEmissive=mat.emissive.getHex();mat.userData.baseIntensity=mat.emissiveIntensity;}
    mat.emissive.setHex(u.hitFlash>0?0xc1a18a:mat.userData.baseEmissive);mat.emissiveIntensity=u.hitFlash>0?.33:mat.userData.baseIntensity;
   }
  }
  for(const [key,a]of actors)if(!present.has(key)){releaseActor(a);actors.delete(key);}
  const casters=units.filter(u=>u.hp>0&&u.castFlash>0).sort((a,b)=>b.castFlash-a.castFlash).slice(0,2);
  castLights.forEach((l,i)=>{const u=casters[i];l.intensity=u&&presentationSettings.effects?u.castFlash*6:0;if(u){l.color.set(u.color);l.position.copy(world(u.px,u.py,1));}});
 }
 const fxMaterial=(color,opacity=.7)=>new T.MeshBasicMaterial({color,transparent:true,opacity,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});
 function makeFx(e){
  const g=new T.Group(),color=e.color||'#a5d6e5',mat=fxMaterial(color),kind=e.type==='skill'?e.hero:e.type;g.userData={kind,materials:[],parts:[]};
  function add(geo,m=mat){const n=new T.Mesh(geo,m);g.add(n);g.userData.parts.push(n);return n;}
  if(kind==='beam'){add(new T.SphereGeometry(.035,8,6));const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,.3)]),new T.LineBasicMaterial({color,transparent:true,opacity:.65}));g.add(line);}
  else if(kind==='slash'||kind==='knight'){const arc=add(new T.TorusGeometry(.50,.012,5,24,Math.PI*1.1));arc.rotation.x=-.55;}
  else if(kind==='impact'){
   for(let i=0;i<7;i++){const spark=add(new T.BoxGeometry(.009,.009,.10),fxMaterial(e.blocked?'#a4e3ed':'#ffd1a0',.85));spark.rotation.set(i*.8,i*2.399,i*.4);}
  }
  else if(kind==='oak'||kind==='warden'){const shield=add(new T.SphereGeometry(.47,20,12,0,Math.PI*2,0,Math.PI*.7),fxMaterial(color,.10));shield.scale.y=1.8;const rim=add(new T.TorusGeometry(.47,.009,5,32));rim.rotation.x=Math.PI/2;}
  else if(kind==='ember'){
   const base=add(new T.RingGeometry(.35,.42,40),fxMaterial('#ed7144',.6));base.rotation.x=-Math.PI/2;
   for(let i=0;i<8;i++){const f=add(new T.ConeGeometry(.10,.72,6,1,true),fxMaterial(i%2?'#ff9a4c':'#cf4d29',.42));const a=i*2.399;f.position.set(Math.cos(a)*.4,.35,Math.sin(a)*.4);}
  }else if(kind==='frost'||kind==='moon'){
   const ring=add(new T.RingGeometry(.35,.365,32));ring.rotation.x=-Math.PI/2;
   for(let i=0;i<4;i++){const b=add(new T.BoxGeometry(.18,.012,.018));const a=i*Math.PI/2;b.position.set(Math.cos(a)*.47,0,Math.sin(a)*.47);b.rotation.y=-a;}
  }else if(kind==='sage'){
   const ring=add(new T.RingGeometry(.28,.30,32));ring.rotation.x=-Math.PI/2;
   add(new T.BoxGeometry(.23,.045,.012)).position.y=.75;add(new T.BoxGeometry(.045,.23,.012)).position.y=.75;
  }else{const ring=add(new T.RingGeometry(.20,.225,32));ring.rotation.x=-Math.PI/2;}
  if(kind!=='beam'&&kind!=='impact'){
   const verts=new Float32Array(24*3);for(let i=0;i<24;i++){const a=i*2.399;verts[i*3]=Math.cos(a)*.3;verts[i*3+1]=.02+(i%7)*.07;verts[i*3+2]=Math.sin(a)*.3;}
   const geom=new T.BufferGeometry();geom.setAttribute('position',new T.BufferAttribute(verts,3));g.add(new T.Points(geom,new T.PointsMaterial({color,transparent:true,opacity:.65,size:.025,depthWrite:false,blending:T.AdditiveBlending})));
  }
  scene.add(g);return g;
 }
 function updateFx(){
  const valid=new Set();let count=0;
  if(presentationSettings.effects)for(const e of effects){if(e.type==='text'||e.life<=0||count++>=80)continue;valid.add(e);let g=fxNodes.get(e);if(!g){g=makeFx(e);fxNodes.set(e,g);}const t=Math.max(0,Math.min(1,1-e.life/e.total));
   const k=g.userData.kind;g.position.copy(world(e.x,e.y,k==='slash'||k==='knight'?.95:.045));g.scale.setScalar(1);
   if(k==='beam'){const a=world(e.x,e.y,1.1),b=world(e.tx,e.ty,1.1);g.position.lerpVectors(a,b,Math.min(1,t*2));g.lookAt(b);}
   else if(k==='slash'||k==='knight'){
    const sx=e.sx??e.x,sy=e.sy??e.y,tx=e.tx??e.x,ty=e.ty??e.y;
    g.position.lerpVectors(world(sx,sy,.95),world(tx,ty,.95),.65);
    g.rotation.y=Math.atan2(tx-sx,ty-sy)-1.1+t*2.2;g.scale.setScalar(.55+t*.9);
   }
   else if(k==='impact'){
    g.position.y=1.05;
    g.userData.parts.forEach((part,i)=>{const a=i*2.399,r=.025+t*.29;part.position.set(Math.cos(a)*r,Math.sin(i*1.7)*r-t*t*.16,Math.sin(a)*r);part.scale.setScalar(1-t*.7);});
   }
   else if(k==='oak'||k==='warden'){g.position.y=.6;g.scale.setScalar(.7+Math.sin(t*Math.PI)*.3);}
   else if(k==='ember'){g.scale.set(1+t*.65,.7+Math.sin(t*Math.PI)*.7,1+t*.65);}
   else if(k==='frost'||k==='moon'){g.scale.setScalar(k==='moon'?1-t*.55:.7+t*.75);g.rotation.y=k==='frost'?t*.5:0;}
   else{g.scale.setScalar(.7+t*.8);g.position.y+=k==='sage'?t*.5:0;}
   g.traverse(o=>{if(o.material){if(o.material.userData.opacity===undefined)o.material.userData.opacity=o.material.opacity;o.material.opacity=o.material.userData.opacity*Math.sin(Math.PI*Math.min(.99,t+.08));}if(o.isPoints){o.scale.setScalar(1+t*2);o.position.y=t*.3;}});
  }
  for(const [e,g]of fxNodes)if(!valid.has(e)){disposeTree(g);fxNodes.delete(e);}
 }
 function hud(){
  ctx.clearRect(0,0,W,H);
  for(const u of units){if(u.hp<=0)continue;const pos=project(u.px+.5,u.py+.5,(actors.get(u.uid)?.spec.height||1.85)+.16),w=u.id==='boss'?56:43;
   ctx.fillStyle='#0b1524d9';ctx.fillRect(pos.x-w/2-2,pos.y-2,w+4,10);ctx.fillStyle=u.team==='blue'?'#9bd5bd':'#d68a90';ctx.fillRect(pos.x-w/2,pos.y,w*Math.max(0,u.hp/u.maxHp),4);ctx.fillStyle='#7eb9d5';ctx.fillRect(pos.x-w/2,pos.y+6,w*u.mana/100,2);
   if(mode==='prep'||u.id===selected&&u.team==='blue'||u.castFlash>0){ctx.font='10px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#0a1525';ctx.fillStyle='#e8eef0';const name=u.team==='red'?(u.id==='boss'?'寂蚀终端':'寂蚀拟态'):heroText(u).name;ctx.strokeText(name,pos.x,pos.y-7);ctx.fillText(name,pos.x,pos.y-7);}
  }
  for(const e of effects)if(e.type==='text'){const p=project(e.x+.5,e.y+.5,1.9),t=1-e.life/e.total;ctx.save();ctx.globalAlpha=Math.min(1,e.life/e.total*1.8);ctx.font='600 13px sans-serif';ctx.textAlign='center';ctx.strokeStyle='#0a1423';ctx.lineWidth=3;ctx.fillStyle=e.color;ctx.strokeText(e.text,p.x,p.y-t*25);ctx.fillText(e.text,p.x,p.y-t*25);ctx.restore();}
  ctx.font='10px sans-serif';ctx.textAlign='left';ctx.fillStyle='#d2e2e8b0';ctx.fillText(mode==='prep'?'TACTICAL OVERLAY / 战前部署':'LIVE FIELD / 现场战斗',16,22);
 }
 let lastTime=0;
 function render(){
  if(!start())return false;if(failed)return false;resize();setTheme();camera.updateMatrixWorld();
  const dt=Math.max(0,Math.min(.1,visualTime-lastTime));lastTime=visualTime;if(!paused)clock+=dt*speed;
  grid.visible=mode==='prep'||presentationSettings.grid===true;preview.visible=mode==='prep';weather.visible=presentationSettings.effects&&quality!=='low';
  if(weather.visible&&!paused){for(let i=0;i<100;i++){weatherPositions[i*3+1]-=dt*(stage%5===0?6:.25);if(weatherPositions[i*3+1]<0)weatherPositions[i*3+1]=7;}weather.geometry.attributes.position.needsUpdate=true;}
  updateActors(dt*speed);updateFx();renderer.render(scene,camera);hud();$('#timer').textContent=formatTime(elapsed);renderCombatHud();return true;
 }
 return {render,project,pick,pickUnit,get active(){return active&&!failed;},get stats(){return renderer?{drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,models:actors.size,quality}:null;}};
})();
