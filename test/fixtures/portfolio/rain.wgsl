// Averse — 3×3 pixel bricks rain down on a white page and shatter into
// shards when they hit the bottom of the viewport.
// Stateless: every brick follows a looping timeline (fall, impact, shards)
// derived from time and per-drop hashes. Two parallax layers, three drops per lane.
// Pointer: acts as an umbrella, bricks falling onto it break on it.
// Registered with WHITE_BACKGROUND = true, so a luminance of 1 is pure white.
// Readability: behind the content column (u.focus) the rain fades to a faint
// ghost, so text stays legible and the motion doesn't pull the reader's eye.

const GRAVITY = 60.0;        // cells / s²
const DRAG = 2.2;            // air drag, 1 / s: shards burst out then slow down
const SHARD_COUNT = 10;
const SHARD_SPEED = vec2f(30.0, 80.0); // min / max launch speed, cells / s (front layer)
const SHARD_LIFE = 1.2;      // seconds
const DUST_LIFE = 0.15;      // seconds
const DROPS_PER_LANE = 3;
const LANE_REACH = 2;        // neighbouring lanes checked on each side (shards travel far)
const UMBRELLA = 10.0;       // pointer half-width, in cells
const OPACITY = 0.35;        // how strongly the rain is drawn over the white page
const CALM_LEVEL = 0.2;      // share of that strength kept behind the content column
const CALM_EDGE = 10.0;      // soft edge of the calm zone, in cells

// Darkness (0..1) that one drop contributes at `px`.
fn brickDrop(px: vec2f, lane: f32, slot: f32, layer: f32, laneWidth: f32, size: f32, speed: f32) -> f32 {
  let seed = vec2f(lane * 1.618, slot * 17.0 + layer * 131.0);
  let startY = u.resolution.y + size;
  let fullFall = startY / speed;
  let period = fullFall + SHARD_LIFE + 0.2 + 1.0 * hash(seed + 3.1);
  let clock = u.time + period * hash(seed + 7.7);
  let k = floor(clock / period); // which drop of this lane and slot
  let tau = clock - k * period;  // seconds since this drop appeared
  let r = seed + vec2f(k * 1.37, k * 0.71);

  let x = lane * laneWidth + 1.0 + (laneWidth - size - 2.0) * hash(r + 1.3);
  // Bricks break on the bottom edge of the viewport, or on the pointer when it is in the way.
  var hitY = 0.0;
  if (u.amount > 0.5 && u.mouse.x > x - UMBRELLA && u.mouse.x < x + size + UMBRELLA) {
    hitY = u.mouse.y + 1.0;
  }
  let fallTime = (startY - hitY) / speed;

  if (tau < fallTime) {
    let rel = px - vec2f(x, startY - speed * tau);
    // The brick itself: a square with a lighter top row.
    if (rel.x >= 0.0 && rel.x < size && rel.y >= 0.0 && rel.y < size) {
      return select(1.0, 0.75, rel.y >= size - 1.0);
    }
    // Speed trail above it, as wide as the brick, fading upward.
    let streak = size * 3.0;
    if (rel.x >= 0.0 && rel.x < size && rel.y >= size && rel.y < size + streak) {
      return 0.55 * (1.0 - (rel.y - size) / streak);
    }
    return 0.0;
  }

  let s = tau - fallTime; // seconds since impact
  if (s > SHARD_LIFE) {
    return 0.0;
  }
  let center = vec2f(x + size * 0.5, hitY);
  var dark = 0.0;

  // Dust: a flat line spreading out along the impact surface.
  if (s < DUST_LIFE && abs(px.y - hitY - 0.5) < 1.0 && abs(px.x - center.x) < size * 0.5 + s * 60.0) {
    dark = 0.6 * (1.0 - s / DUST_LIFE);
  }

  // Shards: small squares burst out in every direction, slowed by drag and
  // pulled down by gravity. Scaled with the lane so distant shards are
  // smaller, slower and stay within LANE_REACH lanes.
  let scale = laneWidth / 24.0;
  let reach = SHARD_SPEED.y * scale / DRAG + 3.0; // furthest horizontal travel
  if (abs(px.x - center.x) > reach) {
    return dark; // too far from this impact: skip the shard loop
  }
  let travel = (1.0 - exp(-DRAG * s)) / DRAG; // distance factor under drag
  let life = 1.0 - smoothstep(0.5, 1.0, s / SHARD_LIFE);
  for (var i = 0; i < SHARD_COUNT; i++) {
    let h = r + vec2f(f32(i) * 3.3, 11.0);
    let angle = 6.2831853 * hash(h);
    let launch = scale * mix(SHARD_SPEED.x, SHARD_SPEED.y, hash(h + 0.5));
    let p = floor(center + launch * travel * vec2f(cos(angle), sin(angle)) - vec2f(0.0, 0.5 * GRAVITY * scale * s * s));
    let side = select(1.0, 2.0, layer > 0.5 && hash(h + 0.9) > 0.6); // 1–2 cells in front, 1 behind
    let d = px - p;
    if (d.x >= 0.0 && d.x < side && d.y >= 0.0 && d.y < side) {
      dark = max(dark, life);
    }
  }
  return dark;
}

// One parallax layer: checks this lane and its neighbours, since shards cross lanes.
fn rainLayer(px: vec2f, layer: f32, laneWidth: f32, size: f32, speed: f32) -> f32 {
  let lane = floor(px.x / laneWidth);
  var dark = 0.0;
  for (var dl = -LANE_REACH; dl <= LANE_REACH; dl++) {
    for (var slot = 0; slot < DROPS_PER_LANE; slot++) {
      dark = max(dark, brickDrop(px, lane + f32(dl), f32(slot), layer, laneWidth, size, speed));
    }
  }
  return dark;
}

// 1 outside the content column, CALM_LEVEL inside it, with a soft edge.
fn calm(x: f32) -> f32 {
  if (u.focus.y <= u.focus.x) {
    return 1.0; // no column to protect
  }
  let inside = min(x - u.focus.x, u.focus.y - x); // > 0 within the column
  return mix(1.0, CALM_LEVEL, smoothstep(-CALM_EDGE, CALM_EDGE, inside));
}

fn field(px: vec2f, uv: vec2f) -> f32 {
  let backLayer = rainLayer(px, 0.0, 12.0, 3.0, 50.0);
  let frontLayer = rainLayer(px, 1.0, 24.0, 3.0, 90.0);

  var lum = 1.0;                    // plain white page
  lum = mix(lum, 0.45, backLayer);  // distant bricks: mid tone
  lum = mix(lum, 0.0, frontLayer);  // near bricks: darkest tone
  // Fade toward white (not `veil`, which fades toward the beige page).
  return mix(1.0, lum, OPACITY * calm(px.x));
}
