extends Control
## 大厅：中央助理立绘，右侧作战与功能磁贴，左侧玩家信息、活动横幅与通讯栏。

const ROSTER := preload("res://scripts/roster_screen.gd")
const BATTLE := preload("res://scripts/battle_panel.gd")

const BANNERS := [
	{"tag": "主线", "en": "MAIN STORY", "title": "第一章 · 幻想乡", "sub": "20 个任务节点 · 剧情编写中", "hero": "warden", "action": "battle"},
	{"tag": "成员", "en": "NEW MEMBERS", "title": "八位少女加入", "sub": "东方 Project 二次创作 · 成员档案已开放", "hero": "ember", "action": "roster"},
	{"tag": "公告", "en": "NOTICE", "title": "Godot 重制版", "sub": "入场界面与大厅已重制 · 战斗移植中", "hero": "moon", "action": "notice"},
]
const CHAT := [
	["系统", "欢迎回来，%s。幻想乡今日一切如常。"],
	["系统", "第一章剧情正在编写，战斗节点已全部开放。"],
	["通讯", "红魔馆的门卫又在站岗时睡着了。"],
	["通讯", "博丽神社的香火钱箱依旧空空如也。"],
]

var app
var _bg: TextureRect
var _hero_layer: Control
var _hero: TextureRect
var _hero_ring: Control
var _hero_en: Label
var _cap_faction: Label
var _cap_name: Label
var _cap_en: Label
var _cap_type: Label
var _bubble: PanelContainer
var _bubble_text: Label
var _bubble_tween: Tween
var _avatar: TextureRect
var _clock: Label
var _date: Label
var _battle_progress: Label
var _banner_holder: Control
var _banner_cards: Array[Control] = []
var _banner_dots: Array[ColorRect] = []
var _banner_index := 0
var _chat_label: Label
var _chat_tag: Label
var _chat_index := 0
var _par := Vector2.ZERO
var _breath: Tween
var _quote_index := 0
var _intro_done := false

func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	_build_background()
	_build_hero()
	_build_top_bar()
	_build_menu()
	_build_left()
	_build_caption()
	refresh()
	_tick_clock()
	var clock_timer := Timer.new()
	clock_timer.wait_time = 1.0
	clock_timer.autostart = true
	clock_timer.timeout.connect(_tick_clock)
	add_child(clock_timer)
	var banner_timer := Timer.new()
	banner_timer.wait_time = 5.0
	banner_timer.autostart = true
	banner_timer.timeout.connect(func(): _show_banner((_banner_index + 1) % BANNERS.size()))
	add_child(banner_timer)
	var chat_timer := Timer.new()
	chat_timer.wait_time = 6.0
	chat_timer.autostart = true
	chat_timer.timeout.connect(_next_chat)
	add_child(chat_timer)
	_intro()

# ---------- 背景 ----------

func _build_background() -> void:
	_bg = UI.full(UI.image(load("res://assets/bg/academy-atrium-v2.png"), true), 48) as TextureRect
	_bg.modulate = Color(0.6, 0.64, 0.76)
	add_child(_bg)
	add_child(UI.full(UI.gradient(Color(0.025, 0.035, 0.06, 0.88), Color(0.025, 0.035, 0.06, 0.0), Vector2(0, 0), Vector2(1, 0), [0.0, 0.42])))
	add_child(UI.full(UI.gradient(Color(0.025, 0.035, 0.06, 0.0), Color(0.025, 0.035, 0.06, 0.82), Vector2(0, 0), Vector2(1, 0), [0.55, 1.0])))
	add_child(UI.full(UI.gradient(Color(0.02, 0.025, 0.045, 0.0), Color(0.02, 0.025, 0.045, 0.9), Vector2(0, 0), Vector2(0, 1), [0.62, 1.0])))
	add_child(UI.full(UI.gradient(Color(0.02, 0.025, 0.045, 0.85), Color(0.02, 0.025, 0.045, 0.0), Vector2(0, 0), Vector2(0, 1), [0.0, 0.16])))
	var motes := CPUParticles2D.new()
	motes.amount = 70
	motes.lifetime = 9.0
	motes.preprocess = 9.0
	motes.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	motes.emission_rect_extents = Vector2(1100, 600)
	motes.position = Vector2(960, 640)
	motes.direction = Vector2(0.2, -1)
	motes.spread = 25.0
	motes.gravity = Vector2.ZERO
	motes.initial_velocity_min = 8.0
	motes.initial_velocity_max = 26.0
	motes.scale_amount_min = 1.5
	motes.scale_amount_max = 4.0
	var ramp := Gradient.new()
	ramp.set_color(0, Color(1, 0.95, 0.8, 0.0))
	ramp.set_color(1, Color(1, 0.95, 0.8, 0.0))
	ramp.add_point(0.3, Color(1, 0.95, 0.8, 0.55))
	ramp.add_point(0.75, Color(0.8, 0.9, 1.0, 0.35))
	motes.color_ramp = ramp
	add_child(motes)

# ---------- 助理立绘 ----------

func _build_hero() -> void:
	_hero_layer = UI.full(Control.new())
	_hero_layer.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(_hero_layer)
	_hero_en = UI.label("", 190, Color(1, 1, 1, 0.05), UI.num(), 12)
	_hero_en.rotation = -PI / 2
	UI.pin(_hero_en, 0.42, 1, -560, -70, 1100, 220)
	_hero_layer.add_child(_hero_en)
	var ring := UI.Ring.new()
	ring.radius = 330
	ring.color = Color(1, 1, 1, 0.14)
	ring.dashes = 60
	ring.gap = 0.5
	UI.pin(ring, 0.42, 0, -360, 110, 720, 720)
	ring.pivot_offset = Vector2(360, 360)
	_hero_layer.add_child(ring)
	_hero_ring = ring
	var spin := create_tween().set_loops()
	spin.tween_property(ring, "rotation", -TAU, 120.0).from(0.0)
	var ring2 := UI.Ring.new()
	ring2.radius = 270
	ring2.width = 1.5
	ring2.color = Color(1, 0.824, 0.227, 0.22)
	ring2.dashes = 3
	ring2.gap = 0.72
	UI.pin(ring2, 0.42, 0, -300, 170, 600, 600)
	ring2.pivot_offset = Vector2(300, 300)
	_hero_layer.add_child(ring2)
	var spin2 := create_tween().set_loops()
	spin2.tween_property(ring2, "rotation", TAU, 40.0).from(0.0)
	var floor_glow := UI.gradient(Color(1, 0.86, 0.5, 0.22), Color(1, 0.86, 0.5, 0.0), Vector2(0.5, 0.5), Vector2(0.5, 0.0))
	(floor_glow.texture as GradientTexture2D).fill = GradientTexture2D.FILL_RADIAL
	UI.pin(floor_glow, 0.42, 1, -330, -150, 660, 160)
	_hero_layer.add_child(floor_glow)
	_hero = UI.image(null)
	UI.pin(_hero, 0.42, 0, -420, 10, 840, 1260)
	_hero.mouse_filter = MOUSE_FILTER_IGNORE
	_hero_layer.add_child(_hero)
	# 只在人物身体范围内响应点击
	var hit := Control.new()
	UI.pin(hit, 0.42, 0, -200, 60, 400, 960)
	hit.mouse_default_cursor_shape = CURSOR_POINTING_HAND
	hit.gui_input.connect(func(e: InputEvent):
		if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
			_poke())
	_hero_layer.add_child(hit)

	_bubble = UI.panel(UI.pad(UI.box(Color(0.97, 0.97, 0.99, 0.95), Color(0, 0, 0, 0), 0, [0, 18, 0, 18]), 26, 16))
	UI.pin(_bubble, 0.42, 0, 150, 150, 420, 0)
	_bubble.mouse_filter = MOUSE_FILTER_IGNORE
	var bcol := UI.vbox(6)
	_bubble_text = UI.wrap(UI.label("", 21, UI.INK, UI.cjk(600), 1), 368)
	bcol.add_child(_bubble_text)
	_bubble.add_child(bcol)
	_bubble.modulate.a = 0.0
	_hero_layer.add_child(_bubble)

func _set_hero(id: String) -> void:
	var h := GameData.hero(id)
	_hero.texture = GameData.portrait(id)
	_hero_en.text = String(h["en"]).to_upper()
	_cap_faction.text = "%s  ·  %s" % [String(h["faction"][1]).to_upper(), h["faction"][0]]
	_cap_name.text = h["name"]
	_cap_en.text = "%s  /  %s" % [h["en"], h["ja"]]
	_cap_type.text = "%s · %s" % [h["type"][0], h["skill"]]
	_avatar.texture = GameData.avatar(id)
	if _breath:
		_breath.kill()
	_hero.pivot_offset = Vector2(420, 1150)
	_hero.scale = Vector2.ONE
	_breath = create_tween().set_loops()
	_breath.tween_property(_hero, "scale", Vector2(1.004, 1.012), 2.4).set_trans(Tween.TRANS_SINE)
	_breath.tween_property(_hero, "scale", Vector2.ONE, 2.4).set_trans(Tween.TRANS_SINE)

func _poke() -> void:
	var h := GameData.assistant()
	var lines: Array = [h["quote"], "我是%s，%s。" % [h["name"], h["faction"][0]], "技能「%s」：%s" % [h["skill"], h["desc"]]]
	_say(lines[_quote_index % lines.size()])
	_quote_index += 1
	var t := create_tween()
	t.tween_property(_hero, "position:y", _hero.position.y - 10.0, 0.1).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	t.tween_property(_hero, "position:y", _hero.position.y, 0.22).set_trans(Tween.TRANS_BOUNCE).set_ease(Tween.EASE_OUT)

func _say(text: String) -> void:
	_bubble_text.text = text
	if _bubble_tween:
		_bubble_tween.kill()
	_bubble.offset_top = 166
	_bubble_tween = create_tween()
	_bubble_tween.set_parallel()
	_bubble_tween.tween_property(_bubble, "modulate:a", 1.0, 0.2)
	_bubble_tween.tween_property(_bubble, "offset_top", 150.0, 0.25).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	_bubble_tween.chain().tween_interval(4.5)
	_bubble_tween.chain().tween_property(_bubble, "modulate:a", 0.0, 0.4)

# ---------- 顶栏 ----------

func _build_top_bar() -> void:
	# 玩家信息
	var card := UI.hbox(16)
	UI.pin(card, 0, 0, 48, 30, 520, 84)
	var frame := UI.panel(UI.box(Color(0.1, 0.13, 0.19, 0.9), Color(1, 1, 1, 0.6), 1, [0, 0, 14, 0]))
	frame.custom_minimum_size = Vector2(84, 84)
	frame.clip_contents = true
	_avatar = UI.image(null, true)
	frame.add_child(_avatar)
	card.add_child(frame)
	var info := UI.vbox(2)
	info.alignment = BoxContainer.ALIGNMENT_CENTER
	info.add_child(UI.label("WAYFARER · FOLD-01", 12, UI.MUTED, UI.mono(), 2))
	var namerow := UI.hbox(14)
	namerow.add_child(UI.label(GameData.profile["name"], 28, Color.WHITE, UI.cjk(800), 4))
	var lv := UI.label("Lv.%d" % int(GameData.profile["level"]), 28, UI.ACCENT, UI.num(), 1)
	namerow.add_child(lv)
	info.add_child(namerow)
	var exp_track := UI.rect(Color(1, 1, 1, 0.16), 240, 4)
	var exp_fill := UI.rect(UI.ACCENT, 0, 4)
	exp_fill.size = Vector2(240.0 * clampf(float(GameData.profile["exp"]) / 100.0, 0.04, 1.0), 4)
	exp_track.add_child(exp_fill)
	info.add_child(exp_track)
	info.add_child(UI.label("UID %s" % GameData.profile["uid"], 12, UI.FAINT, UI.mono(), 1))
	card.add_child(info)
	add_child(card)

	# 时钟
	var clock_box := UI.vbox(0)
	UI.pin(clock_box, 0, 0, 600, 30, 220, 84)
	clock_box.alignment = BoxContainer.ALIGNMENT_CENTER
	_clock = UI.label("00:00", 40, Color.WHITE, UI.num(), 3)
	_clock.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	clock_box.add_child(_clock)
	_date = UI.label("", 12, UI.MUTED, UI.mono(), 2)
	_date.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	clock_box.add_child(_date)
	add_child(clock_box)

	# 资源与系统按钮
	var res := UI.hbox(6)
	UI.pin(res, 1, 0, -1000, 36, 950, 50)
	res.alignment = BoxContainer.ALIGNMENT_END
	for r in [["STAMINA", "体力", "%d/120" % int(GameData.profile["stamina"]), UI.CYAN], ["GOLD", "金币", str(int(GameData.profile["gold"])), UI.ACCENT], ["CRYSTAL", "结晶", str(int(GameData.profile["crystal"])), Color("ff8fb1")]]:
		var cap := UI.panel(UI.pad(UI.box(Color(0.04, 0.05, 0.08, 0.72), UI.LINE, 1, [10, 0, 0, 0]), 14, 4))
		cap.custom_minimum_size = Vector2(176, 50)
		var row := UI.hbox(10)
		var gem := UI.Diamond.new()
		gem.color = r[3]
		gem.custom_minimum_size = Vector2(16, 16)
		gem.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(gem)
		var tcol := UI.vbox(-4)
		tcol.alignment = BoxContainer.ALIGNMENT_CENTER
		tcol.add_child(UI.label(r[0], 10, UI.MUTED, UI.mono(), 1))
		tcol.add_child(UI.label(r[2], 24, Color.WHITE, UI.num(), 1))
		tcol.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(tcol)
		var plus := UI.label("+", 22, r[3], UI.num())
		row.add_child(plus)
		cap.add_child(row)
		cap.tooltip_text = r[1]
		res.add_child(cap)
	var gap := Control.new()
	gap.custom_minimum_size.x = 10
	res.add_child(gap)
	for t in [["公告", "notice"], ["邮件", "mail"], ["设置", "settings"]]:
		var b := UI.text_button(t[0], 15)
		b.custom_minimum_size = Vector2(0, 50)
		var key: String = t[1]
		b.pressed.connect(func(): _open(key))
		res.add_child(b)
	add_child(res)

func _tick_clock() -> void:
	var d := Time.get_datetime_dict_from_system()
	_clock.text = "%02d:%02d" % [d["hour"], d["minute"]]
	var wd: String = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d["weekday"]]
	_date.text = "%04d.%02d.%02d  %s" % [d["year"], d["month"], d["day"], wd]

# ---------- 右侧菜单 ----------

func _build_menu() -> void:
	var x0 := -660.0
	# 作战（主按钮）
	var battle := UI.flat_button(UI.box(UI.ACCENT, Color(0, 0, 0, 0), 0, [0, 34, 0, 0]), UI.box(Color("ffdc5a"), Color(0, 0, 0, 0), 0, [0, 34, 0, 0]))
	UI.pin(battle, 1, 0, x0, 240, 580, 200)
	var stripes := UI.Stripes.new()
	UI.pin(stripes, 1, 0, -240, 0, 200, 200)
	battle.add_child(stripes)
	var bnum := UI.label("01", 60, Color(0, 0, 0, 0.16), UI.num())
	UI.pin(bnum, 0, 0, 30, 18, 120, 70)
	battle.add_child(bnum)
	var bcol := UI.vbox(2)
	UI.pin(bcol, 0, 0, 130, 26, 380, 160)
	bcol.add_child(UI.label("MAIN STORY  ·  OPERATION", 13, Color(0, 0, 0, 0.55), UI.mono(), 2))
	bcol.add_child(UI.label("作 战", 66, UI.INK, UI.cjk(900), 10))
	_battle_progress = UI.label("", 17, Color(0.24, 0.19, 0.0), UI.cjk(700), 2)
	bcol.add_child(_battle_progress)
	battle.add_child(bcol)
	var arrow := UI.label("↗", 34, UI.INK, UI.num())
	UI.pin(arrow, 1, 1, -66, -70, 50, 50)
	battle.add_child(arrow)
	battle.pressed.connect(func(): _open("battle"))
	UI.hover_shift(battle)
	add_child(battle)

	var tiles := [
		["02", "MEMBERS", "成员", "8 位成员", "roster"],
		["03", "RECRUIT", "招募", "研发终端", "recruit"],
		["04", "TASKS", "任务", "每日 0 / 5", "tasks"],
		["05", "ARCHIVE", "档案", "第一章档案", "archive"],
	]
	for i in tiles.size():
		var t: Array = tiles[i]
		var tx := x0 + (i % 2) * 294.0
		var ty := 456.0 + floorf(i / 2.0) * 166.0
		var cuts := [0, 18, 0, 0] if i % 2 == 1 else [0, 0, 0, 0]
		var b := UI.flat_button(
			UI.box(Color(0.04, 0.055, 0.09, 0.78), UI.LINE, 1, cuts),
			UI.box(Color(0.08, 0.1, 0.15, 0.94), Color(1, 1, 1, 0.55), 1, cuts))
		UI.pin(b, 1, 0, tx, ty, 286, 150)
		var bar := UI.rect(Color(1, 1, 1, 0.5), 3, 0)
		UI.pin(bar, 0, 0, 0, 0, 3, 150)
		b.add_child(bar)
		b.mouse_entered.connect(func():
			bar.color = UI.ACCENT
			bar.size.x = 6)
		b.mouse_exited.connect(func():
			bar.color = Color(1, 1, 1, 0.5)
			bar.size.x = 3)
		var n := UI.label(t[0], 36, Color(1, 1, 1, 0.2), UI.num())
		UI.pin(n, 1, 0, -70, 12, 60, 44)
		n.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		b.add_child(n)
		var col := UI.vbox(2)
		UI.pin(col, 0, 1, 28, -122, 240, 110)
		col.alignment = BoxContainer.ALIGNMENT_END
		col.add_child(UI.label(t[1], 12, UI.MUTED, UI.mono(), 2))
		col.add_child(UI.label(t[2], 34, Color.WHITE, UI.cjk(800), 8))
		col.add_child(UI.label(t[3], 15, UI.MUTED, UI.cjk(500), 1))
		b.add_child(col)
		var key: String = t[4]
		b.pressed.connect(func(): _open(key))
		UI.hover_shift(b)
		add_child(b)

	var mark := UI.label("NEVER YIELD / BEYOND THE PAGE", 12, UI.FAINT, UI.mono(), 4)
	mark.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	UI.pin(mark, 1, 1, -660, -70, 580, 20)
	add_child(mark)
	var fan := UI.label("东方 Project 二次创作 · 非官方作品", 13, UI.FAINT, UI.cjk(400), 2)
	fan.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	UI.pin(fan, 1, 1, -660, -46, 580, 20)
	add_child(fan)

# ---------- 左侧：横幅与通讯 ----------

func _build_left() -> void:
	_banner_holder = Control.new()
	UI.pin(_banner_holder, 0, 1, 48, -400, 460, 190)
	_banner_holder.clip_contents = true
	add_child(_banner_holder)
	for i in BANNERS.size():
		var data: Dictionary = BANNERS[i]
		var card := UI.flat_button(UI.box(Color(0.05, 0.07, 0.11, 0.86), UI.LINE, 1, [0, 22, 0, 0]), UI.box(Color(0.08, 0.1, 0.15, 0.94), Color(1, 1, 1, 0.5), 1, [0, 22, 0, 0]))
		UI.full(card)
		card.clip_contents = true
		var glow := UI.gradient(Color(GameData.tone(data["hero"]), 0.0), Color(GameData.tone(data["hero"]), 0.45), Vector2(0, 0), Vector2(1, 0), [0.3, 1.0])
		UI.full(glow)
		card.add_child(glow)
		var face := UI.image(GameData.portrait(data["hero"]), true)
		UI.pin(face, 1, 0, -230, -10, 230, 345)
		face.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		card.add_child(face)
		card.add_child(UI.full(UI.gradient(Color(0.04, 0.05, 0.09, 0.95), Color(0.04, 0.05, 0.09, 0.0), Vector2(0, 0), Vector2(1, 0), [0.42, 0.72])))
		var col := UI.vbox(4)
		UI.pin(col, 0, 0, 24, 22, 300, 150)
		var tag := UI.panel(UI.pad(UI.box(UI.ACCENT, Color(0, 0, 0, 0), 0, [6, 0, 6, 0]), 10, 2))
		tag.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
		tag.add_child(UI.label(data["tag"], 14, UI.INK, UI.cjk(800), 2))
		col.add_child(tag)
		col.add_child(UI.label(data["en"], 11, UI.MUTED, UI.mono(), 2))
		col.add_child(UI.label(data["title"], 30, Color.WHITE, UI.cjk(800), 3))
		col.add_child(UI.wrap(UI.label(data["sub"], 15, Color(1, 1, 1, 0.75), UI.cjk(500), 1), 280))
		card.add_child(col)
		var action: String = data["action"]
		card.pressed.connect(func(): _open(action))
		card.visible = i == 0
		_banner_holder.add_child(card)
		_banner_cards.append(card)
	var dots := UI.hbox(8)
	UI.pin(dots, 0, 1, 52, -198, 200, 6)
	for i in BANNERS.size():
		var d := UI.rect(UI.ACCENT if i == 0 else Color(1, 1, 1, 0.3), 26 if i == 0 else 12, 4)
		dots.add_child(d)
		_banner_dots.append(d)
	add_child(dots)

	var chat := UI.flat_button(UI.pad(UI.box(Color(0.03, 0.04, 0.07, 0.72), UI.LINE, 1, [0, 0, 0, 12]), 18, 0), UI.pad(UI.box(Color(0.06, 0.08, 0.12, 0.9), Color(1, 1, 1, 0.4), 1, [0, 0, 0, 12]), 18, 0))
	UI.pin(chat, 0, 1, 48, -164, 560, 48)
	var crow := UI.hbox(12)
	UI.full(crow)
	crow.offset_left = 18
	crow.offset_right = -18
	_chat_tag = UI.label("[系统]", 16, UI.ACCENT, UI.cjk(700), 1)
	_chat_tag.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	crow.add_child(_chat_tag)
	_chat_label = UI.label("", 16, Color(1, 1, 1, 0.82), UI.cjk(500), 1)
	_chat_label.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_chat_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_chat_label.clip_text = true
	crow.add_child(_chat_label)
	chat.add_child(crow)
	chat.pressed.connect(func(): _open("chat"))
	add_child(chat)
	_show_chat(0)

func _show_banner(i: int) -> void:
	var old := _banner_cards[_banner_index]
	var cur := _banner_cards[i]
	_banner_index = i
	if old != cur:
		var t := create_tween().set_parallel().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		old.modulate.a = 1.0
		t.tween_property(old, "modulate:a", 0.0, 0.3)
		t.chain().tween_callback(func(): old.visible = false)
		cur.visible = true
		cur.modulate.a = 0.0
		cur.position.x = 40
		var t2 := create_tween().set_parallel().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		t2.tween_property(cur, "modulate:a", 1.0, 0.35)
		t2.tween_property(cur, "position:x", 0.0, 0.4)
	for j in _banner_dots.size():
		_banner_dots[j].color = UI.ACCENT if j == i else Color(1, 1, 1, 0.3)
		_banner_dots[j].custom_minimum_size.x = 26 if j == i else 12

func _next_chat() -> void:
	_show_chat((_chat_index + 1) % CHAT.size())

func _show_chat(i: int) -> void:
	_chat_index = i
	_chat_tag.text = "[%s]" % CHAT[i][0]
	var text: String = CHAT[i][1]
	_chat_label.text = text % GameData.profile["name"] if text.contains("%s") else text
	_chat_label.modulate.a = 0.0
	create_tween().tween_property(_chat_label, "modulate:a", 1.0, 0.4)

# ---------- 助理名牌 ----------

func _build_caption() -> void:
	var cap := UI.hbox(18)
	UI.pin(cap, 0, 0, 48, 330, 560, 190)
	var bar := UI.rect(UI.ACCENT, 5, 0)
	cap.add_child(bar)
	var col := UI.vbox(2)
	_cap_faction = UI.label("", 13, UI.ACCENT, UI.mono(), 2)
	col.add_child(_cap_faction)
	_cap_name = UI.label("", 54, Color.WHITE, UI.cjk(900), 8)
	col.add_child(_cap_name)
	_cap_en = UI.label("", 15, UI.MUTED, UI.mono(), 1)
	col.add_child(_cap_en)
	_cap_type = UI.label("", 16, Color(1, 1, 1, 0.8), UI.cjk(500), 2)
	col.add_child(_cap_type)
	cap.add_child(col)
	add_child(cap)
	var swap := UI.text_button("更换助理  ⇄", 16)
	UI.pin(swap, 0, 0, 71, 534, 190, 46)
	swap.pressed.connect(func(): _open("roster"))
	add_child(swap)

# ---------- 行为 ----------

func refresh() -> void:
	_set_hero(GameData.profile["assistant"])
	_battle_progress.text = "第一章 · 幻想乡    进度 %d / %d" % [GameData.cleared_count(), GameData.stages.size()]

func _open(what: String) -> void:
	match what:
		"battle":
			app.push(BATTLE)
		"roster":
			app.push(ROSTER)
		"notice":
			app.open_notice()
		"settings":
			app.open_settings()
		"mail":
			app.toast("暂无新邮件。")
		"recruit":
			app.toast("招募在作战的备战阶段进行：出击后从下方招募终端购买棋子。")
		"tasks":
			app.toast("任务系统即将开放。")
		"archive":
			app.toast("第一章剧情编写中，档案暂未收录内容。")
		"chat":
			_next_chat()

func _intro() -> void:
	_hero_layer.modulate.a = 0.0
	_hero_layer.position.x = 60
	var t := create_tween().set_parallel().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	t.tween_property(_hero_layer, "modulate:a", 1.0, 0.7).set_delay(0.15)
	t.tween_property(_hero_layer, "position:x", 0.0, 0.8).set_delay(0.15)
	t.chain().tween_callback(func(): _intro_done = true)
	get_tree().create_timer(1.2).timeout.connect(func():
		if is_inside_tree():
			_say(GameData.assistant()["quote"]))

func _process(delta: float) -> void:
	var vp := get_viewport_rect().size
	if vp.x <= 0.0:
		return
	var m := get_viewport().get_mouse_position() / vp - Vector2(0.5, 0.5)
	_par = _par.lerp(m.clamp(Vector2(-0.5, -0.5), Vector2(0.5, 0.5)), clampf(delta * 2.5, 0.0, 1.0))
	_bg.position = Vector2(-48, -48) - _par * 40.0
	if _intro_done:
		_hero_layer.position = -_par * 16.0

func debug_open(what: String) -> void:
	if what == "bubble":
		_poke()
	else:
		_open(what)
