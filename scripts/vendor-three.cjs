// Reproducible classic-script packaging: no CDN or ES-module fetch at runtime.
const fs=require('fs'),crypto=require('crypto');
const source=fs.readFileSync('.build/three-source/package/build/three.cjs','utf8');
const pkg=JSON.parse(fs.readFileSync('.build/three-source/package/package.json','utf8'));
if(pkg.version!=='0.180.0'||/require\(/.test(source))throw Error('Unexpected Three.js package');
fs.mkdirSync('assets/vendor',{recursive:true});
fs.writeFileSync('assets/vendor/three.js','(function(){\nconst exports={};\n'+source+'\nglobalThis.THREE=exports;if(typeof module!=="undefined")module.exports=exports;\n})();\n');
fs.copyFileSync('.build/three-source/package/LICENSE','assets/vendor/THREE-LICENSE.txt');
fs.writeFileSync('assets/vendor/README.md','# Three.js\n\nVersion 0.180.0, MIT. Source: https://registry.npmjs.org/three/-/three-0.180.0.tgz\n\nThe unmodified CommonJS distribution is wrapped as a classic script so the game remains playable through file:// without a server or network. Rebuild with `node scripts/vendor-three.cjs` after extracting the official package to `.build/three-source/package`.\n\nSource SHA-256: `'+crypto.createHash('sha256').update(source).digest('hex')+'`.\n');
console.log('Vendored Three.js '+pkg.version);
