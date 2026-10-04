// Relief — a slowly shifting height map drawn as a terraced topographic chart.
// Pointer: raises a hill, so contour rings gather around it.

const CONTOURS = 14.0;
const OPACITY = 0.35; // how strongly the chart is drawn over the page

fn field(px: vec2f, uv: vec2f) -> f32 {
  let t = u.time * 0.03;
  let d = distance(uv, pointer());

  var h = fbm(uv * 1.6 + vec2f(t, -0.6 * t));
  h += 0.35 * u.amount * exp(-d * d * 18.0);

  // Terraces: flat steps between contour levels.
  let bands = h * CONTOURS;
  let terrace = floor(bands) / CONTOURS;

  // Contour lines keep a constant on-screen width whatever the slope.
  let edge = min(fract(bands), 1.0 - fract(bands));
  let contour = 1.0 - smoothstep(0.0, 1.2 * fwidth(bands), edge);

  let base = mix(backdrop(px), 0.35 + terrace, 0.45);
  return veil(px, base - 0.38 * contour, OPACITY);
}
