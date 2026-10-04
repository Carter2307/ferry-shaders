// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { defineShader } from '../core/define'
import type { ShaderStatus } from '../core/types'
import { drift } from '../shaders/drift'
import { fakeContext, installFakeBrowser, installFakeGpu, removeFakeGpu, settle, type FakeGpuLog } from '../test/fake-browser'

import { Drift } from './components'
import { createShaderComponent } from './create-shader-component'
import { ShaderCanvas } from './shader-canvas'

const number = (value: number) => ({ type: 'number', label: 'N', default: value, min: 0, max: 100, step: 1 }) as const

const plain = defineShader({
  id: 'plain-test',
  name: 'Plain',
  technique: 'none',
  description: 'A shader for the React tests.',
  pointerEffect: 'None.',
  resolution: 'cell',
  params: { color: { type: 'color', label: 'Color', default: '#ff0000' }, scale: number(2), cell: number(4) },
  fragment: '@fragment fn fs_main() -> @location(0) vec4f { return u.color; }',
})

const broken = defineShader({
  id: 'broken-test',
  name: 'Broken',
  technique: 'none',
  description: 'A shader that does not compile.',
  pointerEffect: 'None.',
  resolution: 'cell',
  params: {},
  fragment: '@fragment fn fs_main() -> @location(0) vec4f { return BROKEN; }',
})

/** Index of `scale` in the uniform buffer of `plain`: after the header and one color. */
const SCALE = (48 + 16) / 4

let gpu: FakeGpuLog | undefined

/** A fake GPU, fake frames, and a fake WebGPU context on every canvas. */
function withWebGpu() {
  const browser = installFakeBrowser()
  gpu = installFakeGpu()
  const contexts: ReturnType<typeof fakeContext>[] = []
  const createElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
    const element = createElement(tag, options)
    if (element instanceof HTMLCanvasElement) contexts.push(fakeContext(element))
    return element
  })
  return { browser, gpu, contexts }
}

/** Lets the device and the pipeline settle, inside `act` so React applies the status. */
const ready = () => act(settle)

afterEach(async () => {
  cleanup()
  await removeFakeGpu(gpu)
  gpu = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ShaderCanvas without WebGPU', () => {
  it('reports unsupported and renders the fallback', () => {
    const onStatusChange = vi.fn<(status: ShaderStatus) => void>()
    const { container } = render(
      <ShaderCanvas shader={drift} fallback={<p>No WebGPU here</p>} onStatusChange={onStatusChange} className="absolute inset-0" />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.dataset.status).toBe('unsupported')
    expect(root.dataset.shader).toBe('drift')
    expect(root.textContent).toBe('No WebGPU here')
    expect(onStatusChange.mock.calls).toEqual([['unsupported']])
    // The canvas stays in the document, but takes no room: the fallback is in its place.
    const canvas = root.querySelector('canvas')!
    expect(canvas.style.display).toBe('none')
    expect(canvas.style.opacity).toBe('0')
    expect(canvas.nextElementSibling?.textContent).toBe('No WebGPU here')
  })

  it('renders a decorative root that clips its canvas and takes no pointer event', () => {
    const { container } = render(
      <ShaderCanvas shader={drift} className="fixed inset-0" style={{ zIndex: 0 }} id="background" data-testid="shader" />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.tagName).toBe('DIV')
    expect(root.getAttribute('aria-hidden')).toBe('true')
    expect(root.className).toBe('fixed inset-0')
    expect(root.id).toBe('background')
    expect(root.dataset.testid).toBe('shader')
    expect(root.style.overflow).toBe('hidden')
    expect(root.style.zIndex).toBe('0')
    // No position of its own: the consumer places it.
    expect(root.style.position).toBe('')
    const canvas = root.querySelector('canvas')!
    expect(canvas.style.pointerEvents).toBe('none')
    expect(canvas.style.transition).toContain('opacity')
    expect(root.children).toHaveLength(1)
  })

  it('forwards its ref to the root element', () => {
    const ref = React.createRef<HTMLDivElement>()
    const { container } = render(<ShaderCanvas ref={ref} shader={drift} />)
    expect(ref.current).toBe(container.firstElementChild)
  })

  it('mounts and unmounts under StrictMode without an error', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount, rerender } = render(
      <React.StrictMode>
        <ShaderCanvas shader={drift} params={{ scale: 3 }} fallback="fallback" />
      </React.StrictMode>,
    )
    rerender(
      <React.StrictMode>
        <ShaderCanvas shader={drift} params={{ scale: 4 }} paused />
      </React.StrictMode>,
    )
    expect(() => unmount()).not.toThrow()
    expect(error).not.toHaveBeenCalled()
  })

  it('renders on a server as pending, with no fallback', () => {
    const html = renderToString(<ShaderCanvas shader={drift} fallback={<p>fallback</p>} className="absolute inset-0" />)
    expect(html).toContain('data-status="pending"')
    expect(html).toContain('data-shader="drift"')
    expect(html).toContain('<canvas')
    expect(html).not.toContain('fallback')
  })
})

describe('ShaderCanvas with WebGPU', () => {
  it('becomes ready and shows the canvas, under StrictMode too', async () => {
    const { contexts, gpu } = withWebGpu()
    const onStatusChange = vi.fn<(status: ShaderStatus) => void>()
    const { container } = render(
      <React.StrictMode>
        <ShaderCanvas shader={plain} fallback={<p>fallback</p>} onStatusChange={onStatusChange} />
      </React.StrictMode>,
    )
    const root = container.firstElementChild as HTMLElement
    const canvas = root.querySelector('canvas')!
    expect(root.dataset.status).toBe('pending')
    // Pending, the canvas already has its box: the engine is about to size it.
    expect([canvas.style.display, canvas.style.opacity]).toEqual(['block', '0'])
    await ready()
    expect(root.dataset.status).toBe('ready')
    expect([canvas.style.display, canvas.style.opacity]).toEqual(['block', '1'])
    expect(root.textContent).toBe('')
    expect(onStatusChange.mock.calls).toEqual([['ready']])
    // StrictMode mounted twice on the same canvas: only the second mount took it.
    expect(contexts).toHaveLength(1)
    expect(contexts[0]!.configure).toHaveBeenCalledTimes(1)
    expect(gpu.compiled).toHaveLength(1)
    expect(gpu.buffers.filter((buffer) => !buffer.destroyed)).toHaveLength(1)
  })

  it('sends param changes to the mounted shader, with no new mount', async () => {
    const { browser, contexts, gpu } = withWebGpu()
    const { rerender } = render(<ShaderCanvas shader={plain} params={{ scale: 3 }} />)
    await ready()
    expect(gpu.frames.at(-1)![SCALE]).toBe(3)
    rerender(<ShaderCanvas shader={plain} params={{ scale: 9 }} />)
    browser.frame(1000)
    expect(gpu.frames.at(-1)![SCALE]).toBe(9)
    expect(gpu.compiled).toHaveLength(1)
    expect(gpu.buffers).toHaveLength(1)
    expect(contexts[0]!.configure).toHaveBeenCalledTimes(1)
  })

  it('does not resolve the colors again for a new object with the same values', async () => {
    const { browser } = withWebGpu()
    const computed = vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({ color: 'rgb(1, 2, 3)' }) as CSSStyleDeclaration)
    const { rerender } = render(<ShaderCanvas shader={plain} params={{ color: 'var(--ink)', scale: 3 }} />)
    await ready()
    const reads = computed.mock.calls.length
    expect(reads).toBeGreaterThan(0)
    rerender(<ShaderCanvas shader={plain} params={{ color: 'var(--ink)', scale: 3 }} />)
    browser.frame(1000)
    expect(computed.mock.calls).toHaveLength(reads)
    rerender(<ShaderCanvas shader={plain} params={{ color: 'var(--ink)', scale: 4 }} />)
    browser.frame(2000)
    expect(computed.mock.calls.length).toBeGreaterThan(reads)
  })

  it('pauses and resumes the loop from the paused prop', async () => {
    const { browser } = withWebGpu()
    const { rerender } = render(<ShaderCanvas shader={plain} paused />)
    await ready()
    expect(browser.scheduled()).toBe(0)
    rerender(<ShaderCanvas shader={plain} />)
    expect(browser.scheduled()).toBe(1)
  })

  it('renders the fallback when the shader does not compile', async () => {
    withWebGpu()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(<ShaderCanvas shader={broken} fallback={<p>fallback</p>} />)
    await ready()
    const root = container.firstElementChild as HTMLElement
    expect(root.dataset.status).toBe('error')
    expect(root.textContent).toBe('fallback')
    expect(root.querySelector('canvas')!.style.display).toBe('none')
    expect(error).toHaveBeenCalledTimes(1)
  })

  it('takes the canvas out of the layout while a shader fails, and puts it back for one that compiles', async () => {
    const { gpu } = withWebGpu()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container, rerender } = render(<ShaderCanvas shader={plain} fallback={<p>fallback</p>} />)
    await ready()
    const root = container.firstElementChild as HTMLElement
    const canvas = root.querySelector('canvas')!
    // The size the engine gave the canvas: one cell, with no layout in jsdom.
    expect(canvas.style.width).toBe('4px')

    // An error after a frame was drawn: the canvas has a size, and it must not keep the room.
    rerender(<ShaderCanvas shader={broken} fallback={<p>fallback</p>} />)
    await ready()
    expect(root.dataset.status).toBe('error')
    expect(canvas.style.display).toBe('none')
    expect(root.textContent).toBe('fallback')

    const frames = gpu.frames.length
    rerender(<ShaderCanvas shader={drift} fallback={<p>fallback</p>} />)
    await ready()
    expect(root.dataset.status).toBe('ready')
    expect(gpu.frames.length).toBeGreaterThan(frames)
    expect([canvas.style.display, canvas.style.opacity]).toEqual(['block', '1'])
    expect(root.textContent).toBe('')
    // React only wrote `display` and `opacity`: the size set by the engine is still there.
    expect(canvas.style.width).toBe('4px')
  })

  it('switches shader on the same canvas', async () => {
    const { gpu, contexts } = withWebGpu()
    const { container, rerender } = render(<ShaderCanvas shader={plain} />)
    await ready()
    rerender(<ShaderCanvas shader={drift} />)
    await ready()
    expect((container.firstElementChild as HTMLElement).dataset.shader).toBe('drift')
    expect(gpu.compiled).toHaveLength(2)
    expect(gpu.compiled[1]).toContain('fn field(px: vec2f, uv: vec2f) -> f32')
    expect(contexts).toHaveLength(1)
  })

  it('disposes the shader when it unmounts', async () => {
    const { browser, gpu } = withWebGpu()
    const { unmount } = render(<ShaderCanvas shader={plain} />)
    await ready()
    expect(browser.scheduled()).toBe(1)
    unmount()
    expect(browser.scheduled()).toBe(0)
    expect(gpu.buffers.every((buffer) => buffer.destroyed)).toBe(true)
  })

  it('gives the element of focusRef to the shader', async () => {
    const { gpu } = withWebGpu()
    function Page() {
      const focus = React.useRef<HTMLElement>(null)
      return (
        <>
          <ShaderCanvas shader={plain} focusRef={focus} />
          <main ref={focus} />
        </>
      )
    }
    const { container } = render(<Page />)
    const box = (left: number, width: number) => () => ({ left, right: left + width, top: 0, bottom: 10, width, height: 10 }) as DOMRect
    container.querySelector('canvas')!.getBoundingClientRect = box(0, 400)
    container.querySelector('main')!.getBoundingClientRect = box(80, 240)
    await ready()
    const data = gpu.frames[0]!
    // The canvas is 1 cell wide in jsdom (no layout) and 400px wide on screen.
    expect([data[8], data[9]]).toEqual([Math.fround(80 / 400), Math.fround(320 / 400)])
  })
})

describe('createShaderComponent', () => {
  it('names the component after the shader', () => {
    expect(Drift.displayName).toBe('Drift')
    const PixelField = createShaderComponent(defineShader({ ...plain, id: 'pixel-field-2' }))
    expect(PixelField.displayName).toBe('PixelField2')
  })

  it('takes the params as props and passes the rest to the root', async () => {
    const { gpu } = withWebGpu()
    const Plain = createShaderComponent(plain)
    const ref = React.createRef<HTMLDivElement>()
    const { container } = render(<Plain ref={ref} scale={6} color="#0000ff" className="absolute inset-0" id="plain" paused />)
    await ready()
    const root = container.firstElementChild as HTMLElement
    expect(ref.current).toBe(root)
    expect(root.className).toBe('absolute inset-0')
    expect(root.id).toBe('plain')
    // `color` is a param here, not the HTML attribute.
    expect(root.hasAttribute('color')).toBe(false)
    expect(root.hasAttribute('scale')).toBe(false)
    const data = gpu.frames.at(-1)!
    expect(Array.from(data.slice(12, 16))).toEqual([0, 0, 1, 1])
    expect(data[SCALE]).toBe(6)
  })

  it('types the props from the schema', () => {
    const element = <Drift scale={3} color="var(--primary)" background="transparent" tones={4} className="x" fallback={null} />
    expect(element.props.scale).toBe(3)
    // @ts-expect-error: a number param does not take a string.
    void (<Drift scale="3" />)
    // @ts-expect-error: `shader` is fixed by the component.
    void (<Drift shader={plain} />)
  })

  it('renders without WebGPU like ShaderCanvas', () => {
    const { container } = render(<Drift fallback={<span>fallback</span>} />)
    const root = container.firstElementChild as HTMLElement
    expect(root.dataset.shader).toBe('drift')
    expect(root.dataset.status).toBe('unsupported')
    expect(root.textContent).toBe('fallback')
  })
})
