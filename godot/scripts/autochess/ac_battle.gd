class_name ACBattle
extends RefCounted
## 自动战斗：由网页版 autochess-core.js 的 Battle 逐项移植。
## 规则层不依赖画面，通过 listeners 发出事件（spawn / attack / cast / damage / heal / kill / fx / shake / hitstop / wave / finish …）。
## 坐标：gpos 以格为单位，x ∈ [0, COLS]，y ∈ [0, ROWS]；敌方在上（y 小），我方在下。

const C := {
	"ally": Color("fff4c2"), "enemy": Color("ff4a55"), "crit": Color("ffe24a"), "skill": Color("7fe6ff"),
	"shield": Color("cfe9ff"), "team": Color("66d8ff"), "blink": Color("a867ff"), "pierce": Color("8dffb0"),
	"rail": Color("ffe36a"), "frost": Color("8fdcff"), "star": Color("ffc46a"), "slam": Color("ffb060"),
	"meteor": Color("ffd76a"), "fire": Color("ff7a3c"), "mark": Color("ff9aa8"), "heal": Color("8dffc0"),
	"void": Color("d65cff"), "bolt_ally": Color("bfe4ff"), "volley": Color("ff9a5a"),
}

class BUnit extends RefCounted:
	var id := ""
	var uid := 0
	var def: Dictionary
	var enemy_type := false
	var star := 1
	var team := 0
	var scale_mult := 1.0
	var size := 1.0
	var boss := false
	var gpos := Vector2.ZERO
	var max_hp := 0.0
	var hp := 0.0
	var atk := 0.0
	var atk_speed := 1.0
	var armor := 0.0
	var max_mana := 0.0
	var mana := 0.0
	var reach := 1.3
	var crit := 0.1
	var crit_mult := 1.5
	var skill_mult := 1.0
	var regen := 0.0
	var shield := 0.0
	var move_speed := 2.2
	var echo_mana := 0.0
	var alive := true
	var target: BUnit = null
	var cd := 0.0
	var stun := 0.0
	var cast_lock := 0.0
	var retarget := 0.0
	var dealt := 0.0
	var healed := 0.0
	var moving := false
	var face := Vector2(0, -1)
	var spawn_t := 0.0
	var death_t := -1.0
	var flash := 0.0
	var attack_t := 1.0
	var cast_t := 1.0
	var serial := 0
	var view = null # 画面层挂载的节点

static func make_unit(id: String, star: int, team: int, enemy_type: bool = false, strength: float = 1.0) -> BUnit:
	var d: Dictionary = ACData.enemy(id) if enemy_type else ACData.unit(id)
	var m: float = strength if enemy_type else ACData.star_mult(star)
	var u := BUnit.new()
	u.id = id
	u.def = d
	u.enemy_type = enemy_type
	u.star = star
	u.team = team
	u.scale_mult = strength
	u.size = float(d.get("size", 1))
	u.boss = d.get("boss", false) == true
	u.max_hp = float(d["hp"]) * m
	u.hp = u.max_hp
	u.atk = float(d["atk"]) * m
	u.atk_speed = float(d["as"])
	u.armor = float(d["armor"])
	u.max_mana = float(d["mana"])
	u.mana = float(d.get("startMana", 0))
	var rng_cells := float(d["range"])
	u.reach = (1.3 if rng_cells <= 1 else rng_cells + 0.3) + (0.6 if u.boss else 0.0)
	u.face = Vector2(0, -1 if team == 0 else 1)
	return u

static func seg_dist(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var k := clampf((p - a).dot(ab) / ab.length_squared(), 0.0, 1.0)
	return p.distance_to(a + ab * k)

var units: Array[BUnit] = []
var projectiles: Array = []
var scheduled: Array = []
var running := false
var time := 0.0
var listeners: Array[Callable] = []
var rng: ACRng = ACRng.new()
var augments: Array = []
var traits: Dictionary = {}
var serial := 0
var wave_idx := 0
var waves: Array = []
var timeout := 45.0
var _wave_delay := -1.0
var _proj_serial := 0

func on(fn: Callable) -> ACBattle:
	listeners.append(fn)
	return self

func emit(type: String, data: Dictionary = {}) -> void:
	for fn in listeners:
		fn.call(type, data)

func fx(d: Dictionary) -> void:
	emit("fx", d)

func clear() -> void:
	for u in units: # 解开单位之间的互相引用，避免引用计数循环
		u.target = null
		u.view = null
	units = []
	projectiles = []
	scheduled = []
	running = false
	time = 0.0
	emit("clear")

func start(state: ACState, encounter: Dictionary) -> void:
	clear()
	augments = state.augments
	traits = state.active_traits()
	for e in state.board_units():
		var u := make_unit(e["unit"]["id"], int(e["unit"]["star"]), 0)
		u.gpos = Vector2(e["x"] + 0.5, e["y"] + 0.5)
		u.uid = int(e["unit"]["uid"])
		_apply_bonuses(u, traits)
		_add(u)
	waves = encounter["waves"] if encounter.has("waves") else [encounter["enemies"]]
	wave_idx = 0
	timeout = 45.0 + 25.0 * (waves.size() - 1)
	_wave_delay = -1.0
	_spawn_wave(0)
	if traits.has("dawn"):
		var v := ACData.trait_value("dawn", traits["dawn"])
		for u in units:
			if u.team == 0:
				u.shield += v
				fx({"kind": "ring", "at": u.gpos, "lift": 0.9, "color": C.ally, "r0": 0.1, "r1": 0.55, "life": 0.6, "width": 0.05})
	running = true
	emit("start", {"waves": waves.size()})

func _add(u: BUnit) -> BUnit:
	serial += 1
	u.serial = serial
	units.append(u)
	emit("spawn", {"u": u})
	return u

func _spawn_wave(i: int) -> void:
	for e in waves[i]:
		var u := make_unit(e[0], 1, 1, true, float(e[3]))
		u.gpos = Vector2(float(e[1]) + 0.5, float(e[2]) + 0.5)
		_nudge_free(u)
		_add(u)
		if i > 0:
			fx({"kind": "ring", "at": u.gpos, "lift": 0.05, "color": C.enemy, "r0": 0.1, "r1": 0.8 * u.size, "life": 0.5, "width": 0.06, "filled": true})
	if i > 0:
		emit("wave", {"n": i + 1, "total": waves.size()})

func _nudge_free(u: BUnit) -> void:
	for k in 12:
		var crowded := false
		for o in units:
			if o.alive and o.gpos.distance_to(u.gpos) < 0.45:
				crowded = true
				break
		if not crowded:
			return
		u.gpos.y = maxf(0.3, u.gpos.y - 0.4)
		u.gpos.x += -0.3 if k % 2 == 1 else 0.3

func _apply_bonuses(u: BUnit, tr: Dictionary) -> void:
	var own: Array = u.def["traits"]
	if tr.has("bulwark") and own.has("bulwark"):
		u.max_hp += ACData.trait_value("bulwark", tr["bulwark"])
	if tr.has("marksman") and own.has("marksman"):
		u.atk_speed *= 1.0 + ACData.trait_value("marksman", tr["marksman"]) / 100.0
	if tr.has("arcanist"):
		u.skill_mult += ACData.trait_value("arcanist", tr["arcanist"]) / 100.0
	if tr.has("striker") and own.has("striker"):
		u.crit += ACData.trait_value("striker", tr["striker"]) / 100.0
		u.crit_mult = 1.8
	if tr.has("echo") and own.has("echo"):
		u.echo_mana = ACData.trait_value("echo", tr["echo"])
	if augments.has("power"):
		u.atk *= 1.15
	if augments.has("vital"):
		u.max_hp *= 1.18
	if augments.has("overclock"):
		u.atk_speed *= 1.15
	if augments.has("precast"):
		u.mana += 25
	if augments.has("regen"):
		u.regen = 0.02
	u.hp = u.max_hp

func alive(team: int) -> Array[BUnit]:
	var out: Array[BUnit] = []
	for u in units:
		if u.alive and u.team == team:
			out.append(u)
	return out

func enemies_left() -> int:
	var n := alive(1).size()
	for i in range(wave_idx + 1, waves.size()):
		n += (waves[i] as Array).size()
	return n

func damage_report() -> Array:
	var out := []
	for u in units:
		if u.team == 0:
			out.append({"id": u.id, "star": u.star, "dealt": u.dealt, "healed": u.healed, "alive": u.alive})
	out.sort_custom(func(a, b): return a["dealt"] > b["dealt"])
	return out

func step(dt: float) -> void:
	if not running:
		return
	time += dt
	var i := 0
	while i < scheduled.size():
		var ev: Dictionary = scheduled[i]
		ev["t"] -= dt
		if ev["t"] <= 0:
			scheduled.remove_at(i)
			(ev["fn"] as Callable).call()
		else:
			i += 1
	_step_projectiles(dt)
	for u in units:
		u.spawn_t += dt
		u.attack_t += dt
		u.cast_t += dt
		u.flash = maxf(0.0, u.flash - dt * 6.0)
		if u.alive:
			_tick_unit(u, dt)
		elif u.death_t >= 0:
			u.death_t += dt
	_separate(dt)
	var allies := alive(0).size()
	var enemies := alive(1).size()
	if enemies == 0 and allies > 0 and wave_idx < waves.size() - 1: # 下一波
		if _wave_delay < 0:
			_wave_delay = 1.3
		_wave_delay -= dt
		if _wave_delay <= 0:
			_wave_delay = -1.0
			wave_idx += 1
			_spawn_wave(wave_idx)
		return
	if allies == 0 or enemies == 0 or time >= timeout:
		running = false
		var left := enemies_left()
		var won := left == 0 and allies > 0
		var mvp = null
		for u in units:
			if u.team == 0 and (mvp == null or u.dealt > mvp["dealt"]):
				mvp = {"id": u.id, "star": u.star, "dealt": round(u.dealt)}
		emit("finish", {"won": won, "surviving": left, "mvp": mvp, "time": time, "timeout": time >= timeout})

func _nearest(u: BUnit, team: int) -> BUnit:
	var best: BUnit = null
	var bd := INF
	for o in units:
		if o.alive and o.team == team:
			var d := u.gpos.distance_squared_to(o.gpos)
			if d < bd:
				bd = d
				best = o
	return best

func _tick_unit(u: BUnit, dt: float) -> void:
	u.moving = false
	if u.regen > 0:
		u.hp = minf(u.max_hp, u.hp + u.max_hp * u.regen * dt)
	if u.stun > 0:
		u.stun -= dt
		return
	if u.cast_lock > 0:
		u.cast_lock -= dt
		return
	u.cd -= dt
	u.retarget -= dt
	if u.target == null or not u.target.alive or u.retarget <= 0:
		u.target = _nearest(u, 1 - u.team)
		u.retarget = 1.0
	var tgt := u.target
	if tgt == null:
		return
	var d := u.gpos.distance_to(tgt.gpos)
	if d > 0.001:
		u.face = (tgt.gpos - u.gpos) / d
	if u.max_mana > 0 and u.mana >= u.max_mana and u.def.has("skill"):
		_cast(u)
		return
	if d <= u.reach:
		if u.cd <= 0:
			u.cd = 1.0 / u.atk_speed
			_attack(u, tgt)
	else:
		u.gpos += u.face * u.move_speed * dt
		_clamp(u)
		u.moving = true

func _clamp(u: BUnit) -> void:
	u.gpos.x = clampf(u.gpos.x, 0.3, ACData.COLS - 0.3)
	u.gpos.y = clampf(u.gpos.y, 0.3, ACData.ROWS - 0.3)

func _separate(dt: float) -> void: # 简单的单位推挤，避免重叠
	var k := minf(1.0, dt * 10.0)
	for a in units:
		if not a.alive:
			continue
		for b in units:
			if b == a or not b.alive:
				continue
			var dv := a.gpos - b.gpos
			var d := dv.length()
			var mn := 0.62 * (a.size + b.size) * 0.5 + 0.1
			if d < mn and d > 0.0001:
				a.gpos += dv / d * (mn - d) * 0.5 * k
		_clamp(a)

func _shoot(from: Vector2, target: BUnit, tpos: Vector2, opts: Dictionary) -> Dictionary:
	_proj_serial += 1
	var p := {"id": _proj_serial, "from": from, "pos": from, "target": target, "tpos": tpos, "speed": opts.get("speed", 9.5), "arc": opts.get("arc", 0.0),
		"color": opts.get("color", Color.WHITE), "size": opts.get("size", 0.05), "travelled": 0.0, "k": 0.0, "done": false,
		"on_hit": opts.get("on_hit", Callable()), "lift": opts.get("lift", 1.0)}
	projectiles.append(p)
	emit("projectile", {"p": p})
	return p

func _step_projectiles(dt: float) -> void:
	for p in projectiles:
		var t = p["target"]
		if t != null and t.alive:
			p["tpos"] = t.gpos
		p["travelled"] += p["speed"] * dt
		var total := maxf(0.01, (p["from"] as Vector2).distance_to(p["tpos"]))
		p["k"] = minf(1.0, p["travelled"] / total)
		p["pos"] = (p["from"] as Vector2).lerp(p["tpos"], p["k"])
		if p["k"] >= 1.0:
			p["done"] = true
			if (p["on_hit"] as Callable).is_valid():
				(p["on_hit"] as Callable).call()
	projectiles = projectiles.filter(func(p): return not p["done"])

func _attack(u: BUnit, tgt: BUnit) -> void:
	var dmg := u.atk
	var is_crit := false
	if rng.next() < u.crit:
		dmg *= u.crit_mult
		is_crit = true
	if u.max_mana > 0:
		u.mana = minf(u.max_mana, u.mana + 10)
	u.attack_t = 0.0
	var melee := float(u.def["range"]) <= 1
	emit("attack", {"u": u, "tgt": tgt, "crit": is_crit, "melee": melee})
	if melee:
		_damage(u, tgt, dmg, "atk", is_crit)
		fx({"kind": "slash", "at": tgt.gpos, "lift": 0.9, "angle": atan2(u.face.y, u.face.x), "color": C.crit if is_crit else (C.ally if u.team == 0 else C.enemy), "radius": 0.62 if is_crit else 0.45})
	else:
		_shoot(u.gpos, tgt, tgt.gpos, {"color": C.bolt_ally if u.team == 0 else C.enemy, "size": 0.045, "arc": 0.12, "on_hit": func(): _damage(u, tgt, dmg, "atk", is_crit)})

func _damage(src: BUnit, tgt: BUnit, amount: float, kind: String, is_crit: bool = false) -> void:
	if not tgt.alive:
		return
	if kind == "atk":
		amount *= 100.0 / (100.0 + tgt.armor)
	amount = maxf(1.0, amount)
	var raw := amount
	var absorbed := 0.0
	if tgt.shield > 0:
		absorbed = minf(tgt.shield, amount)
		tgt.shield -= absorbed
		amount -= absorbed
	tgt.hp -= amount
	if src != null:
		src.dealt += raw
	if tgt.max_mana > 0:
		tgt.mana = minf(tgt.max_mana, tgt.mana + minf(raw * 0.03, 8.0))
	tgt.flash = 1.0
	emit("damage", {"src": src, "tgt": tgt, "raw": raw, "kind": kind, "crit": is_crit, "absorbed": absorbed})
	if tgt.hp <= 0:
		_kill(tgt)

func _heal(src: BUnit, tgt: BUnit, amount: float) -> void:
	if not tgt.alive:
		return
	var v := minf(tgt.max_hp - tgt.hp, amount)
	tgt.hp += v
	if src != null:
		src.healed += v
	emit("heal", {"src": src, "tgt": tgt, "amount": v})

func _kill(u: BUnit) -> void:
	u.hp = 0
	u.alive = false
	u.death_t = 0.0
	emit("kill", {"u": u})

func _schedule(t: float, fn: Callable) -> void:
	scheduled.append({"t": t, "fn": fn})

func _by_distance(list: Array[BUnit], origin: Vector2) -> Array[BUnit]:
	var out := list.duplicate()
	out.sort_custom(func(a, b): return a.gpos.distance_squared_to(origin) < b.gpos.distance_squared_to(origin))
	return out

# ---------- 技能 ----------

func _cast(u: BUnit) -> void:
	var sk: Dictionary = u.def["skill"]
	var foes := 1 - u.team
	u.mana = 0
	u.cast_lock = 0.35
	u.cast_t = 0.0
	var v: float = float(sk["values"][1 if u.enemy_type else u.star]) * u.skill_mult
	if u.enemy_type:
		v *= u.scale_mult
	emit("cast", {"u": u, "skill": sk})
	fx({"kind": "ring", "at": u.gpos, "lift": 0.05, "color": C.skill if u.team == 0 else C.enemy, "r0": 0.08, "r1": 0.62, "life": 0.4, "width": 0.045})
	var hit := func(o: BUnit, amount: float) -> void:
		_damage(u, o, amount, "skill")
	var big := v > 600
	match String(sk["type"]):
		"shield_self":
			u.shield += v
			emit("shield", {"u": u, "amount": v})
			fx({"kind": "ring", "at": u.gpos, "lift": 0.9, "color": C.shield, "r0": 0.18, "r1": 0.62, "life": 0.6, "width": 0.07, "filled": true})
		"shield_near":
			var others: Array[BUnit] = []
			for a in alive(u.team):
				if a != u:
					others.append(a)
			var near := _by_distance(others, u.gpos).slice(0, int(sk.get("count", 2)))
			var list: Array = [u]
			list.append_array(near)
			for a in list:
				a.shield += v
				emit("shield", {"u": a, "amount": v})
				fx({"kind": "ring", "at": a.gpos, "lift": 0.9, "color": C.shield, "r0": 0.14, "r1": 0.55, "life": 0.65, "width": 0.06, "filled": true})
				if a != u:
					fx({"kind": "beam", "from": Vector3(u.gpos.x, u.gpos.y, 1.1), "to": Vector3(a.gpos.x, a.gpos.y, 1.0), "color": C.shield, "width": 0.04, "life": 0.3})
		"team_shield":
			for a in alive(u.team):
				a.shield += v
				emit("shield", {"u": a, "amount": v})
				fx({"kind": "ring", "at": a.gpos, "lift": 0.9, "color": C.team if u.team == 0 else C.enemy, "r0": 0.12, "r1": 0.52, "life": 0.7, "width": 0.05, "filled": true})
			fx({"kind": "ring", "at": u.gpos, "lift": 0.05, "color": C.team if u.team == 0 else C.enemy, "r0": 0.2, "r1": 3.6, "life": 0.8, "width": 0.08})
		"heal":
			var friends := alive(u.team)
			friends.sort_custom(func(a, b): return a.hp / a.max_hp < b.hp / b.max_hp)
			if friends.is_empty():
				pass
			else:
				var low: BUnit = friends[0]
				fx({"kind": "beam", "from": Vector3(u.gpos.x, u.gpos.y, 1.3), "to": Vector3(low.gpos.x, low.gpos.y, 1.1), "color": C.heal, "width": 0.05, "life": 0.35})
				for a in friends:
					if a.gpos.distance_to(low.gpos) <= float(sk["radius"]):
						_heal(u, a, v if a == low else v * 0.5)
						fx({"kind": "ring", "at": a.gpos, "lift": 0.05, "color": C.heal, "r0": 0.1, "r1": 0.6, "life": 0.6, "width": 0.05, "filled": true})
						fx({"kind": "burst", "at": a.gpos, "lift": 0.4, "color": C.heal, "count": 8, "speed": 1.2, "size": 0.04, "life": 0.7, "up": 1.6})
		"strike":
			var tg := u.target
			if tg != null and tg.alive:
				for k in 3:
					_schedule(0.08 * k, func():
						if not tg.alive:
							return
						hit.call(tg, v / 3.0)
						fx({"kind": "slash", "at": tg.gpos, "lift": 0.9, "angle": rng.next() * TAU, "color": C.crit, "radius": 0.66}))
				emit("hitstop", {"dur": 0.05})
		"snipe":
			var tg := u.target
			if sk.get("pick", "") == "weakest":
				var low := INF
				for o in alive(foes):
					if o.hp < low:
						low = o.hp
						tg = o
			if tg != null and tg.alive:
				u.target = tg
				fx({"kind": "telegraph", "at": tg.gpos, "radius": 0.45, "color": C.skill if u.team == 0 else C.enemy, "life": 0.25, "follow": tg})
				_schedule(0.22, func():
					fx({"kind": "beam", "from": Vector3(u.gpos.x, u.gpos.y, 1.2), "to": Vector3(tg.gpos.x, tg.gpos.y, 1.0), "color": C.rail if big else C.skill, "width": 0.16 if big else 0.09, "life": 0.3})
					if tg.alive:
						hit.call(tg, v)
					fx({"kind": "burst", "at": tg.gpos, "lift": 0.9, "color": C.rail if big else C.skill, "count": 16, "speed": 3.2, "size": 0.06, "life": 0.5})
					emit("shake", {"v": 9 if big else 4})
					if big:
						emit("hitstop", {"dur": 0.07}))
		"blink":
			var tg: BUnit = null
			var low := INF
			for o in alive(foes):
				if o.hp < low:
					low = o.hp
					tg = o
			if tg != null:
				var col: Color = C.blink if u.team == 0 else C["void"]
				fx({"kind": "burst", "at": u.gpos, "lift": 0.9, "color": col, "count": 14, "speed": 2.2, "size": 0.05, "life": 0.5})
				var from := u.gpos
				var side := 1.0 if u.team == 0 else -1.0
				u.gpos = Vector2(tg.gpos.x + (rng.next() - 0.5) * 0.8, clampf(tg.gpos.y + 0.7 * side, 0.3, ACData.ROWS - 0.3))
				u.target = tg
				_clamp(u)
				emit("blink", {"u": u, "from": from})
				_schedule(0.12, func():
					if tg.alive:
						hit.call(tg, v)
					fx({"kind": "slash", "at": tg.gpos, "lift": 0.9, "angle": 0.5, "color": col, "radius": 0.74})
					fx({"kind": "burst", "at": u.gpos, "lift": 0.9, "color": col, "count": 14, "speed": 2.2, "size": 0.05, "life": 0.5})
					emit("hitstop", {"dur": 0.06}))
		"pierce":
			var tg := u.target
			if tg != null:
				var dirv := tg.gpos - u.gpos
				var ln := dirv.length()
				if ln == 0:
					ln = 1.0
				var a := u.gpos
				var b := u.gpos + dirv / ln * 9.0
				var width := float(sk.get("width", 0.55))
				for o in alive(foes):
					if seg_dist(o.gpos, a, b) <= width:
						hit.call(o, v)
				fx({"kind": "beam", "from": Vector3(a.x, a.y, 1.1), "to": Vector3(b.x, b.y, 1.1), "color": C.rail if big else C.pierce, "width": 0.22 if big else 0.1, "life": 0.35})
				emit("shake", {"v": 10 if big else 4})
				if big:
					emit("hitstop", {"dur": 0.08})
		"aoe", "nova":
			var tg := u.target
			if tg != null:
				var center := tg.gpos
				var radius := float(sk["radius"])
				var stun := float(sk.get("stun", 0))
				var nova: bool = sk["type"] == "nova"
				var fxk: String = sk.get("fx", "")
				var col: Color = C.get(fxk, C.frost if nova else C.star)
				var land := func():
					for o in alive(foes):
						if o.gpos.distance_to(center) <= radius:
							hit.call(o, v)
							if stun > 0 and o.alive:
								o.stun = maxf(o.stun, stun)
								emit("stun", {"u": o, "dur": stun, "fx": fxk})
					fx({"kind": "ring", "at": center, "lift": 0.05, "color": col, "r0": 0.1, "r1": radius, "life": 0.5, "width": 0.07, "filled": true})
					fx({"kind": "burst", "at": center, "lift": 0.3, "color": col, "count": 26, "speed": 3.3, "size": 0.06, "life": 0.7, "up": 0.6})
					if fxk == "fire":
						fx({"kind": "pillar", "at": center, "color": col, "radius": radius * 0.8, "life": 0.7})
					emit("shake", {"v": 7})
				if nova:
					fx({"kind": "telegraph", "at": center, "radius": radius, "color": col, "life": 0.18})
					_schedule(0.18, land)
				else:
					_shoot(u.gpos, null, center, {"speed": 6.0, "arc": 1.1, "color": col, "size": 0.1, "lift": 1.2, "on_hit": land})
		"slam":
			var radius := float(sk["radius"])
			var stun := float(sk.get("stun", 0))
			for o in alive(foes):
				if o.gpos.distance_to(u.gpos) <= radius:
					hit.call(o, v)
					if o.alive:
						o.stun = maxf(o.stun, stun)
						emit("stun", {"u": o, "dur": stun})
			var col: Color = C.slam if u.team == 0 else C.enemy
			fx({"kind": "ring", "at": u.gpos, "lift": 0.05, "color": col, "r0": 0.2, "r1": radius, "life": 0.55, "width": 0.09, "filled": true})
			fx({"kind": "burst", "at": u.gpos, "lift": 0.1, "color": col, "count": 30, "speed": 3.6, "size": 0.07, "life": 0.7, "up": 1.2})
			emit("shake", {"v": 14})
			emit("hitstop", {"dur": 0.07})
		"multi":
			var list := _by_distance(alive(foes), u.gpos).slice(0, int(sk.get("count", 3)))
			for k in list.size():
				var o: BUnit = list[k]
				_shoot(u.gpos, o, o.gpos, {"speed": 11.0 - k, "arc": 0.3, "color": C.volley if u.team == 0 else C.enemy, "size": 0.06, "on_hit": func(): hit.call(o, v)})
		"meteor":
			var list := alive(foes)
			if not list.is_empty():
				var radius := float(sk["radius"])
				var best := list[0].gpos
				var bn := 0
				for o in list:
					var n := 0
					for o2 in list:
						if o.gpos.distance_to(o2.gpos) <= radius:
							n += 1
					if n > bn:
						bn = n
						best = o.gpos
				var p := best
				var col: Color = C.meteor if u.team == 0 else C.enemy
				fx({"kind": "telegraph", "at": p, "radius": radius, "color": col, "life": 0.55})
				_schedule(0.55, func():
					for o in alive(foes):
						if o.gpos.distance_to(p) <= radius:
							hit.call(o, v)
					fx({"kind": "beam", "from": Vector3(p.x, p.y, 9.0), "to": Vector3(p.x, p.y, 0.0), "color": col, "width": 0.4, "life": 0.25})
					fx({"kind": "ring", "at": p, "lift": 0.05, "color": col, "r0": 0.2, "r1": radius * 1.25, "life": 0.7, "width": 0.1, "filled": true})
					fx({"kind": "burst", "at": p, "lift": 0.1, "color": col, "count": 50, "speed": 5.5, "size": 0.08, "life": 1.0, "up": 1.0})
					emit("shake", {"v": 24})
					emit("hitstop", {"dur": 0.12}))
	if u.echo_mana > 0:
		u.mana += u.echo_mana
