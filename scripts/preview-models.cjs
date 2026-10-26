// Offline geometry contact sheet, NOT a screenshot or a WebGL visual acceptance test.
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=path.join(__dirname,'..'),T=require(path.join(root,'assets/vendor/three.js'));global.THREE=T;
const M=require(path.join(root,'character-models.js')),cw=400,ch=490,light=new T.Vector3(-3,6,5).normalize();
const camera=new T.PerspectiveCamera(30,cw/ch,.1,30);camera.position.set(2.7,2.6,4.8);camera.lookAt(0,.95,0);camera.updateMatrixWorld();
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="980"><rect width="100%" height="100%" fill="#172431"/>';
Object.keys(M.CAST).forEach((id,i)=>{const model=M.build(id);M.pose(model,0);model.root.updateMatrixWorld(true);const faces=[];
 model.root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,idx=o.geometry.index,normalMatrix=new T.Matrix3().getNormalMatrix(o.matrixWorld);
  for(let j=0;j<(idx?idx.count:p.count);j+=3){const points=[],norm=new T.Vector3();for(let k=0;k<3;k++){const index=idx?idx.getX(j+k):j+k;points.push(new T.Vector3().fromBufferAttribute(p,index).applyMatrix4(o.matrixWorld));norm.add(new T.Vector3().fromBufferAttribute(o.geometry.attributes.normal,index).applyMatrix3(normalMatrix));}
   const center=points.reduce((a,b)=>a.add(b),new T.Vector3()).multiplyScalar(1/3);norm.normalize();if(norm.dot(camera.position.clone().sub(center))<0)continue;
   const color=o.material.color.clone().multiplyScalar(.42+.70*Math.max(0,norm.dot(light)));color.add(o.material.emissive.clone().multiplyScalar(.25));
   const projected=points.map(v=>v.project(camera));faces.push({z:projected.reduce((a,v)=>a+v.z,0)/3,shape:'<path d="M'+projected.map(v=>((v.x+1)*cw/2).toFixed(2)+','+((1-v.y)*ch/2).toFixed(2)).join('L')+'Z" fill="#'+color.getHexString()+'"/>'});
  }
 });
 svg+='<g transform="translate('+(i%4*cw)+','+(Math.floor(i/4)*ch)+')"><rect x="8" y="8" width="384" height="474" rx="10" fill="#233440"/><ellipse cx="200" cy="410" rx="73" ry="20" fill="#101c27"/>'+faces.sort((a,b)=>b.z-a.z).map(f=>f.shape).join('')+'<text x="200" y="464" text-anchor="middle" fill="#d9e4e7" font-family="Microsoft YaHei,sans-serif" font-size="18">'+model.spec.name+' · '+model.spec.height.toFixed(2)+' m</text></g>';model.dispose();
});
svg+='</svg>';sharp(Buffer.from(svg)).png().toFile(path.join(root,'assets/models/model-preview.png')).then(()=>console.log('Wrote geometry contact sheet (CPU preview)'));
