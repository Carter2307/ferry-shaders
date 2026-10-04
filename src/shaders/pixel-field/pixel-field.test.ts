import { describe, expect, it } from 'vitest'

import { parseColor } from '../../core/color'
import { shaderSource } from '../../core/layout'
import { defaultParams, groupParams } from '../../core/params'

import { pixelField } from './index'

// The pixels of the port are compared with the original shader in test/ (Dawn).

/** `oklch(l c h)` as an sRGB hex color: OKLab to linear sRGB (the reference matrices), then the sRGB curve. */
function oklchToHex(l: number, c: number, h: number): string {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const medium = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const short = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ]
  const bytes = linear.map((value) => {
    const encoded = value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055
    return Math.round(Math.min(1, Math.max(0, encoded)) * 255)
  })
  return `#${bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

describe('pixel-field', () => {
  it('is a device shader with its own fs_main', () => {
    expect(pixelField.id).toBe('pixel-field')
    expect(pixelField.resolution).toBe('device')
    expect(pixelField.stillTime).toBe(12)
    expect(pixelField.fragment).toMatch(/@fragment\s+fn fs_main\b/)
    // Its hash, noise and fbm are its own: the dither prelude is not part of the module.
    expect(shaderSource(pixelField)).not.toContain('fn field')
  })

  it('shows its params in three groups', () => {
    expect(groupParams(pixelField.params).map((group) => [group.group, group.entries.map((entry) => entry.key)])).toEqual([
      ['Color', ['color', 'opacity', 'accent', 'accentOpacity']],
      ['Pattern', ['origin', 'falloff', 'cell', 'gap', 'wander', 'accentShare']],
      ['Motion', ['breathing', 'speed']],
    ])
  })

  it('has the constants of the original as defaults', () => {
    expect(defaultParams(pixelField)).toEqual({
      color: 'currentColor',
      opacity: 0.13,
      accent: '#3881f6',
      accentOpacity: 0.5,
      origin: 'top',
      falloff: 2.6,
      cell: 4,
      gap: 0.25,
      wander: 0.7,
      accentShare: 0.48,
      breathing: 0.28,
      speed: 1,
    })
  })

  it('has the light value of the ferry-ui token --primary-bright as its accent', () => {
    // tokens.css of ferry-ui: `--primary-bright: oklch(0.62 0.19 259.5)` on :root.
    expect(pixelField.params.accent.default).toBe(oklchToHex(0.62, 0.19, 259.5))
    // A literal: the pure parser reads it, so the accent shows with no stylesheet and on a server.
    expect(parseColor(pixelField.params.accent.default)).not.toBeNull()
  })

  it('keeps every default inside its range', () => {
    for (const [key, def] of Object.entries(pixelField.params)) {
      if (def.type !== 'number') continue
      expect(def.default, key).toBeGreaterThanOrEqual(def.min)
      expect(def.default, key).toBeLessThanOrEqual(def.max)
    }
  })

  it('reads its params from the uniforms', () => {
    const source = shaderSource(pixelField)
    // `speed` is not read by the shader: the engine multiplies the time by it.
    const read = Object.keys(pixelField.params).filter((key) => key !== 'speed')
    for (const key of read) expect(source, key).toMatch(new RegExp(`\\bu\\.${key}\\b`))
    expect(pixelField.fragment).not.toContain('u.speed')
  })

  it('does not react to the pointer', () => {
    expect(Object.keys(pixelField.params)).not.toContain('pointer')
    expect(pixelField.fragment).not.toMatch(/\bu\.(mouse|amount)\b/)
    expect(pixelField.pointerEffect).toMatch(/does not react/)
  })
})
