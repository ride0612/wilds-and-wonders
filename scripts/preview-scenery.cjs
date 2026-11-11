// CPU mesh proof with a depth buffer; not a browser, game or GPU screenshot.
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),T=require(path.join(root,'assets/vendor/three.js'));
global.THREE=T;const S=require(path.join(root,'battle-scenery.js'));
const W=1280,H=860,camera=new T.PerspectiveCamera(35,W/H,.1,80);
camera.position.set(2.8,16.8,15.2);camera.lookAt(0,.3,-.6);camera.updateMatrixWorld();
const light=new T.Vector3(-7,12,5).normalize();
const edge=(a,b,x,y)=>(x-a.x)*(b.y-a.y)-(y-a.y)*(b.x-a.x);
function rgb(c){const s=c.clone().convertLinearToSRGB();return [s.r,s.g,s.b].map(v=>Math.round(Math.min(1,Math.max(0,v))*255));}
async function render(stage){
 const scenery=S.build(stage),pixels=Buffer.alloc(W*H*3),depth=new Float32Array(W*H).fill(Infinity),bg=rgb(new T.Color(scenery.config.fog));
 for(let i=0;i<pixels.length;i+=3){pixels[i]=bg[0];pixels[i+1]=bg[1];pixels[i+2]=bg[2];}
 scenery.root.updateMatrixWorld(true);
 function draw(mesh,matrix,tint){
  const geometry=mesh.geometry,p=geometry.attributes.position,n=geometry.attributes.normal,index=geometry.index,material=mesh.material;
  if(Array.isArray(material)||!p||!n)return;
  const normalMatrix=new T.Matrix3().getNormalMatrix(matrix),count=index?index.count:p.count;
  for(let i=0;i<count;i+=3){
   const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j),verts=ids.map(j=>new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(matrix));
   const normal=new T.Vector3();for(const j of ids)normal.add(new T.Vector3().fromBufferAttribute(n,j).applyMatrix3(normalMatrix));normal.normalize();
   const center=verts[0].clone().add(verts[1]).add(verts[2]).multiplyScalar(1/3);
   if(material.side!==T.DoubleSide&&normal.dot(camera.position.clone().sub(center))<0)continue;
   const color=material.color.clone().multiply(tint);if(!material.isMeshBasicMaterial)color.multiplyScalar(.48+.58*Math.max(0,normal.dot(light)));
   const bytes=rgb(color),v=verts.map(point=>{point.project(camera);return {x:(point.x+1)*W/2,y:(1-point.y)*H/2,z:point.z};});
   if(v.some(a=>a.z < -1 || a.z > 1))continue;
   const [a,b,c]=v,area=edge(a,b,c.x,c.y);if(Math.abs(area)<1e-8)continue;
   const left=Math.max(0,Math.floor(Math.min(...v.map(q=>q.x)))),right=Math.min(W-1,Math.ceil(Math.max(...v.map(q=>q.x))));
   const top=Math.max(0,Math.floor(Math.min(...v.map(q=>q.y)))),bottom=Math.min(H-1,Math.ceil(Math.max(...v.map(q=>q.y))));
   for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
    const u=edge(b,c,x+.5,y+.5)/area,w=edge(c,a,x+.5,y+.5)/area,t=1-u-w;if(u<0||w<0||t<0)continue;
    const z=u*a.z+w*b.z+t*c.z,k=y*W+x;if(z>=depth[k])continue;depth[k]=z;
    pixels[k*3]=bytes[0];pixels[k*3+1]=bytes[1];pixels[k*3+2]=bytes[2];
   }
  }
 }
 scenery.root.traverse(mesh=>{if(!mesh.isMesh)return;if(mesh.isInstancedMesh){const m=new T.Matrix4(),tint=new T.Color();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);mesh.getColorAt(i,tint);draw(mesh,m.premultiply(mesh.matrixWorld),tint);}}else draw(mesh,mesh.matrixWorld,new T.Color(0xffffff));});
 scenery.dispose();return sharp(pixels,{raw:{width:W,height:H,channels:3}}).resize(640,430).png().toBuffer();
}
async function main(){
 const layers=[];for(const [i,stage]of [0,2,8,10,13,18].entries()){
  const left=i%3*640,top=Math.floor(i/3)*470;layers.push({input:await render(stage),left,top});
  const label=S.CONFIG[stage].label+' · 场景几何预览';
  layers.push({input:Buffer.from(`<svg width="640" height="40"><rect width="640" height="40" fill="#14202a"/><text x="320" y="27" text-anchor="middle" font-family="Microsoft YaHei,sans-serif" font-size="20" fill="#e1e8e9">${label}</text></svg>`),left,top:top+430});
 }
 const out=path.join(root,'assets/scenery/location-preview.png');fs.mkdirSync(path.dirname(out),{recursive:true});
 await sharp({create:{width:1920,height:940,channels:3,background:'#14202a'}}).composite(layers).png().toFile(out);console.log('Wrote CPU scene geometry preview: '+out);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
