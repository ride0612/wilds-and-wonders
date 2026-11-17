extends Control
## 自走棋战斗界面：备战（商店、备战席、拖放部署、升级、刷新、强化三选一）→ 交战（实时模拟与特效）→ 结算。
## 操作：点击卡牌招募；拖动棋子部署或换位，拖回商店出售；D 刷新、F 购买经验、E 出售悬停棋子、空格开始作战；右键查看单位资料。

const STEP := 1.0 / 30.0
const TYPE_NAMES := {"battle": "遭遇战", "defense": "守点战", "boss": "首领战"}

var app
var stage := 0
var state: ACState
var mode := "prep" # prep / fight / result
var battle: ACBattle
var world: ACWorld
var speed := 1
var _acc := 0.0
var _hitstop := 0.0
var _pending_aug: Array = []

var _view: SubViewportContainer
var _float: Control
var _bars := {} # actor key -> HpBar
var _drag: ACActor = null
var _drag_unit: Dictionary = {}
var _hover: ACActor = null
var _info: PanelContainer
var _modal: Control

# HUD 节点
var _stage_title: Label
var _stage_sub: Label
var _phase_label: Label
var _hp_label: Label
var _hp_fill: ColorRect
var _traits_box: VBoxContainer
var _right_title: Label
var _right_box: VBoxContainer
var _level_label: Label
var _xp_label: Label
var _xp_fill: ColorRect
var _gold_label: Label
var _interest_label: Label
var _odds_label: Label
var _shop_row: HBoxContainer
var _shop_panel: Control
var _lock_btn: Button
var _xp_btn: Button
var _reroll_btn: Button
var _go_btn: Button
var _go_title: Label
var _go_sub: Label
var _speed_btn: Button
var _back_btn: Button
var _banner: Control
var _banner_title: Label
var _banner_sub: Label
var _banner_tween: Tween
var _cutin: Control
var _right_refresh := 0.0
var _practice := false

func _ready() -> void:
	mouse_filter = MOUSE_FILTER_STOP
	ACData.ensure()
	state = GameData.ac_state()
	speed = int(GameData.profile.get("battle_speed", 1))
	_build_background()
	_build_view()
	_float = UI.full(Control.new())
	_float.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(_float)
	_build_top()
	_build_left()
	_build_right()
	_build_bottom()
	_build_banner()
	prepare()

# ---------- 场景 ----------

func _build_background() -> void:
	var bg := UI.full(ColorRect.new())
	(bg as ColorRect).color = Color(0.03, 0.035, 0.055)
	add_child(bg)
	var art := UI.full(UI.image(load("res://assets/bg/night-observatory-v2.png"), true))
	art.modulate = Color(0.32, 0.36, 0.48)
	add_child(art)
	add_child(UI.full(UI.gradient(Color(0.02, 0.025, 0.04, 0.0), Color(0.02, 0.025, 0.04, 0.85), Vector2(0.5, 0.0), Vector2(0.5, 1.0), [0.45, 1.0])))

func _build_view() -> void:
	_view = SubViewportContainer.new()
	UI.full(_view)
	_view.stretch = true
	_view.mouse_filter = MOUSE_FILTER_STOP
	add_child(_view)
	var vp := SubViewport.new()
	vp.transparent_bg = true
	vp.own_world_3d = true
	vp.msaa_3d = Viewport.MSAA_4X
	vp.handle_input_locally = false
	_view.add_child(vp)
	world = ACWorld.new()
	vp.add_child(world)
	_view.gui_input.connect(_board_input)
	_view.mouse_exited.connect(func(): _hover = null)

# ---------- 顶栏 ----------

func _build_top() -> void:
	add_child(UI.full(UI.gradient(Color(0.02, 0.025, 0.04, 0.9), Color(0.02, 0.025, 0.04, 0.0), Vector2(0, 0), Vector2(0, 1), [0.0, 0.14])))
	(get_child(get_child_count() - 1) as Control).mouse_filter = MOUSE_FILTER_IGNORE
	_back_btn = UI.text_button("‹  撤退", 17)
	UI.pin(_back_btn, 0, 0, 36, 28, 140, 48)
	_back_btn.pressed.connect(_leave)
	add_child(_back_btn)
	var title := UI.hbox(14)
	UI.pin(title, 0, 0, 196, 22, 700, 64)
	title.add_child(UI.rect(UI.ACCENT, 5, 0))
	var col := UI.vbox(0)
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	_stage_sub = UI.label("", 12, UI.ACCENT, UI.mono(), 2)
	col.add_child(_stage_sub)
	_stage_title = UI.label("", 28, Color.WHITE, UI.cjk(800), 4)
	col.add_child(_stage_title)
	title.add_child(col)
	add_child(title)
	_phase_label = UI.label("", 16, UI.MUTED, UI.mono(), 2)
	_phase_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	UI.pin(_phase_label, 0.5, 0, -200, 34, 400, 30)
	add_child(_phase_label)
	var hp := UI.vbox(4)
	UI.pin(hp, 1, 0, -360, 22, 320, 70)
	var hrow := UI.hbox(10)
	hrow.alignment = BoxContainer.ALIGNMENT_END
	var hl := UI.vbox(0)
	hl.alignment = BoxContainer.ALIGNMENT_CENTER
	hl.add_child(UI.label("TERMINAL INTEGRITY", 10, UI.MUTED, UI.mono(), 2))
	hl.add_child(UI.label("终端完整度", 15, Color.WHITE, UI.cjk(700), 2))
	hrow.add_child(hl)
	_hp_label = UI.label("100", 46, Color.WHITE, UI.num())
	hrow.add_child(_hp_label)
	hp.add_child(hrow)
	var track := UI.rect(Color(1, 1, 1, 0.14), 0, 4)
	_hp_fill = UI.rect(UI.ACCENT, 320, 4)
	track.add_child(_hp_fill)
	hp.add_child(track)
	add_child(hp)

# ---------- 左侧：羁绊 ----------

func _build_left() -> void:
	var panel := UI.panel(UI.pad(UI.box(Color(0.03, 0.04, 0.065, 0.72), UI.LINE, 1, [0, 18, 0, 0]), 20, 16))
	UI.pin(panel, 0, 0, 36, 120, 330, 0)
	panel.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(panel)
	var col := UI.vbox(10)
	panel.add_child(col)
	var head := UI.hbox(8)
	head.add_child(UI.label("SYNERGY", 11, UI.ACCENT, UI.mono(), 2))
	head.add_child(UI.label("羁绊", 17, Color.WHITE, UI.cjk(800), 3))
	col.add_child(head)
	_traits_box = UI.vbox(6)
	col.add_child(_traits_box)

func _render_traits() -> void:
	for c in _traits_box.get_children():
		c.queue_free()
	var counts := state.trait_counts()
	var active := state.active_traits()
	var keys := counts.keys()
	keys.sort_custom(func(a, b):
		var la: int = active.get(a, 0)
		var lb: int = active.get(b, 0)
		if la != lb:
			return la > lb
		return counts[a] > counts[b])
	if keys.is_empty():
		_traits_box.add_child(UI.wrap(UI.label("把棋子放上棋盘后显示羁绊。同一种棋子只计一次。", 14, UI.MUTED), 280))
	for t in keys:
		var tr: Dictionary = ACData.traits()[t]
		var lv: int = active.get(t, 0)
		var row := UI.hbox(10)
		var gem := UI.Diamond.new()
		gem.custom_minimum_size = Vector2(26, 26)
		gem.color = UI.ACCENT if lv > 0 else Color(1, 1, 1, 0.25)
		gem.hollow = lv == 0
		gem.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(gem)
		var info := UI.vbox(0)
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		info.add_child(UI.label(String(tr["en"]), 9, UI.MUTED, UI.mono(), 2))
		info.add_child(UI.label(String(tr["name"]), 17, Color.WHITE if lv > 0 else UI.MUTED, UI.cjk(700), 2))
		row.add_child(info)
		var th: Array = tr["thresholds"]
		var steps := " › ".join(PackedStringArray(th.map(func(x): return str(int(x)))))
		var cnt := UI.label(str(counts[t]), 26, UI.ACCENT if lv > 0 else Color.WHITE, UI.num())
		row.add_child(cnt)
		row.add_child(UI.label(steps, 12, UI.MUTED, UI.mono(), 1))
		row.tooltip_text = String(tr["desc"]).replace("{v}", str(int(tr["values"][maxi(lv, 1) - 1])))
		_traits_box.add_child(row)

# ---------- 右侧：敌情 / 输出统计 ----------

func _build_right() -> void:
	var panel := UI.panel(UI.pad(UI.box(Color(0.03, 0.04, 0.065, 0.72), UI.LINE, 1, [0, 18, 0, 0]), 20, 16))
	UI.pin(panel, 1, 0, -366, 120, 330, 0)
	panel.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(panel)
	var col := UI.vbox(10)
	panel.add_child(col)
	_right_title = UI.label("", 17, Color.WHITE, UI.cjk(800), 3)
	col.add_child(_right_title)
	_right_box = UI.vbox(8)
	col.add_child(_right_box)

func _render_intel() -> void:
	_right_title.text = "敌情侦测  ·  HOSTILE INTEL"
	for c in _right_box.get_children():
		c.queue_free()
	var enc := ACData.encounter(stage)
	var groups := {}
	var order := []
	for e in ACData.encounter_enemies(enc):
		var id: String = e[0]
		if not groups.has(id):
			groups[id] = {"n": 0, "m": float(e[3])}
			order.append(id)
		groups[id]["n"] += 1
		groups[id]["m"] = maxf(groups[id]["m"], float(e[3]))
	if enc.has("waves"):
		_right_box.add_child(UI.label("守点战 · 共 %d 波" % (enc["waves"] as Array).size(), 15, UI.ACCENT, UI.cjk(700), 2))
	for id in order:
		var d := ACData.enemy(id)
		var g: Dictionary = groups[id]
		var row := UI.hbox(10)
		var gem := UI.Diamond.new()
		gem.custom_minimum_size = Vector2(16, 16)
		gem.color = UI.RED
		gem.hollow = not d.get("boss", false)
		gem.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(gem)
		var info := UI.vbox(0)
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		info.add_child(UI.label(String(d["en"]), 9, UI.MUTED, UI.mono(), 2))
		info.add_child(UI.label(String(d["name"]) + ("  首领" if d.get("boss", false) else ""), 17, Color.WHITE, UI.cjk(700), 1))
		info.add_child(UI.label("HP %d   ATK %d" % [int(float(d["hp"]) * g["m"]), int(float(d["atk"]) * g["m"])], 11, UI.MUTED, UI.mono(), 1))
		row.add_child(info)
		row.add_child(UI.label("×%d" % g["n"], 26, Color.WHITE, UI.num()))
		_right_box.add_child(row)

func _render_damage() -> void:
	_right_title.text = "输出统计  ·  DAMAGE"
	for c in _right_box.get_children():
		c.queue_free()
	if battle == null:
		return
	var rep := battle.damage_report()
	var mx := 1.0
	for r in rep:
		mx = maxf(mx, r["dealt"])
	for r in rep.slice(0, 7):
		var row := UI.hbox(10)
		var av := UI.panel(UI.box(Color(0.1, 0.12, 0.17), Color(0, 0, 0, 0), 0))
		av.custom_minimum_size = Vector2(40, 40)
		av.clip_contents = true
		av.add_child(UI.image(_card_art(r["id"]), true))
		if not r["alive"]:
			av.modulate = Color(1, 1, 1, 0.45)
		row.add_child(av)
		var info := UI.vbox(3)
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var top := UI.hbox(6)
		var nm := UI.label("%s %s" % [ACData.unit(r["id"])["name"], "★".repeat(int(r["star"]))], 14, Color.WHITE, UI.cjk(600), 1)
		nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		top.add_child(nm)
		top.add_child(UI.label(str(int(r["dealt"])), 18, UI.ACCENT, UI.num()))
		info.add_child(top)
		var track := UI.rect(Color(1, 1, 1, 0.1), 0, 4)
		var fill := UI.rect(UI.ACCENT, 0, 4)
		var ratio: float = r["dealt"] / mx
		track.add_child(fill)
		track.resized.connect(func(): fill.size = Vector2(track.size.x * ratio, 4))
		info.add_child(track)
		row.add_child(info)
		_right_box.add_child(row)

# ---------- 底部：经济、商店、开始 ----------

func _build_bottom() -> void:
	# 经济
	var econ := UI.panel(UI.pad(UI.box(Color(0.03, 0.04, 0.065, 0.86), UI.LINE, 1, [0, 0, 0, 18]), 20, 14))
	UI.pin(econ, 0, 1, 36, -238, 330, 210)
	add_child(econ)
	var ecol := UI.vbox(8)
	econ.add_child(ecol)
	var top := UI.hbox(14)
	var lv := UI.vbox(0)
	lv.add_child(UI.label("LEVEL", 10, UI.MUTED, UI.mono(), 2))
	_level_label = UI.label("2", 44, Color.WHITE, UI.num())
	lv.add_child(_level_label)
	top.add_child(lv)
	var gold := UI.vbox(0)
	gold.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	gold.add_child(UI.label("GOLD  金币", 10, UI.MUTED, UI.mono(), 2))
	_gold_label = UI.label("0", 44, UI.ACCENT, UI.num())
	gold.add_child(_gold_label)
	top.add_child(gold)
	var intr := UI.vbox(0)
	intr.alignment = BoxContainer.ALIGNMENT_END
	_interest_label = UI.label("", 12, UI.MUTED, UI.mono(), 1)
	intr.add_child(_interest_label)
	top.add_child(intr)
	ecol.add_child(top)
	var xrow := UI.hbox(8)
	var xtrack := UI.rect(Color(1, 1, 1, 0.12), 0, 6)
	xtrack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	xtrack.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_xp_fill = UI.rect(UI.CYAN, 0, 6)
	xtrack.add_child(_xp_fill)
	xrow.add_child(xtrack)
	_xp_label = UI.label("", 12, UI.MUTED, UI.mono(), 1)
	xrow.add_child(_xp_label)
	ecol.add_child(xrow)
	var brow := UI.hbox(8)
	_xp_btn = UI.text_button("升级  4 · F", 15)
	_xp_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_xp_btn.pressed.connect(_buy_xp)
	brow.add_child(_xp_btn)
	_reroll_btn = UI.text_button("刷新  2 · D", 15)
	_reroll_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_reroll_btn.pressed.connect(_reroll)
	brow.add_child(_reroll_btn)
	ecol.add_child(brow)

	# 商店
	_shop_panel = Control.new()
	UI.pin(_shop_panel, 0.5, 1, -560, -238, 1120, 210)
	add_child(_shop_panel)
	var shead := UI.hbox(14)
	UI.pin(shead, 0, 0, 0, 0, 1120, 30)
	shead.add_child(UI.label("RECRUIT", 11, UI.ACCENT, UI.mono(), 2))
	shead.add_child(UI.label("招募终端", 16, Color.WHITE, UI.cjk(800), 3))
	_odds_label = UI.label("", 12, UI.MUTED, UI.mono(), 1)
	_odds_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	shead.add_child(_odds_label)
	shead.add_child(UI.label("拖到这里出售 · 悬停按 E", 13, UI.MUTED, UI.cjk(500), 1))
	_lock_btn = UI.text_button("锁定", 14)
	_lock_btn.pressed.connect(func():
		state.shop_locked = not state.shop_locked
		_save()
		_render_econ())
	shead.add_child(_lock_btn)
	_shop_panel.add_child(shead)
	_shop_row = UI.hbox(10)
	UI.pin(_shop_row, 0, 0, 0, 40, 1120, 170)
	_shop_panel.add_child(_shop_row)

	# 开始作战
	var go := UI.flat_button(UI.box(UI.ACCENT, Color(0, 0, 0, 0), 0, [30, 0, 0, 0]), UI.box(Color("ffdc5a"), Color(0, 0, 0, 0), 0, [30, 0, 0, 0]))
	UI.pin(go, 1, 1, -366, -238, 330, 150)
	var stripes := UI.Stripes.new()
	UI.pin(stripes, 1, 0, -150, 0, 150, 150)
	go.add_child(stripes)
	var gcol := UI.vbox(2)
	UI.pin(gcol, 0, 0, 28, 24, 280, 110)
	gcol.add_child(UI.label("ENGAGE · SPACE", 11, Color(0, 0, 0, 0.55), UI.mono(), 2))
	_go_title = UI.label("开始作战", 40, UI.INK, UI.cjk(900), 6)
	gcol.add_child(_go_title)
	_go_sub = UI.label("", 15, Color(0.25, 0.2, 0.0), UI.cjk(700), 1)
	gcol.add_child(_go_sub)
	go.add_child(gcol)
	UI.passthrough(go)
	go.mouse_filter = MOUSE_FILTER_STOP
	go.pressed.connect(start_combat)
	_go_btn = go
	add_child(go)
	_speed_btn = UI.text_button("速度 ×1", 15)
	UI.pin(_speed_btn, 1, 1, -366, -76, 330, 46)
	_speed_btn.pressed.connect(func():
		speed = 2 if speed == 1 else (3 if speed == 2 else 1)
		GameData.profile["battle_speed"] = speed
		GameData.save_profile()
		_speed_btn.text = "速度 ×%d" % speed)
	_speed_btn.text = "速度 ×%d" % speed
	add_child(_speed_btn)

func _card_art(id: String) -> Texture2D:
	if GameData.by_id.has(id):
		return GameData.avatar(id)
	var m := ACActor.meta(id)
	var at := AtlasTexture.new()
	at.atlas = load("res://assets/units/%s.png" % id)
	var w: float = m["w"]
	var h: float = m["h"]
	var side := minf(w, h * 0.48)
	at.region = Rect2(maxf(0.0, float(m["ax"]) - side * 0.45), h * 0.04, side, side)
	return at

func _render_shop() -> void:
	for c in _shop_row.get_children():
		c.queue_free()
	for i in 5:
		var id: String = state.shop[i]
		if id == "":
			var empty := UI.panel(UI.box(Color(1, 1, 1, 0.03), Color(1, 1, 1, 0.08), 1, [0, 14, 0, 0]))
			empty.custom_minimum_size = Vector2(216, 170)
			_shop_row.add_child(empty)
			continue
		var u := ACData.unit(id)
		var c := ACData.cost(id)
		var ccol := ACData.cost_color(c)
		var card := UI.flat_button(UI.box(Color(0.05, 0.065, 0.1, 0.92), Color(ccol, 0.6), 1, [0, 14, 0, 0]), UI.box(Color(0.09, 0.11, 0.16, 0.98), UI.ACCENT, 1, [0, 14, 0, 0]))
		card.custom_minimum_size = Vector2(216, 170)
		card.clip_contents = true
		var art := UI.image(_card_art(id), true)
		UI.pin(art, 0, 0, 0, 0, 216, 112)
		card.add_child(art)
		card.add_child(UI.pin(UI.gradient(Color(0.05, 0.065, 0.1, 0.0), Color(0.05, 0.065, 0.1, 1.0), Vector2(0, 0), Vector2(0, 1), [0.45, 1.0]), 0, 0, 0, 0, 216, 114))
		card.add_child(UI.pin(UI.rect(ccol, 216, 4), 0, 0, 0, 0, 216, 4))
		var owned := state.count_copies(id, 1)
		if owned > 0:
			var tag := UI.panel(UI.pad(UI.box(UI.ACCENT, Color(0, 0, 0, 0), 0, [6, 0, 6, 0]), 8, 1))
			UI.pin(tag, 0, 0, 10, 12, 60, 22)
			tag.add_child(UI.label("已有 %d" % owned, 12, UI.INK, UI.cjk(800), 1))
			card.add_child(tag)
		var nm := UI.label(String(u["name"]), 21, Color.WHITE, UI.cjk(800), 2)
		UI.pin(nm, 0, 0, 14, 104, 190, 30)
		card.add_child(nm)
		var tr := " / ".join(PackedStringArray((u["traits"] as Array).map(func(t): return ACData.traits()[t]["name"])))
		var trl := UI.label(tr, 13, UI.MUTED, UI.cjk(500), 1)
		UI.pin(trl, 0, 0, 14, 136, 150, 22)
		card.add_child(trl)
		var cost := UI.label(str(c), 26, ccol.lightened(0.2), UI.num())
		cost.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		UI.pin(cost, 1, 0, -56, 126, 44, 34)
		card.add_child(cost)
		UI.passthrough(card)
		card.mouse_filter = MOUSE_FILTER_STOP
		card.disabled = mode != "prep" or not state.can_buy(i)
		if card.disabled:
			card.modulate = Color(1, 1, 1, 0.5)
		var slot := i
		card.pressed.connect(func(): _buy(slot))
		card.mouse_entered.connect(func(): _show_info_for(id, false, 1, card.get_global_rect().position + Vector2(0, -12), true))
		card.mouse_exited.connect(_hide_info)
		_shop_row.add_child(card)

func _render_econ() -> void:
	_level_label.text = str(state.level)
	_gold_label.text = str(state.gold)
	_interest_label.text = "利息 +%d" % state.interest()
	var need := state.xp_needed()
	_xp_label.text = "MAX" if state.level >= ACData.MAX_LEVEL else "%d / %d" % [state.xp, need]
	_xp_fill.size = Vector2((_xp_fill.get_parent() as Control).size.x * (1.0 if state.level >= ACData.MAX_LEVEL else float(state.xp) / maxf(1.0, need)), 6)
	var odds: Array = ACData.shop_odds(state.level)
	_odds_label.text = "   1费 %d%%   2费 %d%%   3费 %d%%" % [int(odds[0]), int(odds[1]), int(odds[2])]
	var prep := mode == "prep"
	_xp_btn.disabled = not prep or state.level >= ACData.MAX_LEVEL or state.gold < ACData.XP_COST
	_reroll_btn.disabled = not prep or state.gold < ACData.REROLL_COST
	_lock_btn.text = "已锁定" if state.shop_locked else "锁定"
	_lock_btn.disabled = not prep
	_hp_label.text = str(state.hp)
	_hp_fill.size = Vector2(320.0 * state.hp / ACData.START_HP, 4)
	_back_btn.disabled = mode == "fight"

func _render_go() -> void:
	if mode == "prep":
		_go_title.text = "开始作战"
		_go_sub.text = "部署 %d / %d   ·   备战席 %d" % [state.board_count(), state.board_cap(), state.bench_count()]
		_go_btn.disabled = false
		_go_btn.modulate = Color.WHITE
	elif mode == "fight":
		_go_title.text = "交战中"
		_go_sub.text = "%s   剩余敌人 %d" % [_fmt_time(battle.time if battle else 0.0), battle.enemies_left() if battle else 0]
		_go_btn.disabled = true
		_go_btn.modulate = Color(1, 1, 1, 0.85)
	else:
		_go_title.text = "结算"
		_go_sub.text = ""
		_go_btn.disabled = true

func _render_all() -> void:
	var type: String = GameData.stages[stage]["type"]
	var act: Dictionary = GameData.ACTS[stage / 5]
	_stage_sub.text = "STAGE %02d / %02d  ·  %s" % [stage + 1, ACData.encounters().size(), act["en"]]
	_stage_title.text = "第 %d 节 · %s%s" % [stage + 1, TYPE_NAMES[type], "（重玩）" if _practice else ""]
	_phase_label.text = {"prep": "—  备战阶段  ·  PLANNING  —", "fight": "—  交战中  ·  ENGAGED  —", "result": "—  结算  ·  RESULT  —"}[mode]
	_render_traits()
	if mode == "prep":
		_render_intel()
	else:
		_render_damage()
	_render_econ()
	_render_shop()
	_render_go()

# ---------- 流程 ----------

func prepare() -> void:
	mode = "prep"
	_practice = GameData.is_cleared(stage)
	_hitstop = 0.0
	if battle != null:
		battle.listeners.clear()
		battle.clear()
		battle = null
	_close_modal()
	var grant := state.grant_stage(stage)
	if not grant.is_empty() and int(grant["income"]) > 0:
		app.toast("回合收入 +%d 金币，经验 +%d" % [grant["income"], grant["xp"]])
	if ACData.augment_stages().has(float(stage)) and not state.offered.has(stage):
		state.offered.append(stage)
		_pending_aug = state.offer_augments()
	_save()
	_sync_planning()
	_render_all()
	var type: String = GameData.stages[stage]["type"]
	app.play_music("res://assets/music/%s.wav" % {"battle": "battle-expedition", "defense": "battle-defense", "boss": "battle-boss"}[type])
	_show_banner("第 %d 节 · %s" % [stage + 1, TYPE_NAMES[type]], "PLANNING  ·  部署你的队伍")
	if not _pending_aug.is_empty():
		_open_augments()

func _sync_planning() -> void:
	_clear_bars()
	world.clear_actors()
	for i in state.bench.size():
		var u = state.bench[i]
		if u != null:
			_add_planning_actor(u, ACWorld.bench_pos(i))
	for e in state.board_units():
		_add_planning_actor(e["unit"], ACWorld.g2w(Vector2(e["x"] + 0.5, e["y"] + 0.5)))
	var enc := ACData.encounter(stage)
	var first: Array = enc["waves"][0] if enc.has("waves") else enc["enemies"]
	for i in first.size():
		var e: Array = first[i]
		var a := world.add_actor("e%d" % i, e[0], true, 1, 1, ACWorld.g2w(Vector2(float(e[1]) + 0.5, float(e[2]) + 0.5)))
		_add_bar("e%d" % i, a)

func _add_planning_actor(u: Dictionary, pos: Vector3) -> void:
	var a := world.add_actor(int(u["uid"]), u["id"], false, 0, int(u["star"]), pos)
	a.uid = int(u["uid"])
	_add_bar(a.uid, a)

func start_combat() -> void:
	if mode != "prep":
		return
	if not _pending_aug.is_empty():
		app.toast("请先选择一项战术强化。")
		return
	state.auto_place_from_bench()
	if state.board_count() == 0:
		app.toast("先招募棋子并放上棋盘。")
		_render_all()
		return
	_hide_info()
	mode = "fight"
	_acc = 0.0
	_save()
	_clear_bars()
	world.clear_actors()
	battle = ACBattle.new()
	battle.on(_on_battle)
	battle.start(state, ACData.encounter(stage))
	_show_banner("交战开始", "STAGE %02d  ·  ENGAGE" % (stage + 1))
	_render_all()

func _on_battle(type: String, d: Dictionary) -> void:
	match type:
		"spawn":
			var u: ACBattle.BUnit = d["u"]
			var key := "b%d" % u.serial
			var a := world.add_actor(key, u.id, u.enemy_type, u.team, u.star, ACWorld.g2w(u.gpos))
			a.bunit = u
			_add_bar(key, a)
		"fx":
			world.fx(d)
		"damage":
			var tgt: ACBattle.BUnit = d["tgt"]
			var src = d["src"]
			var col := Color.WHITE
			var size := 22
			if d["crit"]:
				col = Color("ffe24a")
				size = 30
			elif d["kind"] == "skill":
				col = Color("7fe6ff") if src != null and src.team == 0 else Color("ff8a93")
				size = 26
			elif tgt.team == 0:
				col = Color("ff9aa3")
			_float_text(tgt, str(int(round(d["raw"]))) + ("!" if d["crit"] else ""), col, size)
		"heal":
			if d["amount"] >= 1:
				_float_text(d["tgt"], "+%d" % int(d["amount"]), Color("8dffc0"), 24)
		"shake":
			world.shake(float(d["v"]))
		"hitstop":
			_hitstop = maxf(_hitstop, float(d["dur"]))
		"cast":
			var u: ACBattle.BUnit = d["u"]
			if u.team == 0 and GameData.by_id.has(u.id):
				_show_cutin(u.id)
		"wave":
			_show_banner("第 %d / %d 波" % [d["n"], d["total"]], "HOSTILE REINFORCEMENT  ·  敌方增援")
		"finish":
			_finish.call_deferred(d)

func _process(dt: float) -> void:
	if mode == "fight" and battle != null and battle.running:
		if _hitstop > 0:
			_hitstop -= dt
		else:
			_acc += minf(dt, 0.1) * speed
			var n := 0
			while _acc >= STEP and n < 12 and battle.running:
				battle.step(STEP)
				_acc -= STEP
				n += 1
		world.sync_projectiles(battle.projectiles)
		_right_refresh -= dt
		if _right_refresh <= 0:
			_right_refresh = 0.3
			_render_damage()
			_render_go()
	_update_bars()
	if _drag != null:
		_drag_follow(get_local_mouse_position())

func _finish(d: Dictionary) -> void:
	if mode != "fight":
		return
	var practice := GameData.is_cleared(stage)
	var enc := ACData.encounter(stage)
	var won: bool = d["won"]
	var res := state.apply_result(won, int(d["surviving"]), enc.get("boss", false) == true, practice)
	if won and not practice:
		GameData.mark_cleared(stage)
	mode = "result"
	world.sync_projectiles([])
	_save()
	_render_all()
	_show_banner("作战成功" if won else "防线失守", ("重玩通关" if practice else "奖励 +1 金币") if won else ("完整度 -%d" % int(res["damage"]) if not practice else "重玩不扣完整度"))
	var report := battle.damage_report()
	var allies := battle.alive(0).size()
	get_tree().create_timer(1.5).timeout.connect(func():
		if is_inside_tree() and mode == "result":
			_open_result(won, d, res, practice, report, allies))

func _leave() -> void:
	if mode == "fight":
		return
	_save()
	app.play_music("res://assets/music/lobby.wav")
	app.pop(self)

func _save() -> void:
	GameData.save_ac()

# ---------- 商店操作 ----------

func _buy(i: int) -> void:
	if mode != "prep":
		return
	var res := state.buy(i)
	if not res["ok"]:
		app.toast("金币不足或备战席已满。")
		return
	var merges: Array = res["merges"]
	_save()
	_sync_planning()
	_render_all()
	for m in merges:
		var loc: Dictionary = m["loc"]
		var p := world.loc_world(loc)
		world.fx({"kind": "ring", "at": Vector2(p.x + ACData.COLS / 2.0, p.z + ACData.ROWS / 2.0), "lift": 0.05, "color": ACData.star_color(int(m["unit"]["star"])), "r0": 0.2, "r1": 1.1, "life": 0.7, "width": 0.08, "filled": true})
		world.fx({"kind": "burst", "at": Vector2(p.x + ACData.COLS / 2.0, p.z + ACData.ROWS / 2.0), "lift": 0.8, "color": ACData.star_color(int(m["unit"]["star"])), "count": 24, "speed": 3.0, "size": 0.06, "life": 0.8, "up": 1.0})
		app.toast("%s 升至 %d 星！" % [ACData.unit(m["unit"]["id"])["name"], int(m["unit"]["star"])])

func _reroll() -> void:
	if mode != "prep":
		return
	if state.reroll():
		_save()
		_render_all()
	else:
		app.toast("金币不足。")

func _buy_xp() -> void:
	if mode != "prep":
		return
	var r := state.buy_xp()
	if r == 0:
		app.toast("金币不足或已满级。")
		return
	if r == 2:
		app.toast("等级提升至 %d，可部署 %d 名棋子。" % [state.level, state.board_cap()])
	_save()
	_render_all()

func _sell(u: Dictionary) -> void:
	var v := state.sell(u)
	if v > 0:
		app.toast("出售 %s，获得 %d 金币。" % [ACData.unit(u["id"])["name"], v])
	_save()
	_sync_planning()
	_render_all()

func _unit_for_actor(a: ACActor) -> Dictionary:
	if a == null or a.uid < 0:
		return {}
	for u in state.bench:
		if u != null and int(u["uid"]) == a.uid:
			return u
	for k in state.board:
		if int(state.board[k]["uid"]) == a.uid:
			return state.board[k]
	return {}

# ---------- 棋盘输入：拖放部署 ----------

func _board_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_LEFT and mb.pressed:
			if mode == "prep" and _modal == null:
				var a := world.actor_at(mb.position, 0)
				if a != null and a.uid >= 0:
					_drag = a
					_drag_unit = _unit_for_actor(a)
					a.lifted = true
					world.show_deploy_zone(true)
					_hide_info()
		elif mb.button_index == MOUSE_BUTTON_LEFT and not mb.pressed and _drag != null:
			_drop(mb.position)
		elif mb.button_index == MOUSE_BUTTON_RIGHT and mb.pressed:
			var a := world.actor_at(mb.position)
			if a != null:
				_show_actor_info(a, mb.position)
			else:
				_hide_info()
	elif event is InputEventMouseMotion:
		var mm := event as InputEventMouseMotion
		if _drag == null:
			_hover = world.actor_at(mm.position, 0)

func _drag_follow(pos: Vector2) -> void:
	var g := world.ground_at(pos)
	if g != Vector3.INF:
		_drag.position = g + Vector3(0, 0.35, 0)
	var over_shop := _shop_panel.get_global_rect().has_point(_view.get_global_transform() * pos)
	var loc := world.loc_at(pos)
	if over_shop:
		world.highlight({})
		_shop_panel.modulate = Color(1, 0.7, 0.7)
	else:
		_shop_panel.modulate = Color.WHITE
		var ok: bool = not loc.is_empty() and (loc["kind"] == "bench" or ACState.is_player_cell(loc["x"], loc["y"]))
		world.highlight(loc, ok, true)

func _drop(pos: Vector2) -> void:
	var a := _drag
	_drag = null
	a.lifted = false
	_shop_panel.modulate = Color.WHITE
	world.highlight({})
	world.show_deploy_zone(false)
	var u := _drag_unit
	if u.is_empty():
		_sync_planning()
		return
	if _shop_panel.get_global_rect().has_point(_view.get_global_transform() * pos):
		_sell(u)
		return
	var loc := world.loc_at(pos)
	if not loc.is_empty():
		var from := state.locate(u)
		if not state.move(u, loc) and loc["kind"] == "board" and ACState.is_player_cell(loc["x"], loc["y"]) and from.get("kind") == "bench" and state.unit_at(loc) == null:
			app.toast("已达部署上限（%d）。购买经验可以提升等级。" % state.board_cap())
		elif loc["kind"] == "board" and not ACState.is_player_cell(loc["x"], loc["y"]):
			app.toast("只能部署在我方区域（下方四行）。")
	_save()
	_sync_planning()
	_render_all()

func _unhandled_key_input(event: InputEvent) -> void:
	if not event.pressed or event.is_echo() or _modal != null:
		return
	match (event as InputEventKey).keycode:
		KEY_D:
			_reroll()
		KEY_F:
			_buy_xp()
		KEY_SPACE:
			start_combat()
		KEY_E:
			if mode == "prep" and _hover != null and _drag == null:
				var u := _unit_for_actor(_hover)
				_hover = null
				if not u.is_empty():
					_sell(u)
		KEY_ESCAPE:
			_hide_info()
	get_viewport().set_input_as_handled()

# ---------- 血条与飘字 ----------

class HpBar extends Control:
	var actor: ACActor
	var team := 0
	var star := 1
	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		size = Vector2(76, 18)
	func _draw() -> void:
		var u = actor.bunit if actor != null else null
		var w := size.x
		var hp_k := 1.0
		var sh_k := 0.0
		var mana_k := 0.0
		var has_mana := true
		if u != null:
			hp_k = clampf(u.hp / u.max_hp, 0.0, 1.0)
			sh_k = clampf(u.shield / u.max_hp, 0.0, 1.0)
			has_mana = u.max_mana > 0
			mana_k = clampf(u.mana / u.max_mana, 0.0, 1.0) if has_mana else 0.0
		draw_rect(Rect2(0, 6, w, 8), Color(0, 0, 0, 0.7))
		var col := Color("5fe3ff") if team == 0 else Color("ff4a55")
		draw_rect(Rect2(1, 7, (w - 2) * hp_k, 6), col)
		if sh_k > 0:
			draw_rect(Rect2(1 + (w - 2) * hp_k, 7, minf((w - 2) * sh_k, (w - 2) * (1.0 - hp_k) + 6), 6), Color(0.9, 0.95, 1, 0.85))
		# 每 300 生命一道刻度
		if u != null and u.max_hp > 300:
			var step: float = (w - 2) * 300.0 / u.max_hp
			var x: float = 1.0 + step
			while x < w - 2:
				draw_line(Vector2(x, 7), Vector2(x, 13), Color(0, 0, 0, 0.5), 1.0)
				x += step
		if has_mana:
			draw_rect(Rect2(0, 14, w, 4), Color(0, 0, 0, 0.7))
			draw_rect(Rect2(1, 15, (w - 2) * mana_k, 2), Color("ffd23a") if mana_k >= 1.0 else Color("8fd0ff"))
		if team == 0 and star > 1:
			for i in star:
				var cx := w / 2.0 + (i - (star - 1) / 2.0) * 10.0
				draw_colored_polygon(PackedVector2Array([Vector2(cx, -1), Vector2(cx + 4, 3), Vector2(cx, 7), Vector2(cx - 4, 3)]), ACData.star_color(star))

func _add_bar(key, a: ACActor) -> void:
	var bar := HpBar.new()
	bar.actor = a
	bar.team = a.team
	bar.star = a.star
	if a.enemy and ACData.enemy(a.unit_id).get("boss", false):
		bar.size = Vector2(150, 18)
	_float.add_child(bar)
	_bars[key] = bar

func _clear_bars() -> void:
	for k in _bars:
		(_bars[k] as Control).queue_free()
	_bars.clear()

func _update_bars() -> void:
	for k in _bars:
		var bar: HpBar = _bars[k]
		var a := bar.actor
		if not is_instance_valid(a) or a.gone or not a.visible or (a.bunit != null and not a.bunit.alive):
			bar.visible = false
			continue
		bar.visible = true
		var p := world.screen_of(a)
		bar.position = p - Vector2(bar.size.x / 2.0, bar.size.y)
		bar.queue_redraw()

func _float_text(u: ACBattle.BUnit, text: String, col: Color, size: int) -> void:
	var p := world.camera.unproject_position(ACWorld.g2w(u.gpos) + Vector3(0, 1.4 * u.size, 0))
	var l := UI.label(text, size, col, UI.num())
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	l.add_theme_constant_override("font_outline_size", 6)
	l.position = p + Vector2(randf_range(-26, 14), randf_range(-10, 6))
	_float.add_child(l)
	var t := l.create_tween().set_parallel()
	t.tween_property(l, "position:y", l.position.y - 46, 0.8).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	t.tween_property(l, "modulate:a", 0.0, 0.35).set_delay(0.5)
	t.chain().tween_callback(l.queue_free)

# ---------- 横幅与技能特写 ----------

func _build_banner() -> void:
	_banner = Control.new()
	UI.pin(_banner, 0.5, 0, -480, 150, 960, 120)
	_banner.mouse_filter = MOUSE_FILTER_IGNORE
	var back := UI.panel(UI.box(Color(0.02, 0.025, 0.04, 0.82), Color(0, 0, 0, 0), 0, [0, 0, 0, 0], -0.25))
	UI.full(back)
	_banner.add_child(back)
	var bar := UI.rect(UI.ACCENT, 960, 4)
	UI.pin(bar, 0, 1, 0, -4, 960, 4)
	_banner.add_child(bar)
	_banner_title = UI.label("", 48, Color.WHITE, UI.cjk(900), 10)
	_banner_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	UI.pin(_banner_title, 0, 0, 0, 14, 960, 64)
	_banner.add_child(_banner_title)
	_banner_sub = UI.label("", 14, UI.ACCENT, UI.mono(), 3)
	_banner_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	UI.pin(_banner_sub, 0, 0, 0, 80, 960, 24)
	_banner.add_child(_banner_sub)
	_banner.modulate.a = 0.0
	add_child(_banner)
	_cutin = Control.new()
	UI.pin(_cutin, 0, 0, -620, 330, 600, 150)
	_cutin.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(_cutin)

func _show_banner(title: String, sub: String) -> void:
	_banner_title.text = title
	_banner_sub.text = sub
	if _banner_tween:
		_banner_tween.kill()
	_banner.scale = Vector2(1, 0.6)
	_banner.pivot_offset = Vector2(480, 60)
	_banner_tween = create_tween()
	_banner_tween.set_parallel()
	_banner_tween.tween_property(_banner, "modulate:a", 1.0, 0.18)
	_banner_tween.tween_property(_banner, "scale", Vector2.ONE, 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	_banner_tween.chain().tween_interval(1.1)
	_banner_tween.chain().tween_property(_banner, "modulate:a", 0.0, 0.3)

func _show_cutin(id: String) -> void:
	for c in _cutin.get_children():
		c.queue_free()
	var h := GameData.hero(id)
	var back := UI.panel(UI.box(Color(GameData.tone(id), 0.85), Color(0, 0, 0, 0), 0, [0, 0, 0, 0], -0.3))
	UI.pin(back, 0, 0, 0, 20, 560, 110)
	_cutin.add_child(back)
	back.clip_contents = true
	var face := UI.image(GameData.portrait(id), true)
	UI.pin(face, 1, 0, -230, -40, 230, 345)
	back.add_child(face)
	back.add_child(UI.full(UI.gradient(Color(0, 0, 0, 0.55), Color(0, 0, 0, 0.0), Vector2(0, 0), Vector2(1, 0), [0.35, 0.65])))
	var col := UI.vbox(0)
	UI.pin(col, 0, 0, 60, 14, 330, 90)
	col.add_child(UI.label(String(h["en"]).to_upper() + "  ·  SKILL", 11, Color(1, 1, 1, 0.75), UI.mono(), 2))
	col.add_child(UI.label("「%s」" % h["skill"], 34, Color.WHITE, UI.cjk(900), 4))
	col.add_child(UI.label(h["name"], 15, Color(1, 1, 1, 0.85), UI.cjk(700), 2))
	back.add_child(col)
	_cutin.offset_left = -620
	_cutin.offset_right = -20
	var t := create_tween()
	t.set_parallel()
	t.tween_property(_cutin, "offset_left", 0.0, 0.22).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	t.tween_property(_cutin, "offset_right", 600.0, 0.22).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	t.chain().tween_interval(0.8)
	t.chain().tween_property(_cutin, "offset_left", -620.0, 0.25)
	t.parallel().tween_property(_cutin, "offset_right", -20.0, 0.25)

# ---------- 单位资料 ----------

func _show_actor_info(a: ACActor, pos: Vector2) -> void:
	var u = a.bunit
	_show_info_for(a.unit_id, a.enemy, a.star, pos + Vector2(20, -40), false, u)

func _show_info_for(id: String, enemy_type: bool, star: int, pos: Vector2, above: bool, u = null) -> void:
	_hide_info()
	var d: Dictionary = ACData.enemy(id) if enemy_type else ACData.unit(id)
	_info = UI.panel(UI.pad(UI.box(Color(0.03, 0.04, 0.065, 0.96), UI.LINE_HI, 1, [0, 14, 0, 0]), 20, 16))
	_info.mouse_filter = MOUSE_FILTER_IGNORE
	_info.custom_minimum_size.x = 340
	var col := UI.vbox(6)
	_info.add_child(col)
	var code: String = d.get("code", "")
	col.add_child(UI.label("%s  ·  %s" % [code, ("COST %d" % int(d["cost"])) if not enemy_type else ("BOSS" if d.get("boss", false) else "HOSTILE")], 11, UI.ACCENT if not enemy_type else UI.RED, UI.mono(), 2))
	col.add_child(UI.label("%s %s" % [d["name"], "★".repeat(star) if not enemy_type else ""], 26, Color.WHITE, UI.cjk(800), 2))
	if not enemy_type:
		col.add_child(UI.label(" / ".join(PackedStringArray((d["traits"] as Array).map(func(t): return ACData.traits()[t]["name"]))), 14, UI.MUTED, UI.cjk(500), 1))
	var m: float = ACData.star_mult(star) if not enemy_type else (u.scale_mult if u != null else 1.0)
	var hp_text := "%d" % int(float(d["hp"]) * m)
	if u != null:
		hp_text = "%d / %d" % [int(u.hp), int(u.max_hp)]
	col.add_child(UI.label("生命 %s    攻击 %d" % [hp_text, int(float(d["atk"]) * m)], 15, Color.WHITE, UI.cjk(500), 1))
	col.add_child(UI.label("护甲 %d    射程 %d    攻速 %.2f" % [int(d["armor"]), int(d["range"]), float(d["as"])], 15, Color.WHITE, UI.cjk(500), 1))
	if d.has("skill"):
		col.add_child(UI.rect(UI.LINE, 0, 1))
		var sk: Dictionary = d["skill"]
		col.add_child(UI.label("「%s」  法力 %d" % [sk.get("name", ""), int(d["mana"])], 17, UI.ACCENT, UI.cjk(700), 2))
		if sk.has("desc"):
			col.add_child(UI.wrap(UI.label(String(sk["desc"]).replace("{v}", str(int(sk["values"][star]))), 14, Color(1, 1, 1, 0.8), UI.cjk(400), 1), 300))
	add_child(_info)
	await get_tree().process_frame
	if not is_instance_valid(_info):
		return
	var sz := _info.size
	var p := pos
	if above:
		p.y -= sz.y
	p.x = clampf(p.x, 10, size.x - sz.x - 10)
	p.y = clampf(p.y, 10, size.y - sz.y - 10)
	_info.position = p

func _hide_info() -> void:
	if is_instance_valid(_info):
		_info.queue_free()
	_info = null

# ---------- 强化三选一 ----------

func _open_augments() -> void:
	_close_modal()
	_modal = UI.full(Control.new())
	add_child(_modal)
	var dim := UI.full(ColorRect.new())
	(dim as ColorRect).color = Color(0.01, 0.015, 0.03, 0.8)
	_modal.add_child(dim)
	var col := UI.vbox(26)
	UI.pin(col, 0.5, 0.5, -600, -260, 1200, 520)
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	_modal.add_child(col)
	var t1 := UI.label("TACTICAL AUGMENT", 13, UI.ACCENT, UI.mono(), 4)
	t1.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(t1)
	var t2 := UI.label("选择一项战术强化", 40, Color.WHITE, UI.cjk(900), 8)
	t2.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(t2)
	var row := UI.hbox(24)
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_child(row)
	for a in _pending_aug:
		var aug: Dictionary = ACData.augments()[a]
		var card := UI.flat_button(UI.box(Color(0.05, 0.065, 0.1, 0.96), UI.LINE, 1, [0, 24, 0, 0]), UI.box(Color(0.1, 0.12, 0.17, 0.98), UI.ACCENT, 2, [0, 24, 0, 0]))
		card.custom_minimum_size = Vector2(340, 300)
		var c := UI.vbox(12)
		UI.pin(c, 0, 0, 30, 34, 280, 240)
		var icon := UI.label(String(aug["icon"]), 64, UI.ACCENT, UI.cjk(700))
		c.add_child(icon)
		c.add_child(UI.label(String(aug["en"]), 12, UI.MUTED, UI.mono(), 3))
		c.add_child(UI.label(String(aug["name"]), 30, Color.WHITE, UI.cjk(900), 4))
		c.add_child(UI.wrap(UI.label(String(aug["desc"]), 17, Color(1, 1, 1, 0.8), UI.cjk(500), 1), 280))
		card.add_child(c)
		UI.passthrough(card)
		card.mouse_filter = MOUSE_FILTER_STOP
		var key: String = a
		card.pressed.connect(func():
			state.take_augment(key)
			_pending_aug = []
			_save()
			_close_modal()
			app.toast("已获得强化：%s" % aug["name"])
			_render_all())
		UI.hover_shift(card, 0)
		row.add_child(card)

func _close_modal() -> void:
	if is_instance_valid(_modal):
		_modal.queue_free()
	_modal = null

# ---------- 结算 ----------

func _open_result(won: bool, d: Dictionary, res: Dictionary, practice: bool, report: Array, allies: int) -> void:
	_close_modal()
	_modal = UI.full(Control.new())
	add_child(_modal)
	var dim := UI.full(ColorRect.new())
	(dim as ColorRect).color = Color(0.01, 0.015, 0.03, 0.72)
	_modal.add_child(dim)
	var panel := UI.panel(UI.pad(UI.box(Color(0.03, 0.04, 0.065, 0.97), UI.ACCENT if won else UI.RED, 2, [0, 34, 0, 34]), 44, 34))
	UI.pin(panel, 0.5, 0.5, -420, -330, 840, 0)
	_modal.add_child(panel)
	var col := UI.vbox(16)
	panel.add_child(col)
	var last := stage >= ACData.encounters().size() - 1
	col.add_child(UI.label("%s  ·  STAGE %02d" % ["MISSION CLEARED" if won else "DEFENSE BREACHED", stage + 1], 13, UI.ACCENT if won else UI.RED, UI.mono(), 4))
	col.add_child(UI.label(("第一章 · 全部完成" if last else "作战成功") if won else "防线失守", 48, Color.WHITE, UI.cjk(900), 8))
	var stats := UI.hbox(36)
	var mvp: String = ACData.unit(d["mvp"]["id"])["name"] if d.get("mvp") != null else "—"
	for s in [["用时", _fmt_time(float(d["time"]))], ["存活", str(allies)], ["MVP", mvp], ["完整度", ("-%d" % int(res["damage"])) if not won else str(state.hp)]]:
		var c := UI.vbox(0)
		c.add_child(UI.label(s[0], 13, UI.MUTED, UI.cjk(500), 2))
		c.add_child(UI.label(s[1], 30, Color.WHITE, UI.cjk(800) if s[0] == "MVP" else UI.num(), 1))
		stats.add_child(c)
	col.add_child(stats)
	col.add_child(UI.rect(UI.LINE, 0, 1))
	var mx := 1.0
	for r in report:
		mx = maxf(mx, r["dealt"])
	for r in report.slice(0, 5):
		var row := UI.hbox(12)
		var av := UI.panel(UI.box(Color(0.1, 0.12, 0.17), Color(0, 0, 0, 0), 0))
		av.custom_minimum_size = Vector2(36, 36)
		av.clip_contents = true
		av.add_child(UI.image(_card_art(r["id"]), true))
		row.add_child(av)
		var nm := UI.label("%s %s" % [ACData.unit(r["id"])["name"], "★".repeat(int(r["star"]))], 16, Color.WHITE, UI.cjk(600), 1)
		nm.custom_minimum_size.x = 220
		row.add_child(nm)
		var track := UI.rect(Color(1, 1, 1, 0.1), 0, 6)
		track.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		track.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		var fill := UI.rect(UI.ACCENT, 0, 6)
		track.add_child(fill)
		var ratio: float = r["dealt"] / mx
		track.resized.connect(func(): fill.size = Vector2(track.size.x * ratio, 6))
		row.add_child(track)
		var v := UI.label(str(int(r["dealt"])), 20, UI.ACCENT, UI.num())
		v.custom_minimum_size.x = 70
		v.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		row.add_child(v)
		col.add_child(row)
	var note := ""
	if won:
		note = "重玩通关，不发放奖励。" if practice else "奖励 +1 金币。"
	else:
		note = "重玩不扣完整度。" if practice else "获得重整补给 %d 金币、经验 +1。" % int(res["relief"])
		if res["overload"]:
			note += " 终端过载：损失一半金币，完整度已重置。"
	col.add_child(UI.label(note, 15, UI.MUTED, UI.cjk(500), 1))
	var btns := UI.hbox(12)
	btns.alignment = BoxContainer.ALIGNMENT_END
	var back := UI.text_button("返回作战", 18)
	back.pressed.connect(func():
		_close_modal()
		mode = "prep"
		_leave())
	btns.add_child(back)
	if won:
		var stay := UI.text_button("留在本节", 18)
		stay.pressed.connect(prepare)
		btns.add_child(stay)
		if not last:
			var next := UI.text_button("下一节  ›", 20, true, 12)
			next.pressed.connect(func():
				stage += 1
				prepare())
			btns.add_child(next)
	else:
		var retry := UI.text_button("重新部署", 20, true, 12)
		retry.pressed.connect(prepare)
		btns.add_child(retry)
	col.add_child(btns)
	panel.modulate.a = 0.0
	create_tween().tween_property(panel, "modulate:a", 1.0, 0.25)

func _fmt_time(t: float) -> String:
	return "%02d:%02d" % [int(t) / 60, int(t) % 60]

func refresh() -> void:
	pass

func _exit_tree() -> void:
	if battle != null:
		battle.listeners.clear()
		battle.clear()

func debug_open(what: String) -> void:
	match what:
		"fight":
			if not _pending_aug.is_empty():
				state.take_augment(_pending_aug[0])
				_pending_aug = []
				_close_modal()
			if state.board_count() == 0 and state.bench_count() == 0:
				for i in 5:
					if state.can_buy(i):
						state.buy(i)
			start_combat()
		"buy":
			for i in 5:
				if state.can_buy(i):
					_buy(i)
		"drag":
			# 模拟拖放：把备战席第一个棋子拖到棋盘 (3, 5)，再把它拖回备战席最后一格
			for i in 5:
				if state.can_buy(i):
					_buy(i)
			var before := state.board_count()
			var a: ACActor = null
			for k in world.actors:
				if (world.actors[k] as ACActor).uid >= 0:
					a = world.actors[k]
					break
			var press := InputEventMouseButton.new()
			press.button_index = MOUSE_BUTTON_LEFT
			press.pressed = true
			press.position = world.screen_of(a, 0.7)
			_board_input(press)
			var target := world.camera.unproject_position(ACWorld.g2w(Vector2(3.5, 5.5)))
			_drag_follow(target)
			var release := InputEventMouseButton.new()
			release.button_index = MOUSE_BUTTON_LEFT
			release.pressed = false
			release.position = target
			_board_input(release)
			print("DRAG board %d -> %d, at(3,5)=%s" % [before, state.board_count(), state.board.has("3,5")])
