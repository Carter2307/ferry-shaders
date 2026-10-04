struct Uniforms {
  resolution: vec2f, // size of the canvas, in device pixels
  time: f32,         // seconds
  cell: f32,         // side of a cell, in device pixels
  ink: vec4f,        // neutral pixel color (rgb) and its opacity (a)
  accent: vec4f,     // accent pixel color (rgb) and its opacity (a)
  options: vec4f,    // x: 0 = dense at the top, 1 = dense at the bottom; y: falloff (power of the fade)
}
@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex
fn vertex(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  // One triangle that covers the canvas.
  let corners = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(corners[index], 0.0, 1.0);
}

fn hash(p: vec2f) -> f32 {
  var q = fract(vec3f(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let s = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), s.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), s.x),
    s.y,
  );
}

fn fbm(p: vec2f) -> f32 {
  return 0.5 * noise(p) + 0.3 * noise(p * 2.03 + 11.7) + 0.2 * noise(p * 4.01 + 47.3);
}

@fragment
fn fragment(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let cell = floor(position.xy / u.cell);
  let inside = fract(position.xy / u.cell);
  let uv = (cell * u.cell) / u.resolution;
  // Distance from the edge the field starts from: 0 at that edge, 1 at the other one.
  let depth = mix(uv.y, 1.0 - uv.y - u.cell / u.resolution.y, u.options.x);

  // Soft shapes that drift: they bend the edge of the fade, so it is never a straight line.
  let drift = fbm(cell * 0.022 + vec2f(u.time * 0.010, -u.time * 0.016));
  let edge = depth * 1.2 + (drift - 0.5) * 0.7;
  let fade = 1.0 - smoothstep(0.0, 0.92, edge);
  // A little more on the right, where the page has less text.
  let side = mix(0.8, 1.0, smoothstep(0.1, 0.95, uv.x));
  // The power makes the field dense at its edge and thin where the text of the page is. A higher
  // power gives a short dense band and a long tail of scattered pixels.
  let density = pow(fade, u.options.y) * side;

  // Dither: each cell has its own threshold.
  let lit = step(hash(cell + 3.0), density);
  // The square of the cell, with a gap on two sides.
  let square = step(0.25, inside.x) * step(0.25, inside.y);
  // Each cell breathes at its own pace.
  let breath = 0.72 + 0.28 * sin(u.time * (0.5 + hash(cell + 7.0)) + hash(cell + 19.0) * 6.2832);

  // Patches of accent color inside the neutral field.
  let tint = smoothstep(0.52, 0.74, fbm(cell * 0.035 + vec2f(-u.time * 0.008, 31.0)));
  let color = mix(u.ink.rgb, u.accent.rgb, tint);
  let strength = mix(u.ink.a, u.accent.a, tint);

  let alpha = lit * square * breath * (0.4 + 0.6 * fade) * strength;
  return vec4f(color * alpha, alpha); // premultiplied
}
