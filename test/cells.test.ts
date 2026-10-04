import { describe, expect, it } from 'vitest'

import { cells } from '../src/shaders/cells'

import { comparePixels, describeDitherPort, gpuAvailable, renderDefinition, type Frame } from './fidelity'

describeDitherPort(cells)

/** The cells with a search over the 5x5 squares around the fragment: slower, and it misses no feature point. */
const wideSearch = {
  ...cells,
  fragment: cells.fragment
    .replace('for (var y = -1; y <= 1; y++)', 'for (var y = -2; y <= 2; y++)')
    .replace('for (var x = -1; x <= 1; x++)', 'for (var x = -2; x <= 2; x++)'),
}

describe.skipIf(!gpuAvailable)('cells: the 3x3 search (WebGPU)', () => {
  it('is found in the source', () => {
    expect(wideSearch.fragment).toContain('for (var y = -2; y <= 2; y++)')
    expect(wideSearch.fragment).toContain('for (var x = -2; x <= 2; x++)')
  })

  // With a jitter of 0.5, about half of these frames have seams cut straight at the border of a
  // square. The second look has wide, dark seams at full strength, so a wrong neighbour shows.
  it.each([2, 5, 9.5, 16])('finds the two nearest points at the largest jitter: scale %s', async (scale) => {
    const jitter = cells.params.jitter.max
    for (const look of [{}, { seamWidth: 0.5, seamStrength: 1, intensity: 1 }]) {
      for (let i = 0; i < 8; i++) {
        const frame: Frame = { width: 320, height: 200, time: i * 7.31 }
        const [expected, actual] = await Promise.all([
          renderDefinition(wideSearch, { ...look, scale, jitter }, frame),
          renderDefinition(cells, { ...look, scale, jitter }, frame),
        ])
        expect(comparePixels(expected, actual, 0).differentRatio, `t=${frame.time}`).toBe(0)
      }
    }
  })
})
