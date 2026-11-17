class_name ACSim
extends RefCounted
## 平衡模拟：简单机器人打完整个战役，统计每关首战胜率。与网页版 simulateCampaign 相同算法与种子。
## 运行：godot --headless --path godot -- --ac-sim

## 保留 10 金币吃利息，优先买已有的和高费棋子，金币多时升级。
static func bot_shop(s: ACState, stage_idx: int) -> void:
	for guard in 40:
		var best := -1
		var best_score := -1.0
		for i in 5:
			var id: String = s.shop[i]
			if id == "" or not s.can_buy(i):
				continue
			var score := ACData.cost(id) + s.count_copies(id, 1) * 2.5 + s.count_copies(id, 2) * 3.0
			if score > best_score:
				best_score = score
				best = i
		var reserve := 10 if stage_idx >= 2 else 0
		if best >= 0 and (s.gold - ACData.cost(s.shop[best]) >= reserve or best_score >= 3.5):
			s.buy(best)
			continue
		if s.gold >= reserve + 8 and s.level < ACData.MAX_LEVEL and s.board_count() >= s.board_cap():
			s.buy_xp()
			continue
		if s.gold >= 30:
			s.reroll()
			continue
		break
	var free := 0
	for u in s.bench:
		if u == null:
			free += 1
	if free < 2:
		for u in s.bench:
			if u != null and int(u["star"]) == 1 and s.count_copies(u["id"], 1) == 1:
				s.sell(u)
				break
	s.auto_place_from_bench()
	var power := func(u: Dictionary) -> float: return ACData.cost(u["id"]) * ACData.star_mult(int(u["star"]))
	for u in s.bench.duplicate():
		if u == null:
			continue
		var weakest = null
		var low := 999.0
		for b in s.board_units():
			var pw: float = power.call(b["unit"])
			if pw < low:
				low = pw
				weakest = b
		if weakest != null and power.call(u) > low + 0.5:
			s.move(u, ACState.board_loc(weakest["x"], weakest["y"]))

static func simulate_fight(state: ACState, encounter: Dictionary, rng: ACRng = null) -> Dictionary:
	var b := ACBattle.new()
	if rng != null:
		b.rng = rng
	var result := {}
	b.on(func(type: String, d: Dictionary):
		if type == "finish":
			result.merge(d))
	b.start(state, encounter)
	var t := 0.0
	while result.is_empty() and t < 200.0:
		b.step(1.0 / 30.0)
		t += 1.0 / 30.0
	if result.is_empty():
		result = {"won": false, "surviving": b.enemies_left(), "time": 200.0}
	b.listeners.clear()
	b.clear()
	return result

static func simulate_campaign(games: int = 20, seed0: int = 1000) -> Array:
	var encs := ACData.encounters()
	var stats := []
	for i in encs.size():
		stats.append({"plays": 0, "firstWins": 0, "attempts": 0, "level": 0, "gold": 0})
	for g in games:
		var s := ACState.new(seed0 + g)
		var rng := ACRng.new(seed0 * 7 + g)
		for i in encs.size():
			s.grant_stage(i)
			if ACData.augment_stages().has(float(i)) or ACData.augment_stages().has(i):
				s.take_augment(s.offer_augments()[0])
			var st: Dictionary = stats[i]
			st["plays"] += 1
			for attempt in 30:
				bot_shop(s, i)
				if attempt == 0:
					st["level"] += s.level
					st["gold"] += s.gold
				var r := simulate_fight(s, encs[i], rng)
				s.apply_result(r["won"], int(r["surviving"]), encs[i].get("boss", false) == true)
				st["attempts"] += 1
				if r["won"]:
					if attempt == 0:
						st["firstWins"] += 1
					break
	var out := []
	for i in stats.size():
		var st: Dictionary = stats[i]
		out.append({"stage": i + 1, "firstWin": int(round(100.0 * st["firstWins"] / st["plays"])), "avgAttempts": snappedf(float(st["attempts"]) / st["plays"], 0.01),
			"avgLevel": snappedf(float(st["level"]) / st["plays"], 0.1), "avgGold": int(round(float(st["gold"]) / st["plays"]))})
	return out
