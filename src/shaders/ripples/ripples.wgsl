// Ripples: interference of three wandering wave sources.
// Pointer: becomes a fourth, faster source.
// Params: u.frequency (how tight the rings are), u.falloff (how fast a wave fades with distance),
// u.contrast (how far the rings go from light to dark), u.wobble (noise that bends the rings),
// u.pointerWave (strength of the rings of the pointer).

// Each source rings at its own pitch, so the rings never line up. The pitches are ratios of
// u.frequency, which is the pitch of the first source: 26, 22, 30 and 34 (pointer) in the original.
const PITCH_B = 22.0 / 26.0;
const PITCH_C = 30.0 / 26.0;
const PITCH_POINTER = 34.0 / 26.0;

fn wave(uv: vec2f, origin: vec2f, frequency: f32, speed: f32) -> f32 {
  let d = distance(uv, origin);
  // A negative falloff would put a zero under the division.
  return sin(d * frequency - u.time * speed) / (1.0 + max(u.falloff, 0.0) * d);
}

fn field(px: vec2f, uv: vec2f) -> f32 {
  let aspect = u.resolution.x / u.resolution.y;
  let t = u.time * 0.12;

  // A little noise keeps the rings from looking machined.
  let p = uv + u.wobble * vec2f(noise(uv * 3.0 + t), noise(uv * 3.0 - t + 4.1));

  let a = vec2f(aspect * (0.22 + 0.10 * sin(t * 1.3)), 0.78 + 0.10 * cos(t));
  let b = vec2f(aspect * (0.82 + 0.08 * cos(t * 0.9)), 0.32 + 0.12 * sin(t * 1.1));
  let c = vec2f(aspect * (0.55 + 0.15 * sin(t * 0.7 + 2.0)), 0.08 + 0.08 * cos(t * 1.7));

  var w = wave(p, a, u.frequency, 1.1) + wave(p, b, u.frequency * PITCH_B, 0.9) + wave(p, c, u.frequency * PITCH_C, 1.3);
  w += u.pointerWave * u.amount * wave(p, pointer(), u.frequency * PITCH_POINTER, 2.4);

  return veil(px, mix(backdrop(px), 0.5 + u.contrast * w, 0.6), u.intensity);
}
