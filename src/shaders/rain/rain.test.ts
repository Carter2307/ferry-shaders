import { describe, expect, it } from 'vitest'

import { ditherParams } from '../../core/dither'
import { shaderSource } from '../../core/layout'
import { defaultParams, groupParams } from '../../core/params'

import { rain } from './index'

// The pixels of the port are compared with the original shader in test/ (Dawn).

describe('rain', () => {
  it('is a dither shader with six params of its own', () => {
    expect(rain.id).toBe('rain')
    expect(rain.resolution).toBe('cell')
    expect(rain.stillTime).toBe(14)
    const own = Object.keys(rain.params).filter((key) => !(key in ditherParams))
    expect(own).toEqual(['drops', 'brickSize', 'shards', 'burst', 'calm', 'umbrella'])
    expect(groupParams(rain.params).map((group) => group.group)).toEqual(['Color', 'Pattern', 'Pointer', 'Dither', 'Motion'])
  })

  it('has the constants of the original as defaults, on a white page', () => {
    expect(defaultParams(rain)).toMatchObject({
      drops: 3,
      brickSize: 3,
      shards: 10,
      burst: 80,
      calm: 0.2,
      umbrella: 10,
      background: '#ffffff',
      intensity: 0.35,
      tones: 5,
      cell: 4,
      speed: 1,
      pointer: 1,
    })
  })

  it('reads its params from the uniforms', () => {
    const source = shaderSource(rain)
    for (const key of ['drops', 'brickSize', 'shards', 'burst', 'calm', 'umbrella', 'intensity', 'focus']) {
      expect(source).toContain(`u.${key}`)
    }
    expect(source).not.toContain('const OPACITY')
  })

  it('opens the umbrella from the presence of the pointer, not from a fixed share of u.amount', () => {
    // u.amount is the presence times the `pointer` param: against a fixed 0.5, half of the range
    // of the param would do nothing. The pixels are checked in test/rain.test.ts (Dawn).
    const source = shaderSource(rain)
    expect(source).toContain('u.amount > 0.5 * u.pointer')
    expect(source).toContain('u.umbrella * u.pointer')
  })

  it('caps the loops that a param drives', () => {
    const source = shaderSource(rain)
    expect(source).toContain('min(i32(u.shards), MAX_SHARDS)')
    expect(source).toContain('min(i32(u.drops), MAX_DROPS)')
    // The lanes checked follow the reach of the shards, up to a fixed number.
    expect(source).toContain('MAX_LANE_REACH)')
  })
})
