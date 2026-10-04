import { describe, expect, it } from 'vitest'

import { ditherParams } from '../../core/dither'
import { shaderSource } from '../../core/layout'
import { defaultParams, groupParams } from '../../core/params'

import { drift } from './index'

// The pixels of the port are compared with the original shader in test/ (Dawn).

describe('drift', () => {
  it('is a dither shader with three params of its own', () => {
    expect(drift.id).toBe('drift')
    expect(drift.resolution).toBe('cell')
    expect(drift.stillTime).toBe(14)
    const own = Object.keys(drift.params).filter((key) => !(key in ditherParams))
    expect(own).toEqual(['scale', 'warp', 'glow'])
    expect(groupParams(drift.params).map((group) => group.group)).toEqual(['Color', 'Pattern', 'Pointer', 'Dither', 'Motion'])
    // The glow only shows under the pointer.
    expect(drift.params.glow.group).toBe('Pointer')
  })

  it('has the constants of the original as defaults', () => {
    expect(defaultParams(drift)).toMatchObject({ scale: 2.4, warp: 2.6, glow: 0.2, intensity: 0.35, tones: 5, cell: 4, speed: 1, pointer: 1 })
  })

  it('reads its params from the uniforms', () => {
    const source = shaderSource(drift)
    for (const key of ['scale', 'warp', 'glow', 'intensity']) expect(source).toContain(`u.${key}`)
    expect(source).not.toContain('const OPACITY')
  })
})
