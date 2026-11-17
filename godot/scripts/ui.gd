class_name UI
extends RefCounted
## 共用的界面工具：字体、斜切角面板、按钮与装饰图形。
## 视觉方向参考战术终端风格：深色玻璃、信号黄强调色、斜切角、等宽小字。

const ACCENT := Color("ffd23a")
const ACCENT_SOFT := Color(1.0, 0.824, 0.227, 0.32)
const INK := Color("0b0d12")
const BG := Color("07090e")
const GLASS := Color(0.035, 0.045, 0.07, 0.74)
const GLASS_HI := Color(0.06, 0.075, 0.11, 0.94)
const LINE := Color(1, 1, 1, 0.18)
const LINE_HI := Color(1, 1, 1, 0.5)
const MUTED := Color(1, 1, 1, 0.6)
const FAINT := Color(1, 1, 1, 0.32)
const CYAN := Color("8fe3ff")
const RED := Color("ff5d63")

static var _cache := {}

# ---------- 字体 ----------

static func cjk(weight: int = 500) -> Font:
	var key := "cjk%d" % weight
	if not _cache.has(key):
		var f := SystemFont.new()
		f.font_names = PackedStringArray(["Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "SimHei", "sans-serif"])
		f.font_weight = weight
		_cache[key] = f
	return _cache[key]

static func _file_font(path: String, weight: int = 0) -> Font:
	var key := "%s@%d" % [path, weight]
	if not _cache.has(key):
		var base: FontFile = load(path)
		var fallbacks: Array[Font] = [cjk(700)]
		base.fallbacks = fallbacks
		var font: Font = base
		if weight > 0:
			var v := FontVariation.new()
			v.base_font = base
			var ts := TextServerManager.get_primary_interface()
			v.variation_opentype = {ts.name_to_tag("wght"): weight}
			font = v
		_cache[key] = font
	return _cache[key]

## 数字与英文标题（Barlow Condensed）
static func num() -> Font:
	return _file_font("res://assets/fonts/BarlowCondensed-Bold.ttf")

## 终端小字（JetBrains Mono）
static func mono() -> Font:
	return _file_font("res://assets/fonts/JetBrainsMono-VF.ttf", 500)

static func spaced(font: Font, spacing: int) -> Font:
	if spacing == 0:
		return font
	var key := "sp%d|%d" % [font.get_instance_id(), spacing]
	if not _cache.has(key):
		var v := FontVariation.new()
		v.base_font = font
		v.spacing_glyph = spacing
		_cache[key] = v
	return _cache[key]

# ---------- 基础控件 ----------

static func label(text: String, size: int = 18, color: Color = Color.WHITE, font: Font = null, spacing: int = 0) -> Label:
	var l := Label.new()
	l.text = text
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	l.add_theme_font_override("font", spaced(font if font != null else cjk(), spacing))
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l

static func wrap(l: Label, width: float = 0.0) -> Label:
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if width > 0.0:
		l.custom_minimum_size.x = width
	return l

## 斜切角面板样式。cuts 依次为左上、右上、右下、左下的切角大小。
static func box(bg: Color, border: Color = Color(0, 0, 0, 0), width: int = 0, cuts: Array = [0, 0, 0, 0], skew_x: float = 0.0) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(width)
	s.corner_detail = 1
	s.corner_radius_top_left = cuts[0]
	s.corner_radius_top_right = cuts[1]
	s.corner_radius_bottom_right = cuts[2]
	s.corner_radius_bottom_left = cuts[3]
	s.skew = Vector2(skew_x, 0)
	return s

static func pad(s: StyleBoxFlat, h: float, v: float) -> StyleBoxFlat:
	s.content_margin_left = h
	s.content_margin_right = h
	s.content_margin_top = v
	s.content_margin_bottom = v
	return s

static func panel(style: StyleBox) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", style)
	return p

static func vbox(sep: int = 0) -> VBoxContainer:
	var b := VBoxContainer.new()
	b.add_theme_constant_override("separation", sep)
	b.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return b

static func hbox(sep: int = 0) -> HBoxContainer:
	var b := HBoxContainer.new()
	b.add_theme_constant_override("separation", sep)
	b.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return b

static func rect(color: Color, w: float = 0.0, h: float = 0.0) -> ColorRect:
	var r := ColorRect.new()
	r.color = color
	r.custom_minimum_size = Vector2(w, h)
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return r

static func image(tex: Texture2D, cover: bool = false) -> TextureRect:
	var t := TextureRect.new()
	t.texture = tex
	t.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	t.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED if cover else TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return t

## 线性渐变遮罩。from/to 为 0～1 的方向坐标。
static func gradient(c0: Color, c1: Color, from: Vector2, to: Vector2, offsets: Array = [0.0, 1.0]) -> TextureRect:
	var g := Gradient.new()
	g.set_color(0, c0)
	g.set_color(1, c1)
	g.set_offset(0, offsets[0])
	g.set_offset(1, offsets[1])
	var tex := GradientTexture2D.new()
	tex.gradient = g
	tex.fill_from = from
	tex.fill_to = to
	tex.width = 64
	tex.height = 64
	var t := TextureRect.new()
	t.texture = tex
	t.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	t.stretch_mode = TextureRect.STRETCH_SCALE
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return t

static func full(c: Control, margin: float = 0.0) -> Control:
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	c.offset_left = -margin
	c.offset_top = -margin
	c.offset_right = margin
	c.offset_bottom = margin
	return c

## 以锚点 (ax, ay) 为原点放置控件，x/y 为相对锚点的偏移（逻辑分辨率 1920×1080）。
static func pin(c: Control, ax: float, ay: float, x: float, y: float, w: float, h: float) -> Control:
	c.anchor_left = ax
	c.anchor_right = ax
	c.anchor_top = ay
	c.anchor_bottom = ay
	c.offset_left = x
	c.offset_top = y
	c.offset_right = x + w
	c.offset_bottom = y + h
	return c

## 无文字的扁平按钮：内容作为子节点放进去。
static func flat_button(normal: StyleBox, hover: StyleBox, pressed: StyleBox = null) -> Button:
	var b := Button.new()
	b.focus_mode = Control.FOCUS_NONE
	b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	b.add_theme_stylebox_override("normal", normal)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", pressed if pressed != null else hover)
	b.add_theme_stylebox_override("hover_pressed", pressed if pressed != null else hover)
	b.add_theme_stylebox_override("disabled", normal)
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	return b

## 带文字的斜切角小按钮。
static func text_button(text: String, size: int = 18, primary: bool = false, cut: int = 10) -> Button:
	var bg := ACCENT if primary else Color(0.05, 0.065, 0.1, 0.78)
	var hover := Color("ffdc5a") if primary else Color(0.1, 0.12, 0.17, 0.95)
	var border := Color(0, 0, 0, 0) if primary else LINE
	var b := flat_button(
		pad(box(bg, border, 1, [cut, 0, cut, 0]), 22, 9),
		pad(box(hover, ACCENT if not primary else Color(0, 0, 0, 0), 1, [cut, 0, cut, 0]), 22, 9))
	b.text = text
	b.add_theme_font_override("font", spaced(cjk(700), 3))
	b.add_theme_font_size_override("font_size", size)
	var fc := INK if primary else Color.WHITE
	for k in ["font_color", "font_hover_color", "font_pressed_color", "font_hover_pressed_color", "font_focus_color"]:
		b.add_theme_color_override(k, fc)
	b.add_theme_color_override("font_disabled_color", Color(fc, 0.45))
	return b

## 把装饰节点设为不拦截鼠标，只保留按钮与输入控件。
static func passthrough(node: Node) -> void:
	if node is Control and not (node is BaseButton or node is Range or node is LineEdit or node is ScrollContainer):
		(node as Control).mouse_filter = Control.MOUSE_FILTER_IGNORE
	for child in node.get_children():
		passthrough(child)

## 悬停时水平滑动。用锚点偏移量做动画，窗口缩放后也不会错位。
static func hover_shift(b: Control, dx: float = -8.0) -> void:
	var slide := func(d: float) -> void:
		if not b.has_meta("rest"):
			b.set_meta("rest", Vector2(b.offset_left, b.offset_right))
		var rest: Vector2 = b.get_meta("rest")
		var t := b.create_tween().set_parallel().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		t.tween_property(b, "offset_left", rest.x + d, 0.18)
		t.tween_property(b, "offset_right", rest.y + d, 0.18)
	b.mouse_entered.connect(func(): slide.call(dx))
	b.mouse_exited.connect(func(): slide.call(0.0))

# ---------- 绘制类装饰 ----------

## 圆环或虚线圆环
class Ring extends Control:
	var radius := 300.0
	var color := Color(1, 1, 1, 0.15)
	var width := 2.0
	var dashes := 0
	var gap := 0.4
	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
	func _draw() -> void:
		var c := size / 2.0
		if dashes <= 0:
			draw_arc(c, radius, 0.0, TAU, 160, color, width, true)
			return
		var step := TAU / dashes
		for i in dashes:
			var a := step * i
			draw_arc(c, radius, a, a + step * (1.0 - gap), 12, color, width, true)

## 斜条纹
class Stripes extends Control:
	var color := Color(0, 0, 0, 0.08)
	var band := 10.0
	var spacing := 22.0
	var slant := 0.6
	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		clip_contents = true
	func _draw() -> void:
		var h := size.y
		var x := -h * slant
		while x < size.x:
			draw_colored_polygon(PackedVector2Array([Vector2(x, h), Vector2(x + band, h), Vector2(x + band + h * slant, 0), Vector2(x + h * slant, 0)]), color)
			x += spacing

## 菱形标记
class Diamond extends Control:
	var color := Color("ffd23a")
	var hollow := false
	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
	func _draw() -> void:
		var s := size
		var pts := PackedVector2Array([Vector2(s.x / 2, 0), Vector2(s.x, s.y / 2), Vector2(s.x / 2, s.y), Vector2(0, s.y / 2)])
		if hollow:
			pts.append(pts[0])
			draw_polyline(pts, color, 1.5, true)
		else:
			draw_colored_polygon(pts, color)

## 取景框角标（corner: 0 左上 1 右上 2 右下 3 左下）
class Bracket extends Control:
	var corner := 0
	var color := Color(1, 1, 1, 0.5)
	var width := 1.5
	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
	func _draw() -> void:
		var w := size.x
		var h := size.y
		var pts: PackedVector2Array
		match corner:
			0: pts = PackedVector2Array([Vector2(0, h), Vector2(0, 0), Vector2(w, 0)])
			1: pts = PackedVector2Array([Vector2(0, 0), Vector2(w, 0), Vector2(w, h)])
			2: pts = PackedVector2Array([Vector2(w, 0), Vector2(w, h), Vector2(0, h)])
			_: pts = PackedVector2Array([Vector2(w, h), Vector2(0, h), Vector2(0, 0)])
		draw_polyline(pts, color, width, true)
