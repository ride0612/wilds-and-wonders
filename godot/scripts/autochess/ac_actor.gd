class_name ACActor
extends Node3D
## 棋子 / 敌人的画面表现：面向镜头的序列帧（由网页版 3D 模型渲染），脚下阵营圈、星级环与护盾泡。
## 序列帧：0-3 待机，4-7 跑动，8-11 攻击，12-13 施法，14 受击。图集与锚点信息见 data/sprites.json。

const FRAMES := 15
const STAR_SCALE := [1.0, 1.0, 1.12, 1.2, 1.3]
const ALLY_RING := Color("5fe3ff")
const ENEMY_RING := Color("ff3b4e")

static var _meta: Dictionary = {}

var unit_id := ""
var enemy := false
var team := 0
var star := 1
var uid := -1
var bunit = null # 交战时绑定 ACBattle.BUnit
var sprite: Sprite3D
var height := 1.6
var radius := 0.46
var _ring_mat: StandardMaterial3D
var _bubble: MeshInstance3D
var _bubble_mat: StandardMaterial3D
var _run := 0.0
var _last := Vector2.ZERO
var _seed := 0.0
var lifted := false
var _base_offset := Vector2.ZERO
var gone := false

static func meta(id: String) -> Dictionary:
	if _meta.is_empty():
		_meta = JSON.parse_string(FileAccess.get_file_as_string("res://data/sprites.json"))
	return _meta[id]

static func flat_mat(color: Color, add: bool = false) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = color
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.no_depth_test = false
	if add:
		m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	return m

func setup(id: String, enemy_type: bool, team_: int, star_: int = 1) -> ACActor:
	unit_id = id
	enemy = enemy_type
	team = team_
	star = star_
	_seed = randf() * 10.0
	var m := meta(id)
	var k: float = 1.06 if enemy else STAR_SCALE[star]
	var d: Dictionary = ACData.enemy(id) if enemy else ACData.unit(id)
	sprite = Sprite3D.new()
	sprite.texture = load("res://assets/units/%s.png" % id)
	sprite.hframes = FRAMES
	sprite.pixel_size = k / float(m["ppm"])
	_base_offset = Vector2(float(m["w"]) / 2.0 - float(m["ax"]), float(m["ay"]) - float(m["h"]) / 2.0)
	sprite.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	sprite.shaded = false
	sprite.double_sided = true
	sprite.alpha_cut = SpriteBase3D.ALPHA_CUT_OPAQUE_PREPASS
	sprite.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	add_child(sprite)
	set_flip(enemy)
	height = float(m["height"]) * k
	radius = (1.05 if d.get("boss", false) else 0.45 * float(d.get("size", 1))) if enemy else 0.46
	# 脚下阵营圈
	var col := ALLY_RING if team == 0 else ENEMY_RING
	var disc := MeshInstance3D.new()
	var dm := CylinderMesh.new()
	dm.top_radius = radius * 0.86
	dm.bottom_radius = radius * 0.86
	dm.height = 0.004
	dm.radial_segments = 40
	disc.mesh = dm
	disc.material_override = flat_mat(Color(0.04, 0.16, 0.2, 0.45) if team == 0 else Color(0.2, 0.04, 0.07, 0.45))
	disc.position.y = 0.02
	add_child(disc)
	var ring := MeshInstance3D.new()
	var rm := TorusMesh.new()
	rm.inner_radius = radius * 0.9
	rm.outer_radius = radius
	rm.rings = 48
	rm.ring_segments = 4
	ring.mesh = rm
	ring.scale = Vector3(1, 0.05, 1)
	_ring_mat = flat_mat(Color(col, 0.9), true)
	ring.material_override = _ring_mat
	ring.position.y = 0.03
	add_child(ring)
	if not enemy and star > 1:
		var sr := MeshInstance3D.new()
		var sm := TorusMesh.new()
		sm.inner_radius = radius * 1.04
		sm.outer_radius = radius * 1.12
		sm.rings = 6
		sm.ring_segments = 3
		sr.mesh = sm
		sr.scale = Vector3(1, 0.05, 1)
		sr.material_override = flat_mat(ACData.star_color(star), true)
		sr.position.y = 0.035
		add_child(sr)
	_bubble = MeshInstance3D.new()
	var bm := SphereMesh.new()
	bm.radius = 0.62
	bm.height = 1.24
	bm.radial_segments = 24
	bm.rings = 12
	_bubble.mesh = bm
	_bubble_mat = flat_mat(Color(0.56, 0.9, 1.0, 0.0) if team == 0 else Color(1.0, 0.48, 0.54, 0.0), true)
	_bubble.material_override = _bubble_mat
	_bubble.scale = Vector3(1, height / 1.24, 1)
	_bubble.position.y = height * 0.5
	_bubble.visible = false
	add_child(_bubble)
	return self

## 翻转朝向；锚点（脚底）随之镜像，保证脚踩在阵营圈中心
func set_flip(on: bool) -> void:
	sprite.flip_h = on
	sprite.offset = Vector2(-_base_offset.x if on else _base_offset.x, _base_offset.y)

func head_height() -> float:
	return height + 0.18

## 每帧更新。gpos_to_world 由棋盘提供；t 为全局时间。
func tick(dt: float, t: float, world_pos: Vector3) -> void:
	var f := int(t * 1.4 + _seed) % 4
	var tint := Color.WHITE
	if bunit != null:
		var u: ACBattle.BUnit = bunit
		var moved := u.gpos.distance_to(_last)
		_last = u.gpos
		if absf(u.face.x) > 0.15:
			set_flip(u.face.x < 0)
		if not u.alive:
			if not gone:
				var k := clampf(u.death_t / 0.7, 0.0, 1.0)
				f = 14
				sprite.modulate = Color(1, 1, 1, 1.0 - k)
				world_pos.y -= k * 0.3
				position = world_pos
				if k >= 1.0:
					gone = true
					visible = false
			return
		if u.cast_t < 0.5:
			f = 12 if u.cast_t < 0.2 else 13
		elif u.attack_t < 0.44:
			f = 8 + clampi(int(u.attack_t / 0.11), 0, 3)
		elif u.flash > 0.55:
			f = 14
		elif u.moving:
			_run += moved * 4.0 / (1.2 if enemy else 1.55)
			f = 4 + int(_run) % 4
		if u.flash > 0:
			tint = Color(1, 1, 1).lerp(Color(1, 0.45, 0.45), u.flash)
		if u.stun > 0:
			tint = Color(0.65, 0.85, 1.0)
		var sh: float = u.shield
		_bubble.visible = sh > 1
		if sh > 1:
			_bubble_mat.albedo_color.a = clampf(sh / maxf(1.0, u.max_hp) * 0.6, 0.08, 0.3)
	elif lifted:
		f = 4 + int(t * 8.0) % 4
	sprite.frame = f
	sprite.modulate = tint
	position = world_pos
