// Drift: domain-warped fbm noise drifting slowly.
// Pointer: a decaying radial wave bends the noise, plus a soft glow.
// Params: u.scale (size of the noise), u.warp (strength of the domain warp), u.glow (pointer glow).

fn field(px: vec2f, uv: vec2f) -> f32 {
  let t = u.time * 0.05;
  let d = distance(uv, pointer());

  var p = uv * u.scale;
  let bump = u.amount * exp(-d * 3.2);
  let ph = d * 10.0 - u.time * 1.4;
  p += 0.28 * bump * vec2f(sin(ph), cos(ph));

  // Two levels of domain warping.
  let q = vec2f(fbm(p + vec2f(0.0, t)), fbm(p + vec2f(5.2, 1.3) - t));
  let r = vec2f(
    fbm(p + u.warp * q + vec2f(1.7, 9.2) + t * 0.8),
    fbm(p + u.warp * q + vec2f(8.3, 2.8) - t * 0.6),
  );
  let v = smoothstep(0.28, 0.72, fbm(p + u.warp * r));

  let noiseLum = mix(backdrop(px), v, 0.55);
  return veil(px, noiseLum, u.intensity) + u.glow * u.amount * exp(-d * d * 14.0);
}
