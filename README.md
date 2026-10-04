# ferry-shaders

ferry-shaders is a React + TypeScript library of WebGPU (WGSL) background shaders. Every shader declares its
parameters (colors, numbers, booleans, selects) in a schema, so a panel can configure any shader live.

```tsx
import { Drift } from 'ferry-shaders'

export function Hero() {
  return (
    <section className="relative h-96">
      <Drift className="absolute inset-0" color="#1d4ed8" background="transparent" scale={3} />
    </section>
  )
}
```

## Shaders

| Shader | Component | What it draws |
| --- | --- | --- |
| `drift` | `<Drift>` | Soft clouds of warped noise that drift slowly |
| `ripples` | `<Ripples>` | Rings from three wandering sources that cross each other |
| `relief` | `<Relief>` | A terraced topographic chart with contour lines |
| `cells` | `<Cells>` | Voronoi cells that move slowly |
| `rain` | `<Rain>` | Pixel bricks that fall and shatter at the bottom |
| `stars` | `<Stars>` | Pixel stars that twinkle, linked by lines near the pointer |
| `dunes` | `<Dunes>` | Wind ripples on sand |
| `grass` | `<Grass>` | A fringe of pixel grass that sways along the bottom |
| `aurora` | `<Aurora>` | Curtains with fine vertical rays |
| `pixel-field` | `<PixelField>` | A dense field of pixels at one edge that thins out |

The first nine are dither shaders: a picture reduced to a few tones (`color`, `midColor`, `background`)
on a grid of square cells, black on white by default. They come from the portfolio. The pixel field comes from the ferry-ui site.

## What is in the box

- **React** (`ferry-shaders`): one component per shader (`<Drift />`), `<ShaderCanvas shader={...} params={...} />`
  for a shader chosen at run time, `useShaderControls(shader)` (the state of a panel) and `<ShaderPanel />`
  (a ready-made panel; its stylesheet is `ferry-shaders/styles.css`).
- **Shaders** (`ferry-shaders/shaders`, no React): the ten definitions, `shaders` and `getShader(id)`.
- **Engine** (`ferry-shaders/core`, no React): `mountShader(canvas, options)` draws a shader on a canvas and
  returns `{ update, redraw, dispose }`. One GPU device is shared by every canvas of the page.

## A panel

```tsx
import { ShaderCanvas, ShaderPanel, drift, useShaderControls } from 'ferry-shaders'
import 'ferry-shaders/styles.css'

export function Demo() {
  const controls = useShaderControls(drift)
  return (
    <>
      <ShaderCanvas shader={controls.shader} params={controls.values} className="fixed inset-0 -z-10" />
      <ShaderPanel controls={controls} placement="bottom-right" />
    </>
  )
}
```

The panel is drawn from the schema of the shader, so it works for any shader. Theme it with the
`--ferry-shaders-*` variables. To build your own panel, bind your controls to `controls.groups`, `controls.values`
and `controls.set`: the documentation page does it with ferry-ui components.

## Install

```sh
npm install ferry-shaders
```

Your app needs React 18 or React 19. The library has no other dependency.

## Parameters

A shader is a `ShaderDefinition`: an id, texts for a gallery, a `params` schema and a WGSL fragment.
The engine generates the WGSL `Uniforms` struct from the schema, so the shader reads a parameter by its
name (`u.color`, `u.scale`).

```ts
import { defineDitherShader } from 'ferry-shaders'

export const stripes = defineDitherShader({
  id: 'stripes',
  name: 'Stripes',
  technique: 'sine bands',
  description: 'Soft diagonal bands that move slowly.',
  pointerEffect: 'The pointer does nothing.',
  params: {
    count: { type: 'number', label: 'Bands', default: 12, min: 2, max: 40, step: 1 },
  },
  body: /* wgsl */ `
    fn field(px: vec2f, uv: vec2f) -> f32 {
      let band = 0.5 + 0.5 * sin((uv.x + uv.y) * u.count + u.time * 0.4);
      return veil(px, band, u.intensity);
    }
  `,
})
```

Three parameter names are read by the engine (and still sent to the shader): `speed` (time multiplier),
`cell` (side of a grid cell in CSS pixels, for `resolution: 'cell'`) and `pointer` (pointer influence).

Colors take any CSS color: `#d9c4a3`, `rgb(...)`, `oklch(...)`, `transparent`, `currentColor`,
`var(--token)`. Colors that depend on the page (tokens, `currentColor`) follow the theme.

## Behaviour

- A browser with no WebGPU gets the `fallback` of `ShaderCanvas` (status `unsupported`).
- A reader who asks for reduced motion gets one still frame. A change of that preference is followed live.
- A canvas stops when it is out of view, or when `paused` is set.

## Develop

```sh
npm install
npm run dev          # documentation site, http://localhost:5182
npm run check        # typecheck + lint + tests
npm run build        # dist: ESM + .d.ts + styles.css
```

The library has no dependency. Only the documentation site (`site/`) uses
[ferry-ui](https://www.npmjs.com/package/ferry-ui), as a development dependency.

The tests in `test/` draw the shaders with [Dawn](https://www.npmjs.com/package/webgpu) (WebGPU for Node)
and compare them with the original implementations.

## License

MIT
