import { describe, expect, it } from 'vitest'

import { ditherParams } from '../../core/dither'
import { shaderSource } from '../../core/layout'
import { defaultParams, groupParams } from '../../core/params'

import { relief } from './index'

// The pixels of the port are compared with the original shader in test/ (Dawn).

describe('relief', () => {
  it('is a dither shader with six params of its own', () => {
    expect(relief.id).toBe('relief')
    expect(relief.resolution).toBe('cell')
    expect(relief.stillTime).toBe(14)
    const own = Object.keys(relief.params).filter((key) => !(key in ditherParams))
    expect(own).toEqual(['contours', 'scale', 'lineWidth', 'lineStrength', 'shading', 'hill'])
    expect(groupParams(relief.params).map((group) => group.group)).toEqual(['Color', 'Pattern', 'Pointer', 'Dither', 'Motion'])
    expect(relief.params.hill.group).toBe('Pointer')
  })

  it('has the constants of the original as defaults', () => {
    expect(defaultParams(relief)).toMatchObject({
      contours: 14,
      scale: 1.6,
      lineWidth: 1.2,
      lineStrength: 0.38,
      shading: 0.45,
      hill: 0.35,
      intensity: 0.35,
      tones: 5,
      cell: 4,
      speed: 1,
      pointer: 1,
    })
  })

  it('reads its params from the uniforms', () => {
    const source = shaderSource(relief)
    for (const key of ['contours', 'scale', 'lineWidth', 'lineStrength', 'shading', 'hill', 'intensity']) {
      expect(source).toContain(`u.${key}`)
    }
    expect(source).not.toContain('const OPACITY')
    expect(source).not.toContain('const CONTOURS')
  })

  it('offers no value that divides by zero', () => {
    // The terraces are divided by the number of levels; the lines need a width.
    expect(relief.params.contours.min).toBeGreaterThanOrEqual(1)
    expect(relief.params.lineWidth.min).toBeGreaterThan(0)
  })
})
