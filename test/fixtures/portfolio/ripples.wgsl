// Ondes — interference of three wandering wave sources.
// Pointer: becomes a fourth, faster source.

const OPACITY = 0.35; // how strongly the waves are drawn over the page

fn wave(uv: vec2f, origin: vec2f, frequency: f32, speed: f32) -> f32 {
  let d = distance(uv, origin);
  return sin(d * frequency - u.time * speed) / (1.0 + 2.0 * d);
}

fn field(px: vec2f, uv: vec2f) -> f32 {
  let aspect = u.resolution.x / u.resolution.y;
  let t = u.time * 0.12;

  // A little noise keeps the rings from looking machined.
  let p = uv + 0.025 * vec2f(noise(uv * 3.0 + t), noise(uv * 3.0 - t + 4.1));

  let a = vec2f(aspect * (0.22 + 0.10 * sin(t * 1.3)), 0.78 + 0.10 * cos(t));
  let b = vec2f(aspect * (0.82 + 0.08 * cos(t * 0.9)), 0.32 + 0.12 * sin(t * 1.1));
  let c = vec2f(aspect * (0.55 + 0.15 * sin(t * 0.7 + 2.0)), 0.08 + 0.08 * cos(t * 1.7));

  var w = wave(p, a, 26.0, 1.1) + wave(p, b, 22.0, 0.9) + wave(p, c, 30.0, 1.3);
  w += 1.4 * u.amount * wave(p, pointer(), 34.0, 2.4);

  return veil(px, mix(backdrop(px), 0.5 + 0.3 * w, 0.6), OPACITY);
}
