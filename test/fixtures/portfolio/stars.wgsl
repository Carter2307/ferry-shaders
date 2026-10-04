// Constellations — sparse pixel stars that twinkle, on two drifting parallax layers.
// Pointer: links neighbouring stars around it with thin lines, like a printed star chart.

const NEAR_GRID = 18.0;              // one star slot per square of this size, in cells
const FAR_GRID = 9.0;
const NEAR_DENSITY = 0.55;           // share of slots holding a star
const FAR_DENSITY = 0.35;
const NEAR_DRIFT = vec2f(1.5, 0.4);  // cells / s
const FAR_DRIFT = vec2f(0.6, 0.15);
const LINK_RADIUS = 56.0;            // stars get linked within this distance of the pointer, in cells
const LINK_LENGTH = 1.5;             // longest link, in near-grid squares
const LINK_SHARE = 0.8;              // share of eligible pairs actually linked
const OPACITY = 0.35;                // how strongly the page tone is drawn
const STAR_INK = 0.85;               // stars and links cover few pixels: drawn stronger than the page

// xy: star centre (layer space, cells), z: brightness 0..1 (0 = no star), w: 1 for a big star.
fn star(slot: vec2f, grid: f32, density: f32, seed: f32) -> vec4f {
  let k = slot + seed;
  if (hash(k + 5.3) > density) {
    return vec4f(0.0);
  }
  let pos = floor((slot + 0.2 + 0.6 * hash2(k)) * grid) + 0.5; // snapped to a cell centre
  let twinkle = 0.6 + 0.4 * sin(u.time * mix(0.7, 2.4, hash(k + 9.1)) + 6.2831 * hash(k + 2.7));
  return vec4f(pos, twinkle, select(0.0, 1.0, hash(k + 7.7) > 0.78));
}

// Ink (0..1) of star `s` at `p`: a dot, a plus for big stars, a longer sparkle at their peak.
fn starInk(p: vec2f, s: vec4f) -> f32 {
  if (s.z <= 0.0) {
    return 0.0;
  }
  let d = abs(floor(p) - floor(s.xy));
  let arm = d.x + d.y;
  let onAxis = min(d.x, d.y) < 0.5;
  if (arm < 0.5) {
    return s.z;
  }
  if (s.w > 0.5 && onAxis && arm < 1.5) {
    return 0.8 * s.z;
  }
  if (s.w > 0.5 && onAxis && arm < 2.5 && s.z > 0.93) {
    return 0.6;
  }
  return 0.0;
}

fn segmentDistance(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let ab = b - a;
  let t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  return length(p - a - ab * t);
}

// x: star ink, y: link ink.
fn nearSky(px: vec2f) -> vec2f {
  let offset = u.time * NEAR_DRIFT;
  let p = px + offset;
  let slot = floor(p / NEAR_GRID);

  // This slot and its 8 neighbours: links only join adjacent slots, so every
  // fragment on a link sees both of its stars.
  var stars: array<vec4f, 9>;
  for (var i = 0; i < 9; i++) {
    stars[i] = star(slot + vec2f(f32(i % 3 - 1), f32(i / 3 - 1)), NEAR_GRID, NEAR_DENSITY, 0.0);
  }
  let ink = starInk(p, stars[4]);

  var link = 0.0;
  let mouse = u.mouse + offset;
  if (u.amount > 0.01 && distance(p, mouse) < LINK_RADIUS + NEAR_GRID * LINK_LENGTH) {
    for (var i = 0; i < 9; i++) {
      for (var j = i + 1; j < 9; j++) {
        let a = stars[i];
        let b = stars[j];
        let apart = abs(vec2f(f32(i % 3 - j % 3), f32(i / 3 - j / 3)));
        if (a.z <= 0.0 || b.z <= 0.0 || max(apart.x, apart.y) > 1.0) {
          continue;
        }
        // Same pair, same verdict from every fragment: the hash is symmetric.
        if (distance(a.xy, b.xy) > NEAR_GRID * LINK_LENGTH || hash(a.xy + b.xy) > LINK_SHARE) {
          continue;
        }
        let w = u.amount * (1.0 - smoothstep(LINK_RADIUS * 0.5, LINK_RADIUS, distance(0.5 * (a.xy + b.xy), mouse)));
        // A small gap around each star, like a printed chart.
        if (w > 0.0 && distance(p, a.xy) > 2.0 && distance(p, b.xy) > 2.0 && segmentDistance(p, a.xy, b.xy) < 0.6) {
          link = max(link, 0.7 * w);
        }
      }
    }
  }
  return vec2f(ink, link);
}

fn farSky(px: vec2f) -> f32 {
  let p = px + u.time * FAR_DRIFT;
  let s = star(floor(p / FAR_GRID), FAR_GRID, FAR_DENSITY, 31.0);
  return starInk(p, vec4f(s.xyz, 0.0)); // distant stars are always single dots
}

fn field(px: vec2f, uv: vec2f) -> f32 {
  let nearInk = nearSky(px);
  let farInk = farSky(px);

  var lum = veil(px, mix(backdrop(px), 0.95, 0.4), OPACITY); // the page
  lum = mix(lum, 0.45, farInk * STAR_INK);
  lum = mix(lum, 0.2, nearInk.y * STAR_INK); // links
  lum = mix(lum, 0.0, nearInk.x * STAR_INK); // near stars
  return lum;
}
