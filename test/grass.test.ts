import { describe, expect, it } from 'vitest'

import { defineDitherShader } from '../src/core/dither'
import { grass } from '../src/shaders/grass'

import { comparePixels, describeDitherPort, FRAMES, gpuAvailable, renderDefinition, type Frame } from './fidelity'

// The grass only fills the bottom of the page: this frame has the pointer among the blades.
const parted: Frame = { width: 160, height: 120, time: 37.5, mouse: [60, 14], amount: 1 }

describeDitherPort(grass, {
  frames: [...FRAMES, parted],
  // The default probe has the pointer above the grass, where it parts nothing.
  probe: parted,
})

/** The page with nothing on it: what `veil` draws at intensity 0. */
const page = defineDitherShader({
  id: 'page',
  name: 'Page',
  technique: 'none',
  description: 'The plain page.',
  pointerEffect: 'None.',
  body: 'fn field(px: vec2f, uv: vec2f) -> f32 { return veil(px, 0.0, 0.0); }',
})

/** The grass whose blades do not follow `intensity`: the ink of the original at every intensity. */
const steadyInk = { ...grass, fragment: grass.fragment.replace(' * smoothstep(0.0, FULL_INK, u.intensity)', '') }

describe.skipIf(!gpuAvailable)('grass: `intensity` reaches the blades (WebGPU)', () => {
  const still: Frame = { width: 160, height: 120, time: 14 }

  it('finds the fade in the source', () => {
    expect(steadyInk.fragment).not.toBe(grass.fragment)
  })

  it.each([
    ['pointer away', still],
    ['pointer among the blades', parted],
  ])('draws the plain page at intensity 0: %s', async (_name, frame) => {
    const [expected, actual] = await Promise.all([renderDefinition(page, {}, frame), renderDefinition(grass, { intensity: 0 }, frame)])
    expect(comparePixels(expected, actual, 0).differentRatio).toBe(0)
  })

  it('fades the blades under the default intensity', async () => {
    const [whole, faded] = await Promise.all([
      renderDefinition(steadyInk, { intensity: 0.1 }, still),
      renderDefinition(grass, { intensity: 0.1 }, still),
    ])
    expect(comparePixels(whole, faded, 0).differentRatio).toBeGreaterThan(0)
  })

  // The blades of the original, whose intensity is the default: the fade must not touch them there or above.
  it.each([grass.params.intensity.default, 0.6, 1])('keeps the whole ink at intensity %s', async (intensity) => {
    for (const frame of [still, parted]) {
      const [expected, actual] = await Promise.all([
        renderDefinition(steadyInk, { intensity }, frame),
        renderDefinition(grass, { intensity }, frame),
      ])
      expect(comparePixels(expected, actual, 0).differentRatio).toBe(0)
    }
  })
})
