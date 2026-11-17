class_name ACWorld
extends Node3D
## 3D 战场：棋盘、备战席、镜头、棋子、弹道与技能特效。
## 坐标换算：格坐标 (gx, gy) → 世界 (gx - COLS/2, 0, gy - ROWS/2)；敌方在远处（-Z），我方靠近镜头。

const BENCH_Z_OFFSET := 1.25
const PLAYER_TILE := Color(0.13, 0.17, 0.24, 0.92)
const PLAYER_TILE_2 := Color(0.16, 0.2, 0.28, 0.92)
const ENEMY_TILE := Color(0.2, 0.11, 0.15, 0.9)
const ENEMY_TILE_2 := Color(0.23, 0.13, 0.17, 0.9)
const HILITE := Color(1.0, 0.82, 0.23, 0.95)
const BAD := Color(1.0, 0.3, 0.35, 0.9)

var camera: Camera3D
var actors := {} # key -> ACActor
var _tiles := {} # "x,y" -> material
var _bench := [] # material
var _fx: Array = [] # {node, life, t, update: Callable}
var _proj := {} # projectile id -> node
var _shake := 0.0
var _cam_base := Vector3.ZERO
var _time := 0.0
var _slash_tex: Texture2D
var _dot_mesh: QuadMesh

func _ready() -> void:
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_CLEAR_COLOR
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.7, 0.76, 0.9)
	e.ambient_light_energy = 0.8
	env.environment = e
	add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55, -30, 0)
	sun.light_energy = 1.1
	add_child(sun)
	camera = Camera3D.new()
	camera.fov = 30
	camera.keep_aspect = Camera3D.KEEP_HEIGHT
	add_child(camera)
	set_camera(0.0)
	_build_board()
	_slash_tex = _make_slash_texture()
	_dot_mesh = QuadMesh.new()
	_dot_mesh.size = Vector2(1, 1)

## 镜头：俯角约 48°，略向下偏移给底部商店留位置
func set_camera(h_shift: float) -> void:
	var pitch := 0.84
	var target := Vector3(h_shift, 0, 2.1)
	var dist := 23.5
	camera.position = target + Vector3(0, sin(pitch), cos(pitch)) * dist
	camera.look_at(target)
	_cam_base = camera.position

static func g2w(g: Vector2) -> Vector3:
	return Vector3(g.x - ACData.COLS / 2.0, 0, g.y - ACData.ROWS / 2.0)

static func bench_pos(i: int) -> Vector3:
	return Vector3((i - (ACData.BENCH_SIZE - 1) / 2.0) * 1.02, 0, ACData.ROWS / 2.0 + BENCH_Z_OFFSET)

func _build_board() -> void:
	var base := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(ACData.COLS + 0.6, 0.3, ACData.ROWS + 0.6)
	base.mesh = bm
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.06, 0.075, 0.1)
	mat.roughness = 0.6
	base.material_override = mat
	base.position = Vector3(0, -0.16, 0)
	add_child(base)
	for x in ACData.COLS:
		for y in ACData.ROWS:
			var tile := MeshInstance3D.new()
			var pm := PlaneMesh.new()
			pm.size = Vector2(0.94, 0.94)
			tile.mesh = pm
			var player := y >= ACData.PLAYER_ROW0
			var alt := (x + y) % 2 == 0
			var m := ACActor.flat_mat((PLAYER_TILE if alt else PLAYER_TILE_2) if player else (ENEMY_TILE if alt else ENEMY_TILE_2))
			tile.material_override = m
			tile.position = g2w(Vector2(x + 0.5, y + 0.5)) + Vector3(0, 0.001, 0)
			add_child(tile)
			_tiles[ACState.cell_key(x, y)] = m
	# 敌我分界线与外框
	_line(Vector3(-ACData.COLS / 2.0, 0.01, ACData.PLAYER_ROW0 - ACData.ROWS / 2.0), Vector3(ACData.COLS / 2.0, 0.01, ACData.PLAYER_ROW0 - ACData.ROWS / 2.0), 0.035, Color(1, 0.82, 0.23, 0.85))
	var hw := ACData.COLS / 2.0 + 0.3
	var hh := ACData.ROWS / 2.0 + 0.3
	for c in [[Vector3(-hw, 0, -hh), Vector3(hw, 0, -hh)], [Vector3(-hw, 0, hh), Vector3(hw, 0, hh)], [Vector3(-hw, 0, -hh), Vector3(-hw, 0, hh)], [Vector3(hw, 0, -hh), Vector3(hw, 0, hh)]]:
		_line(c[0] + Vector3(0, 0.01, 0), c[1] + Vector3(0, 0.01, 0), 0.03, Color(1, 1, 1, 0.35))
	# 备战席
	for i in ACData.BENCH_SIZE:
		var slot := MeshInstance3D.new()
		var pm := PlaneMesh.new()
		pm.size = Vector2(0.9, 0.9)
		slot.mesh = pm
		var m := ACActor.flat_mat(Color(0.1, 0.12, 0.17, 0.85))
		slot.material_override = m
		slot.position = bench_pos(i) + Vector3(0, 0.001, 0)
		add_child(slot)
		_bench.append(m)
		var edge := MeshInstance3D.new()
		var em := PlaneMesh.new()
		em.size = Vector2(0.9, 0.04)
		edge.mesh = em
		edge.material_override = ACActor.flat_mat(Color(1, 1, 1, 0.3))
		edge.position = bench_pos(i) + Vector3(0, 0.003, 0.45)
		add_child(edge)

func _line(a: Vector3, b: Vector3, w: float, col: Color) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(w, 0.01, a.distance_to(b))
	mi.mesh = bm
	mi.material_override = ACActor.flat_mat(col, true)
	add_child(mi)
	mi.position = (a + b) / 2.0
	if a.distance_to(b) > 0.001:
		mi.look_at_from_position(mi.position, b, Vector3.UP if absf((b - a).normalized().y) < 0.99 else Vector3.FORWARD)
	return mi

# ---------- 选取与高亮 ----------

## 鼠标位置 → 地面坐标（y=0 平面）
func ground_at(screen: Vector2) -> Vector3:
	var o := camera.project_ray_origin(screen)
	var d := camera.project_ray_normal(screen)
	if absf(d.y) < 0.0001:
		return Vector3.INF
	var t := -o.y / d.y
	return o + d * t

## 鼠标位置 → 棋盘格或备战席位置（无效时返回空字典）
func loc_at(screen: Vector2) -> Dictionary:
	var p := ground_at(screen)
	if p == Vector3.INF:
		return {}
	var gx := int(floor(p.x + ACData.COLS / 2.0))
	var gy := int(floor(p.z + ACData.ROWS / 2.0))
	if gx >= 0 and gx < ACData.COLS and gy >= 0 and gy < ACData.ROWS:
		return ACState.board_loc(gx, gy)
	for i in ACData.BENCH_SIZE:
		var b := bench_pos(i)
		if absf(p.x - b.x) <= 0.51 and absf(p.z - b.z) <= 0.6:
			return ACState.bench_loc(i)
	return {}

func loc_world(loc: Dictionary) -> Vector3:
	if loc["kind"] == "bench":
		return bench_pos(loc["index"])
	return g2w(Vector2(loc["x"] + 0.5, loc["y"] + 0.5))

func highlight(loc: Dictionary, ok: bool = true, deploy: bool = false) -> void:
	for k in _tiles:
		var p := ACState.parse_key(k)
		var player := p.y >= ACData.PLAYER_ROW0
		var alt := (p.x + p.y) % 2 == 0
		(_tiles[k] as StandardMaterial3D).albedo_color = (PLAYER_TILE if alt else PLAYER_TILE_2) if player else (ENEMY_TILE if alt else ENEMY_TILE_2)
	if deploy:
		show_deploy_zone(true)
	for m in _bench:
		(m as StandardMaterial3D).albedo_color = Color(0.1, 0.12, 0.17, 0.85)
	if loc.is_empty():
		return
	var col := HILITE if ok else BAD
	if loc["kind"] == "bench":
		(_bench[loc["index"]] as StandardMaterial3D).albedo_color = Color(col, 0.6)
	else:
		(_tiles[ACState.cell_key(loc["x"], loc["y"])] as StandardMaterial3D).albedo_color = Color(col, 0.6)

## 显示我方可部署区域（拖动时）
func show_deploy_zone(on: bool) -> void:
	for k in _tiles:
		var p := ACState.parse_key(k)
		if p.y >= ACData.PLAYER_ROW0:
			var alt := (p.x + p.y) % 2 == 0
			(_tiles[k] as StandardMaterial3D).albedo_color = (Color(0.16, 0.28, 0.34, 0.95) if alt else Color(0.19, 0.31, 0.37, 0.95)) if on else (PLAYER_TILE if alt else PLAYER_TILE_2)

## 屏幕位置最近的棋子
func actor_at(screen: Vector2, team: int = -1) -> ACActor:
	var best: ACActor = null
	var bd := 9999.0
	for key in actors:
		var a: ACActor = actors[key]
		if not a.visible or a.gone or (team >= 0 and a.team != team):
			continue
		if a.bunit != null and not a.bunit.alive:
			continue
		var foot := camera.unproject_position(a.position)
		var top := camera.unproject_position(a.position + Vector3(0, a.height, 0))
		var half_w := maxf(28.0, (foot.y - top.y) * 0.32)
		if screen.x < foot.x - half_w or screen.x > foot.x + half_w or screen.y < top.y or screen.y > foot.y + 12:
			continue
		var d := absf(screen.x - foot.x) + absf(screen.y - (foot.y + top.y) / 2.0) * 0.3
		if d < bd:
			bd = d
			best = a
	return best

func screen_of(a: ACActor, lift: float = -1.0) -> Vector2:
	var h := a.head_height() if lift < 0 else lift
	return camera.unproject_position(a.position + Vector3(0, h, 0))

func is_visible_on_screen(p: Vector3) -> bool:
	return not camera.is_position_behind(p)

# ---------- 棋子 ----------

func add_actor(key, id: String, enemy_type: bool, team: int, star: int, pos: Vector3) -> ACActor:
	var a := ACActor.new().setup(id, enemy_type, team, star)
	a.position = pos
	add_child(a)
	actors[key] = a
	return a

func remove_actor(key) -> void:
	if actors.has(key):
		(actors[key] as ACActor).queue_free()
		actors.erase(key)

func clear_actors() -> void:
	for k in actors:
		(actors[k] as ACActor).queue_free()
	actors.clear()
	for p in _proj:
		(_proj[p] as Node3D).queue_free()
	_proj.clear()
	for f in _fx:
		(f["node"] as Node).queue_free()
	_fx.clear()

# ---------- 每帧 ----------

func _process(dt: float) -> void:
	_time += dt
	for key in actors:
		var a: ACActor = actors[key]
		if a.bunit != null:
			a.tick(dt, _time, g2w(a.bunit.gpos))
		elif not a.lifted:
			a.tick(dt, _time, a.position)
		else:
			a.tick(dt, _time, a.position)
	var i := 0
	while i < _fx.size():
		var f: Dictionary = _fx[i]
		f["t"] += dt
		var k: float = f["t"] / f["life"]
		if k >= 1.0:
			(f["node"] as Node).queue_free()
			_fx.remove_at(i)
			continue
		(f["update"] as Callable).call(k)
		i += 1
	if _shake > 0.01:
		_shake = maxf(0.0, _shake - dt * 3.0 * maxf(1.0, _shake))
		camera.position = _cam_base + Vector3(randf_range(-1, 1), randf_range(-1, 1), 0) * _shake * 0.02
	else:
		camera.position = _cam_base

func shake(v: float) -> void:
	_shake = maxf(_shake, v * 0.6)

## 同步弹道节点
func sync_projectiles(list: Array) -> void:
	var live := {}
	for p in list:
		var pid: int = p["id"]
		live[pid] = true
		var node: MeshInstance3D = _proj.get(pid)
		if node == null:
			node = MeshInstance3D.new()
			var sm := SphereMesh.new()
			var r: float = p["size"] * 1.6
			sm.radius = r
			sm.height = r * 2.0
			sm.radial_segments = 10
			sm.rings = 6
			node.mesh = sm
			node.material_override = ACActor.flat_mat(p["color"], true)
			add_child(node)
			_proj[pid] = node
		var k: float = p["k"]
		var from: Vector2 = p["from"]
		var tpos: Vector2 = p["tpos"]
		var span := from.distance_to(tpos)
		var y: float = p["lift"] + float(p["arc"]) * 4.0 * k * (1.0 - k) * maxf(1.0, span * 0.6)
		node.position = g2w(p["pos"]) + Vector3(0, y, 0)
	for p in _proj.keys():
		if not live.has(p):
			(_proj[p] as Node3D).queue_free()
			_proj.erase(p)

# ---------- 特效 ----------

func _add_fx(node: Node3D, life: float, update: Callable) -> void:
	add_child(node)
	_fx.append({"node": node, "life": maxf(0.05, life), "t": 0.0, "update": update})
	update.call(0.0)

func fx(d: Dictionary) -> void:
	var col: Color = d.get("color", Color.WHITE)
	var life: float = d.get("life", 0.5)
	match String(d["kind"]):
		"ring":
			var at := g2w(d["at"]) + Vector3(0, float(d.get("lift", 0.05)), 0)
			var r0: float = d.get("r0", 0.1)
			var r1: float = d.get("r1", 0.6)
			var holder := Node3D.new()
			holder.position = at
			var ring := MeshInstance3D.new()
			var tm := TorusMesh.new()
			var w: float = d.get("width", 0.05)
			tm.inner_radius = 1.0 - w / maxf(0.2, r1) * 1.5
			tm.outer_radius = 1.0
			tm.rings = 48
			tm.ring_segments = 4
			ring.mesh = tm
			var rm := ACActor.flat_mat(col, true)
			ring.material_override = rm
			holder.add_child(ring)
			var disc: MeshInstance3D = null
			var dmat: StandardMaterial3D = null
			if d.get("filled", false):
				disc = MeshInstance3D.new()
				var cm := CylinderMesh.new()
				cm.top_radius = 1.0
				cm.bottom_radius = 1.0
				cm.height = 0.004
				cm.radial_segments = 40
				disc.mesh = cm
				dmat = ACActor.flat_mat(Color(col, 0.3), true)
				disc.material_override = dmat
				holder.add_child(disc)
			_add_fx(holder, life, func(k: float):
				var e := 1.0 - pow(1.0 - k, 3.0)
				var r := lerpf(r0, r1, e)
				ring.scale = Vector3(r, 0.04, r)
				rm.albedo_color.a = 1.0 - k
				if disc != null:
					disc.scale = Vector3(r, 1, r)
					dmat.albedo_color.a = 0.3 * (1.0 - k))
		"beam":
			var a3: Vector3 = d["from"]
			var b3: Vector3 = d["to"]
			var a := g2w(Vector2(a3.x, a3.y)) + Vector3(0, a3.z, 0)
			var b := g2w(Vector2(b3.x, b3.y)) + Vector3(0, b3.z, 0)
			var mi := MeshInstance3D.new()
			var bm := BoxMesh.new()
			var w: float = d.get("width", 0.08)
			bm.size = Vector3(w, w, a.distance_to(b))
			mi.mesh = bm
			var m := ACActor.flat_mat(col, true)
			mi.material_override = m
			var mid := (a + b) / 2.0
			var up := Vector3.UP if absf((b - a).normalized().y) < 0.98 else Vector3.FORWARD
			_add_fx(mi, life, func(k: float):
				m.albedo_color.a = 1.0 - k
				mi.scale = Vector3(1.0 - k * 0.7, 1.0 - k * 0.7, 1))
			mi.look_at_from_position(mid, b, up)
			var core := MeshInstance3D.new()
			var cb := BoxMesh.new()
			cb.size = Vector3(w * 0.35, w * 0.35, a.distance_to(b))
			core.mesh = cb
			core.material_override = ACActor.flat_mat(Color(1, 1, 1, 0.9), true)
			mi.add_child(core)
		"slash":
			var at := g2w(d["at"]) + Vector3(0, float(d.get("lift", 0.9)) * 0.75, 0)
			var s := Sprite3D.new()
			s.texture = _slash_tex
			s.billboard = BaseMaterial3D.BILLBOARD_ENABLED
			s.shaded = false
			s.modulate = col
			s.no_depth_test = true
			s.render_priority = 10
			var rad: float = d.get("radius", 0.5)
			s.pixel_size = rad * 2.2 / 128.0
			s.rotation.z = -float(d.get("angle", 0.0))
			s.position = at
			_add_fx(s, 0.22, func(k: float):
				s.modulate.a = 1.0 - k
				s.scale = Vector3.ONE * (0.8 + k * 0.5))
		"burst":
			var at := g2w(d["at"]) + Vector3(0, float(d.get("lift", 0.5)), 0)
			var p := CPUParticles3D.new()
			p.one_shot = true
			p.emitting = true
			p.amount = int(d.get("count", 12))
			p.lifetime = life
			p.explosiveness = 1.0
			p.direction = Vector3(0, 1, 0)
			p.spread = 180.0
			var sp: float = d.get("speed", 2.0)
			p.initial_velocity_min = sp * 0.4
			p.initial_velocity_max = sp
			p.gravity = Vector3(0, -2.0 + float(d.get("up", 0.0)), 0)
			var qm := QuadMesh.new()
			var sz: float = d.get("size", 0.05) * 2.4
			qm.size = Vector2(sz, sz)
			var pm := ACActor.flat_mat(Color.WHITE, true)
			pm.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
			pm.vertex_color_use_as_albedo = true
			qm.material = pm
			p.mesh = qm
			var g := Gradient.new()
			g.set_color(0, Color(col, 1.0))
			g.set_color(1, Color(col, 0.0))
			p.color_ramp = g
			p.position = at
			_add_fx(p, life + 0.1, func(_k: float): pass)
		"telegraph":
			var radius: float = d.get("radius", 1.0)
			var holder := Node3D.new()
			var follow = d.get("follow", null)
			holder.position = g2w(d["at"]) + Vector3(0, 0.02, 0)
			var disc := MeshInstance3D.new()
			var cm := CylinderMesh.new()
			cm.top_radius = radius
			cm.bottom_radius = radius
			cm.height = 0.004
			cm.radial_segments = 48
			disc.mesh = cm
			var dm := ACActor.flat_mat(Color(col, 0.18), true)
			disc.material_override = dm
			holder.add_child(disc)
			var ring := MeshInstance3D.new()
			var tm := TorusMesh.new()
			tm.inner_radius = radius - 0.06
			tm.outer_radius = radius
			tm.rings = 48
			tm.ring_segments = 4
			ring.mesh = tm
			ring.scale = Vector3(1, 0.04, 1)
			var rm := ACActor.flat_mat(col, true)
			ring.material_override = rm
			holder.add_child(ring)
			_add_fx(holder, life, func(k: float):
				if follow != null and follow.alive:
					holder.position = g2w(follow.gpos) + Vector3(0, 0.02, 0)
				dm.albedo_color.a = 0.12 + 0.25 * k
				var s := 1.0 - 0.15 * k
				ring.scale = Vector3(s, 0.04, s))
		"pillar":
			var radius: float = d.get("radius", 1.0)
			var mi := MeshInstance3D.new()
			var cm := CylinderMesh.new()
			cm.top_radius = radius * 0.6
			cm.bottom_radius = radius
			cm.height = 3.0
			cm.cap_top = false
			cm.cap_bottom = false
			mi.mesh = cm
			var m := ACActor.flat_mat(Color(col, 0.6), true)
			mi.material_override = m
			mi.position = g2w(d["at"]) + Vector3(0, 1.5, 0)
			_add_fx(mi, life, func(k: float):
				m.albedo_color.a = 0.6 * (1.0 - k)
				mi.scale = Vector3(1.0 + k * 0.3, 0.4 + k * 0.8, 1.0 + k * 0.3))

## 程序生成的弧形刀光贴图
func _make_slash_texture() -> Texture2D:
	var img := Image.create(128, 128, false, Image.FORMAT_RGBA8)
	var c := Vector2(64, 64)
	for y in 128:
		for x in 128:
			var p := Vector2(x, y) - c
			var r := p.length() / 60.0
			var ang := atan2(p.y, p.x)
			var span := clampf(1.0 - absf(ang) / 1.6, 0.0, 1.0)
			var band := clampf(1.0 - absf(r - 0.82) / (0.16 * span + 0.01), 0.0, 1.0)
			var a := band * span
			img.set_pixel(x, y, Color(1, 1, 1, a))
	return ImageTexture.create_from_image(img)
