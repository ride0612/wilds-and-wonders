extends Control
## 主控：界面切换、斜切过场、提示条、通用弹窗、设置与背景音乐。
##
## 调试 / 截图参数（写在 -- 之后）：
##   --screen=lobby        直接进入某个界面（boot / lobby）
##   --skip                入场界面跳过开场标志与声明
##   --open=roster         进入后打开子界面（roster / battle / settings / notice / bubble / loading）
##   --shot=路径.png --wait=秒   等待后截图并退出

const SCREENS := {
	"boot": preload("res://scripts/boot_screen.gd"),
	"lobby": preload("res://scripts/lobby_screen.gd"),
	"battle": preload("res://scripts/autochess/battle_screen.gd"),
}
const FX_SHADER := preload("res://shaders/screen_fx.gdshader")

var args := {}
var current: Control
var screen_holder: Control
var overlay_layer: Control
var music: AudioStreamPlayer
var _toast: PanelContainer
var _toast_label: Label
var _toast_tween: Tween
var _wipe: Control
var _wipe_dark: Panel
var _wipe_bar: Panel
var _wiping := false

func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	music = AudioStreamPlayer.new()
	music.stream = load("res://assets/music/lobby.wav")
	music.finished.connect(music.play)
	add_child(music)
	screen_holder = UI.full(Control.new())
	screen_holder.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(screen_holder)
	overlay_layer = UI.full(Control.new())
	overlay_layer.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(overlay_layer)
	var fx := UI.full(ColorRect.new())
	fx.mouse_filter = MOUSE_FILTER_IGNORE
	var mat := ShaderMaterial.new()
	mat.shader = FX_SHADER
	fx.material = mat
	add_child(fx)
	_build_toast()
	_build_wipe()
	apply_settings()
	show_screen(args.get("screen", "boot"))
	if not args.has("shot"):
		music.play()
	else:
		_capture()

# ---------- 界面切换 ----------

func show_screen(name: String) -> Control:
	if current:
		current.queue_free()
	current = _make(SCREENS[name])
	if args.has("stage"):
		current.set("stage", int(args["stage"]))
	screen_holder.add_child(current)
	return current

func _make(script: Script) -> Control:
	var s: Control = script.new()
	s.set("app", self)
	UI.full(s)
	return s

## 带过场切换到另一个界面
func goto(name: String) -> void:
	await wipe_in()
	show_screen(name)
	await get_tree().process_frame
	await wipe_out()

## 在当前界面上叠一层全屏子界面（成员、作战等）
func push(script: Script, props: Dictionary = {}) -> Control:
	var s := _make(script)
	for k in props:
		s.set(k, props[k])
	await wipe_in()
	screen_holder.add_child(s)
	await get_tree().process_frame
	wipe_out()
	return s

func pop(s: Control) -> void:
	await wipe_in()
	s.queue_free()
	# 刷新下面一层界面（作战关卡图或大厅）
	for i in range(screen_holder.get_child_count() - 1, -1, -1):
		var below := screen_holder.get_child(i)
		if below != s and not below.is_queued_for_deletion():
			if below.has_method("refresh"):
				below.refresh()
			break
	await get_tree().process_frame
	await wipe_out()

func _build_wipe() -> void:
	_wipe = UI.full(Control.new())
	_wipe.visible = false
	add_child(_wipe)
	_wipe_bar = Panel.new()
	_wipe_bar.add_theme_stylebox_override("panel", UI.box(UI.ACCENT, Color(0, 0, 0, 0), 0, [0, 0, 0, 0], -0.32))
	_wipe.add_child(_wipe_bar)
	_wipe_dark = Panel.new()
	_wipe_dark.add_theme_stylebox_override("panel", UI.box(UI.BG, Color(0, 0, 0, 0), 0, [0, 0, 0, 0], -0.32))
	_wipe.add_child(_wipe_dark)
	var mark := UI.label("FOLD PROJECT", 30, UI.FAINT, UI.num(), 10)
	mark.name = "Mark"
	_wipe_dark.add_child(mark)

func wipe_in() -> void:
	if _wiping:
		return
	_wiping = true
	var vp := get_viewport_rect().size
	_wipe.visible = true
	_wipe.mouse_filter = MOUSE_FILTER_STOP
	var w := vp.x + 900.0
	_wipe_dark.size = Vector2(w, vp.y)
	_wipe_bar.size = Vector2(w, vp.y)
	_wipe_dark.position = Vector2(vp.x + 420.0, 0)
	_wipe_bar.position = Vector2(vp.x + 380.0, 0)
	var mark: Label = _wipe_dark.get_node("Mark")
	mark.position = Vector2(450.0 + vp.x - 300.0, vp.y - 80.0)
	var t := create_tween().set_parallel().set_trans(Tween.TRANS_QUART).set_ease(Tween.EASE_OUT)
	t.tween_property(_wipe_bar, "position:x", -470.0, 0.32)
	t.tween_property(_wipe_dark, "position:x", -450.0, 0.36).set_delay(0.04)
	await t.finished
	_wiping = false

func wipe_out() -> void:
	var vp := get_viewport_rect().size
	var w := vp.x + 900.0
	var t := create_tween().set_parallel().set_trans(Tween.TRANS_QUART).set_ease(Tween.EASE_IN)
	t.tween_property(_wipe_dark, "position:x", -w - 500.0, 0.36)
	t.tween_property(_wipe_bar, "position:x", -w - 500.0, 0.4).set_delay(0.05)
	await t.finished
	_wipe.visible = false
	_wipe.mouse_filter = MOUSE_FILTER_IGNORE

# ---------- 音乐 ----------

func play_music(path: String) -> void:
	var stream: AudioStream = load(path)
	if music.stream == stream and music.playing:
		return
	var t := create_tween()
	if music.playing:
		t.tween_property(music, "volume_db", -40.0, 0.5)
	t.tween_callback(func():
		music.stream = stream
		apply_settings()
		if not args.has("shot"):
			music.play())

# ---------- 提示条 ----------

func _build_toast() -> void:
	_toast = UI.panel(UI.pad(UI.box(Color(0.04, 0.05, 0.08, 0.94), UI.ACCENT_SOFT, 1, [12, 0, 12, 0]), 30, 14))
	UI.pin(_toast, 0.5, 0, -420, 112, 840, 0)
	_toast.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_toast.mouse_filter = MOUSE_FILTER_IGNORE
	var row := UI.hbox(14)
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	var dot := UI.Diamond.new()
	dot.custom_minimum_size = Vector2(12, 12)
	dot.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	row.add_child(dot)
	_toast_label = UI.wrap(UI.label("", 20, Color.WHITE, UI.cjk(500), 1))
	_toast_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(_toast_label)
	_toast.add_child(row)
	_toast.modulate.a = 0.0
	add_child(_toast)

func toast(text: String, seconds: float = 2.6) -> void:
	_toast_label.text = text
	if _toast_tween:
		_toast_tween.kill()
	_toast.offset_top = 96
	_toast_tween = create_tween()
	_toast_tween.set_parallel()
	_toast_tween.tween_property(_toast, "modulate:a", 1.0, 0.2)
	_toast_tween.tween_property(_toast, "offset_top", 112.0, 0.25).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	_toast_tween.chain().tween_interval(seconds)
	_toast_tween.chain().tween_property(_toast, "modulate:a", 0.0, 0.35)

# ---------- 通用弹窗 ----------

func open_modal(title: String, en: String, content: Control, width: float = 760.0) -> Control:
	var root := UI.full(Control.new())
	overlay_layer.add_child(root)
	var dim := UI.full(ColorRect.new())
	dim.color = Color(0.01, 0.015, 0.03, 0.72)
	root.add_child(dim)
	dim.gui_input.connect(func(e: InputEvent):
		if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
			close_modal(root))
	var center := UI.full(CenterContainer.new())
	center.mouse_filter = MOUSE_FILTER_IGNORE
	root.add_child(center)
	var panel := UI.panel(UI.pad(UI.box(UI.GLASS_HI, UI.LINE, 1, [0, 30, 0, 30]), 40, 32))
	panel.custom_minimum_size.x = width
	center.add_child(panel)
	var col := UI.vbox(18)
	panel.add_child(col)
	var head := UI.hbox(16)
	var bar := UI.rect(UI.ACCENT, 5, 0)
	head.add_child(bar)
	var titles := UI.vbox(2)
	titles.add_child(UI.label(en, 13, UI.ACCENT, UI.mono(), 2))
	titles.add_child(UI.label(title, 32, Color.WHITE, UI.cjk(800), 4))
	titles.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(titles)
	var close := UI.text_button("关闭", 16)
	close.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	close.pressed.connect(func(): close_modal(root))
	head.add_child(close)
	col.add_child(head)
	col.add_child(UI.rect(UI.LINE, 0, 1))
	col.add_child(content)
	root.modulate.a = 0.0
	panel.pivot_offset = Vector2(width / 2.0, 200)
	panel.scale = Vector2(0.97, 0.97)
	var t := create_tween().set_parallel().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	t.tween_property(root, "modulate:a", 1.0, 0.18)
	t.tween_property(panel, "scale", Vector2.ONE, 0.22)
	return root

func close_modal(root: Control) -> void:
	if not is_instance_valid(root) or root.is_queued_for_deletion():
		return
	var t := create_tween()
	t.tween_property(root, "modulate:a", 0.0, 0.14)
	t.tween_callback(root.queue_free)

func open_notice() -> void:
	var col := UI.vbox(14)
	col.add_child(UI.label("Ver %s 更新公告" % GameData.VERSION, 22, UI.ACCENT, UI.cjk(700), 2))
	for line in [
		"· 游戏改用 Godot 引擎重制：入场界面、大厅、成员档案与自走棋战斗均已完成。",
		"· 作战 → 选择关卡 → 出击：招募、拖动部署、升级、强化三选一、自动交战与结算，20 节全部可玩。",
		"· 大厅支持更换助理、角色互动、活动横幅与作战进度一览。",
		"· 第一章《幻想乡》剧情编写中，当前为占位旁白。",
	]:
		col.add_child(UI.wrap(UI.label(line, 19, Color(1, 1, 1, 0.86)), 660))
	col.add_child(UI.rect(UI.LINE, 0, 1))
	col.add_child(UI.wrap(UI.label("本作为东方 Project（上海爱丽丝幻乐团）的非官方二次创作，免费发布。角色台词、简介与 3D 造型为本作原创，未使用官方素材。", 15, UI.MUTED), 660))
	open_modal("公告", "NOTICE / UPDATE", col)

func open_settings() -> void:
	var col := UI.vbox(22)
	var row := UI.hbox(20)
	var lab := UI.label("音乐音量", 20, Color.WHITE, UI.cjk(600), 2)
	lab.custom_minimum_size.x = 140
	row.add_child(lab)
	var slider := HSlider.new()
	slider.min_value = 0
	slider.max_value = 100
	slider.value = GameData.profile["music_volume"]
	slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	slider.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	slider.focus_mode = Control.FOCUS_NONE
	var value := UI.label(str(int(slider.value)), 22, UI.ACCENT, UI.num())
	value.custom_minimum_size.x = 48
	slider.value_changed.connect(func(v: float):
		GameData.profile["music_volume"] = int(v)
		value.text = str(int(v))
		apply_settings()
		GameData.save_profile())
	row.add_child(slider)
	row.add_child(value)
	col.add_child(row)
	var row2 := UI.hbox(20)
	var lab2 := UI.label("全屏显示", 20, Color.WHITE, UI.cjk(600), 2)
	lab2.custom_minimum_size.x = 140
	row2.add_child(lab2)
	var fs := CheckButton.new()
	fs.focus_mode = Control.FOCUS_NONE
	fs.button_pressed = GameData.profile["fullscreen"]
	fs.toggled.connect(func(on: bool):
		GameData.profile["fullscreen"] = on
		apply_settings(true)
		GameData.save_profile())
	row2.add_child(fs)
	col.add_child(row2)
	col.add_child(UI.label("设置会自动保存在本机。", 15, UI.MUTED))
	open_modal("设置", "SYSTEM / SETTINGS", col, 640)

func apply_settings(window: bool = false) -> void:
	var v: float = float(GameData.profile["music_volume"]) / 100.0
	music.volume_db = -80.0 if v <= 0.0 else linear_to_db(v * 0.7)
	if window or GameData.profile["fullscreen"]:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if GameData.profile["fullscreen"] else DisplayServer.WINDOW_MODE_WINDOWED)

## 打开网页版（开发目录中存在 index.html 时）
func open_web_version() -> bool:
	var path := ProjectSettings.globalize_path("res://").path_join("../index.html").simplify_path()
	if FileAccess.file_exists(path):
		OS.shell_open("file:///" + path.replace("\\", "/").trim_prefix("/"))
		return true
	return false

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel") and overlay_layer.get_child_count() > 0:
		close_modal(overlay_layer.get_child(overlay_layer.get_child_count() - 1))

# ---------- 截图（自动检查用） ----------

func _capture() -> void:
	await get_tree().create_timer(0.6).timeout
	if args.has("open") and current.has_method("debug_open"):
		current.debug_open(args["open"])
	await get_tree().create_timer(float(args.get("wait", "2.5"))).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(args["shot"])
	get_tree().quit()

func _exit_tree() -> void:
	UI._cache.clear()
