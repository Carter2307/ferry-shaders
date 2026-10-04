// Dunes — wind ripples on sand: meandering crests with a thin dark line and a
// shaded lee side, over broad dunes of light and shade. The bends drift with the wind.
// Pointer: a gust that bends the ripples around it.

const RIPPLES = 22.0;  // crests per screen height
const CREST = 0.76;    // where the crest sits in each ripple (0..1): long lit slope, short lee
const OPACITY = 0.35;  // how strongly the sand is drawn over the page

fn field(px: vec2f, uv: vec2f) -> f32 {
  let t = u.time * 0.08;
  let d = distance(uv, pointer());
  let gust = u.amount * exp(-d * d * 12.0);

  // Crests: mostly horizontal, meandering; the meanders travel with the wind.
  let meander = 0.9 * fbm(vec2f(uv.x * 1.3 - t, uv.y * 0.6)) + 0.25 * sin(uv.x * 5.0 - t * 3.0 + uv.y * 2.0);
  let phase = uv.y * RIPPLES + meander * 4.0 + gust * 3.0 * sin(u.time * 2.0 + d * 20.0);
  let s = fract(phase);

  // Shaded lee just past the crest, and a one-cell crest line of constant width.
  let lee = smoothstep(CREST, CREST + 0.04, s) * (1.0 - smoothstep(0.94, 1.0, s));
  let crest = 1.0 - smoothstep(0.0, 1.2 * fwidth(phase), abs(s - CREST));

  // Broad dunes: slow light and shade across the screen.
  let dune = fbm(uv * vec2f(0.8, 1.6) + vec2f(-t * 0.3, 0.0));

  var lum = mix(backdrop(px), 0.9, 0.4) + 0.25 * (dune - 0.5);
  lum = mix(lum, 0.45, 0.6 * lee);
  lum = mix(lum, 0.2, crest);
  return veil(px, lum, OPACITY);
}
