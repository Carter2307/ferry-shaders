// Shared by every dither shader. Each shader appends one function:
//   fn field(px: vec2f, uv: vec2f) -> f32
// returning a luminance in 0..1, which is then quantised to `u.tones` tones with an
// 8x8 Bayer matrix and mapped to the palette (`u.color`, `u.midColor`, `u.background`).
// Rendered at one fragment per grid cell, then upscaled with `image-rendering: pixelated`.
// The `Uniforms` struct, the binding `u` and the vertex stage are generated in front of this file.

@fragment
fn fs_main(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  // WebGPU's framebuffer origin is top-left: flip y so the maths use a bottom-left origin.
  let px = vec2f(frag.x, u.resolution.y - frag.y);
  let uv = px / u.resolution.y;
  let lum = clamp(field(px, uv), 0.0, 1.0);
  return dither(lum, px);
}

// --- Helpers available to every dither shader ----------------------------

/** Diagonal light-to-dark gradient, brighter toward the top. */
fn backdrop(px: vec2f) -> f32 {
  return 0.55 * (px.y / u.resolution.y) + 0.25 * (px.x / u.resolution.x) + 0.2;
}

/** Draws `lum` over a light page at `opacity` (0 = plain page, 1 = full strength). */
fn veil(px: vec2f, lum: f32, opacity: f32) -> f32 {
  return mix(mix(backdrop(px), 1.0, 0.5), lum, opacity);
}

/** Pointer position in `uv` space (height-normalised). */
fn pointer() -> vec2f {
  return u.mouse / u.resolution.y;
}

fn hash(q: vec2f) -> f32 {
  var p = fract(q * vec2f(123.34, 456.21));
  p = p + dot(p, p + 45.32);
  return fract(p.x * p.y);
}

fn hash2(q: vec2f) -> vec2f {
  return vec2f(hash(q), hash(q + vec2f(19.19, 7.31)));
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let w = f * f * (3.0 - 2.0 * f);
  let a = hash(i);
  let b = hash(i + vec2f(1.0, 0.0));
  let c = hash(i + vec2f(0.0, 1.0));
  let d = hash(i + vec2f(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

fn fbm(q: vec2f) -> f32 {
  var p = q;
  var v = 0.0;
  var a = 0.5;
  for (var i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2f(11.7, 5.3);
    a *= 0.5;
  }
  return v;
}

fn bayer2(q: vec2f) -> f32 {
  let a = floor(q);
  return fract(a.x * 0.5 + a.y * a.y * 0.75);
}

fn bayer4(a: vec2f) -> f32 { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
fn bayer8(a: vec2f) -> f32 { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

/** A uniform color (straight alpha) as a premultiplied color. */
fn premultiplied(color: vec4f) -> vec4f {
  return vec4f(color.rgb * color.a, color.a);
}

/** Ordered dithering down to `u.tones` levels, then palette lookup. Returns a premultiplied color. */
fn dither(lum: f32, px: vec2f) -> vec4f {
  // At least two tones: one step between the darkest and the lightest.
  let steps = max(round(u.tones), 2.0) - 1.0;
  let levels = lum * steps;
  let threshold = bayer8(px) + 0.5 / 64.0;
  let k = clamp(floor(levels) + step(threshold, fract(levels)), 0.0, steps) / steps;
  // The tones are mixed premultiplied, so a transparent background fades the others out
  // instead of darkening them.
  let dark = premultiplied(u.color);
  let mid = premultiplied(u.midColor);
  let light = premultiplied(u.background);
  return mix(mix(dark, mid, smoothstep(0.0, 0.5, k)), light, smoothstep(0.5, 1.0, k));
}
