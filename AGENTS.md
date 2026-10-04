# ferry-shaders: guide for AI coding agents

ferry-shaders is a React + TypeScript library of WebGPU (WGSL) background shaders. Every shader declares a
parameter schema, so a panel can configure any shader live. This file says how the code is organised
and how to add a shader. Match the existing code exactly.

## Layout

```text
src/
  index.ts            public entry: re-exports core, shaders, react
                      (`ferry-shaders/core` and `ferry-shaders/shaders` are entries too: they import no React)
  core/               the engine: no React, no DOM access when the module loads
    types.ts          ParamDef, ParamSchema, ParamValues, ShaderDefinition, ShaderStatus
    define.ts         defineShader: checks a definition (ids, param names, fs_main)
    dither.ts         defineDitherShader + ditherParams (the dither family)
    wgsl/dither.wgsl  prelude of the dither family: fs_main, palette, noise, Bayer dither
    params.ts         defaultParams, resolveParams, groupParams
    color.ts          parseColor (pure), resolveColor (browser), resolveColors ('auto' colors)
    layout.ts         buildLayout (generated WGSL struct), packParams, writeFrame, shaderSource
    gpu.ts            the GPU device and the pipelines shared by every canvas
    renderer.ts       one canvas: context, uniform buffer, draw
    scene.ts          time and eased pointer (pure)
    mount.ts          mountShader: size, pointer, loop, reduced motion, theme, device loss
  shaders/<id>/       one folder per shader: <id>.wgsl + index.ts
  shaders/index.ts    registry: `shaders`, `getShader`, and each definition by name
  react/              ShaderCanvas, createShaderComponent, useShaderControls, ShaderPanel, components.ts
  styles/panel.css    default stylesheet of the panel (`ferry-shaders/styles.css`)
  test/               test doubles (fake GPU, fake frames) for the jsdom tests
test/                 WebGPU tests with Dawn: the pixels of each shader
site/                 documentation page (Vite + Tailwind 4 + ferry-ui)
```

## Rules

- TypeScript strict, no semicolons, single quotes, 2 spaces, kebab-case file names, relative imports.
- Short JSDoc in plain English on every export. Comments say why, not what.
- No runtime dependency. `react` and `react-dom` are peer dependencies (18 or 19): no React-19-only
  API in `src/` (use `forwardRef`, not `ref` as a prop).
- Nothing under `src/core` or `src/shaders` imports React. No module reads `window`, `document` or
  `navigator` when it loads.
- Do not run `npm install`. Do not edit files outside this repository.

## The uniforms a shader reads

The `Uniforms` struct, its binding (`u`) and the vertex stage (`vs_main`) are generated from the schema
(`buildLayout`). A shader reads a parameter by its key: `u.scale`, `u.color`.

| Field | Type | Meaning |
| --- | --- | --- |
| `u.resolution` | `vec2f` | Canvas size in canvas pixels: grid cells (`cell`) or device pixels (`device`) |
| `u.mouse` | `vec2f` | Pointer position in canvas pixels, origin bottom-left |
| `u.time` | `f32` | Seconds, already multiplied by `speed` |
| `u.amount` | `f32` | Pointer influence 0..1, eased, already multiplied by the `pointer` param |
| `u.pixelRatio` | `f32` | Canvas pixels per CSS pixel (`1 / cell`, or the device pixel ratio) |
| `u.focus` | `vec2f` | Calm column `[left, right]` in canvas pixels; `left >= right` means none |
| color params | `vec4f` | sRGB 0..1 with a straight alpha: premultiply before you return |
| other params | `f32` | number as is, boolean as 0 or 1, select as the index of the option |

A parameter key is camelCase (`/^[a-z][A-Za-z0-9]*$/`), is not a header field, and is not a WGSL keyword
or reserved word (`from`, `filter`, `target`, `type`, `layout`, `smooth`, `mod`…): `defineShader` throws
with the reason. `speed`, `cell` and `pointer` are read by the engine and must be numbers.

## Add a dither shader

1. `src/shaders/<id>/<id>.wgsl`: define `fn field(px: vec2f, uv: vec2f) -> f32` (luminance 0..1, 0 is
   the darkest tone). The prelude gives `backdrop`, `veil`, `pointer`, `hash`, `hash2`, `noise`, `fbm`,
   `bayer2`, `bayer4`, `bayer8`. Read `u.intensity` where the original had `const OPACITY`. Turn the
   constants worth tuning into params (`u.<key>`); leave the others as `const`.
2. `src/shaders/<id>/index.ts`: `export const <id> = /* @__PURE__ */ defineDitherShader({ id, name,
   technique, description, pointerEffect, params, body })`. See `src/shaders/drift/index.ts`. Own params
   go in the "Pattern" group by default. `overrides` changes the default of a shared param
   (`{ background: '#ffffff' }`). `stillTime` (default 14) is the frame drawn for reduced motion.
3. `src/shaders/index.ts`: import it, export it by name, add it to `shaders`. The export is the id in
   camelCase (`pixel-field` is `pixelField`).
4. `src/react/components.ts`: add its component, named after the id in PascalCase
   (`export const PixelField = /* @__PURE__ */ createShaderComponent(pixelField)`).
5. Tests: a unit test next to the shader (see `drift.test.ts`), and a Dawn test `test/<id>.test.ts`
   that calls `describeDitherPort(<id>)` (see `test/fidelity.ts`): it compiles the shader, compares
   its pixels with the original, and checks that each parameter changes the picture.

With the default params and the original palette (`color: 'rgb(217 196 163)'`,
`midColor: 'rgb(238 224 203)'`, `background: 'rgb(251 247 240)'`), a port must draw the same pixels as
the original shader.

Two things to know when a constant becomes a param:

- A loop bound that comes from a param needs a `const` maximum in WGSL
  (`min(i32(u.count), MAX_COUNT)`), and the `max` of the param stays at or under it.
- A value that feeds `hash()` must keep the original constant expression. `r * u.spacing` does not
  round like `r * SPACING`, the seed moves and the picture changes. Keep the seed on a `const` and use
  the param for the position only (see `SEED_STEP` in `src/shaders/grass/grass.wgsl`).

Params that only matter for the pointer go in the group `Pointer`. A panel shows the groups in the
order Color, Pattern, Pointer, Dither, Motion.

A shader that is not a dither shader (its own `fs_main`, `resolution: 'device'`) uses `defineShader`.
Its `fs_main` returns a premultiplied color. See `src/shaders/pixel-field` and its Dawn test
`test/pixel-field.test.ts`, which fills the uniform buffer of the original itself.

## Checks

```sh
npm run typecheck
npm run lint
npm run test       # unit tests (src/**) and Dawn tests (test/**)
npm run build      # dist: ESM + .d.ts + styles.css
npm run site:build
```
