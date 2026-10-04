// Relief: a slowly shifting height map drawn as a terraced topographic chart.
// Pointer: raises a hill, so contour rings gather around it.
// Params: u.contours (number of height levels), u.scale (size of the terrain), u.lineWidth (width of
// the contour lines, in cells), u.lineStrength (how dark the lines are), u.shading (how much the tone
// changes from one level to the next), u.hill (height of the hill under the pointer).

fn field(px: vec2f, uv: vec2f) -> f32 {
  let t = u.time * 0.03;
  let d = distance(uv, pointer());

  var h = fbm(uv * u.scale + vec2f(t, -0.6 * t));
  h += u.hill * u.amount * exp(-d * d * 18.0);

  // Terraces: flat steps between contour levels. Less than one level would divide by zero.
  let levels = max(u.contours, 1.0);
  let bands = h * levels;
  let terrace = floor(bands) / levels;

  // Contour lines keep a constant on-screen width whatever the slope. Where the ground is flat the
  // slope is zero: the floor keeps the two edges of the smoothstep apart.
  let edge = min(fract(bands), 1.0 - fract(bands));
  let contour = 1.0 - smoothstep(0.0, max(u.lineWidth * fwidth(bands), 1e-5), edge);

  let base = mix(backdrop(px), 0.35 + terrace, u.shading);
  return veil(px, base - u.lineStrength * contour, u.intensity);
}
