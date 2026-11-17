extends Control
## 入场流程：制作组标志 → 二次创作声明 → 标题画面（点击开始）→ 同步进度条 → 大厅。

var app
var _phase_root: Control
var _phase_tween: Tween
var _phase_next := Callable()
var _title_ready := false
var _loading := false
var _tap_box: Control
var _load_box: Control
var _load_fill: ColorRect
var _load_pct: Label
var _load_status: Label
var _glitch: Array[Label] = []
var _bg: TextureRect
var _pulse: Tween

const TIPS := [
	"提示：在大厅点击助理，可以听她说说话。",
	"提示：成员档案里可以把任意一位少女设为大厅助理。",
	"提示：首领战前记得把护盾型成员放在前排。",
	"提示：琪露诺的完美冻结可以打断敌人的蓄力。",
]

func _ready() -> void:
	mouse_filter = MOUSE_FILTER_STOP
	var bg := UI.full(ColorRect.new())
	(bg as ColorRect).color = UI.BG
	bg.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(bg)
	if app.args.has("skip"):
		_title()
	else:
		_studio()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		accept_event()
		_tap()

func _unhandled_key_input(event: InputEvent) -> void:
	if event.pressed and not event.is_echo():
		get_viewport().set_input_as_handled()
		_tap()

func _tap() -> void:
	if _phase_next.is_valid():
		_skip_phase()
	elif _title_ready and not _loading:
		_start_loading()

func _run_phase(root: Control, hold: float, next: Callable) -> void:
	_phase_root = root
	_phase_next = next
	root.modulate.a = 0.0
	_phase_tween = create_tween()
	_phase_tween.tween_property(root, "modulate:a", 1.0, 0.6)
	_phase_tween.tween_interval(hold)
	_phase_tween.tween_property(root, "modulate:a", 0.0, 0.45)
	_phase_tween.tween_callback(_skip_phase)

func _skip_phase() -> void:
	if _phase_tween:
		_phase_tween.kill()
	var next := _phase_next
	_phase_next = Callable()
	if is_instance_valid(_phase_root):
		_phase_root.queue_free()
	if next.is_valid():
		next.call()

# ---------- 1. 制作组标志 ----------

func _studio() -> void:
	var root := UI.full(Control.new())
	add_child(root)
	var col := UI.full(UI.vbox(18))
	(col as VBoxContainer).alignment = BoxContainer.ALIGNMENT_CENTER
	root.add_child(col)
	var mark := UI.label("FOLD PROJECT", 76, Color.WHITE, UI.num(), 22)
	mark.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(mark)
	var line := UI.rect(UI.ACCENT, 0, 3)
	line.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	col.add_child(line)
	var sub := UI.label("绝 不 认 书  ·  制 作 组", 18, UI.MUTED, UI.cjk(500), 4)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(sub)
	_run_phase(root, 1.2, _notice)
	var grow := root.create_tween()
	grow.tween_property(line, "custom_minimum_size:x", 460.0, 1.0).set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)

# ---------- 2. 二次创作声明 ----------

func _notice() -> void:
	var root := UI.full(Control.new())
	add_child(root)
	var center := UI.full(CenterContainer.new())
	root.add_child(center)
	var col := UI.vbox(20)
	col.custom_minimum_size.x = 980
	center.add_child(col)
	col.add_child(UI.label("FAN WORK NOTICE", 14, UI.ACCENT, UI.mono(), 3))
	col.add_child(UI.label("二次创作声明", 38, Color.WHITE, UI.cjk(800), 8))
	col.add_child(UI.rect(UI.LINE, 0, 1))
	for line in [
		"本作是《东方 Project》（上海爱丽丝幻乐团 / ZUN）的非官方二次创作作品，与原作者及官方无关。",
		"角色台词、简介、技能与 3D 造型均为本作原创，未使用任何官方图像、音乐或游戏数据。",
		"本作免费发布。转载与分发请遵守东方 Project 二次创作指南。",
	]:
		col.add_child(UI.wrap(UI.label(line, 21, Color(1, 1, 1, 0.84), UI.cjk(400), 1), 980))
	col.add_child(UI.label("点击任意位置继续", 14, UI.FAINT, UI.cjk(400), 4))
	UI.passthrough(root)
	_run_phase(root, 2.6, _title)

# ---------- 3. 标题画面 ----------

func _title() -> void:
	var root := UI.full(Control.new())
	add_child(root)
	_bg = UI.full(UI.image(load("res://assets/bg/night-observatory-v2.png"), true), 24) as TextureRect
	_bg.modulate = Color(0.55, 0.6, 0.74)
	root.add_child(_bg)
	root.add_child(UI.full(UI.gradient(Color(0.02, 0.025, 0.045, 0.94), Color(0.02, 0.025, 0.045, 0.0), Vector2(0, 0), Vector2(1, 0), [0.0, 0.62])))
	root.add_child(UI.full(UI.gradient(Color(0.02, 0.025, 0.045, 0.0), Color(0.02, 0.025, 0.045, 0.92), Vector2(0, 0), Vector2(0, 1), [0.5, 1.0])))

	# 背景大字与圆环
	var echo := UI.label("ECHO", 420, Color(1, 1, 1, 0.045), UI.num(), 30)
	UI.pin(echo, 1, 0, -1250, 120, 1300, 500)
	root.add_child(echo)
	var ring := UI.Ring.new()
	ring.radius = 400
	ring.color = Color(1, 0.824, 0.227, 0.16)
	ring.width = 2
	ring.dashes = 36
	ring.gap = 0.55
	UI.pin(ring, 1, 0, -1080, 60, 860, 860)
	ring.pivot_offset = Vector2(430, 430)
	root.add_child(ring)
	var ring2 := UI.Ring.new()
	ring2.radius = 340
	ring2.color = Color(1, 1, 1, 0.1)
	UI.pin(ring2, 1, 0, -1020, 120, 740, 740)
	root.add_child(ring2)
	var spin := create_tween().set_loops()
	spin.tween_property(ring, "rotation", TAU, 90.0).from(0.0)

	# 角色阵容：灵梦居中，魔理沙与咲夜在后
	var lineup := [["arrow", -1240, 150, 980, Color(0.42, 0.46, 0.58)], ["moon", -640, 150, 980, Color(0.42, 0.46, 0.58)], ["warden", -1010, 40, 1150, Color.WHITE]]
	for spec in lineup:
		var h: float = spec[3]
		var tex := UI.image(GameData.portrait(spec[0]))
		UI.pin(tex, 1, 0, spec[1], spec[2], h / 1.5, h)
		tex.modulate = spec[4]
		root.add_child(tex)
	root.add_child(UI.full(UI.gradient(Color(0.02, 0.025, 0.045, 0.0), Color(0.02, 0.025, 0.045, 0.95), Vector2(0, 0), Vector2(0, 1), [0.72, 1.0])))

	# 标志
	var logo := UI.vbox(0)
	UI.pin(logo, 0, 0, 140, 250, 900, 400)
	root.add_child(logo)
	var tagline := UI.hbox(12)
	var d := UI.Diamond.new()
	d.custom_minimum_size = Vector2(10, 10)
	d.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	tagline.add_child(d)
	tagline.add_child(UI.label("FOLD PROJECT  //  DIMENSION ECHO", 15, UI.ACCENT, UI.mono(), 2))
	logo.add_child(tagline)
	var title_wrap := Control.new()
	title_wrap.custom_minimum_size = Vector2(900, 170)
	logo.add_child(title_wrap)
	for c in [Color(1, 0.25, 0.3, 0.75), Color(0.3, 0.9, 1.0, 0.75)]:
		var ghost := UI.label("绝不认书", 140, c, UI.cjk(900), 14)
		ghost.modulate.a = 0.0
		title_wrap.add_child(ghost)
		_glitch.append(ghost)
	var title := UI.label("绝不认书", 140, Color.WHITE, UI.cjk(900), 14)
	title_wrap.add_child(title)
	var subrow := UI.hbox(18)
	subrow.add_child(UI.rect(UI.ACCENT, 64, 6))
	(subrow.get_child(0) as Control).size_flags_vertical = Control.SIZE_SHRINK_CENTER
	subrow.add_child(UI.label("次元回响", 50, Color.WHITE, UI.cjk(700), 26))
	logo.add_child(subrow)
	var en := UI.label("NEVER YIELD  —  ECHOES BEYOND THE PAGE", 17, UI.MUTED, UI.mono(), 3)
	logo.add_child(en)
	var chapter := UI.panel(UI.pad(UI.box(Color(1, 1, 1, 0.06), UI.LINE, 1, [10, 0, 10, 0]), 18, 8))
	chapter.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	var crow := UI.hbox(12)
	crow.add_child(UI.label("CHAPTER 01", 14, UI.ACCENT, UI.mono(), 2))
	crow.add_child(UI.label("幻想乡", 18, Color.WHITE, UI.cjk(700), 6))
	chapter.add_child(crow)
	var gap := Control.new()
	gap.custom_minimum_size.y = 26
	logo.add_child(gap)
	logo.add_child(chapter)

	# 点击开始
	_tap_box = UI.vbox(8)
	UI.pin(_tap_box, 0.5, 1, -400, -210, 800, 90)
	(_tap_box as VBoxContainer).alignment = BoxContainer.ALIGNMENT_CENTER
	var tap := UI.label("—  点击任意位置开始  —", 26, Color.WHITE, UI.cjk(600), 8)
	tap.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_tap_box.add_child(tap)
	var tap_en := UI.label("TOUCH TO START", 14, UI.ACCENT, UI.mono(), 5)
	tap_en.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_tap_box.add_child(tap_en)
	root.add_child(_tap_box)
	_pulse = create_tween().set_loops()
	_pulse.tween_property(_tap_box, "modulate:a", 0.35, 1.1).set_trans(Tween.TRANS_SINE)
	_pulse.tween_property(_tap_box, "modulate:a", 1.0, 1.1).set_trans(Tween.TRANS_SINE)

	# 进度条（点击后出现）
	_load_box = UI.vbox(10)
	UI.pin(_load_box, 0.5, 1, -520, -200, 1040, 110)
	_load_box.modulate.a = 0.0
	var lrow := UI.hbox(12)
	_load_status = UI.label("正在同步次元数据", 20, Color.WHITE, UI.cjk(600), 3)
	_load_status.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	lrow.add_child(_load_status)
	_load_pct = UI.label("0%", 28, UI.ACCENT, UI.num(), 1)
	lrow.add_child(_load_pct)
	_load_box.add_child(lrow)
	var track := UI.rect(Color(1, 1, 1, 0.14), 0, 4)
	_load_fill = UI.rect(UI.ACCENT, 0, 4)
	track.add_child(_load_fill)
	_load_box.add_child(track)
	var tip := UI.label(TIPS[randi() % TIPS.size()], 16, UI.MUTED, UI.cjk(400), 1)
	_load_box.add_child(tip)
	root.add_child(_load_box)

	# 角落信息
	var ver := UI.vbox(4)
	UI.pin(ver, 0, 1, 60, -96, 700, 60)
	var info := Engine.get_version_info()
	ver.add_child(UI.label("Ver %s  ·  Godot %s.%s" % [GameData.VERSION, info["major"], info["minor"]], 14, UI.MUTED, UI.mono(), 1))
	ver.add_child(UI.label("东方 Project 二次创作 · 非官方作品 · 免费发布", 14, UI.FAINT, UI.cjk(400), 2))
	root.add_child(ver)
	var uid := UI.label("UID  %s" % GameData.profile["uid"], 14, UI.MUTED, UI.mono(), 1)
	uid.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	UI.pin(uid, 1, 1, -460, -72, 400, 24)
	root.add_child(uid)

	# 取景框角标
	for i in 4:
		var b := UI.Bracket.new()
		b.corner = i
		var ax := 1.0 if i in [1, 2] else 0.0
		var ay := 1.0 if i in [2, 3] else 0.0
		UI.pin(b, ax, ay, -84.0 if ax > 0 else 34.0, -84.0 if ay > 0 else 34.0, 50, 50)
		root.add_child(b)

	UI.passthrough(root)

	# 右上角按钮（在 passthrough 之后添加，保持可点击）
	var tools := UI.hbox(8)
	UI.pin(tools, 1, 0, -460, 40, 400, 48)
	tools.alignment = BoxContainer.ALIGNMENT_END
	var b_notice := UI.text_button("公告", 16)
	b_notice.pressed.connect(app.open_notice)
	var b_set := UI.text_button("设置", 16)
	b_set.pressed.connect(app.open_settings)
	var b_quit := UI.text_button("退出", 16)
	b_quit.pressed.connect(func(): get_tree().quit())
	for b in [b_notice, b_set, b_quit]:
		tools.add_child(b)
	root.add_child(tools)

	root.modulate.a = 0.0
	var fade := create_tween()
	fade.tween_property(root, "modulate:a", 1.0, 0.8)
	_bg.pivot_offset = Vector2(980, 560)
	var drift := create_tween().set_loops()
	drift.tween_property(_bg, "scale", Vector2(1.06, 1.06), 18.0).set_trans(Tween.TRANS_SINE)
	drift.tween_property(_bg, "scale", Vector2(1.0, 1.0), 18.0).set_trans(Tween.TRANS_SINE)
	_title_ready = true
	_glitch_loop()

func _glitch_loop() -> void:
	while is_inside_tree() and not _loading:
		await get_tree().create_timer(randf_range(2.2, 4.2)).timeout
		if not is_inside_tree():
			return
		for i in 3:
			var off := randf_range(4.0, 10.0)
			_glitch[0].position = Vector2(-off, randf_range(-2, 2))
			_glitch[1].position = Vector2(off, randf_range(-2, 2))
			for g in _glitch:
				g.modulate.a = 1.0
			await get_tree().create_timer(0.05).timeout
			for g in _glitch:
				g.modulate.a = 0.0
			await get_tree().create_timer(0.04).timeout

# ---------- 4. 同步进度 ----------

func _start_loading() -> void:
	_loading = true
	_pulse.kill()
	var t := create_tween()
	t.tween_property(_tap_box, "modulate:a", 0.0, 0.2)
	t.tween_property(_load_box, "modulate:a", 1.0, 0.25)
	var steps := [[0.32, "校验本地档案"], [0.68, "载入幻想乡成员数据"], [0.92, "构建大厅"], [1.0, "同步完成"]]
	var from := 0.0
	for s in steps:
		var target: float = s[0]
		t.tween_callback(func(): _load_status.text = s[1])
		t.tween_method(_set_progress, from, target, 0.5 * (target - from) / 0.34 + 0.15)
		from = target
	t.tween_interval(0.25)
	t.tween_callback(func(): app.goto("lobby"))

func _set_progress(v: float) -> void:
	_load_fill.size = Vector2(1040.0 * v, 4)
	_load_pct.text = "%d%%" % int(round(v * 100.0))

func debug_open(what: String) -> void:
	if what == "loading" and _title_ready:
		_start_loading()
