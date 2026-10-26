(function(global){
'use strict';
const T=global.THREE;
// Metres, adult proportions. The head is about 1/7.4 of standing height.
const CAST={
 oak:{name:'芬格尔',height:1.90,width:1.16,coat:0x30433a,pants:0x30363b,hair:0x9a9078,skin:0xd6b79b,accent:0xbcb69b,hairStyle:'messy',gear:'shield',coatLength:.22},
 arrow:{name:'方晴',height:1.66,width:.87,coat:0xcc6d22,pants:0x343d45,hair:0x3b2721,skin:0xe2bda4,accent:0xf4bb65,hairStyle:'bob',gear:'beacon',coatLength:.20},
 ember:{name:'楚子航',height:1.82,width:.96,coat:0x202733,pants:0x252c35,hair:0x171a20,skin:0xdec1ad,accent:0xc55739,hairStyle:'short',gear:'katana',coatLength:.61},
 sage:{name:'沈岚',height:1.72,width:.89,coat:0xd6dedf,pants:0x354650,hair:0x252d33,skin:0xdec2ac,accent:0x63c4c7,hairStyle:'bob',gear:'tablet',coatLength:.57},
 knight:{name:'凯撒',height:1.90,width:1.06,coat:0xe5dfc9,pants:0x242a32,hair:0xc8a45e,skin:0xdfbda1,accent:0xd5ae5b,hairStyle:'long',gear:'knife',coatLength:.55},
 frost:{name:'诺诺',height:1.70,width:.88,coat:0x263f37,pants:0x242c36,hair:0xa13824,skin:0xe6c0aa,accent:0xe6aa8d,hairStyle:'ponytail',gear:'scanner',coatLength:.32},
 warden:{name:'路明非',height:1.77,width:.92,coat:0x2a443c,pants:0x34383d,hair:0x202025,skin:0xdfbea5,accent:0x90b39a,hairStyle:'messy',gear:'shield',coatLength:.23},
 moon:{name:'零',height:1.62,width:.80,coat:0xdddfe0,pants:0x232b34,hair:0xd0c4a5,skin:0xead1bb,accent:0x9ec7df,hairStyle:'bob',gear:'rifle',coatLength:.49}
};
const up=new T.Vector3(0,1,0);
function build(id,enemy=false){
 const spec=CAST[id]||{...CAST.ember,height:2.35,width:1.28,gear:'blade'};
 const root=new T.Group();root.name=enemy?'寂蚀拟态':spec.name;
 root.userData={id,normalProportions:true,headRatio:7.4,units:'metres',enemy};
 const materials=new Map(),joints={},meshes=[];
 const material=(hex,metal=.05,rough=.72,emissive=0)=>{
  const key=[hex,metal,rough,emissive].join(':');if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color:hex,metalness:metal,roughness:rough,emissive,emissiveIntensity:emissive?.6:0}));return materials.get(key);
 };
 const cloth=material(enemy?0x20232d:spec.coat),pants=material(enemy?0x151a24:spec.pants),skin=material(enemy?0x383746:spec.skin),hair=material(enemy?0x1b1b27:spec.hair),boots=material(0x1b2027,.15,.48),white=material(enemy?0x3b3447:0xd6dcd9),trim=material(enemy?0x8b4764:spec.accent,.35,.38),metal=material(0xaab6bf,.8,.27),dark=material(0x131b23,.4,.4),glow=material(enemy?0xc4587b:spec.accent,.25,.4,enemy?0x8b1641:spec.accent);
 const attach=(parent,geo,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);meshes.push(m);return m;};
 const oval=(p,x,y,z,rx,ry,rz,mat)=>attach(p,new T.SphereGeometry(1,12,10),mat,x,y,z,rx,ry,rz);
 const box=(p,x,y,z,w,h,d,mat)=>attach(p,new T.BoxGeometry(w,h,d),mat,x,y,z);
 const rod=(p,a,b,r,mat,r2=r)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av);const m=attach(p,new T.CylinderGeometry(r2,r,v.length(),10),mat);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(up,v.normalize());return m;};
 function shell(parent,rings,mat,segments=20){
  const positions=[],indices=[];
  for(const [y,rx,rz,z=0]of rings)for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2;positions.push(Math.cos(a)*rx,y,Math.sin(a)*rz+z);}
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return attach(parent,g,mat);
 }
 const joint=(parent,name,x,y,z)=>{const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);joints[name]=g;return g;};
 const hips=joint(root,'hips',0,1.00,0);hips.scale.x=spec.width;
 oval(hips,0,.035,0,.155,.13,.104,pants);
 const spine=joint(hips,'spine',0,.10,0);
 shell(spine,[[-.055,.162,.102],[.04,.147,.095],[.21,.178,.106],[.34,.205,.107],[.40,.15,.085]],cloth);
 // Shirt, tailored lapels, belt, shoulder seams and pockets are mesh details, not painted miniatures.
 box(spine,0,.245,.105,.092,.29,.014,white);box(spine,0,-.035,.103,.30,.035,.018,dark);box(spine,0,-.035,.119,.036,.027,.01,metal);
 for(const side of [-1,1]){const lapel=box(spine,side*.067,.285,.124,.052,.24,.014,cloth);lapel.rotation.z=side*-.22;box(spine,side*.115,.095,.105,.062,.055,.014,cloth);rod(spine,[side*.10,.115,.118],[side*.148,.115,.118],.004,trim);}
 for(let i=0;i<4;i++)oval(spine,.025,.04+i*.075,.12,.005,.005,.004,trim);
 const tie=box(spine,0,.245,.127,.022,.22,.012,pants);tie.rotation.z=id==='warden'?.12:0;
 const tails=joint(hips,'coat',0,.025,-.02);
 shell(tails,[[-spec.coatLength,.20,.127],[ -.08,.166,.112],[.02,.16,.105]],cloth);
 if(spec.coatLength>.3){box(tails,0,-spec.coatLength*.55,.13,.032,spec.coatLength*.8,.014,pants);for(const side of [-1,1])rod(tails,[side*.17,-spec.coatLength,.075],[side*.15,-.04,.10],.004,trim);}
 const head=joint(spine,'head',0,.47,0);
 rod(head,[0,-.06,0],[0,.015,0],.046,skin);
 oval(head,0,.075,.004,.092,.126,.096,skin);oval(head,0,.012,.042,.067,.065,.067,skin);
 for(const side of [-1,1]){
  oval(head,side*.092,.066,0,.015,.032,.019,skin);
  oval(head,side*.034,.085,.091,.024,.009,.007,white);
  oval(head,side*.034,.085,.097,.010,.009,.004,material(enemy?0xe66d9d:id==='ember'?0xcb9b45:0x4c6574,.2,.25,enemy?0xac204b:0));
  rod(head,[side*.013,.103,.095],[side*.057,.105,.086],.004,hair);
 }
 oval(head,0,.057,.103,.012,.021,.018,skin);rod(head,[-.024,.020,.092],[.024,.020,.092],.003,material(0xa47b70));
 attach(head,new T.SphereGeometry(.102,16,10,0,Math.PI*2,0,1.78),hair,0,.096,-.006,1,1.12,1.03);
 // Layered, individually oriented hair locks make each silhouette readable from above.
 for(let i=0;i<11;i++){
  const a=(i/10)*Math.PI*1.65+.6,px=Math.cos(a)*.086,pz=Math.sin(a)*.082;
  const lock=attach(head,new T.ConeGeometry(.025,spec.hairStyle==='short'?.092:.13,5),hair,px,.075,pz);
  lock.rotation.x=Math.cos(a)*.55;lock.rotation.z=Math.sin(a)*.38+Math.PI;
 }
 if(spec.hairStyle==='bob'||spec.hairStyle==='long')for(const side of [-1,1]){
  const length=spec.hairStyle==='long'?.29:.16;
  oval(head,side*.088,.065-length*.42,-.015,.034,length*.58,.081,hair);
  oval(head,side*.04,.025-length*.46,-.078,.048,length*.58,.027,hair);
 }
 if(spec.hairStyle==='messy')for(let i=0;i<6;i++){const lock=attach(head,new T.ConeGeometry(.028,.09,5),hair,(i-2.5)*.026,.19,-.015);lock.rotation.z=(i-3)*.18;lock.rotation.x=.3;}
 if(spec.hairStyle==='ponytail'){const pony=joint(head,'ponytail',0,.155,-.075);oval(pony,0,-.10,-.045,.048,.18,.055,hair);oval(pony,.035,-.26,-.07,.035,.12,.04,hair);box(pony,0,-.006,-.005,.055,.025,.04,trim);for(const side of [-1,1])rod(head,[side*.10,.043,.01],[side*.10,.002,.015],.004,metal);}
 if(spec.gear==='tablet')for(const side of [-1,1]){
  const frame=attach(head,new T.TorusGeometry(.028,.0025,5,12),dark,side*.035,.083,.106);frame.scale.y=.65;
  rod(head,[-.009,.084,.109],[.009,.084,.109],.002,dark);
 }
 if(['beacon','scanner'].includes(spec.gear)){
  oval(head,-.10,.07,0,.022,.035,.024,dark);rod(head,[-.11,.05,.01],[-.06,.015,.105],.003,dark);oval(head,-.06,.015,.105,.009,.006,.006,metal);
 }
 if(enemy){box(head,0,.06,.101,.148,.087,.018,dark);box(head,0,.081,.114,.118,.012,.008,glow);}
 for(const side of [-1,1]){
  const tag=side<0?'L':'R';
  const leg=joint(hips,'leg'+tag,side*.095,-.015,0);
  shell(leg,[[-.44,.056,.059],[-.34,.070,.078],[-.16,.087,.084],[.015,.088,.090]],pants,14);
  const knee=joint(leg,'knee'+tag,0,-.44,0);oval(knee,0,0,.01,.059,.065,.064,pants);
  shell(knee,[[-.43,.035,.040],[-.27,.054,.054],[-.1,.062,.064],[.01,.055,.06]],pants,14);
  const foot=joint(knee,'foot'+tag,0,-.43,0);oval(foot,0,-.052,.045,.053,.067,.104,boots);box(foot,0,-.104,.048,.102,.022,.18,boots);rod(foot,[-.039,-.019,.052],[.039,-.019,.052],.006,metal);
  const arm=joint(spine,'arm'+tag,side*.205,.34,0);arm.rotation.z=side*.08;
  oval(arm,0,-.02,0,.067,.084,.070,cloth);
  shell(arm,[[-.29,.045,.046],[-.15,.058,.057],[.015,.062,.066]],cloth,12);
  const elbow=joint(arm,'elbow'+tag,0,-.29,0);oval(elbow,0,0,0,.046,.050,.049,cloth);
  shell(elbow,[[-.255,.031,.034],[-.13,.042,.046],[.01,.045,.047]],cloth,12);box(elbow,0,-.245,0,.069,.023,.070,trim);
  const hand=joint(elbow,'hand'+tag,0,-.29,.005);oval(hand,0,0,.012,.033,.047,.026,skin);
 }
 const hand=joints.handR,offhand=joints.handL;
 if(['katana','knife','blade'].includes(spec.gear)){
  const bladeLength=spec.gear==='knife'?.38:.77;
  rod(hand,[0,0,0],[0,.14,0],.018,dark);box(hand,0,.13,0,.12,.018,.055,trim);
  const blade=box(hand,0,.14+bladeLength*.5,0,.037,bladeLength,.012,metal);blade.rotation.z=-.025;
  attach(hand,new T.ConeGeometry(.022,.10,3),metal,-.011,.14+bladeLength,0).rotation.y=Math.PI/2;
  const scabbard=box(hips,-.19,-.18,-.06,.043,.78,.04,dark);scabbard.rotation.z=-.3;
 }else if(spec.gear==='rifle'){
  const grip=new T.Group();hand.add(grip);grip.rotation.x=1.2;
  box(grip,0,.11,.07,.055,.11,.28,dark);box(grip,0,.16,-.09,.075,.12,.17,pants);
  rod(grip,[0,.13,.14],[0,.13,.59],.014,metal);box(grip,0,.085,.05,.035,.14,.075,dark);
  rod(grip,[0,.22,-.02],[0,.22,.13],.019,dark);
 }else if(spec.gear==='shield'){
  const shield=box(offhand,0,-.01,.055,.29,.47,.055,pants);shield.rotation.x=-.08;
  box(offhand,0,.14,.09,.22,.065,.012,metal);box(offhand,0,-.11,.09,.024,.21,.012,trim);
  box(spine,.18,-.06,-.07,.13,.19,.08,material(0x5c4c3c));rod(spine,[-.16,.35,.12],[.14,-.05,.13],.012,boots);
 }else{
  const tab=box(offhand,0,.06,.045,.17,.23,.022,dark);tab.rotation.x=-.6;
  const screen=box(offhand,0,.067,.059,.144,.188,.005,glow);screen.rotation.x=-.6;
  if(spec.gear==='beacon'){oval(hand,0,.025,0,.045,.034,.045,dark);oval(hand,0,.06,0,.026,.027,.026,glow);}
 }
 if(spec.gear==='tablet'){
  const drone=joint(root,'drone',.45,1.38,.12);oval(drone,0,0,0,.085,.065,.085,white);oval(drone,0,0,.076,.035,.035,.012,glow);
  for(const side of [-1,1]){box(drone,side*.1,.02,0,.12,.018,.10,dark);rod(drone,[side*.10,.02,-.08],[side*.10,.02,.08],.008,metal);}
 }
 root.scale.setScalar(spec.height/1.84);root.userData.height=spec.height;root.userData.gear=spec.gear;
 root.updateMatrixWorld(true);
 // Merge rigid parts within each articulation, preserving editable joint hierarchy.
 function mergeRigid(group){
  for(const child of [...group.children])if(child.isGroup)mergeRigid(child);
  const batches=new Map();for(const child of [...group.children])if(child.isMesh){const list=batches.get(child.material)||[];list.push(child);batches.set(child.material,list);}
  for(const [mat,list]of batches){if(list.length<2)continue;const pos=[],norm=[],idx=[];let offset=0;
   for(const m of list){m.updateMatrix();const g=m.geometry.clone().applyMatrix4(m.matrix),p=g.attributes.position,n=g.attributes.normal;pos.push(...p.array);norm.push(...n.array);const a=g.index?g.index.array:Array.from({length:p.count},(_,i)=>i);for(const i of a)idx.push(i+offset);offset+=p.count;group.remove(m);g.dispose();m.geometry.dispose();}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setIndex(idx);attach(group,g,mat);
  }
 }
 mergeRigid(root);
 const rest={};for(const [name,bone]of Object.entries(joints))rest[name]=bone.rotation.clone();
 return {root,joints,rest,spec,materials:[...materials.values()],disposed:false,dispose(){if(this.disposed)return;this.disposed=true;root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});for(const m of materials.values())m.dispose();}};
}
function pose(model,time,move=0,attack=0,cast=0,hit=0){
 const b=model.joints;for(const [name,joint]of Object.entries(b))joint.rotation.copy(model.rest[name]);
 const stride=Math.sin(time*9),swing=stride*.48*move;
 b.legL.rotation.x=swing;b.legR.rotation.x=-swing;b.kneeL.rotation.x=Math.max(0,-stride)*.65*move;b.kneeR.rotation.x=Math.max(0,stride)*.65*move;
 b.armL.rotation.x=-swing*.65;b.armR.rotation.x=swing*.65;b.hips.position.y=1+Math.sin(time*18)*.016*move;
 b.spine.rotation.x=.035*move+hit*.10;b.spine.rotation.y=Math.sin(time*9)*.025*move;b.head.rotation.x=-.04;
 b.elbowL.rotation.x=-.13;b.elbowR.rotation.x=-.13;
 b.coat.rotation.x=Math.sin(time*9+.6)*.06*move;
 if(b.ponytail)b.ponytail.rotation.x=Math.sin(time*9+.8)*.12*move;
 const gear=model.spec.gear;
 if(['rifle','beacon','scanner','tablet'].includes(gear)){
  b.armR.rotation.x=-.55-attack*.80;b.elbowR.rotation.x=-.55;b.armL.rotation.x=-.45;b.elbowL.rotation.x=-.95;
  if(gear==='rifle'){b.armR.rotation.x=-.55-attack*.07;b.armR.rotation.y=-.23;b.armL.rotation.y=.5;b.elbowR.rotation.x=-.65;b.spine.rotation.z=attack*.035;}
 }else if(gear==='shield'){
  b.armL.rotation.x=-.48-cast*.38;b.elbowL.rotation.x=-.45;b.armR.rotation.x-=attack*.7;b.spine.rotation.y=attack*.1;
 }else{
  b.armR.rotation.x=-.28-attack*1.4;b.armR.rotation.z=-.18+attack*.8;b.elbowR.rotation.x=-.25;b.spine.rotation.y=-attack*.28;
 }
 if(cast>0){b.armL.rotation.x-=cast*.4;b.spine.rotation.x-=cast*.035;}
 if(b.drone){b.drone.position.y=1.4+Math.sin(time*2.5)*.045;b.drone.rotation.y=time*.4;}
}
global.StoryModels={CAST,build,pose};if(typeof module!=='undefined')module.exports=global.StoryModels;
})(globalThis);
