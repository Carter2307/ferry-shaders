import { describe, expect, it } from 'vitest'

import { parseColor } from '../src/core/color'
import { shaderSource } from '../src/core/layout'
import { pixelField } from '../src/shaders/pixel-field'

import { comparePixels, fixture, gpuAvailable, otherValue, renderDefinition, type Frame } from './fidelity'
import { compileMessages, renderToPixels } from './gpu'

// pixel-field is not a dither shader, so `describeDitherPort` does not apply: the original has its
// own module (entries `vertex` and `fragment`) and its own uniform buffer.

/** The two colors of the field as literals: the pure parser cannot resolve `currentColor`. */
const COLORS = { color: 'rgb(23 23 23)', accent: 'rgb(56 129 246)' }

/** Side of one cell in CSS pixels: the `CELL` constant of the ferry-ui site. */
const CELL = 4

type Origin = 'top' | 'bottom'

/** What the site passes to the original, besides the frame. The defaults are the light theme. */
interface OriginalOptions {
  origin?: Origin
  falloff?: number
  /** Alpha of the neutral pixels: 0.13 in the light theme, 0.1 in the dark one. */
  inkAlpha?: number
  /** Alpha of the accent pixels: 0.5 in the light theme, 0.42 in the dark one. */
  accentAlpha?: number
}

function rgb(color: string): [number, number, number] {
  const [r = 0, g = 0, b = 0] = parseColor(color) ?? []
  return [r, g, b]
}

/**
 * Draws the original shader of the ferry-ui site for `frame`, with the uniform buffer filled the
 * way its component fills it: resolution, time, cell in device pixels, ink, accent, options.
 */
function renderOriginal(frame: Frame, options: OriginalOptions = {}): Promise<Uint8Array> {
  const { origin = 'top', falloff = 2.6, inkAlpha = 0.13, accentAlpha = 0.5 } = options
  const uniforms = new Float32Array([
    frame.width,
    frame.height,
    frame.time,
    CELL * (frame.pixelRatio ?? 1),
    ...rgb(COLORS.color),
    inkAlpha,
    ...rgb(COLORS.accent),
    accentAlpha,
    origin === 'bottom' ? 1 : 0,
    falloff,
    0,
    0,
  ])
  return renderToPixels({
    code: fixture('libui/pixel-field.wgsl'),
    uniforms,
    width: frame.width,
    height: frame.height,
    vertexEntry: 'vertex',
    fragmentEntry: 'fragment',
  })
}

/** Number of pixels that are not fully transparent. */
function countLit(pixels: Uint8Array): number {
  let lit = 0
  for (let i = 3; i < pixels.length; i += 4) if ((pixels[i] ?? 0) > 0) lit++
  return lit
}

/** Number of pixels with a color channel above their alpha: 0 for a premultiplied picture. */
function countNotPremultiplied(pixels: Uint8Array): number {
  let wrong = 0
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] ?? 0
    if ((pixels[i] ?? 0) > alpha || (pixels[i + 1] ?? 0) > alpha || (pixels[i + 2] ?? 0) > alpha) wrong++
  }
  return wrong
}


const ORIGINS: readonly Origin[] = ['top', 'bottom']
/** A size the cells divide, and one they do not (the last row and column of cells are cut). */
const SIZES = [
  [240, 160],
  [187, 123],
] as const
/** The still frame of reduced motion, and a later one. */
const TIMES = [12, 37.5]
const RATIOS = [1, 2]

const CASES = ORIGINS.flatMap((origin) =>
  SIZES.flatMap(([width, height]) =>
    TIMES.flatMap((time) =>
      RATIOS.map((pixelRatio) => {
        const frame: Frame = { width, height, time, pixelRatio }
        return [`${origin} ${width}x${height} t=${time} ratio=${pixelRatio}`, origin, frame] as const
      }),
    ),
  ),
)

/** The frame used to check the effect of each parameter: large enough to hold accent patches. */
const PROBE: Frame = { width: 240, height: 160, time: 12, pixelRatio: 1 }

describe.skipIf(!gpuAvailable)('pixel-field (WebGPU)', () => {
  it('compiles with no message', async () => {
    expect(await compileMessages(shaderSource(pixelField))).toEqual([])
  })

  it.each(CASES)('draws the same pixels as the original: %s', async (_name, origin, frame) => {
    const [expected, actual] = await Promise.all([
      renderOriginal(frame, { origin }),
      renderDefinition(pixelField, { ...COLORS, origin }, frame),
    ])
    // The comparison means nothing on an empty picture.
    expect(countLit(expected)).toBeGreaterThan(0)
    const diff = comparePixels(expected, actual)
    expect(diff.differentRatio, `max channel delta ${diff.maxDelta}`).toBeLessThanOrEqual(0.005)
  })

  it('maps opacity, accentOpacity and falloff to the uniforms of the original', async () => {
    // The values of the site in the dark theme, and the falloff of its tall fields.
    const [expected, actual] = await Promise.all([
      renderOriginal(PROBE, { falloff: 4, inkAlpha: 0.1, accentAlpha: 0.42 }),
      renderDefinition(pixelField, { ...COLORS, falloff: 4, opacity: 0.1, accentOpacity: 0.42 }, PROBE),
    ])
    const diff = comparePixels(expected, actual)
    expect(diff.differentRatio, `max channel delta ${diff.maxDelta}`).toBeLessThanOrEqual(0.005)
  })

  // `speed` is not a uniform the shader reads: the engine multiplies the time by it (next test).
  const own = Object.entries(pixelField.params).filter(([key]) => key !== 'speed')
  it.each(own)('the param "%s" changes the picture', async (key, def) => {
    const [base, changed] = await Promise.all([
      renderDefinition(pixelField, COLORS, PROBE),
      renderDefinition(pixelField, { ...COLORS, [key]: otherValue(def) }, PROBE),
    ])
    expect(comparePixels(base, changed, 0).differentRatio).toBeGreaterThan(0)
  })

  it('moves with the time, so with the speed', async () => {
    const [base, later] = await Promise.all([
      renderDefinition(pixelField, COLORS, PROBE),
      renderDefinition(pixelField, COLORS, { ...PROBE, time: PROBE.time * 3 }),
    ])
    expect(comparePixels(base, later, 0).differentRatio).toBeGreaterThan(0)
  })

  it('draws no accent patch with accentShare at 0', async () => {
    const [blue, pink] = await Promise.all([
      renderDefinition(pixelField, { ...COLORS, accentShare: 0 }, PROBE),
      renderDefinition(pixelField, { ...COLORS, accentShare: 0, accent: '#ff00ff' }, PROBE),
    ])
    expect(countLit(blue)).toBeGreaterThan(0)
    expect(comparePixels(blue, pink, 0).differentRatio).toBe(0)
  })

  it('returns premultiplied pixels on a transparent background', async () => {
    // Strong colors: a channel above its alpha would show.
    const pixels = await renderDefinition(pixelField, { color: '#ffffff', accent: '#ff00ff', opacity: 0.6, accentOpacity: 0.9 }, PROBE)
    expect(countNotPremultiplied(pixels)).toBe(0)
    const lit = countLit(pixels)
    expect(lit).toBeGreaterThan(0)
    // The field thins out to nothing: most of the canvas stays transparent.
    expect(lit).toBeLessThan(pixels.length / 4 / 2)
  })

  const numbers = own.flatMap(([key, def]) => (def.type === 'number' ? ([[key, def.min], [key, def.max]] as const) : []))
  it.each(numbers)('draws a sound picture with "%s" at %d', async (key, value) => {
    const pixels = await renderDefinition(pixelField, { ...COLORS, [key]: value }, PROBE)
    expect(countNotPremultiplied(pixels)).toBe(0)
    expect(countLit(pixels)).toBeGreaterThan(0)
  })
})
