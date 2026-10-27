const fs=require('node:fs'),assert=require('node:assert/strict');
global.THREE=require('./assets/vendor/three.js');const T=global.THREE,models=require('./character-models.js');
const names=['fingel','fangqing','chuzihang','shenlan','caesar','nono','lumingfei','zero'];
for(const [i,id]of Object.keys(models.CAST).entries()){
 const m=models.build(id);m.root.updateMatrixWorld(true);const size=new T.Box3().setFromObject(m.root).getSize(new T.Vector3());
 assert.ok(size.y>1.5&&size.y<2.15,id+' adult standing height');assert.ok(size.x<1.25,id+' human width');
 let triangles=0;m.root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;assert.ok([...p.array].every(Number.isFinite));for(const index of o.geometry.index?.array||[])assert.ok(index<p.count);triangles+=(o.geometry.index?.count||p.count)/3;});assert.ok(triangles>3000&&triangles<18000);
 models.pose(m,.17,1);assert.ok(Math.abs(m.joints.legL.rotation.x-m.joints.legR.rotation.x)>.4,'articulated walking');
 models.pose(m,0,0,1);assert.ok(Math.abs(m.joints.armR.rotation.x)>.5||id==='frost'||id==='arrow'||id==='sage','attack pose');m.dispose();m.dispose();
 const bytes=fs.readFileSync('assets/models/'+names[i]+'.glb');assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+length).toString()),bin=bytes.subarray(28+length);
 assert.equal(doc.buffers[0].byteLength,bin.length);assert.equal(doc.nodes[0].extras.normalProportions,true);assert.equal(doc.animations.length,4);
 const sizes={SCALAR:1,VEC3:3,VEC4:4},componentSizes={5126:4,5125:4,5123:2};
 for(const a of doc.accessors){const v=doc.bufferViews[a.bufferView];assert.equal(v.byteOffset%4,0);assert.ok(v.byteOffset+v.byteLength<=bin.length);assert.equal(a.count*sizes[a.type]*componentSizes[a.componentType],v.byteLength);if(a.componentType===5126)for(let k=v.byteOffset;k<v.byteOffset+v.byteLength;k+=4)assert.ok(Number.isFinite(bin.readFloatLE(k)));}
 for(const mesh of doc.meshes)for(const p of mesh.primitives){const a=doc.accessors[p.indices],v=doc.bufferViews[a.bufferView],max=doc.accessors[p.attributes.POSITION].count;for(let k=0;k<a.count;k++){const n=a.componentType===5123?bin.readUInt16LE(v.byteOffset+k*2):bin.readUInt32LE(v.byteOffset+k*4);assert.ok(n<max);}}
 for(const anim of doc.animations)for(const channel of anim.channels){assert.ok(doc.nodes[channel.target.node]);const s=anim.samplers[channel.sampler];assert.equal(doc.accessors[s.input].count,doc.accessors[s.output].count);}
}
console.log('PASS: eight adult-proportion meshes, articulated poses, valid GLB buffers/indices and four animation tracks');

// Real Three scene graph, camera, raycaster and geometries; replace ONLY GPU submission.
// This tests game/renderer integration, not actual WebGL output or performance.
const {run,context}=require('./narrative-test.cjs');
run(`
 let capturedRenderer;
 THREE.WebGLRenderer=class{
  constructor({canvas}){this.domElement=canvas;this.shadowMap={};this.info={render:{calls:0,triangles:0}};capturedRenderer=this;}
  setPixelRatio(n){this.pixelRatio=n;}setSize(w,h){this.size=[w,h];}dispose(){}
  render(scene,camera){this.scene=scene;this.camera=camera;scene.updateMatrixWorld(true);}
 };
 const originalCreate=document.createElement;document.createElement=()=>({...originalCreate(),addEventListener(name,fn){this[name]=fn},remove(){}});
 canvas.parentElement={insertBefore(){},getBoundingClientRect(){return {left:0,top:0}}};
 canvas.getBoundingClientRect=()=>({left:0,top:0,width:960,height:660});window.devicePixelRatio=2;
 for(const name of ['clearRect','fillRect','strokeText'])ctx[name]=()=>{};
 currentView='adventure';$('#chapter-mission').hidden=false;stage=0;prepare();paused=false;visualTime=1;draw();
`);
assert.equal(run('Battle3D.active'),true);
for(let y=0;y<6;y++)for(let x=0;x<8;x++){
 const result=run(`(()=>{const p=project(${x}+.5,${y}+.5);return {p,cell:boardCell(p)};})()`);assert.equal(result.cell.x,x);assert.equal(result.cell.y,y);assert.ok(result.p.x>0&&result.p.x<960&&result.p.y>0&&result.p.y<660,'visible battlefield');
}
run(`units=[createUnit('ember','blue',3,3)];visualTime+=.05;Battle3D.render();`);
assert.equal(run(`Battle3D.pickUnit(Battle3D.project(3.5,3.5,1.2)).id`),'ember','mesh body click selects the correct person');
run(`units[0].hp=0;visualTime+=.1;Battle3D.render();for(let i=0;i<9;i++){visualTime+=.1;Battle3D.render();}`);
assert.equal(run(`capturedRenderer.scene.children.some(o=>o.userData.id==='ember')`),false,'defeated actor releases its mesh');
assert.equal(run(`capturedRenderer.scene.getObjectByName('protection-blue-ember')`),undefined,'defeated actor releases its shield field');
run(`units=[createUnit('ember','blue',3,3)];visualTime+=.05;Battle3D.render();`);
assert.equal(run(`capturedRenderer.scene.children.filter(o=>o.userData.id==='ember').length`),1,'retry does not duplicate a cached model');
assert.equal(run(`capturedRenderer.scene.children.find(o=>o.userData.id==='ember').visible`),true,'retry revives the newly created model');
run(`units[0].x=4;units[0].faceX=1;units[0].faceY=0;visualTime+=.1;Battle3D.render();paused=true;`);
const pose=run(`capturedRenderer.scene.children.find(o=>o.userData.id==='ember').getObjectByName('legL').rotation.x`);run('Battle3D.render()');assert.equal(run(`capturedRenderer.scene.children.find(o=>o.userData.id==='ember').getObjectByName('legL').rotation.x`),pose,'pause freezes articulation');
for(const quality of ['low','balanced','high']){run('presentationSettings.quality='+JSON.stringify(quality)+';Battle3D.render()');assert.equal(run('capturedRenderer.shadowMap.enabled'),quality!=='low');}
run(`paused=false;stage=1;prepare();visualTime+=.1;Battle3D.render();presentationSettings.effects=true;effects=Object.keys(STORY_CAST).map((hero,i)=>({type:'skill',hero,x:i%8,y:2,sx:0,sy:0,color:'#88bbff',life:.6,total:1}));effects.push({type:'beam',x:0,y:0,tx:1,ty:2,color:'#fff',life:.1,total:.3});Battle3D.render();`);
assert.equal(run('capturedRenderer.scene.children.filter(o=>o.userData.kind).length'),9,'all skill families and projectile are present');
run('presentationSettings.effects=false;Battle3D.render()');assert.equal(run('capturedRenderer.scene.children.filter(o=>o.userData.kind).length'),0,'effects toggle releases active nodes');
run("stage=0;prepare();mode='fight';paused=false;presentationSettings.effects=true;units=[createUnit('oak','blue',3,3)];units[0].shield=150;visualTime+=.1;Battle3D.render()");
assert.equal(run("capturedRenderer.scene.getObjectByName('protection-blue-oak').visible"),true,'shield remains visible between skill casts');
run('damage(units[0],40);Battle3D.render()');assert.equal(run('units[0].shield'),110);assert.equal(run('units[0].hp'),run('units[0].maxHp'),'shield feedback does not alter damage rules');
assert.equal(run("capturedRenderer.scene.children.some(o=>o.userData.kind==='impact')"),true,'impact sparks generated by real damage event');
run('units[0].shield=0;Battle3D.render()');assert.equal(run("capturedRenderer.scene.getObjectByName('protection-blue-oak').visible"),false,'depleted shield disappears');
run("effects=[{type:'slash',x:1,y:1,tx:2,ty:1,color:'#fff',life:.15,total:.3}];Battle3D.render()");
assert.ok(Math.abs(run("capturedRenderer.scene.children.find(o=>o.userData.kind==='slash').rotation.y")-Math.PI/2)<1e-8,'melee arc follows target direction');
run('units=[];Battle3D.render()');assert.equal(run('Battle3D.stats.models'),0,'removing all combatants releases model cache');
run(`capturedRenderer.domElement.webglcontextlost({preventDefault(){}})`);assert.equal(run('Battle3D.active'),false);assert.equal(run('Battle3D.render()'),false,'lost WebGL context routes to compatibility view');
console.log('PASS: projection/picking, human mesh selection, death/retry lifecycle, pause, quality, defense scene, VFX cleanup and context-loss fallback (GPU not exercised)');
