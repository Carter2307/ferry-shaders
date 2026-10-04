// Aurora: soft curtains hanging at different heights, densest along their lower edge and
// streaked with fine vertical rays, waving slowly.
// Pointer: the curtains swell and shiver near it.
// Params: u.curtains (how many curtains, 1 to 3), u.rays (rays along a curtain), u.rayContrast
// (how faint the gaps between the rays are), u.fade (how fast a curtain fades upward), u.sway (how
// far the lower edges wave), u.swell (how much denser the curtains get near the pointer).

// Density (0..1) of one curtain whose lower edge rests around height `base` (uv units).
fn curtain(uv: vec2f, base: f32, speed: f32, seed: f32) -> f32 {
  let t = u.time * speed;
  let m = pointer();
  let dx = uv.x - m.x;
  let closeness = u.amount * exp(-dx * dx * 20.0);

  // Two sines and a slow noise. The second and the third keep the proportions of the original
  // (0.08, 0.05, 0.06), so one param scales the whole wave.
  var edge = base
    + u.sway * sin(uv.x * 2.3 + t + seed)
    + 0.625 * u.sway * sin(uv.x * 5.1 - t * 1.3 + seed * 2.0)
    + 0.75 * u.sway * (fbm(vec2f(uv.x * 1.5 + seed, t * 0.3)) - 0.5);
  edge += closeness * 0.03 * sin(u.time * 4.0 + uv.x * 30.0); // shiver

  let h = uv.y - edge; // height above the lower edge
  let body = exp(-max(h, 0.0) * u.fade) * smoothstep(-0.015, 0.0, h);
  // Fine vertical rays: sharp, uneven striations that slide slowly along the curtain.
  let streak = smoothstep(0.3, 0.75, noise(vec2f(uv.x * u.rays + seed * 10.0 - t * 2.0, t * 0.5)));
  let rays = (1.0 - u.rayContrast) + u.rayContrast * streak;
  let swell = 1.0 + u.swell * closeness * exp(-h * h * 30.0);
  return clamp(body * rays * swell, 0.0, 1.0);
}

fn field(px: vec2f, uv: vec2f) -> f32 {
  // The lowest curtain is always there; u.curtains adds the middle one, then the highest.
  let low = curtain(uv, 0.3, 0.10, 1.3);
  let mid = step(1.5, u.curtains) * curtain(uv, 0.52, 0.07, 4.1);
  let high = step(2.5, u.curtains) * curtain(uv, 0.74, 0.05, 7.7);
  let glow = max(low, max(0.8 * mid, 0.6 * high));

  var lum = mix(backdrop(px), 0.95, 0.45);
  lum = mix(lum, 0.05, glow);
  return veil(px, lum, u.intensity);
}
