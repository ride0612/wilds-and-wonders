# 角色 3D 模型

## 当前运行时模型

战斗、招募卡面与角色立绘使用 `hero-models.js` 程序生成的蒙皮模型（约 7.5 头身，卡通分层光照、描边、边缘光与动漫面部），不需要外部 GLB，可通过 `file://` 离线启动。八位剧情角色（东方 Project 二次创作）的造型参数见 `hero-models.js` 中的 `SPECS`。

## Tripo 高精度模型（制作中）

八位角色另在 Tripo（tripo3d.ai）中用文字描述生成高精度模型，文件名约定如下，放入本目录即可在后续接入：

| 文件 | 角色 | 内部 ID |
| --- | --- | --- |
| reimu.glb | 博丽灵梦 | warden |
| marisa.glb | 雾雨魔理沙 | arrow |
| meiling.glb | 红美铃 | oak |
| cirno.glb | 琪露诺 | frost |
| youmu.glb | 魂魄妖梦 | knight |
| eirin.glb | 八意永琳 | sage |
| flandre.glb | 芙兰朵露·斯卡雷特 | ember |
| sakuya.glb | 十六夜咲夜 | moon |

生成时只用文字描述，不上传官方图像。使用的提示词见 `tripo-prompts.md`。Tripo 生成的模型需遵守 Tripo 的使用条款；角色本身属于东方 Project 二次创作，见根目录 README 的声明。

旧版模型（原第一章角色）已删除。原创角色方晴、沈岚的旧模型与立绘保留在 `legacy/original-cast/`。

Third-party renderer: Three.js 0.180.0, MIT. See `../vendor/THREE-LICENSE.txt`.
