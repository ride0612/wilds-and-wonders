# 远境传说 · 冒险自走棋 Demo

Windows 桌面冒险自走棋：8 名英雄、五关剧情、待机大厅与角色收藏，支持中文、English、日本語。

## 下载

- [Windows 可运行版（完整解压后启动 EXE）](https://github.com/ride0612/wilds-and-wonders/releases/latest/download/WildsAndWonders-Windows-x64.zip)
- [完整项目包（源码与 Windows 程序）](https://github.com/ride0612/wilds-and-wonders/releases/latest/download/WildsAndWonders-Complete-Project.zip)
- [版本发布页](https://github.com/ride0612/wilds-and-wonders/releases)

仓库保留源代码；编译好的程序在上述下载包中。源码下载后可运行 `./build.ps1` 生成 `release` 目录。

Windows 桌面应用：双击 `release/WildsAndWonders/WildsAndWonders.exe`。分享时使用 `release/WildsAndWonders-Windows-x64.zip`，接收者完整解压后启动。游戏离线运行。

使用系统 WebView2 和 .NET Framework 4.6.2+，支持 Windows 10 / 11 x64。不需要 Node.js。也可直接用现代浏览器打开 `index.html`。

重新构建：在 PowerShell 执行 `./build.ps1`。首次构建会下载微软 WebView2 SDK，后续使用 `.build` 中的缓存。桌面入口为 `desktop/Program.cs`。

## 玩法

- 启动进入星灯营地。点击收藏中的任意棋子，将它设为大厅展示角色；这不会改变出战阵容。当前 8 名棋子全部拥有。
- 右上角可即时切换简体中文、英语、日本语，英雄、技能、羁绊、战斗记录和剧情同步切换。剧情弹窗内也可切换语言。
- 点击启程阅读战前故事；获胜后点击继续剧情阅读战后篇章，再进入下一关。旅途手记可重读已解锁的故事。
- 从 8 名英雄中选择最多 5 人，在下半区拖动布阵，拖到友军位置会交换站位。
- 点击开始战斗，双方自动寻找最近敌人、绕开占用格移动并攻击。
- 每次普攻回复 25 法力，100 法力自动施法：单体伤害、治疗、范围伤害、护盾。
- 每名英雄有 2～3 个羁绊，按独特英雄数量触发 2 / 3 人档位。双方独立计算羁绊。
- 通关四个冒险关卡后挑战最终 Boss。每关恢复全队状态，失败可以重新布阵重试。
- 支持暂停、两倍速和查看已解锁关卡。战斗 120 秒未结束判负，避免僵局。
- 战斗中回大厅会自动暂停，回战场后点击继续恢复战斗。

## 本地存档

语言、大厅展示棋子、外观选择、布阵、当前关卡和通关记录自动保存。战斗过程不保存，重新启动后回到本关准备状态；若已胜利但尚未读完战后剧情，会恢复胜利界面。

Windows 存档由 WebView2 保存在 `%LOCALAPPDATA%/WildsAndWonders/WebView2` 用户目录中。升级或替换应用文件不会主动清除此存档。浏览器直接打开版本使用该浏览器自己的本地存储。

## 后续接入人物形象与皮肤

`lobby.js` 的 `APPEARANCES` 为每个英雄保留外观配置：`id` 是稳定外观 ID，`nameKey` 对应 `localization.js` 的三语名称，`image` 是立绘的相对路径（例如 `assets/oak/base.png`）。为同一英雄添加多个配置即可在大厅外观下拉框中切换，并单独记住每个英雄的选择。当前只提供默认符号形象，不包含额外皮肤资源或皮肤解锁系统。

把立绘放在 `assets` 文件夹，构建脚本会复制此目录。`OWNED_HEROES` 与出战 `lineup`、大厅 `displayHero` 独立，后续可接入角色获得系统。

## 文件

- `index.html`：游戏界面。
- `style.css`：响应式布局与视觉样式。
- `lobby.css`：大厅、展示台、剧情对话和手记样式。
- `localization.js`：三语界面、英雄、技能和羁绊翻译。
- `story.js`：五关战前/战后故事、角色对白和战斗目标，完整三语版本。
- `lobby.js`：大厅收藏、外观、视图切换、剧情推进和本地保存。
- `game.js`：英雄与关卡配置、羁绊、BFS 寻路、固定步长战斗模拟、Canvas 渲染。
- `test.cjs`：无依赖模拟测试，使用 `node test.cjs` 运行。
- `desktop/smoke.js`：WebView2 真实页面交互测试。源码环境构建后，用 `WildsAndWonders.exe --smoke-test` 运行，使用独立测试存储，不影响玩家存档。

这是玩法原型，使用符号肖像，不包含商店、升星、装备、音效或人物立绘。
