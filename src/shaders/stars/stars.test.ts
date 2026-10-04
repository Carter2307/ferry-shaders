import { describe, expect, it } from 'vitest'

import { ditherParams } from '../../core/dither'
import { shaderSource } from '../../core/layout'
import { defaultParams, groupParams } from '../../core/params'

import { stars } from './index'

// The pixels of the port are compared with the original shader in test/ (Dawn).

describe('stars', () => {
  it('is a dither shader with five params of its own', () => {
    expect(stars.id).toBe('stars')
    expect(stars.resolution).toBe('cell')
    expect(stars.stillTime).toBe(14)
    const own = Object.keys(stars.params).filter((key) => !(key in ditherParams))
    expect(own).toEqual(['spacing', 'density', 'ink', 'linkRadius', 'linkLength'])
    expect(groupParams(stars.params).map((group) => group.group)).toEqual(['Color', 'Pattern', 'Pointer', 'Dither', 'Motion'])
  })

  it('has the constants of the original as defaults', () => {
    expect(defaultParams(stars)).toMatchObject({
      spacing: 18,
      density: 0.55,
      ink: 0.85,
      linkRadius: 56,
      linkLength: 1.5,
      intensity: 0.35,
      tones: 5,
      cell: 4,
      speed: 1,
      pointer: 1,
    })
  })

  it('reads its params from the uniforms', () => {
    const source = shaderSource(stars)
    for (const key of ['spacing', 'density', 'ink', 'linkRadius', 'linkLength', 'intensity']) {
      expect(source).toContain(`u.${key}`)
    }
    expect(source).not.toContain('const OPACITY')
  })

  it('fades the stars and the links with the intensity, under the default only', () => {
    // FULL_INK in stars.wgsl. The stars are drawn over the page: without the fade, intensity 0
    // still drew them. At the default intensity they must keep the ink of the original.
    const source = shaderSource(stars)
    expect(source).toContain('u.ink * smoothstep(0.0, FULL_INK, u.intensity)')
    const full = Number(/const FULL_INK = ([\d.]+);/.exec(source)?.[1])
    expect(full).toBeGreaterThan(0)
    expect(full).toBeLessThanOrEqual(stars.params.intensity.default)
  })
})
