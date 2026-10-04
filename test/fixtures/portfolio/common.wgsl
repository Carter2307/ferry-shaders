// Shared by every background shader. Each variant appends one function:
//   fn field(px: vec2f, uv: vec2f) -> f32
// returning a luminance in 0..1, which is then quantised to 5 tones with an
// 8x8 Bayer matrix and mapped to the site palette.
// Rendered at one fragment per grid cell, then upscaled with `image-rendering: pixelated`.

struct Uniforms {
  resolution: vec2f, // grid size, in cells
  mouse: vec2f,      // pointer position, in cells, origin bottom-left
  time: f32,
  amount: f32,       // pointer influence, 0..1
  focus: vec2f,      // readable column [left, right], in cells; left >= right means none
}

@group(0) @binding(0) var<uniform> u: Uniforms;

// Palette, from darkest to lightest (matches the page gradient).
const DUNE = vec3f(0.851, 0.769, 0.639);
const SAND = vec3f(0.935, 0.878, 0.796);
const PAPER = vec3f(0.984, 0.969, 0.941);

// Set per variant at pipeline creation (see `constants` in shaders/index.ts):
// swaps the lightest tone for pure white.
override WHITE_BACKGROUND: bool = false;

@vertex
fn vs_main(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  // One oversized triangle covers the whole viewport.
  var positions = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(positions[index], 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  // WebGPU's framebuffer origin is top-left: flip y so the maths use a bottom-left origin.
  let px = vec2f(frag.x, u.resolution.y - frag.y);
  let uv = px / u.resolution.y;
  let lum = clamp(field(px, uv), 0.0, 1.0);
  return vec4f(dither(lum, px), 1.0);
}

// --- Helpers available to every variant ---------------------------------

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

/** Ordered dithering down to 5 levels, then palette lookup. */
fn dither(lum: f32, px: vec2f) -> vec3f {
  let levels = lum * 4.0;
  let threshold = bayer8(px) + 0.5 / 64.0;
  let k = clamp(floor(levels) + step(threshold, fract(levels)), 0.0, 4.0) / 4.0;
  let light = select(PAPER, vec3f(1.0), WHITE_BACKGROUND);
  return mix(mix(DUNE, SAND, smoothstep(0.0, 0.5, k)), light, smoothstep(0.5, 1.0, k));
}
