// Herbes — a fringe of pixel grass along the bottom of the screen, swaying in the wind.
// The rest of the page stays empty. Pointer: parts the blades like a hand through grass.

const SPACING = 3.0;             // one blade root every SPACING cells
const LENGTH = vec2f(8.0, 36.0); // min / max blade length, in cells
const SEGMENTS = 5;              // each blade is a bent polyline
const REACH = 36.0;              // widest sideways travel of a bent blade, in cells
const PART_RADIUS = 28.0;        // pointer reach, in cells
const OPACITY = 0.35;            // page tone
const GRASS_INK = 0.6;           // blades only fill the bottom fringe: drawn stronger than the page

fn segmentDistance(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let ab = b - a;
  let t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  return length(p - a - ab * t);
}

// Ink (0..1) of the blade rooted at `root` (x, in cells) at `px`.
fn blade(px: vec2f, root: f32) -> f32 {
  let k = vec2f(root, 3.7);
  let len = mix(LENGTH.x, LENGTH.y, hash(k) * hash(k + 1.3)); // mostly short, a few tall
  let tone = mix(0.55, 1.0, hash(k + 2.1));

  // Bend at the tip, in radians: resting lean, wind sway, gusts, and the pointer parting.
  var bend = 0.35 * (hash(k + 4.4) - 0.5);
  bend += 0.25 * sin(u.time * 1.3 + root * 0.07) + 0.3 * (noise(vec2f(root * 0.02 - u.time * 0.4, 0.0)) - 0.5);
  let dx = root - u.mouse.x;
  let closeness = exp(-(dx * dx) / (PART_RADIUS * PART_RADIUS)) * (1.0 - smoothstep(len, len + 24.0, u.mouse.y));
  bend += 1.2 * u.amount * closeness * sign(dx);

  var a = vec2f(root + 0.5, 0.0);
  var ink = 0.0;
  for (var i = 1; i <= SEGMENTS; i++) {
    let f = f32(i) / f32(SEGMENTS);
    let angle = bend * pow(f, 1.5);
    let b = a + vec2f(sin(angle), cos(angle)) * (len / f32(SEGMENTS));
    let width = mix(1.3, 0.5, f); // tapers to the tip
    if (segmentDistance(px, a, b) < width) {
      ink = tone;
    }
    a = b;
  }
  return ink;
}

fn field(px: vec2f, uv: vec2f) -> f32 {
  var lum = veil(px, mix(backdrop(px), 0.95, 0.4), OPACITY);
  if (px.y > LENGTH.y + 2.0) {
    return lum; // above the grass
  }
  var ink = 0.0;
  let first = floor((px.x - REACH) / SPACING);
  let last = floor((px.x + REACH) / SPACING);
  for (var r = first; r <= last; r += 1.0) {
    ink = max(ink, blade(px, r * SPACING));
  }
  return mix(lum, 0.1, ink * GRASS_INK);
}
