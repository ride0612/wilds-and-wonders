class_name ACState
extends RefCounted
## 一局自走棋的状态：经济、商店、备战席、棋盘、合星、羁绊、强化与结算。
## 由网页版 autochess-core.js 的 State 逐项移植。
## 棋子：{uid, id, star}；位置：{kind:"bench", index} 或 {kind:"board", x, y}。

var rng: ACRng
var gold := 0
var level := 2
var xp := 0
var hp := 100
var shop: Array = []
var shop_locked := false
var bench: Array = []
var board: Dictionary = {}
var pool: Dictionary = {}
var augments: Array = []
var next_uid := 1
var wins := 0
var losses := 0
var granted := -1   # 已发放过回合收入的最高关卡
var offered: Array = []   # 已提供过强化选择的关卡
var streak := 0     # 同一关连续失利次数

func _init(seed: int = -1) -> void:
	ACData.ensure()
	new_game(seed)

static func cell_key(x: int, y: int) -> String:
	return "%d,%d" % [x, y]

static func parse_key(k: String) -> Vector2i:
	var p := k.split(",")
	return Vector2i(int(p[0]), int(p[1]))

static func bench_loc(i: int) -> Dictionary:
	return {"kind": "bench", "index": i}

static func board_loc(x: int, y: int) -> Dictionary:
	return {"kind": "board", "x": x, "y": y}

func new_game(seed: int = -1) -> void:
	rng = ACRng.new(seed)
	gold = ACData.START_GOLD
	level = 2
	xp = 0
	hp = ACData.START_HP
	shop = []
	shop_locked = false
	bench = []
	bench.resize(ACData.BENCH_SIZE)
	board = {}
	pool = {}
	for id in ACData.units():
		pool[id] = ACData.pool_size(ACData.cost(id))
	augments = []
	next_uid = 1
	wins = 0
	losses = 0
	granted = -1
	offered = []
	streak = 0
	roll_shop()

# ---------- 经济 ----------

func interest() -> int:
	return mini(gold / 10, 5)

func stage_income() -> int:
	return 5 + interest() + (2 if augments.has("interest") else 0)

## 首次抵达某一关时发放收入与经验并刷新商店；重复进入不再发放。
func grant_stage(stage_idx: int) -> Dictionary:
	if stage_idx <= granted:
		return {}
	var first := granted < 0
	granted = stage_idx
	streak = 0
	if first:
		return {"income": 0, "xp": 0}
	var income := stage_income()
	gold += income
	var gain := 2 + (1 if augments.has("training") else 0)
	add_xp(gain)
	if not shop_locked:
		roll_shop()
	shop_locked = false
	return {"income": income, "xp": gain}

func xp_needed() -> int:
	return ACData.xp_to_next(level)

func add_xp(n: int) -> bool:
	if level >= ACData.MAX_LEVEL:
		return false
	xp += n
	var leveled := false
	while level < ACData.MAX_LEVEL and xp >= xp_needed():
		xp -= xp_needed()
		level += 1
		leveled = true
	if level >= ACData.MAX_LEVEL:
		xp = 0
	return leveled

## 0 = 失败，1 = 成功，2 = 成功并升级
func buy_xp() -> int:
	if level >= ACData.MAX_LEVEL or gold < ACData.XP_COST:
		return 0
	gold -= ACData.XP_COST
	return 2 if add_xp(ACData.XP_PER_BUY) else 1

# ---------- 商店 ----------

func roll_shop() -> void:
	for id in shop:
		if id != "":
			pool[id] += 1
	shop = []
	for i in 5:
		shop.append(_draw_unit())

func _draw_unit() -> String:
	var odds: Array = ACData.shop_odds(level)
	var r := rng.range_int(1, 100)
	var c := 1
	var acc := 0
	for i in odds.size():
		acc += int(odds[i])
		if r <= acc:
			c = i + 1
			break
	while c > 0: # 某个费用抽空时向下取
		var candidates := []
		var total := 0
		for id in ACData.unit_ids_of_cost(c):
			if pool[id] > 0:
				candidates.append(id)
				total += pool[id]
		if not candidates.is_empty():
			var pick := rng.range_int(1, total)
			for id in candidates:
				pick -= pool[id]
				if pick <= 0:
					pool[id] -= 1
					return id
		c -= 1
	return ""

func reroll() -> bool:
	if gold < ACData.REROLL_COST:
		return false
	gold -= ACData.REROLL_COST
	roll_shop()
	return true

func can_buy(slot: int) -> bool:
	var id: String = shop[slot]
	if id == "" or gold < ACData.cost(id):
		return false
	return _bench_free() >= 0 or count_copies(id, 1) >= 2 # 满席但买下即可合成

func buy(slot: int) -> Dictionary:
	if not can_buy(slot):
		return {"ok": false}
	var id: String = shop[slot]
	gold -= ACData.cost(id)
	shop[slot] = ""
	var u := _make_unit(id, 1)
	var idx := _bench_free()
	if idx >= 0:
		bench[idx] = u
		return {"ok": true, "unit": u, "merges": check_merges()}
	return {"ok": true, "unit": u, "merges": check_merges(u)}

func sell_value(u: Dictionary) -> int:
	var c := ACData.cost(u["id"])
	var copies := int(pow(3, int(u["star"]) - 1))
	return c * copies if int(u["star"]) == 1 or c == 1 else c * copies - 1

func sell(u: Dictionary) -> int:
	var loc := locate(u)
	if loc.is_empty():
		return 0
	_remove_at(loc)
	var v := sell_value(u)
	gold += v
	pool[u["id"]] += int(pow(3, int(u["star"]) - 1))
	return v

# ---------- 位置 ----------

func _make_unit(id: String, star: int) -> Dictionary:
	var u := {"uid": next_uid, "id": id, "star": star}
	next_uid += 1
	return u

func _bench_free() -> int:
	for i in bench.size():
		if bench[i] == null:
			return i
	return -1

func bench_count() -> int:
	var n := 0
	for u in bench:
		if u != null:
			n += 1
	return n

func board_count() -> int:
	return board.size()

func board_cap() -> int:
	return level

## [{x, y, unit}]
func board_units() -> Array:
	var out := []
	for k in board:
		var p := parse_key(k)
		out.append({"x": p.x, "y": p.y, "unit": board[k]})
	return out

func locate(u: Dictionary) -> Dictionary:
	for i in bench.size():
		if bench[i] != null and bench[i]["uid"] == u["uid"]:
			return bench_loc(i)
	for k in board:
		if board[k]["uid"] == u["uid"]:
			var p := parse_key(k)
			return board_loc(p.x, p.y)
	return {}

func unit_at(loc: Dictionary):
	if loc["kind"] == "bench":
		return bench[loc["index"]]
	return board.get(cell_key(loc["x"], loc["y"]), null)

func _remove_at(loc: Dictionary) -> void:
	if loc["kind"] == "bench":
		bench[loc["index"]] = null
	else:
		board.erase(cell_key(loc["x"], loc["y"]))

func _put_at(loc: Dictionary, u) -> void:
	if loc["kind"] == "bench":
		bench[loc["index"]] = u
	elif u == null:
		board.erase(cell_key(loc["x"], loc["y"]))
	else:
		board[cell_key(loc["x"], loc["y"])] = u

static func is_player_cell(x: int, y: int) -> bool:
	return x >= 0 and x < ACData.COLS and y >= ACData.PLAYER_ROW0 and y < ACData.ROWS

static func _same_loc(a: Dictionary, b: Dictionary) -> bool:
	if a["kind"] != b["kind"]:
		return false
	if a["kind"] == "bench":
		return a["index"] == b["index"]
	return a["x"] == b["x"] and a["y"] == b["y"]

## 把单位移到目标位置；目标有单位则交换。返回是否成功。
func move(u: Dictionary, target: Dictionary) -> bool:
	var from := locate(u)
	if from.is_empty() or target.is_empty():
		return false
	if target["kind"] == "board" and not is_player_cell(target["x"], target["y"]):
		return false
	if target["kind"] == "bench" and not (target["index"] >= 0 and target["index"] < ACData.BENCH_SIZE):
		return false
	if _same_loc(from, target):
		return false
	var other = unit_at(target)
	if from["kind"] == "bench" and target["kind"] == "board" and other == null and board_count() >= board_cap():
		return false # 人口上限
	_remove_at(from)
	if other != null:
		_remove_at(target)
		_put_at(from, other)
	_put_at(target, u)
	return true

## 开战前若场上未满员，自动把备战席单位补上。返回被放置的单位。
func auto_place_from_bench() -> Array:
	var placed := []
	for i in bench.size():
		if board_count() >= board_cap():
			break
		var u = bench[i]
		if u == null:
			continue
		var cell := _free_cell_for(u)
		if cell.x < 0:
			break
		bench[i] = null
		board[cell_key(cell.x, cell.y)] = u
		placed.append(u)
	return placed

func _free_cell_for(u: Dictionary) -> Vector2i:
	var melee := int(ACData.unit(u["id"])["range"]) <= 1
	var rows := [4, 5, 6, 7] if melee else [7, 6, 5, 4]
	for y in rows:
		for x in [3, 2, 4, 1, 5, 0, 6]:
			if not board.has(cell_key(x, y)):
				return Vector2i(x, y)
	return Vector2i(-1, -1)

# ---------- 合星 ----------

func count_copies(id: String, star: int) -> int:
	var n := 0
	for u in bench:
		if u != null and u["id"] == id and int(u["star"]) == star:
			n += 1
	for k in board:
		if board[k]["id"] == id and int(board[k]["star"]) == star:
			n += 1
	return n

## 反复检查三合一。extra 为满席购买时还没有位置的那个单位。返回 [{unit, loc}]
func check_merges(extra = null) -> Array:
	var events := []
	var changed := true
	while changed:
		changed = false
		var groups := {}
		var add := func(u: Dictionary, loc: Dictionary) -> void:
			if int(u["star"]) < 3:
				var key := "%s#%d" % [u["id"], int(u["star"])]
				if not groups.has(key):
					groups[key] = []
				groups[key].append(loc)
		for k in board: # 棋盘位置排前，合成结果优先留在场上
			var p := parse_key(k)
			add.call(board[k], board_loc(p.x, p.y))
		for i in bench.size():
			if bench[i] != null:
				add.call(bench[i], bench_loc(i))
		if extra != null:
			var key := "%s#%d" % [extra["id"], int(extra["star"])]
			var locs: Array = groups.get(key, [])
			if locs.size() >= 2:
				var keep: Dictionary = locs[0]
				var nu := _make_unit(extra["id"], int(extra["star"]) + 1)
				_remove_at(locs[0])
				_remove_at(locs[1])
				_put_at(keep, nu)
				events.append({"unit": nu, "loc": keep})
				extra = null
				changed = true
				continue
		for key in groups:
			var locs: Array = groups[key]
			if locs.size() < 3:
				continue
			var first: Dictionary = unit_at(locs[0])
			var nu := _make_unit(first["id"], int(first["star"]) + 1)
			for i in 3:
				_remove_at(locs[i])
			_put_at(locs[0], nu)
			events.append({"unit": nu, "loc": locs[0]})
			changed = true
			break
	return events

# ---------- 羁绊 ----------

func trait_counts() -> Dictionary:
	var seen := {}
	var counts := {}
	for k in board:
		var id: String = board[k]["id"]
		if seen.has(id):
			continue
		seen[id] = true
		for t in ACData.unit(id)["traits"]:
			counts[t] = counts.get(t, 0) + 1
	return counts

func active_traits() -> Dictionary:
	var out := {}
	var counts := trait_counts()
	for t in counts:
		var lv := ACData.trait_level(t, counts[t])
		if lv > 0:
			out[t] = lv
	return out

# ---------- 强化 ----------

func offer_augments() -> Array:
	var c := []
	for a in ACData.augments():
		if not augments.has(a):
			c.append(a)
	for i in range(c.size() - 1, 0, -1):
		var j := rng.range_int(0, i)
		var tmp = c[i]
		c[i] = c[j]
		c[j] = tmp
	return c.slice(0, 3)

func take_augment(a: String) -> void:
	if not ACData.augments().has(a) or augments.has(a):
		return
	augments.append(a)
	if a == "fund":
		gold += 12
	elif a == "training":
		add_xp(6)

# ---------- 结算 ----------

## 胜利 +1 金币；失利扣终端完整度并发放逐次递减的重整补给。完整度归零时终端过载：损失一半金币后重置。
func apply_result(won: bool, surviving: int, boss: bool, practice: bool = false) -> Dictionary:
	if practice:
		return {"damage": 0, "relief": 0, "overload": false}
	if won:
		wins += 1
		gold += 1
		streak = 0
		return {"damage": 0, "relief": 1, "overload": false}
	losses += 1
	var damage := 4 + surviving * 2 + (8 if boss else 0)
	hp = maxi(0, hp - damage)
	var relief := maxi(2, 5 - streak)
	streak += 1
	gold += relief
	add_xp(1)
	var overload := false
	if hp <= 0:
		overload = true
		gold = int(ceil(gold / 2.0))
		hp = ACData.START_HP
	return {"damage": damage, "relief": relief, "overload": overload}

# ---------- 存档 ----------

func to_dict() -> Dictionary:
	return {"v": 1, "gold": gold, "level": level, "xp": xp, "hp": hp, "shop": shop.duplicate(), "shopLocked": shop_locked,
		"bench": bench.duplicate(true), "board": board.duplicate(true), "augments": augments.duplicate(), "nextUid": next_uid,
		"wins": wins, "losses": losses, "granted": granted, "offered": offered.duplicate(), "streak": streak}

static func from_dict(data) -> ACState:
	var s := ACState.new()
	if not (data is Dictionary) or int(data.get("v", 0)) != 1:
		return s
	var iv := func(v, lo: int, hi: int, d: int) -> int:
		if (v is int or v is float) and float(v) == floor(float(v)) and int(v) >= lo and int(v) <= hi:
			return int(v)
		return d
	var valid := func(u) -> bool:
		return u is Dictionary and ACData.has_unit(String(u.get("id", ""))) and int(u.get("star", 0)) in [1, 2, 3] and (u.get("uid") is int or u.get("uid") is float)
	s.gold = iv.call(data.get("gold"), 0, 9999, ACData.START_GOLD)
	s.level = iv.call(data.get("level"), 1, ACData.MAX_LEVEL, 2)
	s.xp = iv.call(data.get("xp"), 0, 200, 0)
	s.hp = iv.call(data.get("hp"), 1, ACData.START_HP, ACData.START_HP)
	s.bench = []
	s.bench.resize(ACData.BENCH_SIZE)
	if data.get("bench") is Array:
		var b: Array = data["bench"]
		for i in mini(b.size(), ACData.BENCH_SIZE):
			if valid.call(b[i]):
				s.bench[i] = {"uid": int(b[i]["uid"]), "id": String(b[i]["id"]), "star": int(b[i]["star"])}
	s.board = {}
	if data.get("board") is Dictionary:
		for k in data["board"]:
			var p := parse_key(k)
			var u = data["board"][k]
			if is_player_cell(p.x, p.y) and valid.call(u) and s.board_count() < s.level:
				s.board[cell_key(p.x, p.y)] = {"uid": int(u["uid"]), "id": String(u["id"]), "star": int(u["star"])}
	s.augments = []
	if data.get("augments") is Array:
		for a in data["augments"]:
			if ACData.augments().has(a) and not s.augments.has(a):
				s.augments.append(a)
	if data.get("shop") is Array and data["shop"].size() == 5:
		var ok := true
		for id in data["shop"]:
			if not (id is String) or (id != "" and not ACData.has_unit(id)):
				ok = false
		if ok:
			s.shop = (data["shop"] as Array).duplicate()
	s.shop_locked = data.get("shopLocked") == true
	s.wins = iv.call(data.get("wins"), 0, 9999, 0)
	s.losses = iv.call(data.get("losses"), 0, 9999, 0)
	s.granted = iv.call(data.get("granted"), -1, ACData.encounters().size() - 1, -1)
	s.streak = iv.call(data.get("streak"), 0, 99, 0)
	s.offered = []
	if data.get("offered") is Array:
		for o in data["offered"]:
			if (o is int or o is float):
				s.offered.append(int(o))
	var owned := []
	for u in s.bench:
		if u != null:
			owned.append(u)
	for k in s.board:
		owned.append(s.board[k])
	s.next_uid = iv.call(data.get("nextUid"), 1, 1000000000, 1)
	for u in owned:
		s.next_uid = maxi(s.next_uid, int(u["uid"]) + 1)
	# 卡池按存档里的棋子与商店重新结算
	for id in ACData.units():
		s.pool[id] = ACData.pool_size(ACData.cost(id))
	for u in owned:
		s.pool[u["id"]] = maxi(0, s.pool[u["id"]] - int(pow(3, int(u["star"]) - 1)))
	for id in s.shop:
		if id != "":
			s.pool[id] = maxi(0, s.pool[id] - 1)
	return s
