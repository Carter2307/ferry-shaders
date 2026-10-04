import { describe, expect, expectTypeOf, it } from 'vitest'

import { defineShader, type ShaderInit } from './define'
import { defaultParams, groupParams, resolveParams } from './params'
import type { ParamSchema, ParamValues } from './types'

const FRAGMENT = '@fragment fn fs_main() -> @location(0) vec4f { return vec4f(0.0); }'

const base = {
  id: 'params-test',
  name: 'Params test',
  technique: 'none',
  description: 'A shader for the params tests.',
  pointerEffect: 'None.',
  resolution: 'device',
  fragment: FRAGMENT,
} as const

const shader = defineShader({
  ...base,
  params: {
    ink: { type: 'color', label: 'Ink', group: 'Color', default: '#112233' },
    accent: { type: 'color', label: 'Accent', group: 'Color', default: 'auto', auto: { from: 'ink', to: 'ink', mix: 0.5 } },
    falloff: { type: 'number', label: 'Falloff', group: 'Shape', default: 2.6, min: 0, max: 8, step: 0.1 },
    invert: { type: 'boolean', label: 'Invert', default: false },
    origin: {
      type: 'select',
      label: 'Origin',
      group: 'Shape',
      default: 'top',
      options: [
        { value: 'top', label: 'Top' },
        { value: 'bottom', label: 'Bottom' },
      ],
    },
    speed: { type: 'number', label: 'Speed', group: 'Motion', default: 1, min: 0, max: 3, step: 0.05 },
  },
})

/** A definition with one param, to test what `defineShader` refuses. */
const define = (params: ParamSchema, extra: Partial<ShaderInit<ParamSchema>> = {}) => defineShader({ ...base, params, ...extra })
const number = { type: 'number', label: 'N', default: 1, min: 0, max: 2, step: 0.1 } as const

describe('defaultParams', () => {
  it('gives the default of every param', () => {
    expect(defaultParams(shader)).toEqual({ ink: '#112233', accent: 'auto', falloff: 2.6, invert: false, origin: 'top', speed: 1 })
  })

  it('keeps the literal types of a select', () => {
    expectTypeOf(defaultParams(shader)).toEqualTypeOf<{
      ink: string
      accent: string
      falloff: number
      invert: boolean
      origin: 'top' | 'bottom'
      speed: number
    }>()
    // With no schema, a value is any of the three value types.
    expectTypeOf<ParamValues[string]>().toEqualTypeOf<string | number | boolean>()
  })
})

describe('resolveParams', () => {
  it('replaces the defaults with the valid values', () => {
    const values = resolveParams(shader, { ink: 'var(--ink)', accent: '#fff', falloff: 4, invert: true, origin: 'bottom', speed: 0 })
    expect(values).toEqual({ ink: 'var(--ink)', accent: '#fff', falloff: 4, invert: true, origin: 'bottom', speed: 0 })
  })

  it('falls back to the default for a value of the wrong type', () => {
    const values = resolveParams(shader, { ink: 12, accent: '  ', falloff: '4', invert: 'yes', origin: 'left', speed: null })
    expect(values).toEqual(defaultParams(shader))
  })

  it('falls back to the default for a number that is not finite', () => {
    expect(resolveParams(shader, { falloff: Number.NaN }).falloff).toBe(2.6)
    expect(resolveParams(shader, { falloff: Number.POSITIVE_INFINITY }).falloff).toBe(2.6)
  })

  it('does not clamp numbers to the range of the schema', () => {
    expect(resolveParams(shader, { falloff: 100 }).falloff).toBe(100)
    expect(resolveParams(shader, { falloff: -3 }).falloff).toBe(-3)
  })

  it("accepts 'auto' only for a color that declares it", () => {
    expect(resolveParams(shader, { ink: 'auto' }).ink).toBe('#112233')
    expect(resolveParams(shader, { accent: 'auto' }).accent).toBe('auto')
  })

  it('drops unknown keys and accepts nothing at all', () => {
    expect(resolveParams(shader, { unknown: 1 })).toEqual(defaultParams(shader))
    expect(resolveParams(shader, null)).toEqual(defaultParams(shader))
    expect(resolveParams(shader)).toEqual(defaultParams(shader))
  })
})

describe('groupParams', () => {
  it('orders the groups by first appearance and keeps schema order inside a group', () => {
    const groups = groupParams(shader.params)
    expect(groups.map(({ group, entries }) => [group, entries.map((entry) => entry.key)])).toEqual([
      ['Color', ['ink', 'accent']],
      ['Shape', ['falloff', 'origin']],
      ['', ['invert']],
      ['Motion', ['speed']],
    ])
    expect(groups[0]!.entries[0]!.def).toBe(shader.params.ink)
  })

  it('gives no group for no param', () => {
    expect(groupParams({})).toEqual([])
  })
})

describe('defineShader', () => {
  it('returns the definition, frozen, with stillTime at 0 by default', () => {
    expect(shader.id).toBe('params-test')
    expect(shader.stillTime).toBe(0)
    expect(Object.isFrozen(shader)).toBe(true)
    expect(define({}, { stillTime: 12 }).stillTime).toBe(12)
  })

  it('refuses an id that is not kebab-case', () => {
    for (const id of ['Drift', 'pixel_field', 'pixel--field', '-drift', '9lives', '']) {
      expect(() => define({}, { id })).toThrow(/kebab-case/)
    }
    expect(() => define({}, { id: 'pixel-field-2' })).not.toThrow()
  })

  it('refuses a fragment with no fs_main and an unknown resolution', () => {
    expect(() => define({}, { fragment: 'fn main() {}' })).toThrow(/fs_main/)
    expect(() => define({}, { resolution: 'retina' as 'cell' })).toThrow(/resolution/)
  })

  it('refuses a param name that is not a camelCase identifier', () => {
    for (const key of ['Scale', 'my_scale', 'my-scale', '2x', '_scale', 'échelle', '']) {
      expect(() => define({ [key]: number })).toThrow(/camelCase/)
    }
    expect(() => define({ scale2X: number })).not.toThrow()
  })

  it('refuses the name of a header field', () => {
    for (const key of ['resolution', 'mouse', 'time', 'amount', 'pixelRatio', 'focus']) {
      expect(() => define({ [key]: number })).toThrow(/built-in uniform/)
    }
  })

  it('refuses a WGSL keyword or reserved word, and says so', () => {
    for (const key of ['from', 'filter', 'target', 'type', 'layout', 'smooth', 'loop', 'var', 'auto', 'mod']) {
      expect(() => define({ [key]: number })).toThrow(`parameter "${key}" is a keyword or a reserved word of WGSL`)
    }
    // Names of built-in functions and types are fine as struct members.
    expect(() => define({ mix: number, step: number, vec2f: number, color: number })).not.toThrow()
  })

  it('refuses an inconsistent number, boolean or select', () => {
    expect(() => define({ a: { ...number, default: Number.NaN } })).toThrow(/finite/)
    expect(() => define({ a: { ...number, min: 3, max: 2 } })).toThrow(/min above max/)
    expect(() => define({ a: { ...number, step: 0 } })).toThrow(/step/)
    expect(() => define({ a: { type: 'boolean', label: 'A', default: 1 as unknown as boolean } })).toThrow(/true or false/)
    expect(() => define({ a: { type: 'select', label: 'A', default: 'x', options: [] } })).toThrow(/at least one option/)
    expect(() => define({ a: { type: 'select', label: 'A', default: 'z', options: [{ value: 'x', label: 'X' }] } })).toThrow(/not one of its options/)
    expect(() =>
      define({
        a: {
          type: 'select',
          label: 'A',
          default: 'x',
          options: [
            { value: 'x', label: 'X' },
            { value: 'x', label: 'Again' },
          ],
        },
      }),
    ).toThrow(/same value/)
    expect(() => define({ a: { type: 'matrix', label: 'A', default: 1 } as unknown as typeof number })).toThrow(/unknown type/)
  })

  it('refuses an auto color that cannot be computed', () => {
    const ink = { type: 'color', label: 'Ink', default: '#000' } as const
    expect(() => define({ a: { type: 'color', label: 'A', default: 'auto' } })).toThrow(/declares no "auto" mix/)
    expect(() => define({ a: { type: 'color', label: 'A', default: '' } })).toThrow(/CSS color/)
    // An end that does not exist, that is not a color, that is the color itself, or that is auto too.
    expect(() => define({ ink, a: { ...ink, auto: { from: 'ink', to: 'missing', mix: 0.5 } } })).toThrow(/"missing"/)
    expect(() => define({ ink, n: number, a: { ...ink, auto: { from: 'ink', to: 'n', mix: 0.5 } } })).toThrow(/"n"/)
    expect(() => define({ ink, a: { ...ink, auto: { from: 'a', to: 'ink', mix: 0.5 } } })).toThrow(/"a"/)
    expect(() =>
      define({
        ink,
        a: { ...ink, auto: { from: 'ink', to: 'ink', mix: 0.5 } },
        b: { ...ink, auto: { from: 'ink', to: 'a', mix: 0.5 } },
      }),
    ).toThrow(/color "b": auto mixes "a"/)
  })

  it('refuses an engine param that is not a number', () => {
    for (const key of ['speed', 'cell', 'pointer']) {
      expect(() => define({ [key]: { type: 'boolean', label: 'B', default: true } })).toThrow(/read by the engine/)
    }
  })

  it('names the shader in the error', () => {
    expect(() => define({ from: number }, { id: 'my-shader' })).toThrow('[ferry-shaders] shader "my-shader"')
  })
})
