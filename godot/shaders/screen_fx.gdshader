shader_type canvas_item;
// 全屏叠加：暗角、细扫描线与缓慢下移的亮带（终端屏幕质感）。

uniform float vignette : hint_range(0.0, 1.0) = 0.55;
uniform float line_alpha : hint_range(0.0, 0.2) = 0.035;
uniform float band_alpha : hint_range(0.0, 0.2) = 0.035;
uniform float band_speed = 0.06;

void fragment() {
	vec2 uv = UV;
	float d = length((uv - 0.5) * vec2(1.0, 0.82));
	float dark = smoothstep(0.38, 0.92, d) * vignette;
	float lines = step(0.5, fract(FRAGCOORD.y * 0.5)) * line_alpha;
	float band_pos = fract(TIME * band_speed);
	float band = smoothstep(0.09, 0.0, abs(uv.y - band_pos)) * band_alpha;
	float light = lines + band;
	float a = clamp(dark + light, 0.0, 1.0);
	vec3 col = a > 0.0 ? vec3(light / a) : vec3(0.0);
	COLOR = vec4(col, a);
}
