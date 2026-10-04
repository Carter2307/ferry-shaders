import { describe, expect, it } from 'vitest'

import { ditherParams } from '../../core/dither'
import { shaderSource } from '../../core/layout'
import { defaultParams, groupParams } from '../../core/params'

import { cells } from './index'

// The pixels of the port are compared with the original shader in test/ (Dawn).

describe('cells', () => {
  it('is a dither shader with six params of its own', () => {
    expect(cells.id).toBe('cells')
    expect(cells.resolution).toBe('cell')
    expect(cells.stillTime).toBe(14)
    const own = Object.keys(cells.params).filter((key) => !(key in ditherParams))
    expect(own).toEqual(['scale', 'jitter', 'seamWidth', 'seamStrength', 'push', 'glow'])
    expect(groupParams(cells.params).map((group) => group.group)).toEqual(['Color', 'Pattern', 'Pointer', 'Dither', 'Motion'])
    expect(cells.params.push.group).toBe('Pointer')
    expect(cells.params.glow.group).toBe('Pointer')
  })

  it('has the constants of the original as defaults', () => {
    expect(defaultParams(cells)).toMatchObject({
      scale: 5,
      jitter: 0.4,
      seamWidth: 0.14,
      seamStrength: 0.35,
      push: 0.08,
      glow: 0.18,
      intensity: 0.35,
      tones: 5,
      cell: 4,
      speed: 1,
      pointer: 1,
    })
  })

  it('reads its params from the uniforms', () => {
    const source = shaderSource(cells)
    for (const key of ['scale', 'jitter', 'seamWidth', 'seamStrength', 'push', 'glow', 'intensity']) {
      expect(source).toContain(`u.${key}`)
    }
    expect(source).not.toContain('const OPACITY')
    expect(source).not.toContain('const SCALE')
  })

  it('offers no value the 3x3 search or the seam cannot draw', () => {
    // MAX_JITTER and SEAM_CORE in cells.wgsl. Above 0.4 a 5x5 search draws other seams
    // (test/cells.test.ts), so neither the panel nor the shader goes further.
    const cap = Number(/const MAX_JITTER = ([\d.]+);/.exec(shaderSource(cells))?.[1])
    expect(cap).toBeLessThanOrEqual(0.4)
    expect(cells.params.jitter.max).toBeLessThanOrEqual(cap)
    // The default is the constant of the original: the cap must not change it.
    expect(cells.params.jitter.default).toBeLessThanOrEqual(cap)
    expect(cells.params.seamWidth.min).toBeGreaterThan(0.03)
    expect(cells.params.scale.min).toBeGreaterThan(0)
  })
})
