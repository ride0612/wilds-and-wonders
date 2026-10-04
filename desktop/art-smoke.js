(async()=>{
 const checks=[],check=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
 try{
  const assets=[];
  for(const hero of HEROES){const expected='assets/characters/'+hero.id+'-portrait-v2.png';check(characterImage(hero.id)===expected&&characterImage(hero.id,'ultimate')===expected,'portrait and skill artwork v2: '+hero.id);check(APPEARANCES[hero.id][0].image===expected,'lobby appearance v2: '+hero.id);assets.push(expected);}
  for(const id of PROTAGONISTS){const expected='assets/characters/protagonist-'+id+'-v2.png';check(protagonistImage(id)===expected&&$('#protagonist-'+id+' img').getAttribute('src')===expected,'protagonist picker and story v2: '+id);assets.push(expected);}
  for(const id of ['moon','knight','frost','ember'])assets.push(CARD_DESIGNS[id].art);
  await Promise.all(assets.map(async src=>{const image=new Image();image.src=src;await image.decode();check(image.naturalWidth>=768&&image.naturalHeight>=1024,'decoded artwork: '+src);}));
  for(const id of ['oak','arrow','sage','warden'])check(cardImage({kind:'character',id})===characterImage(id),'portrait fallback v2: '+id);
  const health=await fetch('/api/health').then(response=>response.json());check(health.version==='0.9.0','version 0.9.0');
  window.artSmokeResult={passed:true,checks};
 }catch(error){window.artSmokeResult={passed:false,error:error.stack,checks};}
})();
