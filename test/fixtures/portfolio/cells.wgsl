// Cellules — animated Voronoi cells, lighter at their core, with dark seams.
// Pointer: pushes the lattice outward like a lens and lights the cells beneath.

const SCALE = 5.0;
const OPACITY = 0.35; // how strongly the cells are drawn over the page

fn field(px: vec2f, uv: vec2f) -> f32 {
  let t = u.time * 0.25;
  let offset = uv - pointer();
  let d = length(offset);

  let push = u.amount * 0.08 * exp(-d * 5.0) / (d + 0.05);
  let p = (uv - offset * push) * SCALE;

  let cell = floor(p);
  let f = fract(p);
  var f1 = 8.0; // distance to the nearest feature point
  var f2 = 8.0; // distance to the second nearest
  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let g = vec2f(f32(x), f32(y));
      let o = hash2(cell + g);
      let site = g + 0.5 + 0.4 * sin(t + 6.2831 * o);
      let dist = length(site - f);
      if (dist < f1) {
        f2 = f1;
        f1 = dist;
      } else if (dist < f2) {
        f2 = dist;
      }
    }
  }

  let seam = 1.0 - smoothstep(0.03, 0.14, f2 - f1);
  let v = 0.88 - 0.5 * f1 - 0.35 * seam;

  let cells = mix(backdrop(px), v, 0.55);
  return veil(px, cells, OPACITY) + 0.18 * u.amount * exp(-d * d * 14.0);
}
