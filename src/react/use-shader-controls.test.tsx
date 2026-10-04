// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

import { defineShader } from '../core/define'
import type { ShaderDefinition } from '../core/types'
import { drift } from '../shaders/drift'

import { useShaderControls, type ShaderControls } from './use-shader-controls'

const other = defineShader({
  id: 'other-test',
  name: 'Other',
  technique: 'none',
  description: 'A second shader for the controls tests.',
  pointerEffect: 'None.',
  resolution: 'device',
  params: {
    color: { type: 'color', label: 'Color', group: 'Color', default: '#000000' },
    origin: {
      type: 'select',
      label: 'Origin',
      default: 'top',
      options: [
        { value: 'top', label: 'Top' },
        { value: 'bottom', label: 'Bottom' },
      ],
    },
    invert: { type: 'boolean', label: 'Invert', default: false },
  },
  fragment: '@fragment fn fs_main() -> @location(0) vec4f { return u.color; }',
})

const KEY = 'shader-ui:test'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useShaderControls', () => {
  it('starts with the defaults of the shader', () => {
    const { result } = renderHook(() => useShaderControls(drift))
    expect(result.current.shader).toBe(drift)
    expect(result.current.schema).toBe(drift.params)
    expect(result.current.values).toMatchObject({ color: '#000000', midColor: 'auto', scale: 2.4, warp: 2.6, glow: 0.2, tones: 5, cell: 4 })
    expect(result.current.isDefault).toBe(true)
    expect(result.current.toProps()).toEqual({})
    expect(result.current.groups.map((group) => group.group)).toEqual(['Color', 'Pattern', 'Pointer', 'Dither', 'Motion'])
  })

  it('sets one value and several values', () => {
    const { result } = renderHook(() => useShaderControls(drift))
    act(() => result.current.set('scale', 5))
    expect(result.current.values.scale).toBe(5)
    expect(result.current.isDefault).toBe(false)
    act(() => result.current.setMany({ color: 'var(--primary)', tones: 3 }))
    expect(result.current.values).toMatchObject({ scale: 5, color: 'var(--primary)', tones: 3, warp: 2.6 })
  })

  it('keeps both values when set is called twice before a render', () => {
    const { result } = renderHook(() => useShaderControls(drift))
    act(() => {
      result.current.set('scale', 5)
      result.current.set('warp', 1)
    })
    expect(result.current.values).toMatchObject({ scale: 5, warp: 1 })
  })

  it('gives only the changed values as props', () => {
    const { result } = renderHook(() => useShaderControls(drift))
    act(() => result.current.setMany({ scale: 5, background: 'transparent', warp: 2.6 }))
    // `warp` was set to its default: it is not a change.
    expect(result.current.toProps()).toEqual({ scale: 5, background: 'transparent' })
  })

  it('resets one value, then all of them', () => {
    const { result } = renderHook(() => useShaderControls(drift))
    act(() => result.current.setMany({ scale: 5, warp: 1 }))
    act(() => result.current.reset('scale'))
    expect(result.current.values).toMatchObject({ scale: 2.4, warp: 1 })
    act(() => result.current.reset())
    expect(result.current.values.warp).toBe(2.6)
    expect(result.current.isDefault).toBe(true)
  })

  it('falls back to the default for a value that is not valid', () => {
    const { result } = renderHook(() => useShaderControls(other))
    act(() => result.current.set('origin', 'left' as 'top'))
    expect(result.current.values.origin).toBe('top')
    act(() => result.current.set('origin', 'bottom'))
    expect(result.current.values.origin).toBe('bottom')
  })

  it('remembers the values of each shader when the shader changes', () => {
    const { result, rerender } = renderHook(({ shader }: { shader: ShaderDefinition }) => useShaderControls(shader), {
      initialProps: { shader: drift as ShaderDefinition },
    })
    act(() => result.current.set('scale', 5))
    rerender({ shader: other })
    expect(result.current.shader).toBe(other)
    expect(result.current.values).toEqual({ color: '#000000', origin: 'top', invert: false })
    act(() => result.current.set('invert', true))
    rerender({ shader: drift })
    expect(result.current.values.scale).toBe(5)
    // The other shader has a `color` too: its value did not leak into this one.
    expect(result.current.values.color).toBe('#000000')
    rerender({ shader: other })
    expect(result.current.values.invert).toBe(true)
  })

  it('starts each shader from the initial values, and resets to the defaults', () => {
    const { result, rerender } = renderHook(
      ({ shader }: { shader: ShaderDefinition }) => useShaderControls(shader, { initial: { color: 'var(--primary)', scale: 4 } }),
      { initialProps: { shader: drift as ShaderDefinition } },
    )
    expect(result.current.values).toMatchObject({ color: 'var(--primary)', scale: 4 })
    expect(result.current.isDefault).toBe(false)
    expect(result.current.toProps()).toEqual({ color: 'var(--primary)', scale: 4 })
    // A change keeps the other initial values.
    act(() => result.current.set('warp', 1))
    expect(result.current.values).toMatchObject({ color: 'var(--primary)', scale: 4, warp: 1 })
    // Keys the shader does not have are ignored.
    rerender({ shader: other })
    expect(result.current.values).toEqual({ color: 'var(--primary)', origin: 'top', invert: false })
    act(() => result.current.reset())
    expect(result.current.values.color).toBe('#000000')
    expect(result.current.isDefault).toBe(true)
  })

  it('keeps the same object while nothing changes', () => {
    const { result, rerender } = renderHook(() => useShaderControls(drift))
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })

  it('types the values and the setters from the schema', () => {
    const { result } = renderHook(() => useShaderControls(other))
    expectTypeOf(result.current.values.origin).toEqualTypeOf<'top' | 'bottom'>()
    expectTypeOf(result.current.values.invert).toEqualTypeOf<boolean>()
    // @ts-expect-error: `invert` takes a boolean.
    act(() => result.current.set('invert', 'yes'))
    // A panel works on any shader: the typed controls fit the generic type.
    const generic: ShaderControls = result.current
    expect(generic.schema).toBe(other.params)
  })
})

describe('useShaderControls storage', () => {
  it('writes the changed values of every shader under the storage key', () => {
    const { result, rerender } = renderHook(
      ({ shader }: { shader: ShaderDefinition }) => useShaderControls(shader, { storageKey: KEY }),
      { initialProps: { shader: drift as ShaderDefinition } },
    )
    act(() => result.current.set('scale', 5))
    rerender({ shader: other })
    act(() => result.current.set('invert', true))
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual({ drift: { scale: 5 }, 'other-test': { invert: true } })
  })

  it('reads the stored values on the first render', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ drift: { scale: 7, color: '#123456' } }))
    const { result } = renderHook(() => useShaderControls(drift, { storageKey: KEY, initial: { scale: 4, warp: 1 } }))
    // Stored values replace the initial ones for that shader.
    expect(result.current.values).toMatchObject({ scale: 7, color: '#123456', warp: 2.6 })
  })

  it('checks what it reads: bad values and bad JSON fall back to the defaults', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ drift: { scale: 'big', tones: null, warp: 3 }, other: 'nonsense' }))
    const stored = renderHook(() => useShaderControls(drift, { storageKey: KEY }))
    expect(stored.result.current.values).toMatchObject({ scale: 2.4, tones: 5, warp: 3 })

    window.localStorage.setItem(KEY, '{not json')
    const broken = renderHook(() => useShaderControls(drift, { storageKey: KEY }))
    expect(broken.result.current.isDefault).toBe(true)

    window.localStorage.setItem(KEY, '[1, 2]')
    const list = renderHook(() => useShaderControls(drift, { storageKey: KEY }))
    expect(list.result.current.isDefault).toBe(true)
  })

  it('keeps working when the storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(() => useShaderControls(drift, { storageKey: KEY }))
    act(() => result.current.set('scale', 5))
    expect(result.current.values.scale).toBe(5)
  })

  it('stores nothing with no storage key', () => {
    const { result } = renderHook(() => useShaderControls(drift))
    act(() => result.current.set('scale', 5))
    expect(window.localStorage.length).toBe(0)
  })

  it('renders to a string with the defaults', () => {
    function Probe() {
      const controls = useShaderControls(drift, { storageKey: KEY })
      return <output>{String(controls.values.scale)}</output>
    }
    expect(renderToString(<Probe />)).toBe('<output>2.4</output>')
  })
})
