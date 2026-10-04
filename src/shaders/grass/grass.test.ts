import { describe, expect, it } from 'vitest'

import { ditherParams } from '../../core/dither'
import { shaderSource } from '../../core/layout'
import { defaultParams, groupParams } from '../../core/params'

import { grass } from './index'

// The pixels of the port are compared with the original shader in test/ (Dawn).

describe('grass', () => {
  it('is a dither shader with five params of its own', () => {
    expect(grass.id).toBe('grass')
    expect(grass.resolution).toBe('cell')
    expect(grass.stillTime).toBe(14)
    const own = Object.keys(grass.params).filter((key) => !(key in ditherParams))
    expect(own).toEqual(['spacing', 'height', 'sway', 'ink', 'partRadius'])
    expect(groupParams(grass.params).map((group) => group.group)).toEqual(['Color', 'Pattern', 'Pointer', 'Dither', 'Motion'])
    expect(grass.params.partRadius.group).toBe('Pointer')
  })

  it('has the constants of the original as defaults', () => {
    expect(defaultParams(grass)).toMatchObject({
      spacing: 3,
      height: 36,
      sway: 0.25,
      ink: 0.6,
      partRadius: 28,
      intensity: 0.35,
      tones: 5,
      cell: 4,
      speed: 1,
      pointer: 1,
    })
  })

  it('reads its params from the uniforms', () => {
    const source = shaderSource(grass)
    for (const key of ['spacing', 'height', 'sway', 'ink', 'partRadius', 'intensity']) expect(source).toContain(`u.${key}`)
    expect(source).not.toContain('const OPACITY')
  })

  it('fades the blades with the intensity, under the default only', () => {
    // FULL_INK in grass.wgsl. The blades are drawn over the page: without the fade, intensity 0
    // still drew them. At the default intensity they must keep the ink of the original.
    const source = shaderSource(grass)
    expect(source).toContain('ink * u.ink * smoothstep(0.0, FULL_INK, u.intensity)')
    const full = Number(/const FULL_INK = ([\d.]+);/.exec(source)?.[1])
    expect(full).toBeGreaterThan(0)
    expect(full).toBeLessThanOrEqual(grass.params.intensity.default)
  })

  it('searches enough blades for the densest and tallest grass of the panel', () => {
    // A cell looks for blades `height + 2` cells away on each side, one every `spacing` cells:
    // both ends of the range can fall on a blade.
    const { spacing, height } = grass.params
    const searched = Math.floor((2 * (height.max + 2)) / spacing.min) + 2
    const cap = Number(/const MAX_BLADES = (\d+);/.exec(shaderSource(grass))?.[1])
    expect(cap).toBeGreaterThanOrEqual(searched)
  })
})
