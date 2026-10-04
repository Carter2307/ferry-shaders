// Rain: pixel bricks fall on a white page and shatter into shards where they land.
// Stateless: every brick follows a looping timeline (fall, impact, shards) derived from the time
// and from hashes of its lane and slot. Two parallax layers.
// Pointer: an umbrella. The bricks that fall on it break on it. u.pointer narrows it.
// Behind the calm column (u.focus) the rain fades to a faint ghost, so the text stays easy to read.
// Params: u.drops (bricks per lane), u.brickSize (side of a brick), u.shards (shards per impact),
// u.burst (launch speed of the shards), u.calm (strength kept in the calm column),
// u.umbrella (half-width of the pointer).

const GRAVITY = 60.0;        // cells / s²
const DRAG = 2.2;            // air drag, 1 / s: shards burst out then slow down
const SLOWEST_SHARD = 0.375; // launch speed of the slowest shard, as a share of the fastest
const SHARD_LIFE = 1.2;      // seconds
const DUST_LIFE = 0.15;      // seconds
const CALM_EDGE = 10.0;      // soft edge of the calm zone, in cells

// Loop bounds: a param cannot ask for more work than this.
const MAX_DROPS = 6;
const MAX_SHARDS = 20;
const MAX_LANE_REACH = 4;    // neighbouring lanes checked on each side, at most
const MAX_BURST = 160.0;     // fastest launch whose shards stay within MAX_LANE_REACH lanes

// Furthest horizontal travel of a shard from its impact, in cells. Shards are scaled with the
// lane, so distant shards are smaller and slower.
fn shardReach(laneWidth: f32) -> f32 {
  let scale = laneWidth / 24.0;
  return min(u.burst, MAX_BURST) * scale / DRAG + 3.0;
}

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
  // u.amount is the presence of the pointer times the `pointer` param. The umbrella opens when the
  // pointer is half there, whatever the param: a test against a fixed 0.5 would keep it closed for
  // the lower half of the param. The param sets how wide the umbrella opens, and 0 keeps it closed.
  var hitY = 0.0;
  let shelter = u.umbrella * u.pointer;
  if (u.amount > 0.5 * u.pointer && u.mouse.x > x - shelter && u.mouse.x < x + size + shelter) {
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
  // smaller, slower and stay within the lanes that `rainLayer` checks.
  let scale = laneWidth / 24.0;
  let fastest = min(u.burst, MAX_BURST); // launch speed, cells / s (front layer)
  let travel = (1.0 - exp(-DRAG * s)) / DRAG; // distance factor under drag
  // Where the shards are now: in a square around the point they all fall from. Its half-side is
  // the travel of the fastest shard so far, plus 3 cells for the side of a shard and the rounding.
  // A cell outside it skips the shard loop: most cells are far from the shards of most impacts,
  // and drops x lanes x shards iterations for each cell are the cost of the rain.
  let spread = fastest * scale * travel + 3.0;
  if (abs(px.x - center.x) > spread || abs(px.y - (center.y - 0.5 * GRAVITY * scale * s * s)) > spread) {
    return dark;
  }
  let life = 1.0 - smoothstep(0.5, 1.0, s / SHARD_LIFE);
  for (var i = 0; i < min(i32(u.shards), MAX_SHARDS); i++) {
    let h = r + vec2f(f32(i) * 3.3, 11.0);
    let angle = 6.2831853 * hash(h);
    let launch = scale * mix(SLOWEST_SHARD * fastest, fastest, hash(h + 0.5));
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
  // As many neighbours as the fastest shard can cross: a stronger burst needs more of them.
  let reach = clamp(i32(ceil(shardReach(laneWidth) / laneWidth)), 1, MAX_LANE_REACH);
  let drops = min(i32(u.drops), MAX_DROPS);
  var dark = 0.0;
  for (var dl = -reach; dl <= reach; dl++) {
    for (var slot = 0; slot < drops; slot++) {
      dark = max(dark, brickDrop(px, lane + f32(dl), f32(slot), layer, laneWidth, size, speed));
    }
  }
  return dark;
}

// 1 outside the calm column, u.calm inside it, with a soft edge.
fn calmAt(x: f32) -> f32 {
  if (u.focus.y <= u.focus.x) {
    return 1.0; // no column to protect
  }
  let inside = min(x - u.focus.x, u.focus.y - x); // > 0 within the column
  return mix(1.0, u.calm, smoothstep(-CALM_EDGE, CALM_EDGE, inside));
}

fn field(px: vec2f, uv: vec2f) -> f32 {
  let backLayer = rainLayer(px, 0.0, 12.0, u.brickSize, 50.0);
  let frontLayer = rainLayer(px, 1.0, 24.0, u.brickSize, 90.0);

  var lum = 1.0;                    // plain page
  lum = mix(lum, 0.45, backLayer);  // distant bricks: mid tone
  lum = mix(lum, 0.0, frontLayer);  // near bricks: darkest tone
  // Fade toward the lightest tone (not `veil`, which fades toward the beige page).
  return mix(1.0, lum, u.intensity * calmAt(px.x));
}
