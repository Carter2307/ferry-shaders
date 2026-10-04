import { describe, expect, expectTypeOf, it } from 'vitest'

import { resolveColors } from './color'
import { defineDitherShader, ditherParams } from './dither'
import { shaderSource } from './layout'
import { defaultParams, groupParams, resolveParams } from './params'
import type { ParamSchema } from './types'

const BODY = 'fn field(px: vec2f, uv: vec2f) -> f32 { return veil(px, uv.x * u.bands, u.intensity); }'

const base = {
  id: 'dither-test',
  name: 'Dither test',
  technique: 'bands',
  description: 'A shader for the dither tests.',
  pointerEffect: 'None.',
  body: BODY,
} as const

const shader = defineDitherShader({
  ...base,
  params: {
    bands: { type: 'number', label: 'Bands', default: 4, min: 1, max: 12, step: 1 },
    mode: {
      type: 'select',
      label: 'Mode',
      group: 'Look',
      default: 'soft',
      options: [
        { value: 'soft', label: 'Soft' },
        { value: 'hard', label: 'Hard' },
      ],
    },
  },
})

describe('ditherParams', () => {
  it('declares the shared params in panel order', () => {
    expect(Object.keys(ditherParams)).toEqual(['color', 'midColor', 'background', 'intensity', 'tones', 'cell', 'speed', 'pointer'])
    expect(groupParams(ditherParams).map((group) => group.group)).toEqual(['Color', 'Dither', 'Motion'])
  })

  it('has black on white as the default palette, and the other defaults of the original shaders', () => {
    const defaults = Object.fromEntries(Object.entries(ditherParams).map(([key, def]) => [key, def.default]))
    expect(defaults).toEqual({
      color: '#000000',
      midColor: 'auto',
      background: '#ffffff',
      intensity: 0.35,
      tones: 5,
      cell: 4,
      speed: 1,
      pointer: 1,
    })
    expect(ditherParams.midColor.auto).toEqual({ from: 'color', to: 'background', mix: 0.57 })
  })
})

describe('defineDitherShader', () => {
  it('puts the shared colors first, then the own params, then the other shared params', () => {
    expect(Object.keys(shader.params)).toEqual([
      'color',
      'midColor',
      'background',
      'bands',
      'mode',
      'intensity',
      'tones',
      'cell',
      'speed',
      'pointer',
    ])
  })

  it('groups the own params under Pattern unless they say otherwise', () => {
    const params: ParamSchema = shader.params
    expect(params.bands?.group).toBe('Pattern')
    expect(params.mode?.group).toBe('Look')
    expect(groupParams(shader.params).map((group) => group.group)).toEqual(['Color', 'Pattern', 'Look', 'Dither', 'Motion'])
  })

  it('is a cell shader with a still frame at 14 seconds', () => {
    expect(shader.resolution).toBe('cell')
    expect(shader.stillTime).toBe(14)
    expect(defineDitherShader({ ...base, stillTime: 3 }).stillTime).toBe(3)
  })

  it('places the body after the dither prelude', () => {
    const source = shaderSource(shader)
    expect(source).toContain('fn fs_main(')
    expect(source).toContain('fn dither(lum: f32, px: vec2f) -> vec4f')
    expect(source.endsWith(BODY)).toBe(true)
    expect(source.indexOf('struct Uniforms')).toBeLessThan(source.indexOf('fn fs_main('))
    // The palette comes from uniforms: no constant of the original is left.
    expect(source).not.toMatch(/WHITE_BACKGROUND|const (DUNE|SAND|PAPER)/)
  })

  it('types the values: shared params and own params', () => {
    const values = defaultParams(shader)
    expectTypeOf(values.color).toEqualTypeOf<string>()
    expectTypeOf(values.tones).toEqualTypeOf<number>()
    expectTypeOf(values.bands).toEqualTypeOf<number>()
    expectTypeOf(values.mode).toEqualTypeOf<'soft' | 'hard'>()
    expect(values).toMatchObject({ color: '#000000', midColor: 'auto', bands: 4, mode: 'soft', tones: 5 })
  })

  it('changes the default of a shared param with overrides, and leaves ditherParams alone', () => {
    const paper = defineDitherShader({ ...base, overrides: { background: '#fbf7f0', cell: 3 } })
    expect(paper.params.background.default).toBe('#fbf7f0')
    expect(paper.params.cell.default).toBe(3)
    expect(paper.params.background.label).toBe('Background')
    expect(ditherParams.background.default).toBe('#ffffff')
    expect(ditherParams.cell.default).toBe(4)
  })

  it('works with no param of its own', () => {
    expect(Object.keys(defineDitherShader(base).params)).toEqual(Object.keys(ditherParams))
  })

  it('refuses an own param with the name of a shared one', () => {
    expect(() => defineDitherShader({ ...base, params: { tones: { type: 'number', label: 'T', default: 1, min: 0, max: 2, step: 1 } } })).toThrow(
      /"tones" is a shared dither parameter/,
    )
  })

  it('checks the own params like defineShader', () => {
    expect(() => defineDitherShader({ ...base, params: { from: { type: 'number', label: 'F', default: 1, min: 0, max: 2, step: 1 } } })).toThrow(
      /reserved word of WGSL/,
    )
  })

  it('mixes the mid tone from the two others by default', () => {
    const values = resolveParams(shader, { color: '#000000', background: '#ffffff' })
    const colors = resolveColors(shader.params, values)
    expect(colors.midColor![0]).toBeCloseTo(0.57, 6)
    expect(colors.midColor![3]).toBe(1)
  })
})
