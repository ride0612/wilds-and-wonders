extends Control
## 成员档案：左侧成员列表，中间立绘，右侧资料、属性、技能与“设为助理”。

var app
var _selected := ""
var _cards := {}
var _portrait: TextureRect
var _bg_name: Label
var _glow: TextureRect
var _faction: Label
var _name: Label
var _names: Label
var _tags: HBoxContainer
var _quote: Label
var _stats: VBoxContainer
var _skill_name: Label
var _skill_desc: Label
var _bio: Label
var _assist_btn: Button
var _maxima := {}

func _ready() -> void:
	mouse_filter = MOUSE_FILTER_STOP
	for k in ["hp", "atk", "armor", "range"]:
		var m := 0.0
		for c in GameData.cast:
			m = maxf(m, float(c[k]))
		_maxima[k] = m
	var bg := UI.full(ColorRect.new())
	(bg as ColorRect).color = Color(0.03, 0.04, 0.065)
	add_child(bg)
	var scene := UI.full(UI.image(load("res://assets/bg/night-observatory-v2.png"), true))
	scene.modulate = Color(0.3, 0.33, 0.42, 1)
	add_child(scene)
	_glow = UI.full(UI.gradient(Color(1, 1, 1, 0.0), Color(1, 1, 1, 0.3), Vector2(0, 1), Vector2(0.45, 0.2)))
	add_child(_glow)
	add_child(UI.full(UI.gradient(Color(0.03, 0.04, 0.065, 0.0), Color(0.03, 0.04, 0.065, 0.92), Vector2(0, 0), Vector2(1, 0), [0.5, 0.72])))
	add_child(UI.full(UI.gradient(Color(0.03, 0.04, 0.065, 0.95), Color(0.03, 0.04, 0.065, 0.0), Vector2(0, 0), Vector2(1, 0), [0.12, 0.3])))

	_bg_name = UI.label("", 230, Color(1, 1, 1, 0.05), UI.num(), 10)
	UI.pin(_bg_name, 0.44, 0, -700, 640, 1400, 300)
	_bg_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(_bg_name)
	var ring := UI.Ring.new()
	ring.radius = 310
	ring.color = Color(1, 1, 1, 0.12)
	ring.dashes = 48
	UI.pin(ring, 0.44, 0, -340, 150, 680, 680)
	add_child(ring)
	_portrait = UI.image(null)
	UI.pin(_portrait, 0.44, 0, -360, 50, 720, 1080)
	add_child(_portrait)

	_build_header()
	_build_list()
	_build_info()
	select(GameData.profile["assistant"], false)

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
	tcol.add_child(UI.label("PERSONNEL / MEMBERS", 12, UI.ACCENT, UI.mono(), 2))
	tcol.add_child(UI.label("成员档案", 26, Color.WHITE, UI.cjk(800), 6))
	title.add_child(tcol)
	add_child(title)

func _build_list() -> void:
	var scroll := ScrollContainer.new()
	UI.pin(scroll, 0, 0, 40, 112, 380, 940)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(scroll)
	var col := UI.vbox(8)
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(col)
	for c in GameData.cast:
		var id: String = c["id"]
		var card := UI.flat_button(UI.box(Color(0.05, 0.065, 0.1, 0.8), UI.LINE, 1, [0, 0, 14, 0]), UI.box(Color(0.09, 0.11, 0.16, 0.94), Color(1, 1, 1, 0.45), 1, [0, 0, 14, 0]))
		card.custom_minimum_size = Vector2(360, 104)
		var stripe := UI.rect(GameData.tone(id), 4, 104)
		card.add_child(stripe)
		var av_frame := UI.panel(UI.box(Color(0.12, 0.14, 0.2), Color(0, 0, 0, 0), 0))
		UI.pin(av_frame, 0, 0, 14, 12, 80, 80)
		av_frame.clip_contents = true
		av_frame.add_child(UI.image(GameData.avatar(id), true))
		card.add_child(av_frame)
		var info := UI.vbox(2)
		UI.pin(info, 0, 0, 110, 14, 240, 80)
		info.alignment = BoxContainer.ALIGNMENT_CENTER
		info.add_child(UI.label(String(c["code"]) + "  ·  " + String(c["en"]).to_upper(), 11, UI.MUTED, UI.mono(), 1))
		info.add_child(UI.label(c["name"], 24, Color.WHITE, UI.cjk(800), 2))
		info.add_child(UI.label("%s · %s" % [c["type"][0], c["faction"][0]], 14, Color(1, 1, 1, 0.7), UI.cjk(500), 1))
		card.add_child(info)
		var star := UI.label("", 13, UI.INK, UI.cjk(800), 1)
		var star_panel := UI.panel(UI.pad(UI.box(UI.ACCENT, Color(0, 0, 0, 0), 0, [6, 0, 6, 0]), 8, 1))
		UI.pin(star_panel, 1, 0, -64, 10, 54, 22)
		star_panel.add_child(star)
		star_panel.visible = false
		star.text = "助理"
		card.add_child(star_panel)
		UI.passthrough(card)
		card.mouse_filter = MOUSE_FILTER_STOP
		card.pressed.connect(func(): select(id))
		col.add_child(card)
		_cards[id] = {"card": card, "stripe": stripe, "badge": star_panel}

func _build_info() -> void:
	var panel := UI.panel(UI.pad(UI.box(Color(0.03, 0.04, 0.065, 0.7), UI.LINE, 1, [0, 30, 0, 0]), 40, 34))
	UI.pin(panel, 1, 0, -700, 112, 650, 940)
	add_child(panel)
	var col := UI.vbox(14)
	panel.add_child(col)
	_faction = UI.label("", 14, UI.ACCENT, UI.mono(), 2)
	col.add_child(_faction)
	_name = UI.label("", 60, Color.WHITE, UI.cjk(900), 8)
	col.add_child(_name)
	_names = UI.label("", 16, UI.MUTED, UI.mono(), 1)
	col.add_child(_names)
	_tags = UI.hbox(8)
	col.add_child(_tags)
	var qrow := UI.hbox(14)
	qrow.add_child(UI.rect(Color(1, 1, 1, 0.4), 2, 0))
	_quote = UI.wrap(UI.label("", 19, Color(1, 1, 1, 0.88), UI.cjk(500), 1), 520)
	qrow.add_child(_quote)
	col.add_child(qrow)
	col.add_child(UI.rect(UI.LINE, 0, 1))
	col.add_child(UI.label("ATTRIBUTES  ·  属性", 12, UI.MUTED, UI.mono(), 2))
	_stats = UI.vbox(10)
	col.add_child(_stats)
	col.add_child(UI.rect(UI.LINE, 0, 1))
	col.add_child(UI.label("SKILL  ·  技能", 12, UI.MUTED, UI.mono(), 2))
	_skill_name = UI.label("", 26, UI.ACCENT, UI.cjk(800), 3)
	col.add_child(_skill_name)
	_skill_desc = UI.wrap(UI.label("", 17, Color(1, 1, 1, 0.85), UI.cjk(500), 1), 560)
	col.add_child(_skill_desc)
	col.add_child(UI.rect(UI.LINE, 0, 1))
	_bio = UI.wrap(UI.label("", 16, UI.MUTED, UI.cjk(400), 1), 560)
	col.add_child(_bio)
	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	spacer.mouse_filter = MOUSE_FILTER_IGNORE
	col.add_child(spacer)
	_assist_btn = UI.text_button("设为大厅助理", 20, true, 12)
	_assist_btn.custom_minimum_size.y = 58
	_assist_btn.pressed.connect(func():
		GameData.set_assistant(_selected)
		app.toast("%s 已设为大厅助理。" % GameData.hero(_selected)["name"])
		_update_assist())
	col.add_child(_assist_btn)

func select(id: String, animate: bool = true) -> void:
	if id == _selected:
		return
	_selected = id
	var h := GameData.hero(id)
	var tone := GameData.tone(id)
	for k in _cards:
		var on: bool = k == id
		var entry: Dictionary = _cards[k]
		(entry["card"] as Button).add_theme_stylebox_override("normal", UI.box(Color(0.12, 0.14, 0.2, 0.95) if on else Color(0.05, 0.065, 0.1, 0.8), UI.ACCENT if on else UI.LINE, 1, [0, 0, 14, 0]))
		(entry["stripe"] as ColorRect).custom_minimum_size.x = 8 if on else 4
		(entry["stripe"] as ColorRect).size.x = 8 if on else 4
	_portrait.texture = GameData.portrait(id)
	_bg_name.text = String(h["en"]).split(" ")[0].to_upper()
	_glow.modulate = tone
	_faction.text = "%s  ·  %s" % [String(h["faction"][1]).to_upper(), h["faction"][0]]
	_name.text = h["name"]
	_names.text = "%s  /  %s" % [h["en"], h["ja"]]
	for c in _tags.get_children():
		c.queue_free()
	for t in [[h["type"][0], true], [h["code"], false], ["COST %d" % int(h["cost"]), false], ["射程 %d" % int(h["range"]), false]]:
		var tag := UI.panel(UI.pad(UI.box(UI.ACCENT if t[1] else Color(1, 1, 1, 0.08), Color(0, 0, 0, 0) if t[1] else UI.LINE, 1, [6, 0, 6, 0]), 12, 3))
		tag.add_child(UI.label(t[0], 14, UI.INK if t[1] else Color.WHITE, UI.cjk(700) if t[1] else UI.mono(), 1))
		_tags.add_child(tag)
	_quote.text = "「%s」" % h["quote"]
	for c in _stats.get_children():
		c.queue_free()
	for s in [["生命", "HP", "hp"], ["攻击", "ATK", "atk"], ["护甲", "ARMOR", "armor"], ["射程", "RANGE", "range"]]:
		var row := UI.hbox(14)
		var lab := UI.label("%s  %s" % [s[0], s[1]], 15, Color(1, 1, 1, 0.75), UI.cjk(600), 1)
		lab.custom_minimum_size.x = 130
		row.add_child(lab)
		var track := UI.rect(Color(1, 1, 1, 0.1), 0, 8)
		track.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		track.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		var fill := UI.rect(tone.lerp(Color.WHITE, 0.2), 0, 8)
		track.add_child(fill)
		var ratio := float(h[s[2]]) / float(_maxima[s[2]])
		track.resized.connect(func(): fill.size = Vector2(track.size.x * ratio, 8))
		row.add_child(track)
		var v := UI.label(str(int(h[s[2]])), 22, Color.WHITE, UI.num())
		v.custom_minimum_size.x = 56
		v.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		row.add_child(v)
		_stats.add_child(row)
	_skill_name.text = "「%s」" % h["skill"]
	_skill_desc.text = h["desc"]
	_bio.text = h["bio"][0]
	_update_assist()
	if animate:
		_portrait.modulate.a = 0.0
		_portrait.offset_left = -300.0
		_portrait.offset_right = 420.0
		var t := create_tween().set_parallel().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		t.tween_property(_portrait, "modulate:a", 1.0, 0.35)
		t.tween_property(_portrait, "offset_left", -360.0, 0.4)
		t.tween_property(_portrait, "offset_right", 360.0, 0.4)

func _update_assist() -> void:
	var is_assist: bool = GameData.profile["assistant"] == _selected
	_assist_btn.disabled = is_assist
	_assist_btn.text = "当前大厅助理" if is_assist else "设为大厅助理"
	for k in _cards:
		(_cards[k]["badge"] as Control).visible = GameData.profile["assistant"] == k

func debug_open(what: String) -> void:
	if GameData.by_id.has(what):
		select(what)
