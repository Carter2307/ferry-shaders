import { createShaderComponent, defineDitherShader } from 'shader-ui'

export const stripes = defineDitherShader({
  id: 'stripes',
  name: 'Stripes',
  technique: 'sine bands',
  description: 'Soft diagonal bands that move slowly.',
  pointerEffect: 'The bands get darker near the pointer.',
  params: {
    count: { type: 'number', label: 'Bands', description: 'Number of bands.', default: 12, min: 2, max: 40, step: 1 },
  },
  // field returns a luminance: 0 is the darkest tone, 1 is the lightest.
  body: /* wgsl */ `
    fn field(px: vec2f, uv: vec2f) -> f32 {
      let band = 0.5 + 0.5 * sin((uv.x + uv.y) * u.count + u.time * 0.4);
      let near = u.amount * exp(-distance(uv, pointer()) * 4.0);
      return veil(px, band - 0.5 * near, u.intensity);
    }
  `,
})

/** The component of the shader. Its parameters are typed props: <Stripes count={20} />. */
export const Stripes = createShaderComponent(stripes)
