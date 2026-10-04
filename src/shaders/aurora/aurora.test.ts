import { describe, expect, it } from 'vitest'

import { ditherParams } from '../../core/dither'
import { shaderSource } from '../../core/layout'
import { defaultParams, groupParams } from '../../core/params'

import { aurora } from './index'

// The pixels of the port are compared with the original shader in test/ (Dawn).

describe('aurora', () => {
  it('is a dither shader with six params of its own', () => {
    expect(aurora.id).toBe('aurora')
    expect(aurora.resolution).toBe('cell')
    expect(aurora.stillTime).toBe(14)
    const own = Object.keys(aurora.params).filter((key) => !(key in ditherParams))
    expect(own).toEqual(['curtains', 'rays', 'rayContrast', 'fade', 'sway', 'swell'])
    expect(groupParams(aurora.params).map((group) => group.group)).toEqual(['Color', 'Pattern', 'Pointer', 'Dither', 'Motion'])
    expect(aurora.params.swell.group).toBe('Pointer')
  })

  it('has the constants of the original as defaults', () => {
    expect(defaultParams(aurora)).toMatchObject({
      curtains: 3,
      rays: 55,
      rayContrast: 0.75,
      fade: 3.5,
      sway: 0.08,
      swell: 0.8,
      intensity: 0.35,
      tones: 5,
      cell: 4,
      speed: 1,
      pointer: 1,
    })
  })

  it('reads its params from the uniforms', () => {
    const source = shaderSource(aurora)
    for (const key of ['curtains', 'rays', 'rayContrast', 'fade', 'sway', 'swell', 'intensity']) expect(source).toContain(`u.${key}`)
    expect(source).not.toContain('const OPACITY')
  })
})
