(async()=>{
 try{
  const check=(v,label)=>{if(!v)throw new Error(label);};
  $('#protagonist-dialog').close();dimensionState=freshDimensionState();protagonist='female';featureProtagonist=true;stage=0;cleared=[];unlocked=0;prepare();
  check(!$('#account-dialog'),'account UI absent');check(document.title==='绝不认书：次元回响','renamed window title');
  openStory(0,'before','prepare');revealCinematic();$('#story-next').click();revealCinematic();$('#story-next').click();
  check(cinema.shot===2,'advance dialogue');dismissCinematic();openStory(0,'before','prepare');check(cinema.shot===2,'resume dialogue');dismissCinematic();
  cleared=Array.from({length:20},(_,i)=>i);unlocked=19;
  const bounds=[];
  for(let i=0;i<20;i++)for(const part of ['before','after']){
   openStory(i,part,'read');
   const shots=cinematicShots(i,part);for(let k=0;k<shots.length;k++){
    // A real playthrough gates this portion behind the choice. Use a selected route for layout checks.
    dimensionState.companion='nono';cinema.shot=k;renderCinematic();revealCinematic();
    const next=$('#story-next').getBoundingClientRect(),text=$('#cinema-text').getBoundingClientRect();
    if(next.right>innerWidth+1||next.bottom>innerHeight+1||text.top<0||$('#cinema-text').scrollWidth>$('#cinema-text').clientWidth+1)bounds.push([i,part,k]);
   }
   dismissCinematic();
  }
  check(bounds.length===0,'story layout overflow '+JSON.stringify(bounds));
  for(const id of Object.keys(RETURN_COMPANIONS)){
   dimensionState=freshDimensionState();stage=19;prepare();openStory(19,'after','advance');$('#cinema-skip').click();
   check($('#return-companion-dialog').open,'skip invitation gate');check($('#return-companion-confirm').disabled,'choice requires selection');
   document.querySelector('[data-return-companion="'+id+'"]').click();check(!$('#return-companion-confirm').disabled,'selection enables confirm');$('#return-companion-confirm').click();
   check(dimensionState.companion===id&&!$('#return-companion-dialog').open,'invitation saved '+id);
   check(cinema.shot===11,'continue into epilogue');
   check(cinematicShots(19,'after').some(s=>s.text===RETURN_COMPANIONS[id].arrival),'unique arrival '+id);
   completeStory();check(dimensionState.returned,'return complete '+id);
  }
  dimensionState=freshDimensionState();stage=19;prepare();openStory(19,'after','advance');completeStory();
  window.storySmokeResult={passed:true,scenes:20,shots:DIMENSION_STORY.reduce((n,s)=>n+s.before.length+s.after.length,0),layoutErrors:bounds,errors:window.testErrors};
 }catch(error){window.storySmokeResult={passed:false,error:String(error.stack||error),errors:window.testErrors};}
})();
