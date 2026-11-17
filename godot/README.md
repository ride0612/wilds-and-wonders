# 绝不认书：次元回响 · Godot 重制版

游戏正在改用 Godot 4 引擎重新开发。目前完成了**入场界面**、**大厅**（含成员档案与作战关卡图）和**自走棋战斗**，界面风格为战术终端式：深色玻璃、信号黄强调色、斜切角、等宽小字、取景框角标、扫描线和斜切过场。

剧情对话尚未移植（第一章剧情本身也还在编写），出击后直接进入备战。

## 运行

需要 Godot 4.7（本机已通过 winget 安装 `GodotEngine.GodotEngine`）。

- 编辑器：用 Godot 打开 `godot/project.godot`，按 F5 运行。
- 命令行：

```bash
godot --path godot
```

逻辑分辨率 1920×1080，窗口默认 1600×900，支持任意宽高比（`canvas_items` + `expand`）。设置里可以切换全屏与音乐音量。

## 界面

| 界面 | 内容 |
| --- | --- |
| 入场 | 制作组标志 → 东方 Project 二次创作声明 → 标题画面（角色阵容、故障闪烁标题、点击开始）→ 同步进度条 → 斜切过场进入大厅。任意点击或按键可跳过开场 |
| 大厅 | 中央为助理立绘（呼吸动画、鼠标视差、点击说话），右侧是「作战」主按钮和成员、招募、任务、档案磁贴，左侧是玩家信息、时钟、助理名牌、活动横幅（自动轮播）和通讯栏，右上是体力、金币、结晶与公告、邮件、设置 |
| 成员档案 | 八位角色列表、立绘、阵营、属性条、技能、简介，可设为大厅助理 |
| 作战 | 第一章四幕 × 五节关卡图，按顺序解锁，显示首领战与通关状态；选关后「出击」进入战斗 |
| 战斗 | 3D 棋盘（7×8）与备战席（9 格），见下节 |

任务、档案和邮件目前只有提示，尚未实现。

## 自走棋战斗

规则从网页版 `autochess-core.js` 逐项移植，数值来自同一份数据，一局进度（金币、等级、棋子、强化、终端完整度）贯穿整个战役并保存在本机。

| 操作 | 方式 |
| --- | --- |
| 招募 | 点击下方招募终端的卡牌；三个相同棋子自动升星 |
| 部署 / 换位 | 拖动棋子到棋盘下方四行或备战席；拖回招募终端出售，或悬停后按 E |
| 刷新 / 升级 | D（2 金币）/ F（4 金币 4 经验） |
| 开始作战 | 空格或右下角按钮；未满员时自动从备战席补位 |
| 查看资料 | 右键棋子或敌人；悬停卡牌 |
| 速度 | 右下角切换 ×1 / ×2 / ×3 |

- 战斗画面：Godot 3D 棋盘，棋子与敌人是由网页版 3D 模型渲染的序列帧（待机、跑动、攻击、施法、受击，共 15 帧），面向镜头显示；血条、护盾、法力、星级、伤害数字与暴击、治疗飘字。
- 技能特效：护盾环、光束、刀光、粒子爆发、预警圈、火柱、陨星与弹道；震屏与命中停顿。剧情角色释放技能时有角色特写。
- 守点战分波刷新；第 2、6、10、14、18 节进入时三选一战术强化；通关后可继续下一节或留在本节重玩（重玩不发奖励、不扣完整度）。

## 目录

| 路径 | 说明 |
| --- | --- |
| `scenes/main.tscn` | 主场景，界面全部由脚本构建 |
| `scripts/main.gd` | 界面切换、过场、提示条、弹窗、设置、音乐 |
| `scripts/ui.gd` | 字体、斜切角样式、按钮与绘制类装饰（`class_name UI`） |
| `scripts/game_data.gd` | 自动加载 `GameData`：角色、关卡与存档（`user://profile.json`） |
| `scripts/boot_screen.gd` | 入场流程 |
| `scripts/lobby_screen.gd` | 大厅 |
| `scripts/roster_screen.gd` / `scripts/battle_panel.gd` | 成员档案 / 作战关卡图 |
| `scripts/autochess/ac_data.gd`、`ac_rng.gd`、`ac_state.gd`、`ac_battle.gd` | 自走棋数据、随机数、经济与棋盘规则、自动战斗（无画面，可单独测试） |
| `scripts/autochess/ac_world.gd`、`ac_actor.gd` | 3D 棋盘、镜头、棋子序列帧与特效 |
| `scripts/autochess/battle_screen.gd` | 战斗界面：商店、拖放、羁绊、敌情、输出统计、强化、结算 |
| `scripts/autochess/ac_sim.gd`、`tests/ac_test.gd` | 机器人平衡模拟与规则测试 |
| `shaders/screen_fx.gdshader` | 全屏暗角与扫描线 |
| `data/cast.json`、`data/campaign.json`、`data/autochess.json` | 从网页版导出：`node scripts/export-godot-data.cjs` |
| `data/sprites.json`、`assets/units/` | 29 套棋子 / 敌人序列帧图集与脚底锚点（由网页版 `hero-models.js` 渲染） |
| `assets/portraits/` | 由网页版 3D 角色模型渲染的立绘（1000×1500）与头像（256×256） |
| `assets/bg/`、`assets/music/`、`assets/fonts/` | 复制自网页版的场景、配乐（大厅与三种战斗曲）与 OFL 字体 |

中文使用系统字体（微软雅黑等），数字与英文使用 Barlow Condensed 和 JetBrains Mono。

Godot 版的存档与网页版不互通。

## 测试

```bash
godot --headless --path godot --script res://tests/ac_test.gd
```

检查随机数与商店抽卡和网页版逐位一致、购买与三合一、出售价、人口上限与换位、存档往返、20 节都能分出胜负，并跑 5 局机器人战役与网页版的首战胜率对照（当前 20 节中 17 节一致，其余 3 节相差 20 个百分点以内，来自排序与浮点的细微差异）。

## 截图检查

`--` 之后的参数可用于自动截图：

```bash
godot --path godot --resolution 1600x900 -- --screen=lobby --open=roster --wait=2 --shot=lobby.png
```

`--screen` 可选 `boot` / `lobby` / `battle`（配合 `--stage=0`～`19`）；`--skip` 跳过开场；`--open` 在大厅可选 `roster`、`battle`、`notice`、`settings`、`bubble`，在入场界面可选 `loading`，在战斗界面可选 `buy`（买下商店）、`fight`（直接开战）、`drag`（模拟拖放并打印结果）。加 `--profile=名字` 使用独立的测试存档，不影响正式存档。

## 声明

东方 Project 及其角色属于上海爱丽丝幻乐团（ZUN）。本作是非官方二次创作，免费发布，未使用官方图像、音乐或游戏数据。界面参考了同类动作手游的大厅布局思路，所有图形均为本项目自行绘制。
