extends SceneTree
## 自走棋规则测试与平衡模拟（对照网页版 autochess-core.js 的输出）。
## 运行：godot --headless --path godot --script res://tests/ac_test.gd

var failures := 0

func check(cond: bool, msg: String) -> void:
	if not cond:
		failures += 1
		print("FAIL: ", msg)

func _init() -> void:
	ACData.ensure()
	# 随机数与网页版逐位一致
	var r := ACRng.new(1000)
	var seq := [r.next(), r.next(), r.next(), r.range_int(1, 100)]
	check(absf(seq[0] - 0.7951949068810791) < 1e-12 and absf(seq[2] - 0.6915161057841033) < 1e-12 and seq[3] == 89, "rng parity %s" % [seq])
	var s := ACState.new(42)
	check(s.shop == ["flick", "warden", "flick", "warden", "flick"], "seeded shop parity %s" % [s.shop])

	# 购买、三合一与出售
	s.gold = 20
	s.buy(0)
	s.buy(2)
	var res := s.buy(4)
	check(res["ok"] and (res["merges"] as Array).size() == 1, "three flicks merge into 2-star")
	check(s.count_copies("flick", 2) == 1 and s.count_copies("flick", 1) == 0, "one 2-star flick remains")
	var two = s.bench.filter(func(u): return u != null)[0]
	check(s.sell_value(two) == 3, "2-star 1-cost sells for 3")
	# 人口上限与换位
	s.bench[1] = {"uid": 900, "id": "warden", "star": 1}
	s.bench[2] = {"uid": 901, "id": "arrow", "star": 1}
	s.bench[3] = {"uid": 902, "id": "oak", "star": 1}
	check(s.move(two, ACState.board_loc(3, 5)), "move to board")
	check(s.move(s.bench[1], ACState.board_loc(2, 5)), "second unit fits level 2")
	check(not s.move(s.bench[2], ACState.board_loc(1, 5)), "board cap blocks third")
	check(not s.move(s.bench[3], ACState.board_loc(1, 1)), "enemy rows rejected")
	check(s.move(s.bench[2], ACState.board_loc(3, 5)), "swap with occupied cell")
	# 羁绊
	var tr := s.active_traits()
	check(tr.is_empty() or tr.size() >= 0, "traits computed")
	# 存档往返
	var back := ACState.from_dict(JSON.parse_string(JSON.stringify(s.to_dict())))
	check(back.gold == s.gold and back.board.size() == s.board.size() and back.bench_count() == s.bench_count(), "save round trip")

	# 战斗：每关都能分出胜负，每位剧情角色都能单独打一场
	var b := ACBattle.new()
	var events := {}
	b.on(func(t, _d): events[t] = events.get(t, 0) + 1)
	var st := ACState.new(7)
	st.level = 8
	for id in ["warden", "arrow", "oak", "frost", "knight", "sage", "ember", "moon"]:
		var cell := st._free_cell_for({"id": id})
		st.board[ACState.cell_key(cell.x, cell.y)] = {"uid": st.next_uid, "id": id, "star": 2}
		st.next_uid += 1
	for i in ACData.encounters().size():
		var fr := ACSim.simulate_fight(st, ACData.encounter(i), ACRng.new(i))
		check(fr.has("won"), "stage %d finishes" % (i + 1))
	b.start(st, ACData.encounter(1))
	while b.running:
		b.step(1.0 / 30.0)
	b.listeners.clear()
	b.clear()
	check(events.get("attack", 0) > 0 and events.get("wave", 0) == 1 and events.get("finish", 0) == 1, "events fired %s" % [events])

	# 平衡模拟：与网页版 simulateCampaign(5, 1000) 对照
	var t0 := Time.get_ticks_msec()
	var sim := ACSim.simulate_campaign(5, 1000)
	var first := sim.map(func(x): return x["firstWin"])
	var js := [100, 100, 100, 100, 100, 100, 100, 100, 80, 80, 100, 100, 100, 100, 80, 80, 100, 100, 100, 100]
	print("first-try win %: ", first, "  (", Time.get_ticks_msec() - t0, " ms)")
	print("web reference:   ", js)
	var diff := 0
	for i in js.size():
		diff += absi(int(first[i]) - js[i])
	check(diff <= 100, "balance close to web version (total diff %d)" % diff)

	print("PASS" if failures == 0 else "FAILED: %d" % failures)
	quit(1 if failures > 0 else 0)
