class_name ACRng
extends RefCounted
## mulberry32 伪随机数，与网页版 makeRng 逐位一致（同一种子得到同样的序列）。

const MASK := 0xFFFFFFFF
var a: int

func _init(seed: int = -1) -> void:
	if seed < 0:
		seed = randi() & 0x7FFFFFFF
	a = seed & MASK

static func imul(x: int, y: int) -> int:
	var xl := x & 0xFFFF
	var xh := (x >> 16) & 0xFFFF
	var yl := y & 0xFFFF
	var yh := (y >> 16) & 0xFFFF
	return ((((xh * yl + xl * yh) & 0xFFFF) << 16) + xl * yl) & MASK

func next() -> float:
	a = (a + 0x6D2B79F5) & MASK
	var t := imul(a ^ (a >> 15), 1 | a)
	t = ((t + imul(t ^ (t >> 7), 61 | t)) & MASK) ^ t
	return float((t ^ (t >> 14)) & MASK) / 4294967296.0

func range_int(lo: int, hi: int) -> int:
	return lo + int(floor(next() * (hi - lo + 1)))
