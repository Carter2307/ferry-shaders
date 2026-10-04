// Cells: animated Voronoi cells, lighter at their core, with dark seams.
// Pointer: pushes the lattice outward like a lens and lights the cells beneath.
// Params: u.scale (number of cells across the height), u.jitter (how far the cell points stray from a
// regular grid), u.seamWidth (width of the seams), u.seamStrength (how dark the seams are),
// u.push (strength of the lens under the pointer), u.glow (light under the pointer).

// The search below looks at the 3x3 squares around the fragment. That is enough while a feature
// point strays at most 0.4 of a square from its centre, the value of the original: up to there it
// draws the same pixels as a 5x5 search (test/cells.test.ts). Further, a point two squares away
// can be the second nearest, and the seam is cut straight at the border of a square. At 0.5 two
// points can also meet, and their two cells fill with the seam tone.
const MAX_JITTER = 0.4;

// Where a seam is fully dark. The seam fades from here to u.seamWidth, which must stay above it.
const SEAM_CORE = 0.03;

fn field(px: vec2f, uv: vec2f) -> f32 {
  let t = u.time * 0.25;
  let offset = uv - pointer();
  let d = length(offset);

  let push = u.amount * u.push * exp(-d * 5.0) / (d + 0.05);
  let p = (uv - offset * push) * u.scale;

  // Named `tile`, not `cell`: u.cell is the size of a dither cell.
  let tile = floor(p);
  let f = fract(p);
  let jitter = min(u.jitter, MAX_JITTER);
  var f1 = 8.0; // distance to the nearest feature point
  var f2 = 8.0; // distance to the second nearest
  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let g = vec2f(f32(x), f32(y));
      let o = hash2(tile + g);
      let site = g + 0.5 + jitter * sin(t + 6.2831 * o);
      let dist = length(site - f);
      if (dist < f1) {
        f2 = f1;
        f1 = dist;
      } else if (dist < f2) {
        f2 = dist;
      }
    }
  }

  let seam = 1.0 - smoothstep(SEAM_CORE, max(u.seamWidth, SEAM_CORE + 0.01), f2 - f1);
  let v = 0.88 - 0.5 * f1 - u.seamStrength * seam;

  let cells = mix(backdrop(px), v, 0.55);
  return veil(px, cells, u.intensity) + u.glow * u.amount * exp(-d * d * 14.0);
}
