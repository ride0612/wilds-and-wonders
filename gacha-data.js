'use strict';
// Shared, versioned public banner catalog. Random draws and ownership live on the server.
const GACHA_DATA={version:1,starter:['oak','arrow'],initialTickets:60,rates:{six:.02,five:.08},pity:{six:60,five:10},banners:[
 {id:'limited-character',kind:'character',name:['月下回信 · 限定角色','Moonlit Reply · Limited','月下の返事・限定'],six:['moon'],five:['ember','sage','frost','warden'],four:['oak','arrow'],featured:'moon'},
 {id:'standard-character',kind:'character',name:['晨星同行 · 常驻角色','Morningstar · Standard','晨星の仲間・恒常'],six:['knight'],five:['ember','sage','frost','warden'],four:['oak','arrow'],featured:'knight'},
 {id:'limited-weapon',kind:'weapon',name:['弦月遗音 · 限定武器','Crescent Echo · Limited arms','弦月の残響・限定武器'],six:['crescent'],five:['flame','crystal','rune'],four:['practice','field'],featured:'crescent'},
 {id:'standard-weapon',kind:'weapon',name:['晨星军械 · 常驻武器','Morningstar · Standard arms','晨星の武装・恒常武器'],six:['daybreak'],five:['flame','crystal','rune'],four:['practice','field'],featured:'daybreak'}
],weapons:{
 crescent:{stars:6,name:['弦月遗音','Crescent Echo','弦月の残響'],icon:'☽',atk:24,power:60},
 daybreak:{stars:6,name:['黎明誓约','Oath of Dawn','暁の誓約'],icon:'⚔',atk:30,power:40},
 flame:{stars:5,name:['余烬手札','Ember Codex','残火の手記'],icon:'✧',atk:12,power:35},
 crystal:{stars:5,name:['霜晶法杖','Frostglass Staff','霜晶の杖'],icon:'❄',atk:15,power:25},
 rune:{stars:5,name:['守望之刃','Warden Blade','見守る刃'],icon:'◇',atk:18,power:15},
 practice:{stars:4,name:['学院训练剑','Academy Blade','学院の訓練剣'],icon:'†',atk:8,power:10},
 field:{stars:4,name:['外勤法器','Field Focus','外勤の法器'],icon:'✦',atk:5,power:18}
}};
if(typeof module!=='undefined')module.exports=GACHA_DATA;
