// Self-contained glTF 2.0 exporter for this project's rigid articulated models.
// No images, external buffers, browser, or network required.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');globalThis.THREE=require(path.join(root,'assets/vendor/three.js'));
const models=require(path.join(root,'character-models.js'));
const names={oak:'fingel',arrow:'fangqing',ember:'chuzihang',sage:'shenlan',knight:'caesar',frost:'nono',warden:'lumingfei',moon:'zero'};
function exportModel(id){
 const model=models.build(id),doc={asset:{version:'2.0',generator:'Never Yield articulated mesh exporter'},scene:0,scenes:[{nodes:[0]}],nodes:[],meshes:[],materials:[],accessors:[],bufferViews:[],buffers:[],animations:[]},chunks=[];
 let offset=0;const nodes=new Map(),mats=new Map();
 function accessor(array,size,type,target){
  const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength),index=doc.accessors.length;
  const view={buffer:0,byteOffset:offset,byteLength:bytes.length};if(target)view.target=target;
  const a={bufferView:doc.bufferViews.length,componentType:array instanceof Float32Array?5126:array instanceof Uint32Array?5125:5123,count:array.length/size,type};
  if(size===3||type==='SCALAR'){a.min=Array(size).fill(Infinity);a.max=Array(size).fill(-Infinity);for(let i=0;i<array.length;i++){const j=i%size;a.min[j]=Math.min(a.min[j],array[i]);a.max[j]=Math.max(a.max[j],array[i]);}}
  doc.bufferViews.push(view);doc.accessors.push(a);chunks.push(bytes);offset+=bytes.length;const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}return index;
 }
 function material(m){if(mats.has(m))return mats.get(m);const i=doc.materials.length;mats.set(m,i);doc.materials.push({name:'surface-'+i,pbrMetallicRoughness:{baseColorFactor:[m.color.r,m.color.g,m.color.b,1],metallicFactor:m.metalness,roughnessFactor:m.roughness},emissiveFactor:[m.emissive.r,m.emissive.g,m.emissive.b].map(v=>v*m.emissiveIntensity)});return i;}
 function visit(o){const i=doc.nodes.length;nodes.set(o,i);const n={name:o.name||'part-'+i,translation:o.position.toArray(),rotation:o.quaternion.toArray(),scale:o.scale.toArray()};doc.nodes.push(n);
  if(o.isMesh){const g=o.geometry,attrs={};for(const [key,semantic]of [['position','POSITION'],['normal','NORMAL']])attrs[semantic]=accessor(g.attributes[key].array,3,'VEC3',34962);
   const primitive={attributes:attrs,material:material(o.material)};if(g.index)primitive.indices=accessor(g.index.array,1,'SCALAR',34963);n.mesh=doc.meshes.length;doc.meshes.push({primitives:[primitive]});}
  if(o.children.length)n.children=o.children.map(visit);return i;
 }
 visit(model.root);doc.nodes[0].extras=model.root.userData;
 const joints=Object.values(model.joints);
 for(const [name,duration,args]of [['idle',2,t=>[0,0,0,0]],['walk',Math.PI*2/9,t=>[1,0,0,0]],['attack',.56,t=>[0,Math.sin(t/.56*Math.PI),0,0]],['skill',.85,t=>[0,0,Math.sin(t/.85*Math.PI),0]]]){
  const times=Float32Array.from({length:17},(_,i)=>i*duration/16),input=accessor(times,1,'SCALAR'),samples=new Map(joints.map(j=>[j,{rotation:[],translation:[]}])) ;
  for(const t of times){models.pose(model,t,...args(t));for(const j of joints){samples.get(j).rotation.push(...j.quaternion.toArray());samples.get(j).translation.push(...j.position.toArray());}}
  const animation={name,channels:[],samplers:[]};
  for(const j of joints)for(const property of ['rotation','translation']){const output=accessor(new Float32Array(samples.get(j)[property]),property==='rotation'?4:3,property==='rotation'?'VEC4':'VEC3');animation.channels.push({sampler:animation.samplers.length,target:{node:nodes.get(j),path:property}});animation.samplers.push({input,output,interpolation:'LINEAR'});}
  doc.animations.push(animation);
 }
 doc.buffers.push({byteLength:offset});const json=Buffer.from(JSON.stringify(doc)),padding=(4-json.length%4)%4,jchunk=Buffer.concat([json,Buffer.alloc(padding,0x20)]),bin=Buffer.concat(chunks),header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);
 header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+jchunk.length+8+bin.length,8);jh.writeUInt32LE(jchunk.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
 const output=path.join(root,'assets/models',names[id]+'.glb');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,Buffer.concat([header,jh,jchunk,bh,bin]));model.dispose();console.log(names[id]+': '+doc.meshes.length+' meshes, '+joints.length+' joints, 4 animations');
}
for(const id of Object.keys(names))exportModel(id);
