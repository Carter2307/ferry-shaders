import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveColors } from '../src/core/color'
import { ditherParams } from '../src/core/dither'
import { packParams, shaderLayout, shaderSource, writeFrame } from '../src/core/layout'
import { resolveParams } from '../src/core/params'
import type { ParamDef, ShaderDefinition, Vec2 } from '../src/core/types'

import { compileMessages, getDevice, renderToPixels } from './gpu'

/** True when this machine gives a WebGPU device (Dawn). The GPU tests are skipped when it does not. */
export const gpuAvailable = (await getDevice()) !== null

if (!gpuAvailable) {
  console.warn('\n[ferry-shaders] NO WEBGPU DEVICE (Dawn): the pixel tests of the shaders are SKIPPED.\n')
}

/** The state of one frame: what the engine writes to the header of the uniform buffer. */
export interface Frame {
  width: number
  height: number
  /** Seconds. */
  time: number
  /** Pointer position in canvas pixels, origin bottom-left. */
  mouse?: Vec2
  /** Pointer influence, 0..1. Defaults to 0 (pointer away). */
  amount?: number
  /** Calm column `[left, right]` in canvas pixels. Defaults to none. */
  focus?: Vec2
  /** Canvas pixels per CSS pixel. Defaults to `1 / cell` for a cell shader, 1 for a device shader. */
  pixelRatio?: number
}

/** The palette of the portfolio (the DUNE, SAND and PAPER constants of common.wgsl) as params. */
export const ORIGINAL_PALETTE = {
  color: 'rgb(217 196 163)',
  midColor: 'rgb(238 224 203)',
  background: 'rgb(251 247 240)',
}

/** Frames every port is compared on: two sizes, three times, pointer away and pointer active. */
export const FRAMES: readonly Frame[] = [
  { width: 160, height: 120, time: 0 },
  { width: 160, height: 120, time: 14 },
  { width: 160, height: 120, time: 37.5, mouse: [60, 70], amount: 1 },
  { width: 97, height: 61, time: 14, mouse: [30, 20], amount: 1 },
  { width: 97, height: 61, time: 37.5, mouse: [80, 12], amount: 0.5 },
]

/** The text of a fixture: `fixture('portfolio/drift.wgsl')`. */
export function fixture(path: string): string {
  return readFileSync(new URL(`./fixtures/${path}`, import.meta.url), 'utf8')
}

/** Draws an original shader of the portfolio (common.wgsl + its body) for `frame`. */
export function renderOriginalDither(id: string, frame: Frame, constants?: Record<string, number>): Promise<Uint8Array> {
  const [left, right] = frame.focus ?? [0, 0]
  const [mouseX, mouseY] = frame.mouse ?? [0, 0]
  // The `Uniforms` struct of common.wgsl: resolution, mouse, time, amount, focus.
  const uniforms = new Float32Array([frame.width, frame.height, mouseX, mouseY, frame.time, frame.amount ?? 0, left, right])
  return renderToPixels({
    code: `${fixture('portfolio/common.wgsl')}\n${fixture(`portfolio/${id}.wgsl`)}`,
    uniforms,
    width: frame.width,
    height: frame.height,
    constants,
  })
}

/**
 * Draws a shader of the library for `frame`, the way the engine does: sanitised params, colors
 * resolved with the pure parser, the generated uniform layout. Time is used as it is (the engine
 * multiplies it by `speed` before); the pointer influence is multiplied by the `pointer` param.
 */
export function renderDefinition(
  shader: ShaderDefinition,
  params: Readonly<Record<string, unknown>> | undefined,
  frame: Frame,
): Promise<Uint8Array> {
  const layout = shaderLayout(shader)
  const values: Readonly<Record<string, unknown>> = resolveParams(shader, params)
  const data = new Float32Array(layout.byteSize / 4)
  packParams(layout, shader.params, values, resolveColors(shader.params, values), data)

  const pointer = typeof values.pointer === 'number' ? values.pointer : 1
  const cell = typeof values.cell === 'number' ? values.cell : 4
  writeFrame(data, {
    resolution: [frame.width, frame.height],
    mouse: frame.mouse ?? [0, 0],
    time: frame.time,
    amount: (frame.amount ?? 0) * pointer,
    pixelRatio: frame.pixelRatio ?? (shader.resolution === 'cell' ? 1 / cell : 1),
    focus: frame.focus ?? [0, 0],
  })
  return renderToPixels({ code: shaderSource(shader), uniforms: data, width: frame.width, height: frame.height })
}

/** How two pictures differ. */
export interface PixelDiff {
  /** Share of the pixels with a channel further apart than the tolerance, 0..1. */
  differentRatio: number
  /** Largest difference of one channel, 0..255. */
  maxDelta: number
}

/** Compares two pictures of the same size. A pixel differs when one channel is more than `channelTolerance` apart. */
export function comparePixels(a: Uint8Array, b: Uint8Array, channelTolerance = 2): PixelDiff {
  if (a.length !== b.length) throw new Error(`pictures of different sizes: ${a.length} and ${b.length} bytes`)
  let different = 0
  let maxDelta = 0
  for (let i = 0; i < a.length; i += 4) {
    let delta = 0
    for (let c = 0; c < 4; c++) delta = Math.max(delta, Math.abs((a[i + c] ?? 0) - (b[i + c] ?? 0)))
    maxDelta = Math.max(maxDelta, delta)
    if (delta > channelTolerance) different++
  }
  return { differentRatio: different / (a.length / 4), maxDelta }
}

/** Number of distinct colors in a picture. */
export function countColors(pixels: Uint8Array): number {
  const colors = new Set<number>()
  const view = new DataView(pixels.buffer, pixels.byteOffset, pixels.byteLength)
  for (let i = 0; i < pixels.length; i += 4) colors.add(view.getUint32(i))
  return colors.size
}

const describeFrame = (frame: Frame) =>
  `${frame.width}x${frame.height} t=${frame.time} pointer=${frame.amount ? `${frame.amount} at ${frame.mouse?.join(',')}` : 'away'}`

/** A value of `def` that is not its default, to check that the parameter changes the picture. */
export function otherValue(def: ParamDef): unknown {
  switch (def.type) {
    case 'color':
      return def.default === '#ff00ff' ? '#00ffff' : '#ff00ff'
    case 'number':
      return def.default === def.max ? def.min : def.max
    case 'boolean':
      return !def.default
    case 'select':
      return def.options.find((option) => option.value !== def.default)?.value
  }
}

/** Options of {@link describeDitherPort}. */
export interface DitherPortOptions {
  /** Name of the original in test/fixtures/portfolio (without `.wgsl`). Defaults to the id of the shader. */
  original?: string
  /** Pipeline constants of the original (`{ WHITE_BACKGROUND: 1 }` for the rain). */
  constants?: Record<string, number>
  /** Params that replace the original palette for the comparison (`{ background: 'rgb(255 255 255)' }`). */
  params?: Readonly<Record<string, unknown>>
  /** Frames to compare. Defaults to {@link FRAMES}. Add `focus` frames for a shader that reads `u.focus`. */
  frames?: readonly Frame[]
  /**
   * The frame used to check that each parameter changes the picture. Defaults to a frame with the
   * pointer active. Change it when a parameter only shows in another situation.
   */
  probe?: Frame
  /** Own params whose effect cannot show on the probe frame (say why in a comment). */
  skipSensitivity?: readonly string[]
}

/**
 * The tests every port of a portfolio shader must pass:
 * 1. the WGSL compiles with no message;
 * 2. with the default params and the original palette, it draws the same pixels as the original
 *    (a channel may differ by 2, and at most 0.5% of the pixels may differ more);
 * 3. each parameter of its own changes the picture;
 * 4. the shared parameters work: color, number of tones, transparent background.
 *
 * Do not loosen the tolerances: a port that does not match has a bug.
 */
export function describeDitherPort(shader: ShaderDefinition, options: DitherPortOptions = {}): void {
  const original = options.original ?? shader.id
  const palette = { ...ORIGINAL_PALETTE, ...options.params }
  const probe = options.probe ?? { width: 160, height: 120, time: 37.5, mouse: [60, 70], amount: 1 }

  describe.skipIf(!gpuAvailable)(`${shader.id} (WebGPU)`, () => {
    it('compiles with no message', async () => {
      expect(await compileMessages(shaderSource(shader))).toEqual([])
    })

    it.each((options.frames ?? FRAMES).map((frame) => [describeFrame(frame), frame] as const))(
      'draws the same pixels as the original: %s',
      async (_name, frame) => {
        const [expected, actual] = await Promise.all([
          renderOriginalDither(original, frame, options.constants),
          renderDefinition(shader, palette, frame),
        ])
        const diff = comparePixels(expected, actual)
        expect(diff.differentRatio, `max channel delta ${diff.maxDelta}`).toBeLessThanOrEqual(0.005)
      },
    )

    const own = Object.entries(shader.params).filter(
      ([key]) => !(key in ditherParams) && !options.skipSensitivity?.includes(key),
    )
    it.each(own)('the param "%s" changes the picture', async (key, def) => {
      const [base, changed] = await Promise.all([
        renderDefinition(shader, palette, probe),
        renderDefinition(shader, { ...palette, [key]: otherValue(def) }, probe),
      ])
      expect(comparePixels(base, changed, 0).differentRatio).toBeGreaterThan(0)
    })

    it('follows the shared params: color, tones, transparent background', async () => {
      // At full strength: a faint shader (the rain) never reaches its darkest tone at the default intensity.
      const strong = await renderDefinition(shader, { ...palette, intensity: 1 }, probe)
      const recolored = await renderDefinition(shader, { ...palette, intensity: 1, color: '#0044ff' }, probe)
      expect(comparePixels(strong, recolored, 0).differentRatio).toBeGreaterThan(0)

      const twoTones = await renderDefinition(shader, { ...palette, tones: 2 }, probe)
      expect(countColors(twoTones)).toBeLessThanOrEqual(2)

      const seeThrough = await renderDefinition(shader, { ...palette, background: 'transparent', midColor: 'auto' }, probe)
      let transparent = 0
      for (let i = 3; i < seeThrough.length; i += 4) if ((seeThrough[i] ?? 255) < 255) transparent++
      expect(transparent).toBeGreaterThan(0)
    })
  })
}
