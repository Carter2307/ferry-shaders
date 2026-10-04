import { describe, expect, it } from 'vitest'

import { ditherParams } from '../../core/dither'
import { shaderSource } from '../../core/layout'
import { defaultParams, groupParams } from '../../core/params'

import { dunes } from './index'

// The pixels of the port are compared with the original shader in test/ (Dawn).

describe('dunes', () => {
  it('is a dither shader with six params of its own', () => {
    expect(dunes.id).toBe('dunes')
    expect(dunes.resolution).toBe('cell')
    expect(dunes.stillTime).toBe(14)
    const own = Object.keys(dunes.params).filter((key) => !(key in ditherParams))
    expect(own).toEqual(['ripples', 'crest', 'meander', 'lee', 'relief', 'gust'])
    expect(groupParams(dunes.params).map((group) => group.group)).toEqual(['Color', 'Pattern', 'Pointer', 'Dither', 'Motion'])
    expect(dunes.params.gust.group).toBe('Pointer')
  })

  it('has the constants of the original as defaults', () => {
    expect(defaultParams(dunes)).toMatchObject({
      ripples: 22,
      crest: 0.76,
      meander: 4,
      lee: 0.6,
      relief: 0.25,
      gust: 3,
      intensity: 0.35,
      tones: 5,
      cell: 4,
      speed: 1,
      pointer: 1,
    })
  })

  it('reads its params from the uniforms', () => {
    const source = shaderSource(dunes)
    for (const key of ['ripples', 'crest', 'meander', 'lee', 'relief', 'gust', 'intensity']) expect(source).toContain(`u.${key}`)
    expect(source).not.toContain('const OPACITY')
  })
})
