extends Node
## 全局数据（自动加载为 GameData）：角色表、关卡表与本地存档。
## cast.json / campaign.json 由网页版数据导出：node scripts/export-godot-data.cjs

var SAVE_PATH := "user://profile.json" # 测试时用 -- --profile=名字 改用独立存档
const ACTS := [
	{"name": "第一幕", "sub": "夜雨", "en": "ACT I · NIGHT RAIN"},
	{"name": "第二幕", "sub": "暮色", "en": "ACT II · DUSK"},
	{"name": "第三幕", "sub": "结界层", "en": "ACT III · BARRIER"},
	{"name": "第四幕", "sub": "赤雾", "en": "ACT IV · SCARLET MIST"},
]
const VERSION := "0.9.0"

var cast: Array = []
var stages: Array = []
var by_id := {}
var profile := {}
var _textures := {}
var _ac: ACState = null

func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--profile="):
			SAVE_PATH = "user://profile-%s.json" % arg.trim_prefix("--profile=").validate_filename()
	cast = JSON.parse_string(FileAccess.get_file_as_string("res://data/cast.json"))
	stages = JSON.parse_string(FileAccess.get_file_as_string("res://data/campaign.json"))
	for c in cast:
		by_id[c["id"]] = c
	load_profile()

func default_profile() -> Dictionary:
	return {
		"name": "旅者",
		"uid": str(randi_range(10000000, 99999999)),
		"level": 1,
		"exp": 0,
		"gold": 1200,
		"crystal": 300,
		"stamina": 120,
		"assistant": "warden",
		"cleared": [],
		"music_volume": 60,
		"fullscreen": false,
		"ac": {},
		"battle_speed": 1,
	}

func load_profile() -> void:
	profile = default_profile()
	if FileAccess.file_exists(SAVE_PATH):
		var saved = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
		if saved is Dictionary:
			for k in saved:
				# JSON 里的数字都是浮点数，整数字段也接受
				if profile.has(k) and (typeof(saved[k]) == typeof(profile[k]) or (saved[k] is float and profile[k] is int)):
					profile[k] = saved[k]
	if not by_id.has(profile["assistant"]):
		profile["assistant"] = cast[0]["id"]
	save_profile()

func save_profile() -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(profile, "\t"))

func hero(id: String) -> Dictionary:
	return by_id.get(id, cast[0])

func assistant() -> Dictionary:
	return hero(profile["assistant"])

func set_assistant(id: String) -> void:
	profile["assistant"] = id
	save_profile()

func cleared_count() -> int:
	return (profile["cleared"] as Array).size()

func is_cleared(index: int) -> bool:
	for v in profile["cleared"]:
		if int(v) == index:
			return true
	return false

func mark_cleared(index: int) -> void:
	if not is_cleared(index):
		(profile["cleared"] as Array).append(index)
		save_profile()

## 自走棋进度（金币、等级、棋子、强化），整个战役共用一局
func ac_state() -> ACState:
	if _ac == null:
		_ac = ACState.from_dict(profile.get("ac", {}))
	return _ac

func save_ac() -> void:
	if _ac != null:
		profile["ac"] = _ac.to_dict()
	save_profile()

## 下一个可挑战的关卡（全部通关时返回最后一关）
func next_stage() -> int:
	for i in stages.size():
		if not is_cleared(i):
			return i
	return stages.size() - 1

func portrait(id: String) -> Texture2D:
	return _tex("res://assets/portraits/%s.png" % hero(id)["asset"])

func avatar(id: String) -> Texture2D:
	return _tex("res://assets/portraits/%s-avatar.png" % hero(id)["asset"])

func _tex(path: String) -> Texture2D:
	if not _textures.has(path):
		_textures[path] = load(path)
	return _textures[path]

func tone(id: String) -> Color:
	return Color(hero(id)["tone"])
