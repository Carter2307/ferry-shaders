// Aurores — three soft curtains hanging at different heights, densest along their
// lower edge and streaked with fine vertical rays, waving slowly.
// Pointer: the curtains swell and shiver near it.

const OPACITY = 0.35; // how strongly the curtains are drawn over the page

// Density (0..1) of one curtain whose lower edge rests around height `base` (uv units).
fn curtain(uv: vec2f, base: f32, speed: f32, seed: f32) -> f32 {
  let t = u.time * speed;
  let m = pointer();
  let dx = uv.x - m.x;
  let closeness = u.amount * exp(-dx * dx * 20.0);

  var edge = base
    + 0.08 * sin(uv.x * 2.3 + t + seed)
    + 0.05 * sin(uv.x * 5.1 - t * 1.3 + seed * 2.0)
    + 0.06 * (fbm(vec2f(uv.x * 1.5 + seed, t * 0.3)) - 0.5);
  edge += closeness * 0.03 * sin(u.time * 4.0 + uv.x * 30.0); // shiver

  let h = uv.y - edge; // height above the lower edge
  let body = exp(-max(h, 0.0) * 3.5) * smoothstep(-0.015, 0.0, h);
  // Fine vertical rays: sharp, uneven striations that slide slowly along the curtain.
  let rays = 0.25 + 0.75 * smoothstep(0.3, 0.75, noise(vec2f(uv.x * 55.0 + seed * 10.0 - t * 2.0, t * 0.5)));
  let swell = 1.0 + 0.8 * closeness * exp(-h * h * 30.0);
  return clamp(body * rays * swell, 0.0, 1.0);
}

fn field(px: vec2f, uv: vec2f) -> f32 {
  let low = curtain(uv, 0.3, 0.10, 1.3);
  let mid = curtain(uv, 0.52, 0.07, 4.1);
  let high = curtain(uv, 0.74, 0.05, 7.7);
  let glow = max(low, max(0.8 * mid, 0.6 * high));

  var lum = mix(backdrop(px), 0.95, 0.45);
  lum = mix(lum, 0.05, glow);
  return veil(px, lum, OPACITY);
}
