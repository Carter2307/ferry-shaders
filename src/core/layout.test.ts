import { describe, expect, it } from 'vitest'

import { resolveColors } from './color'
import { defineShader } from './define'
import { buildLayout, HEADER_BYTES, packParams, shaderLayout, shaderSource, writeFrame } from './layout'
import { resolveParams } from './params'
import type { ParamSchema } from './types'

/** One parameter of every type, with the colors mixed in between the others. */
const schema = {
  ink: { type: 'color', label: 'Ink', default: '#ff8000' },
  falloff: { type: 'number', label: 'Falloff', default: 2.6, min: 0, max: 8, step: 0.1 },
  accent: { type: 'color', label: 'Accent', default: 'auto', auto: { from: 'ink', to: 'paper', mix: 0.25 } },
  invert: { type: 'boolean', label: 'Invert', default: true },
  origin: {
    type: 'select',
    label: 'Origin',
    default: 'bottom',
    options: [
      { value: 'top', label: 'Top' },
      { value: 'bottom', label: 'Bottom' },
    ],
  },
  paper: { type: 'color', label: 'Paper', default: 'rgb(0 0 255 / 50%)' },
} as const satisfies ParamSchema

const shader = defineShader({
  id: 'layout-test',
  name: 'Layout test',
  technique: 'none',
  description: 'A shader for the layout tests.',
  pointerEffect: 'None.',
  resolution: 'device',
  params: schema,
  fragment: '@fragment fn fs_main() -> @location(0) vec4f { return u.ink; }',
})

describe('buildLayout', () => {
  const layout = buildLayout(schema)

  it('puts the colors after the header, then the other params, in schema order', () => {
    expect(HEADER_BYTES).toBe(48)
    expect(layout.offsets).toEqual({ ink: 48, accent: 64, paper: 80, falloff: 96, invert: 100, origin: 104 })
  })

  it('rounds the buffer size up to 16 bytes', () => {
    expect(layout.byteSize).toBe(112)
    expect(buildLayout({}).byteSize).toBe(48)
    expect(buildLayout({ a: schema.falloff }).byteSize).toBe(64)
    expect(buildLayout({ a: schema.ink }).byteSize).toBe(64)
    expect(buildLayout({ a: schema.ink, b: schema.falloff }).byteSize).toBe(80)
  })

  it('generates the Uniforms struct, the binding and the vertex stage', () => {
    const members = [...layout.wgsl.matchAll(/^ {2}(\w+): (\w+),/gm)].map((match) => `${match[1]}: ${match[2]}`)
    expect(members).toEqual([
      'resolution: vec2f',
      'mouse: vec2f',
      'time: f32',
      'amount: f32',
      'pixelRatio: f32',
      '_pad0: f32',
      'focus: vec2f',
      '_pad1: vec2f',
      'ink: vec4f',
      'accent: vec4f',
      'paper: vec4f',
      'falloff: f32',
      'invert: f32',
      'origin: f32',
    ])
    expect(layout.wgsl).toContain('struct Uniforms {')
    expect(layout.wgsl).toContain('@group(0) @binding(0) var<uniform> u: Uniforms;')
    expect(layout.wgsl).toMatch(/@vertex\s+fn vs_main\(@builtin\(vertex_index\) index: u32\) -> @builtin\(position\) vec4f/)
  })

  it('declares only the header for a schema with no params', () => {
    const members = [...buildLayout({}).wgsl.matchAll(/^ {2}(\w+): (\w+),/gm)]
    expect(members).toHaveLength(8)
  })
})

describe('shaderSource', () => {
  it('is the generated header followed by the fragment', () => {
    const source = shaderSource(shader)
    expect(source.startsWith(shaderLayout(shader).wgsl)).toBe(true)
    expect(source.endsWith(shader.fragment)).toBe(true)
  })

  it('builds the layout of a definition once', () => {
    expect(shaderLayout(shader)).toBe(shaderLayout(shader))
  })
})

describe('packParams', () => {
  const layout = buildLayout(schema)
  const pack = (partial: Record<string, unknown>) => {
    const values = resolveParams(shader, partial)
    const data = new Float32Array(layout.byteSize / 4).fill(-1)
    packParams(layout, schema, values, resolveColors(schema, values), data)
    return data
  }
  const at = (data: Float32Array, key: keyof typeof schema, length = 1) => {
    const index = layout.offsets[key]! / 4
    return Array.from(data.slice(index, index + length))
  }

  it('writes every param type at its offset', () => {
    const data = pack({ falloff: 4.5, invert: false, origin: 'top', ink: '#00ff00' })
    expect(at(data, 'ink', 4)).toEqual([0, 1, 0, 1])
    expect(at(data, 'paper', 4)).toEqual([0, 0, 1, 0.5])
    expect(at(data, 'falloff')).toEqual([4.5])
    expect(at(data, 'invert')).toEqual([0])
    expect(at(data, 'origin')).toEqual([0])
  })

  it('writes the defaults: a boolean as 0 or 1, a select as the index of its option', () => {
    const data = pack({})
    expect(at(data, 'ink', 4)).toEqual([1, Math.fround(128 / 255), 0, 1])
    expect(at(data, 'falloff')).toEqual([Math.fround(2.6)])
    expect(at(data, 'invert')).toEqual([1])
    expect(at(data, 'origin')).toEqual([1])
  })

  it('computes an auto color from the two colors it names', () => {
    // ink (1, 0, 0, 1) and paper (0, 0, 1, 1) at 25%.
    const data = pack({ ink: '#ff0000', paper: '#0000ff' })
    expect(at(data, 'accent', 4)).toEqual([0.75, 0, 0.25, 1])
    // An explicit value replaces the mix.
    expect(at(pack({ accent: '#ffffff' }), 'accent', 4)).toEqual([1, 1, 1, 1])
  })

  it('leaves the header alone', () => {
    expect(Array.from(pack({}).slice(0, 12))).toEqual(new Array(12).fill(-1))
  })
})

describe('writeFrame', () => {
  it('writes the 48-byte header', () => {
    const data = new Float32Array(16).fill(-1)
    writeFrame(data, { resolution: [320, 180], mouse: [12, 34], time: 1.5, amount: 0.25, pixelRatio: 0.5, focus: [40, 280] })
    expect(Array.from(data)).toEqual([320, 180, 12, 34, 1.5, 0.25, 0.5, 0, 40, 280, 0, 0, -1, -1, -1, -1])
  })
})
