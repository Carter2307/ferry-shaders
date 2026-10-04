import { describe, expect, it } from 'vitest'

import { hasPageColors, mixColors, parseColor, resolveColor, resolveColors } from './color'
import type { ParamSchema, Rgba } from './types'

const close = (actual: Rgba | null, expected: readonly number[]) => {
  expect(actual).not.toBeNull()
  actual!.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, 5))
}

describe('parseColor', () => {
  it('reads hex colors', () => {
    expect(parseColor('#fff')).toEqual([1, 1, 1, 1])
    expect(parseColor('#f008')).toEqual([1, 0, 0, 136 / 255])
    expect(parseColor('#d9c4a3')).toEqual([217 / 255, 196 / 255, 163 / 255, 1])
    expect(parseColor('#D9C4A380')).toEqual([217 / 255, 196 / 255, 163 / 255, 128 / 255])
  })

  it('reads rgb() with commas', () => {
    expect(parseColor('rgb(217, 196, 163)')).toEqual([217 / 255, 196 / 255, 163 / 255, 1])
    expect(parseColor('rgba(255,0,0,0.5)')).toEqual([1, 0, 0, 0.5])
    expect(parseColor('rgba(255, 0, 0, 25%)')).toEqual([1, 0, 0, 0.25])
  })

  it('reads rgb() with spaces and a slash alpha', () => {
    expect(parseColor('rgb(217 196 163)')).toEqual([217 / 255, 196 / 255, 163 / 255, 1])
    expect(parseColor('rgb(0 0 255 / 50%)')).toEqual([0, 0, 1, 0.5])
    expect(parseColor('rgb(0 0 255 / .5)')).toEqual([0, 0, 1, 0.5])
    expect(parseColor('RGB( 0  0  255 / 1 )')).toEqual([0, 0, 1, 1])
  })

  it('reads percentages and clamps out-of-range values', () => {
    close(parseColor('rgb(100% 50% 0%)'), [1, 0.5, 0, 1])
    expect(parseColor('rgb(300 -20 0 / 4)')).toEqual([1, 0, 0, 1])
  })

  it('reads transparent', () => {
    expect(parseColor('transparent')).toEqual([0, 0, 0, 0])
    expect(parseColor('  Transparent ')).toEqual([0, 0, 0, 0])
  })

  it('returns null for everything the browser must resolve', () => {
    for (const value of ['red', 'currentColor', 'var(--primary)', 'oklch(0.7 0.1 80)', 'hsl(20 50% 50%)', 'auto', '']) {
      expect(parseColor(value)).toBeNull()
    }
  })

  it('returns null for a malformed literal', () => {
    for (const value of ['#12', '#12345', '#ggg', 'rgb(1 2)', 'rgb(1, 2, 3, 4, 5)', 'rgb(a b c)', 'rgb(1 2 3 / 4 / 5)']) {
      expect(parseColor(value)).toBeNull()
    }
  })
})

describe('resolveColor', () => {
  it('reads literals with no DOM', () => {
    expect(resolveColor('#000')).toEqual([0, 0, 0, 1])
  })

  it('cannot resolve page colors with no DOM', () => {
    // This file runs in Node: there is no document.
    expect(typeof document).toBe('undefined')
    expect(resolveColor('var(--primary)')).toBeNull()
    expect(resolveColor('rebeccapurple')).toBeNull()
  })
})

describe('mixColors', () => {
  it('mixes two opaque colors in sRGB', () => {
    close(mixColors([1, 0, 0, 1], [0, 0, 1, 1], 0.25), [0.75, 0, 0.25, 1])
    close(mixColors([0.2, 0.4, 0.6, 1], [1, 1, 1, 1], 0), [0.2, 0.4, 0.6, 1])
    close(mixColors([0.2, 0.4, 0.6, 1], [1, 1, 1, 1], 1), [1, 1, 1, 1])
  })

  it('fades toward transparent without darkening the color', () => {
    close(mixColors([0.8, 0.6, 0.4, 1], [0, 0, 0, 0], 0.5), [0.8, 0.6, 0.4, 0.5])
    expect(mixColors([0, 0, 0, 0], [0, 0, 0, 0], 0.5)).toEqual([0, 0, 0, 0])
  })
})

describe('resolveColors', () => {
  const schema = {
    color: { type: 'color', label: 'Color', default: '#ff0000' },
    mid: { type: 'color', label: 'Mid', default: 'auto', auto: { from: 'color', to: 'background', mix: 0.5 } },
    background: { type: 'color', label: 'Background', default: '#0000ff' },
    scale: { type: 'number', label: 'Scale', default: 1, min: 0, max: 2, step: 0.1 },
  } as const satisfies ParamSchema

  it('resolves only the color params', () => {
    const colors = resolveColors(schema, { color: '#00ff00', mid: '#ffffff', background: '#000000', scale: 1 })
    expect(colors).toEqual({ color: [0, 1, 0, 1], mid: [1, 1, 1, 1], background: [0, 0, 0, 1] })
  })

  it('computes auto from the current values of the two ends', () => {
    const colors = resolveColors(schema, { color: '#ffffff', mid: 'auto', background: '#000000' })
    close(colors.mid!, [0.5, 0.5, 0.5, 1])
  })

  it('falls back to the default of the param, then to transparent', () => {
    // 'nonsense' is not a color; `resolve` cannot read 'red' either (pure parser).
    const colors = resolveColors(schema, { color: 'nonsense', mid: 'red', background: 'transparent' })
    expect(colors.color).toEqual([1, 0, 0, 1])
    close(colors.mid!, [1, 0, 0, 0.5])
    expect(resolveColors({ a: { type: 'color', label: 'A', default: 'red' } }, { a: 'blue' })).toEqual({ a: [0, 0, 0, 0] })
  })

  it('uses the resolver it is given', () => {
    const colors = resolveColors(schema, { color: 'var(--ink)', mid: 'auto', background: '#000' }, (value) =>
      value === 'var(--ink)' ? [0.2, 0.4, 0.6, 1] : null,
    )
    expect(colors.color).toEqual([0.2, 0.4, 0.6, 1])
    // The resolver knows nothing else: the background falls back to transparent, and the mix follows.
    expect(colors.background).toEqual([0, 0, 0, 0])
    close(colors.mid!, [0.2, 0.4, 0.6, 0.5])
  })
})

describe('hasPageColors', () => {
  const schema = {
    color: { type: 'color', label: 'Color', default: '#ff0000' },
    mid: { type: 'color', label: 'Mid', default: 'auto', auto: { from: 'color', to: 'color', mix: 0.5 } },
  } as const satisfies ParamSchema

  it('is false for literals and auto', () => {
    expect(hasPageColors(schema, { color: 'rgb(1 2 3)', mid: 'auto' })).toBe(false)
  })

  it('is true for tokens, named colors and currentColor', () => {
    expect(hasPageColors(schema, { color: 'var(--primary)', mid: 'auto' })).toBe(true)
    expect(hasPageColors(schema, { color: '#fff', mid: 'currentColor' })).toBe(true)
  })
})
