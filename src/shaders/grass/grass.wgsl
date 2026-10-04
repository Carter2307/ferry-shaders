// Grass: a fringe of pixel grass along the bottom of the page, swaying in the wind. The rest of
// the page stays empty. Every length is in cells.
// Pointer: parts the blades like a hand through grass.
// Params: u.spacing (cells between two blades), u.height (length of the tallest blades), u.sway
// (how far the wind bends the blades), u.ink (how strongly the blades are drawn), u.partRadius
// (how far from the pointer the blades part).

const SHORTEST = 8.0;  // length of the shortest blades, in cells
const SEGMENTS = 5;    // each blade is a bent polyline
const MAX_BLADES = 96; // most blades searched for one cell, whatever the params ask for
// The original hashed the root of a blade, one every 3 cells. The hash is chaotic: the seed must
// be this same constant product, not `rank * u.spacing`, or the compiler rounds it another way and
// the blades change. A blade also keeps its look when the spacing changes.
const SEED_STEP = 3.0;
// The blades are drawn over the page, not through `veil`, so u.intensity does not reach them by
// itself. Under this intensity (the one of the original) they fade with it, and intensity 0 leaves
// the plain page. From it up they keep the ink of the original.
const FULL_INK = 0.35;

fn segmentDistance(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let ab = b - a;
  let t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  return length(p - a - ab * t);
}

// Ink (0..1) at `px` of the blade number `rank` (counted from the left edge), rooted at `root`
// (x, in cells).
fn blade(px: vec2f, rank: f32, root: f32) -> f32 {
  let k = vec2f(rank * SEED_STEP, 3.7);
  let len = mix(SHORTEST, u.height, hash(k) * hash(k + 1.3)); // mostly short, a few tall
  let tone = mix(0.55, 1.0, hash(k + 2.1));

  // Bend at the tip, in radians: resting lean, wind sway, gusts, and the pointer parting.
  // The gusts keep the proportion of the original (0.25 of sway, 0.3 of gusts).
  var bend = 0.35 * (hash(k + 4.4) - 0.5);
  bend += u.sway * sin(u.time * 1.3 + root * 0.07) + 1.2 * u.sway * (noise(vec2f(root * 0.02 - u.time * 0.4, 0.0)) - 0.5);
  let dx = root - u.mouse.x;
  // Never a zero radius: it would divide by zero right under the pointer.
  let radius = max(u.partRadius, 1.0);
  let closeness = exp(-(dx * dx) / (radius * radius)) * (1.0 - smoothstep(len, len + 24.0, u.mouse.y));
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
  let lum = veil(px, mix(backdrop(px), 0.95, 0.4), u.intensity);
  let tallest = max(u.height, SHORTEST);
  if (px.y > tallest + 2.0) {
    return lum; // above the grass
  }
  // The blades that can touch this cell. A blade lying flat travels its whole length sideways,
  // and it is up to 1.3 cells thick: this range covers every length and every bend.
  let reach = tallest + 2.0;
  let spacing = max(u.spacing, 1.0);
  let first = floor((px.x - reach) / spacing);
  let last = floor((px.x + reach) / spacing);
  let count = min(i32(last - first) + 1, MAX_BLADES);
  var ink = 0.0;
  for (var i = 0; i < count; i++) {
    let rank = first + f32(i);
    ink = max(ink, blade(px, rank, rank * spacing));
  }
  return mix(lum, 0.1, ink * u.ink * smoothstep(0.0, FULL_INK, u.intensity));
}
