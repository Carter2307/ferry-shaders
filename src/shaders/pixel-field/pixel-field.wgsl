// Pixel field: the canvas is cut into small cells. A cell is lit when a density value is above the
// cell's own threshold, which gives a dithered gradient: dense pixels at one edge (the top or the
// bottom) that thin out to nothing. A slow noise bends the edge of the fade and moves it, and each
// cell breathes a little.
//
// This shader is not in the dither family: it has its own fs_main, and its hash, noise and fbm are
// not the ones of the dither prelude. Keep them: the picture of the original depends on them.

// Width of the soft border of an accent patch, in noise levels.
const PATCH_BORDER = 0.22;

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
fn fs_main(@builtin(position) position: vec4f) -> @location(0) vec4f {
  // `u.cell` is in CSS pixels and the canvas is in device pixels. A cell is never smaller than one
  // device pixel: below that, every pixel would be a cell of its own (and 0 would divide by zero).
  let size = max(u.cell * u.pixelRatio, 1.0);
  let cell = floor(position.xy / size);
  let inside = fract(position.xy / size);
  let uv = (cell * size) / u.resolution;
  // Distance from the edge the field starts from: 0 at that edge, 1 at the other one.
  // `u.origin` is the index of the option: 0 = top, 1 = bottom.
  let depth = mix(uv.y, 1.0 - uv.y - size / u.resolution.y, u.origin);

  // Soft shapes that drift: they bend the edge of the fade, so it is never a straight line.
  let drift = fbm(cell * 0.022 + vec2f(u.time * 0.010, -u.time * 0.016));
  let edge = depth * 1.2 + (drift - 0.5) * u.wander;
  let fade = 1.0 - smoothstep(0.0, 0.92, edge);
  // A little more on the right, where a page has less text.
  let side = mix(0.8, 1.0, smoothstep(0.1, 0.95, uv.x));
  // The power makes the field dense at its edge and thin where the text of the page is. A higher
  // power gives a short dense band and a long tail of scattered pixels.
  let density = pow(fade, u.falloff) * side;

  // Dither: each cell has its own threshold.
  let lit = step(hash(cell + 3.0), density);
  // The square of the cell, with a gap on two sides.
  let square = step(u.gap, inside.x) * step(u.gap, inside.y);
  // Each cell breathes at its own pace, between `1 - 2 * breathing` and 1.
  let pace = u.time * (0.5 + hash(cell + 7.0)) + hash(cell + 19.0) * 6.2832;
  let breath = (1.0 - u.breathing) + u.breathing * sin(pace);

  // Patches of accent color inside the neutral field. A patch starts where the noise is above
  // `1 - accentShare`: the fbm stays between 0 and 1, so 0 gives no patch and 1 gives only patches.
  let start = 1.0 - u.accentShare;
  let tint = smoothstep(start, start + PATCH_BORDER, fbm(cell * 0.035 + vec2f(-u.time * 0.008, 31.0)));
  let color = mix(u.color.rgb, u.accent.rgb, tint);
  // The alpha of each color multiplies its opacity, so a translucent color stays translucent.
  let strength = mix(u.color.a * u.opacity, u.accent.a * u.accentOpacity, tint);

  let alpha = lit * square * breath * (0.4 + 0.6 * fade) * strength;
  return vec4f(color * alpha, alpha); // premultiplied
}
