// Original fixed scores, rendered with additive piano, bell, string and percussion synthesis.
// Deterministic source is retained so every delivered WAV can be reproduced without a service.
const fs=require('fs'),path=require('path');const SR=22050,TAU=Math.PI*2;
const tracks=[
 {id:'lobby',bpm:78,root:50,chords:[0,5,3,7],melody:[12,16,19,23,21,19,16,14,12,14,16,19,17,16,14,12],tone:'piano',mood:'major'},
 {id:'red-tide',bpm:74,root:45,chords:[0,5,8,7],melody:[12,15,19,22,20,19,15,14,12,10,12,15,14,10,7,12],tone:'bell',mood:'minor'},
 {id:'white-bell',bpm:86,root:47,chords:[0,8,3,7],melody:[19,24,22,19,15,14,12,10,15,19,22,24,22,19,14,12],tone:'bell',mood:'minor'},
 {id:'nameless-court',bpm:80,root:42,chords:[0,3,8,5],melody:[12,14,15,19,18,15,14,10,12,7,10,14,15,14,10,7],tone:'piano',mood:'minor'},
 {id:'starlit-return',bpm:76,root:50,chords:[0,7,9,5],melody:[12,16,19,24,23,21,19,16,14,16,19,21,19,16,14,12],tone:'piano',mood:'major'},
 {id:'battle-expedition',bpm:114,root:45,chords:[0,8,3,7],melody:[12,19,15,19,22,19,15,14,12,15,19,24,22,19,15,14],tone:'strings',mood:'minor',drums:true},
 {id:'battle-defense',bpm:104,root:43,chords:[0,5,8,7],melody:[12,12,19,15,14,19,22,19,20,19,15,14,12,10,7,10],tone:'strings',mood:'minor',drums:true},
 {id:'battle-boss',bpm:122,root:38,chords:[0,1,8,7],melody:[12,19,24,22,20,19,15,14,12,13,19,24,25,24,19,15],tone:'strings',mood:'minor',drums:true}
];
fs.mkdirSync('assets/music',{recursive:true});
function render(t){
 const beat=60/t.bpm,duration=64*beat,N=Math.ceil(duration*SR),left=new Float32Array(N),right=new Float32Array(N);let seed=123456;
 const noise=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2147483648-1;};
 function note(start,beats,midi,amp,kind,pan=0){const freq=440*Math.pow(2,(midi-69)/12),len=beats*beat,release=kind==='pad'?.65:.35,count=Math.floor((len+release)*SR),at=Math.floor(start*beat*SR),l=Math.sqrt((1-pan)/2),r=Math.sqrt((1+pan)/2);
  for(let j=0;j<count;j++){const sec=j/SR,phase=TAU*freq*sec;let sample;
   if(kind==='pad')sample=(Math.sin(phase)+.22*Math.sin(phase*2.002)+.13*Math.sin(phase*3.001))*Math.min(1,sec/.4)*Math.min(1,(len+release-sec)/release)*.55;
   else if(kind==='strings')sample=(Math.sin(phase)+.32*Math.sin(phase*2)+.16*Math.sin(phase*3)+.07*Math.sin(phase*5))*Math.min(1,sec/.035)*Math.min(1,(len+release-sec)/.35)*Math.exp(-sec*.7);
   else if(kind==='bell')sample=(Math.sin(phase)*Math.exp(-sec*1.9)+.28*Math.sin(phase*2.76)*Math.exp(-sec*3.8)+.12*Math.sin(phase*5.4)*Math.exp(-sec*7))*Math.min(1,sec/.009);
   else sample=(Math.sin(phase)*Math.exp(-sec*2)+.28*Math.sin(phase*2)*Math.exp(-sec*4)+.12*Math.sin(phase*3)*Math.exp(-sec*6))*Math.min(1,sec/.007);
   const idx=(at+j)%N;left[idx]+=sample*amp*l;right[idx]+=sample*amp*r;
  }
 }
 function drum(start,strong){const at=Math.floor(start*beat*SR);for(let j=0;j<SR*.22;j++){const s=j/SR,k=strong?Math.sin(TAU*(65*s-45*s*s))*Math.exp(-s*22):noise()*Math.exp(-s*65)*.35;const idx=(at+j)%N;left[idx]+=k*.07;right[idx]+=k*.07;}}
 for(let bar=0;bar<16;bar++){
  const chord=t.root+t.chords[bar%4],third=t.mood==='major'?4:3;
  [0,third,7,12].forEach((n,i)=>note(bar*4,3.5,chord+n,.037,'pad',(i-1.5)*.35));
  note(bar*4,2,chord-12,.10,'piano',-.1);note(bar*4+2,1.6,chord-5,.065,'piano',.1);
  const arp=[0,7,third+12,7,12,7,third+12,7];for(let j=0;j<8;j++)note(bar*4+j*.5,.7,chord+arp[j]+12,.030,'piano',j%2?.45:-.45);
  for(let j=0;j<2;j++){const pos=(bar*2+j)%16,variation=bar>=8&&j===1?12:0;note(bar*4+j*2+(bar%4===3?.25:0),1.6,t.root+t.melody[pos]+variation,.11,t.tone,j?.18:-.18);}
  if(t.drums){for(let j=0;j<4;j++)drum(bar*4+j,j%2===0);for(let j=0;j<8;j++)note(bar*4+j*.5,.28,chord+(j%2?7:0),.045,'strings',-.3);}
 }
 // A quiet circular delay preserves the loop's reverb tail across its boundary.
 const dryL=left.slice(),dryR=right.slice();for(const [sec,gain] of [[.19,.16],[.37,.11],[.53,.07]]){const offset=Math.floor(sec*SR);for(let i=0;i<N;i++){left[(i+offset)%N]+=dryR[i]*gain;right[(i+offset)%N]+=dryL[i]*gain;}}
 let peak=0;for(let i=0;i<N;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));const scale=.72/Math.max(peak,.001),data=Buffer.alloc(44+N*4);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(2,22);data.writeUInt32LE(SR,24);data.writeUInt32LE(SR*4,28);data.writeUInt16LE(4,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(N*4,40);
 for(let i=0;i<N;i++){data.writeInt16LE(Math.round(left[i]*scale*32767),44+i*4);data.writeInt16LE(Math.round(right[i]*scale*32767),46+i*4);}
 fs.writeFileSync(path.join('assets/music',t.id+'.wav'),data);console.log(t.id,Math.round(duration*10)/10+'s',peak.toFixed(3));return {id:t.id,bpm:t.bpm,duration:Math.round(duration*100)/100,frames:N,sampleRate:SR,channels:2};
}
fs.writeFileSync('assets/music/manifest.json',JSON.stringify(tracks.map(render),null,2));
