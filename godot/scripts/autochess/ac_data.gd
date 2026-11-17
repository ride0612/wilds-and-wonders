class_name ACData
extends RefCounted
## 自走棋静态数据：由网页版 autochess-data.js 导出到 data/autochess.json（node scripts/export-godot-data.cjs）。

static var D: Dictionary = {}
static var COLS := 7
static var ROWS := 8
static var PLAYER_ROW0 := 4
static var BENCH_SIZE := 9
static var MAX_LEVEL := 8
static var START_HP := 100
static var START_GOLD := 6
static var REROLL_COST := 2
static var XP_COST := 4
static var XP_PER_BUY := 4

static func ensure() -> void:
	if not D.is_empty():
		return
	D = JSON.parse_string(FileAccess.get_file_as_string("res://data/autochess.json"))
	COLS = int(D["COLS"])
	ROWS = int(D["ROWS"])
	PLAYER_ROW0 = int(D["PLAYER_ROW0"])
	BENCH_SIZE = int(D["BENCH_SIZE"])
	MAX_LEVEL = int(D["MAX_LEVEL"])
	START_HP = int(D["START_HP"])
	START_GOLD = int(D["START_GOLD"])
	REROLL_COST = int(D["REROLL_COST"])
	XP_COST = int(D["XP_COST"])
	XP_PER_BUY = int(D["XP_PER_BUY"])

static func units() -> Dictionary:
	ensure()
	return D["UNITS"]

static func unit(id: String) -> Dictionary:
	return units()[id]

static func has_unit(id: String) -> bool:
	return units().has(id)

static func enemy(id: String) -> Dictionary:
	ensure()
	return D["ENEMIES"][id]

static func traits() -> Dictionary:
	ensure()
	return D["TRAITS"]

static func augments() -> Dictionary:
	ensure()
	return D["AUGMENTS"]

static func encounters() -> Array:
	ensure()
	return D["ENCOUNTERS"]

static func encounter(i: int) -> Dictionary:
	return encounters()[i]

static func augment_stages() -> Array:
	ensure()
	return D["AUGMENT_STAGES"]

static func star_mult(star: int) -> float:
	ensure()
	return float(D["STAR_MULT"][star])

static func cost(id: String) -> int:
	return int(unit(id)["cost"])

static func unit_ids_of_cost(c: int) -> Array:
	var out := []
	for id in units():
		if int(units()[id]["cost"]) == c:
			out.append(id)
	return out

static func trait_level(t: String, count: int) -> int:
	var lv := 0
	var th: Array = traits()[t]["thresholds"]
	for i in th.size():
		if count >= int(th[i]):
			lv = i + 1
	return lv

static func trait_value(t: String, lv: int) -> float:
	return float(traits()[t]["values"][lv - 1])

static func xp_to_next(level: int) -> int:
	ensure()
	return int(D["XP_TO_NEXT"].get(str(level), 0))

static func shop_odds(level: int) -> Array:
	ensure()
	return D["SHOP_ODDS"][str(level)]

static func pool_size(c: int) -> int:
	ensure()
	return int(D["POOL_SIZE"][str(c)])

static func cost_color(c: int) -> Color:
	ensure()
	return Color(D["COST_COLORS"][str(c)])

static func star_color(s: int) -> Color:
	ensure()
	return Color(D["STAR_COLORS"][str(s)])

## 遭遇战的所有敌人（含各波）
static func encounter_enemies(enc: Dictionary) -> Array:
	if enc.has("waves"):
		var all := []
		for w in enc["waves"]:
			all.append_array(w)
		return all
	return enc["enemies"]

## 文本中的 {v} 替换为技能数值
static func skill_desc(id: String, star: int = 1) -> String:
	var sk: Dictionary = unit(id)["skill"]
	return String(sk["desc"]).replace("{v}", str(int(sk["values"][star])))
