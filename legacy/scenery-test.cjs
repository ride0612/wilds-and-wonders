const assert=require('node:assert/strict');global.THREE=require('./assets/vendor/three.js');
const scenery=require('./battle-scenery.js'),models=require('./character-models.js');
assert.equal(scenery.CONFIG.length,20);assert.equal(new Set(scenery.CONFIG.map(c=>c.label)).size,20);
const stats=[];
for(let i=0;i<20;i++){
 const s=scenery.build(i),{staticParts,batches,landmarks,solids}=s.root.userData;assert.ok(landmarks.length>=2,'story landmarks '+i);assert.ok(batches<=12,'bounded static draw calls '+i);assert.ok(staticParts/batches>10,'instancing used '+i);
 for(const p of solids)assert.ok(p.x+p.w/2<=-6.2||p.x-p.w/2>=6.2||p.z+p.d/2<=-4.65||p.z-p.d/2>=4.65,'prop overlaps usable cells at stage '+i+': '+JSON.stringify(p));
 const materials=new Set(),geometries=new Set();let instances=0;
 s.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);if(o.isInstancedMesh){instances+=o.count;assert.ok(o.instanceColor);for(const v of o.instanceMatrix.array)assert.ok(Number.isFinite(v));}});
 assert.equal(instances,staticParts);s.update(2,'high',true);s.update(2,'balanced',true);s.update(2,'low',false);
 const weather=s.root.children.find(o=>o.isLineSegments);assert.equal(weather.visible,false);assert.ok([...weather.geometry.attributes.position.array].every(Number.isFinite));
 let freed=0;for(const m of [...materials,...geometries])m.addEventListener('dispose',()=>freed++);s.dispose();s.dispose();assert.equal(freed,materials.size+geometries.size,'single disposal per resource');
 stats.push({stage:i+1,location:s.config.label,parts:staticParts,batches});
}
for(const id of Object.keys(models.CAST)){
 function walk(fps){const m=models.build(id);models.pose(m,0);for(let f=1;f<=fps;f++)models.animate(m,{time:f/fps,distance:1.8/fps,move:1,attack:0,turn:.3},1/fps);return m;}
 const a=walk(30),b=walk(120);assert.ok(Math.abs(a.motionState.phase-b.motionState.phase)<1e-10,'distance-driven steps');assert.ok(a.joints.legL.quaternion.angleTo(b.joints.legL.quaternion)<.12,'frame-rate stable walk '+id);
 const q=a.joints.armR.quaternion.clone();models.animate(a,{time:1.02,distance:0,move:0,attack:1,cast:1,hit:1},1/60);assert.ok(q.angleTo(a.joints.armR.quaternion)<.5,'no hard attack snap '+id);
 const frozen=a.joints.armR.quaternion.clone();models.animate(a,{time:10,distance:8,move:1,attack:0},0);assert.deepEqual(frozen.toArray(),a.joints.armR.quaternion.toArray(),'pause does not advance pose');
 for(let f=0;f<120;f++)models.animate(a,{time:2+f/60,distance:0,move:0},1/60);assert.ok(a.motionState.move<.0001,'smooth stop reaches rest');assert.ok(Math.abs(a.joints.legL.rotation.x)<.003,'legs settle at rest');a.dispose();b.dispose();
}
console.log(JSON.stringify(stats));
console.log('PASS: 20 locations, narrative landmarks, unobstructed ground, static instancing budgets, weather tiers, resource disposal, distance-driven gait, 30/120 Hz convergence, smooth attack/stop and pause');
