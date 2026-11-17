'use strict';
// 第一章剧情尚未编写：每关只保留占位旁白，战斗目标按关卡类型生成。
// 写剧情时按原格式调用 dimensionScene(标题, 地点, 目标, 战前对白, 战后对白)，每行“说话人|台词”，旁白写作“旁白|……”。
// 说话人可直接使用角色中文名（如“博丽灵梦”），立绘会自动匹配。
const DIMENSION_STORY=[];
function dimensionScene(title,location,goal,before,after){
 const parse=text=>text.trim().split('\n').map(line=>{const at=line.indexOf('|');return {speaker:line.slice(0,at)==='旁白'?null:line.slice(0,at),text:line.slice(at+1)};});
 DIMENSION_STORY.push({title,location,goal,before:parse(before),after:parse(after)});
}
ACData.ENCOUNTERS.forEach((enc,i)=>{
 const n=i+1,goal=enc.boss?'首领战：击败本节首领。':enc.waves?'守点战：守住阵地，撑过全部 '+enc.waves.length+' 波敌人。':'遭遇战：击退所有敌人。';
 dimensionScene('第 '+n+' 节','幻想乡 · 地点待定',goal,
  `旁白|第一章剧情编写中。本节（第 ${n} 节）暂无战前剧情，可以直接进入备战。`,
  `旁白|第 ${n} 节战斗结束。本节战后剧情待编写。`);
});
