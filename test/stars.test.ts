import { describe, expect, it } from 'vitest'

import { defineDitherShader } from '../src/core/dither'
import { stars } from '../src/shaders/stars'

import { comparePixels, describeDitherPort, gpuAvailable, renderDefinition, type Frame } from './fidelity'

describeDitherPort(stars)

/** The page with nothing on it: what `veil` draws at intensity 0. */
const page = defineDitherShader({
  id: 'page',
  name: 'Page',
  technique: 'none',
  description: 'The plain page.',
  pointerEffect: 'None.',
  body: 'fn field(px: vec2f, uv: vec2f) -> f32 { return veil(px, 0.0, 0.0); }',
})

/** The stars that do not follow `intensity`: the ink of the original at every intensity. */
const steadyInk = { ...stars, fragment: stars.fragment.replace('u.ink * smoothstep(0.0, FULL_INK, u.intensity)', 'u.ink') }

describe.skipIf(!gpuAvailable)('stars: `intensity` reaches the stars and the links (WebGPU)', () => {
  const still: Frame = { width: 160, height: 120, time: 14 }
  // The pointer is there: it links the stars around it.
  const linked: Frame = { width: 160, height: 120, time: 37.5, mouse: [60, 70], amount: 1 }

  it('finds the fade in the source', () => {
    expect(steadyInk.fragment).not.toBe(stars.fragment)
  })

  it.each([
    ['pointer away', still],
    ['pointer among the stars', linked],
  ])('draws the plain page at intensity 0: %s', async (_name, frame) => {
    const [expected, actual] = await Promise.all([renderDefinition(page, {}, frame), renderDefinition(stars, { intensity: 0 }, frame)])
    expect(comparePixels(expected, actual, 0).differentRatio).toBe(0)
  })

  it('fades the stars under the default intensity', async () => {
    const [whole, faded] = await Promise.all([
      renderDefinition(steadyInk, { intensity: 0.1 }, linked),
      renderDefinition(stars, { intensity: 0.1 }, linked),
    ])
    expect(comparePixels(whole, faded, 0).differentRatio).toBeGreaterThan(0)
  })

  // The stars of the original, whose intensity is the default: the fade must not touch them there or above.
  it.each([stars.params.intensity.default, 0.6, 1])('keeps the whole ink at intensity %s', async (intensity) => {
    for (const frame of [still, linked]) {
      const [expected, actual] = await Promise.all([
        renderDefinition(steadyInk, { intensity }, frame),
        renderDefinition(stars, { intensity }, frame),
      ])
      expect(comparePixels(expected, actual, 0).differentRatio).toBe(0)
    }
  })
})
