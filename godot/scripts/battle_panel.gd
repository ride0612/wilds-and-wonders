extends Control
## 作战：第一章四幕 × 五节的关卡图，显示通关状态，选择关卡后出击。
## 出击后进入自走棋战斗界面（scripts/autochess/battle_screen.gd）。

const BATTLE := preload("res://scripts/autochess/battle_screen.gd")
const TYPE_NAMES := {"battle": ["遭遇战", "ENCOUNTER"], "defense": ["守点战", "DEFENSE"], "boss": ["首领战", "BOSS"]}

var app
var _selected := -1
var _nodes: Array[Button] = []
var _info_title: Label
var _info_type: Label
var _info_desc: Label
var _info_state: Label

func _ready() -> void:
	mouse_filter = MOUSE_FILTER_STOP
	_build_all()

## 战斗结束返回时重建（通关状态与进度会变化）
func refresh() -> void:
	for c in get_children():
		c.queue_free()
	_nodes.clear()
	_build_all()

func _build_all() -> void:
	var bg := UI.full(ColorRect.new())
	(bg as ColorRect).color = Color(0.025, 0.03, 0.05)
	add_child(bg)
	var scene := UI.full(UI.image(load("res://assets/bg/academy-atrium-v2.png"), true))
	scene.modulate = Color(0.26, 0.28, 0.36)
	add_child(scene)
	add_child(UI.full(UI.gradient(Color(0.025, 0.03, 0.05, 0.96), Color(0.025, 0.03, 0.05, 0.4), Vector2(0, 0), Vector2(1, 0), [0.2, 0.7])))
	var big := UI.label("OPERATION", 260, Color(1, 1, 1, 0.035), UI.num(), 20)
	UI.pin(big, 0, 1, 560, -540, 1400, 300)
	add_child(big)
	_build_header()
	_build_chapter()
	_build_map()
	_build_info()
	select(GameData.next_stage())

func _build_header() -> void:
	var back := UI.text_button("‹  返回", 18)
	UI.pin(back, 0, 0, 40, 30, 150, 52)
	back.pressed.connect(func(): app.pop(self))
	add_child(back)
	var title := UI.hbox(14)
	UI.pin(title, 0, 0, 214, 30, 600, 52)
	title.add_child(UI.rect(UI.ACCENT, 5, 0))
	var tcol := UI.vbox(0)
	tcol.alignment = BoxContainer.ALIGNMENT_CENTER
	tcol.add_child(UI.label("MAIN STORY / OPERATION", 12, UI.ACCENT, UI.mono(), 2))
	tcol.add_child(UI.label("作战", 26, Color.WHITE, UI.cjk(800), 6))
	title.add_child(tcol)
	add_child(title)

func _build_chapter() -> void:
	var panel := UI.panel(UI.pad(UI.box(Color(0.04, 0.05, 0.08, 0.82), UI.LINE, 1, [0, 30, 0, 0]), 36, 32))
	UI.pin(panel, 0, 0, 40, 130, 470, 600)
	add_child(panel)
	var col := UI.vbox(12)
	panel.add_child(col)
	col.add_child(UI.label("CHAPTER 01", 14, UI.ACCENT, UI.mono(), 3))
	col.add_child(UI.label("幻想乡", 64, Color.WHITE, UI.cjk(900), 12))
	col.add_child(UI.label("GENSOKYO", 18, UI.MUTED, UI.num(), 8))
	var tag := UI.panel(UI.pad(UI.box(Color(1, 1, 1, 0.08), UI.LINE, 1, [6, 0, 6, 0]), 12, 3))
	tag.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	tag.add_child(UI.label("剧情编写中", 14, Color.WHITE, UI.cjk(700), 2))
	col.add_child(tag)
	col.add_child(UI.wrap(UI.label("主角穿过折页，抵达的第一个次元。四幕共二十个任务节点，按顺序解锁，包含守点战与首领战。剧情正在编写，目前每节只有占位旁白。", 17, Color(1, 1, 1, 0.78), UI.cjk(400), 1), 398))
	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(spacer)
	var done := GameData.cleared_count()
	var total := GameData.stages.size()
	var prow := UI.hbox(8)
	var plab := UI.label("章节进度", 15, UI.MUTED, UI.cjk(500), 2)
	plab.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	prow.add_child(plab)
	prow.add_child(UI.label("%d / %d" % [done, total], 26, UI.ACCENT, UI.num(), 1))
	col.add_child(prow)
	var track := UI.rect(Color(1, 1, 1, 0.12), 0, 6)
	var fill := UI.rect(UI.ACCENT, 0, 6)
	track.add_child(fill)
	track.resized.connect(func(): fill.size = Vector2(track.size.x * float(done) / float(total), 6))
	col.add_child(track)
	UI.passthrough(panel)

func _build_map() -> void:
	var map := UI.vbox(26)
	UI.pin(map, 0, 0, 570, 140, 1250, 640)
	add_child(map)
	for a in GameData.ACTS.size():
		var act: Dictionary = GameData.ACTS[a]
		var row := UI.hbox(0)
		var head := UI.vbox(0)
		head.custom_minimum_size.x = 200
		head.alignment = BoxContainer.ALIGNMENT_CENTER
		head.add_child(UI.label(act["en"], 11, UI.MUTED, UI.mono(), 1))
		head.add_child(UI.label("%s · %s" % [act["name"], act["sub"]], 24, Color.WHITE, UI.cjk(800), 3))
		row.add_child(head)
		for s in 5:
			var i := a * 5 + s
			if s > 0:
				var link := UI.rect(Color(1, 1, 1, 0.25) if i <= GameData.next_stage() else Color(1, 1, 1, 0.08), 30, 2)
				link.size_flags_vertical = Control.SIZE_SHRINK_CENTER
				row.add_child(link)
			row.add_child(_stage_node(i))
		map.add_child(row)

func _stage_node(i: int) -> Button:
	var st: Dictionary = GameData.stages[i]
	var type: String = st["type"]
	var locked := i > GameData.next_stage()
	var cleared := GameData.is_cleared(i)
	var boss := type == "boss"
	var cuts := [12, 0, 12, 0]
	var base := Color(0.32, 0.06, 0.08, 0.85) if boss else Color(0.05, 0.065, 0.1, 0.85)
	var b := UI.flat_button(UI.box(base, Color(1, 0.36, 0.39, 0.7) if boss else UI.LINE, 1, cuts), UI.box(base.lightened(0.12), Color(1, 1, 1, 0.7), 1, cuts))
	b.custom_minimum_size = Vector2(170, 104)
	b.disabled = locked
	var col := UI.vbox(0)
	UI.full(col)
	col.offset_left = 16
	col.offset_top = 10
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_child(UI.label("1-%02d" % (i + 1), 34, Color(1, 1, 1, 0.3) if locked else Color.WHITE, UI.num(), 1))
	col.add_child(UI.label(TYPE_NAMES[type][0], 15, Color(1, 1, 1, 0.3) if locked else (UI.RED if boss else UI.MUTED), UI.cjk(700), 2))
	b.add_child(col)
	if cleared:
		var mark := UI.panel(UI.pad(UI.box(UI.ACCENT, Color(0, 0, 0, 0), 0, [0, 0, 8, 0]), 8, 1))
		UI.pin(mark, 1, 0, -54, 0, 54, 22)
		mark.add_child(UI.label("CLEAR", 11, UI.INK, UI.mono(), 1))
		b.add_child(mark)
	if locked:
		var lock := UI.label("LOCK", 11, Color(1, 1, 1, 0.3), UI.mono(), 1)
		UI.pin(lock, 1, 0, -54, 8, 50, 20)
		b.add_child(lock)
	UI.passthrough(b)
	b.pressed.connect(func(): select(i))
	_nodes.append(b)
	return b

func _build_info() -> void:
	var panel := UI.panel(UI.pad(UI.box(Color(0.04, 0.05, 0.08, 0.9), UI.LINE, 1, [0, 26, 0, 0]), 34, 26))
	UI.pin(panel, 1, 1, -900, -260, 850, 210)
	add_child(panel)
	var row := UI.hbox(30)
	panel.add_child(row)
	var col := UI.vbox(6)
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_info_type = UI.label("", 13, UI.ACCENT, UI.mono(), 2)
	col.add_child(_info_type)
	_info_title = UI.label("", 36, Color.WHITE, UI.cjk(900), 6)
	col.add_child(_info_title)
	_info_desc = UI.wrap(UI.label("", 16, Color(1, 1, 1, 0.75), UI.cjk(400), 1), 480)
	col.add_child(_info_desc)
	_info_state = UI.label("", 14, UI.MUTED, UI.cjk(500), 2)
	col.add_child(_info_state)
	row.add_child(col)
	var go := UI.text_button("出 击", 30, true, 16)
	go.custom_minimum_size = Vector2(220, 0)
	go.pressed.connect(_launch)
	row.add_child(go)

func select(i: int) -> void:
	_selected = i
	var st: Dictionary = GameData.stages[i]
	var type: String = st["type"]
	var act: Dictionary = GameData.ACTS[i / 5]
	_info_type.text = "STAGE 1-%02d  ·  %s" % [i + 1, TYPE_NAMES[type][1]]
	_info_title.text = "第 %d 节 · %s" % [i + 1, TYPE_NAMES[type][0]]
	var goal := "击败本节首领。" if type == "boss" else ("守住阵地，撑过全部 %d 波敌人。" % int(st["waves"]) if type == "defense" else "击退所有敌人。")
	_info_desc.text = "%s · %s　%s" % [act["name"], act["sub"], goal]
	_info_state.text = "已通关" if GameData.is_cleared(i) else "未通关"
	for j in _nodes.size():
		var on := j == i
		_nodes[j].modulate = Color(1, 1, 1) if on or _nodes[j].disabled else Color(0.82, 0.84, 0.9)
		var boss: bool = GameData.stages[j]["type"] == "boss"
		var base := Color(0.32, 0.06, 0.08, 0.85) if boss else Color(0.05, 0.065, 0.1, 0.85)
		_nodes[j].add_theme_stylebox_override("normal", UI.box(base.lightened(0.1) if on else base, UI.ACCENT if on else (Color(1, 0.36, 0.39, 0.7) if boss else UI.LINE), 2 if on else 1, [12, 0, 12, 0]))

func _launch() -> void:
	if _selected > GameData.next_stage():
		app.toast("请先通关前一节。")
		return
	app.push(BATTLE, {"stage": _selected})

func debug_open(what: String) -> void:
	if what.is_valid_int():
		select(int(what))
