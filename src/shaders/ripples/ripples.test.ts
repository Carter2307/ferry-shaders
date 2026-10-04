import { describe, expect, it } from 'vitest'

import { ditherParams } from '../../core/dither'
import { shaderSource } from '../../core/layout'
import { defaultParams, groupParams } from '../../core/params'

import { ripples } from './index'

// The pixels of the port are compared with the original shader in test/ (Dawn).

describe('ripples', () => {
  it('is a dither shader with five params of its own', () => {
    expect(ripples.id).toBe('ripples')
    expect(ripples.resolution).toBe('cell')
    expect(ripples.stillTime).toBe(14)
    const own = Object.keys(ripples.params).filter((key) => !(key in ditherParams))
    expect(own).toEqual(['frequency', 'falloff', 'contrast', 'wobble', 'pointerWave'])
    expect(groupParams(ripples.params).map((group) => group.group)).toEqual(['Color', 'Pattern', 'Pointer', 'Dither', 'Motion'])
    expect(ripples.params.pointerWave.group).toBe('Pointer')
  })

  it('has the constants of the original as defaults', () => {
    expect(defaultParams(ripples)).toMatchObject({
      frequency: 26,
      falloff: 2,
      contrast: 0.3,
      wobble: 0.025,
      pointerWave: 1.4,
      intensity: 0.35,
      tones: 5,
      cell: 4,
      speed: 1,
      pointer: 1,
    })
  })

  it('reads its params from the uniforms', () => {
    const source = shaderSource(ripples)
    for (const key of ['frequency', 'falloff', 'contrast', 'wobble', 'pointerWave', 'intensity']) expect(source).toContain(`u.${key}`)
    expect(source).not.toContain('const OPACITY')
  })

  it('offers no value that divides by zero', () => {
    // The wave is divided by 1 + falloff * distance.
    expect(ripples.params.falloff.min).toBeGreaterThanOrEqual(0)
    expect(ripples.params.frequency.min).toBeGreaterThan(0)
  })
})
