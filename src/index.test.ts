import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import * as core from './core'
import * as api from './index'

// This file runs in Node, with no DOM: the same conditions as a server render.

/** `pixel-field` -> `pixelField`: the name of the definition of a shader. */
const camelCase = (id: string) => id.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase())
/** `pixel-field` -> `PixelField`: the name of the component of a shader. */
const pascalCase = (id: string) => camelCase(id).replace(/^\w/, (letter) => letter.toUpperCase())

describe('public entry', () => {
  it('exports the engine, the React bindings, and a definition and a component per shader', () => {
    const fixed = [
      // core
      'HEADER_BYTES',
      'buildLayout',
      'defaultParams',
      'defineDitherShader',
      'defineShader',
      'ditherParams',
      'groupParams',
      'isWebGpuSupported',
      'mixColors',
      'mountShader',
      'packParams',
      'parseColor',
      'resolveColor',
      'resolveColors',
      'resolveParams',
      'shaderLayout',
      'shaderSource',
      'writeFrame',
      // shaders
      'getShader',
      'shaders',
      // react
      'ShaderCanvas',
      'ShaderPanel',
      'createShaderComponent',
      'useShaderControls',
    ]
    // A shader needs no change here: its two exports are named after its id.
    const perShader = api.shaders.flatMap((shader) => [camelCase(shader.id), pascalCase(shader.id)])
    expect(Object.keys(api).sort()).toEqual([...fixed, ...perShader].sort())
  })

  it('exports each shader under the name of its id, with its component', () => {
    const exports: Record<string, unknown> = api
    for (const shader of api.shaders) {
      expect(exports[camelCase(shader.id)]).toBe(shader)
      expect(exports[pascalCase(shader.id)]).toMatchObject({ displayName: pascalCase(shader.id) })
    }
  })

  it('exports the engine alone from ./core', () => {
    for (const name of Object.keys(core)) expect(api).toHaveProperty(name)
    expect(core).not.toHaveProperty('ShaderCanvas')
  })

  it('loads with no DOM and reports no WebGPU', () => {
    expect(typeof document).toBe('undefined')
    expect(api.isWebGpuSupported()).toBe(false)
  })

  it('renders its components on a server', () => {
    const canvas = renderToString(createElement(api.ShaderCanvas, { shader: api.drift, className: 'absolute inset-0' }))
    expect(canvas).toContain('data-status="pending"')
    const drift = renderToString(createElement(api.Drift, { scale: 3, fallback: 'fallback' }))
    expect(drift).toContain('data-shader="drift"')
    expect(drift).not.toContain('fallback')
    const Probe = () => createElement('output', null, String(api.useShaderControls(api.drift, { storageKey: 'k' }).values.scale))
    expect(renderToString(createElement(Probe))).toBe('<output>2.4</output>')
  })
})

describe('shader registry', () => {
  it('lists every shader once, with a unique kebab-case id', () => {
    const ids = api.shaders.map((shader) => shader.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('drift')
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)
  })

  it('finds a shader by id', () => {
    expect(api.getShader('drift')).toBe(api.drift)
    expect(api.getShader('missing')).toBeUndefined()
  })

  it('gives every shader the texts a gallery needs', () => {
    for (const shader of api.shaders) {
      for (const text of [shader.name, shader.technique, shader.description, shader.pointerEffect]) {
        expect(text.trim().length).toBeGreaterThan(0)
      }
      expect(shader.fragment).toMatch(/\bfn\s+fs_main\b/)
      expect(() => api.shaderSource(shader)).not.toThrow()
    }
  })
})
