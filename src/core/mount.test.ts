// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fakeContext, installFakeBrowser, installFakeGpu, rect, removeFakeGpu, settle, type FakeBrowser } from '../test/fake-browser'

import { defineShader } from './define'
import type { MountOptions, ShaderController } from './mount'
import type { ShaderStatus } from './types'

// The mount logic is tested against a fake GPU: what it asks the device to do, not what is drawn.
// The real pixels are checked with Dawn in test/.

const number = (value: number) => ({ type: 'number', label: 'N', default: value, min: 0, max: 100, step: 1 }) as const
const FRAGMENT = '@fragment fn fs_main() -> @location(0) vec4f { return u.color; }'

const cells = defineShader({
  id: 'cells-test',
  name: 'Cells',
  technique: 'none',
  description: 'A cell shader for the mount tests.',
  pointerEffect: 'None.',
  resolution: 'cell',
  stillTime: 14,
  params: {
    color: { type: 'color', label: 'Color', default: '#ff0000' },
    scale: number(2),
    cell: number(4),
    speed: number(1),
    pointer: number(1),
  },
  fragment: FRAGMENT,
})

const smooth = defineShader({
  id: 'device-test',
  name: 'Device',
  technique: 'none',
  description: 'A device shader for the mount tests.',
  pointerEffect: 'None.',
  resolution: 'device',
  stillTime: 12,
  params: { color: { type: 'color', label: 'Color', default: '#00ff00' } },
  fragment: `${FRAGMENT} // device`,
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

/** Offsets of the header fields, in floats. */
const H = { width: 0, height: 1, mouseX: 2, mouseY: 3, time: 4, amount: 5, pixelRatio: 6, focusLeft: 8, focusRight: 9 }

let browser: FakeBrowser
let controllers: ShaderController[] = []

interface Stage {
  parent: HTMLDivElement
  canvas: HTMLCanvasElement
  context: ReturnType<typeof fakeContext>
}

/** A canvas in a 400x300 box, with a fake WebGPU context. */
function stage(width = 400, height = 300): Stage {
  const parent = document.createElement('div')
  const canvas = document.createElement('canvas')
  parent.appendChild(canvas)
  document.body.appendChild(parent)
  Object.defineProperty(parent, 'clientWidth', { value: width, configurable: true })
  Object.defineProperty(parent, 'clientHeight', { value: height, configurable: true })
  // On screen the canvas covers its box, 10px from the left and 20px from the top of the viewport.
  canvas.getBoundingClientRect = () => rect(10, 20, width, height)
  return { parent, canvas, context: fakeContext(canvas) }
}

async function mount(target: Stage, options: MountOptions) {
  // A fresh module for each test: the shared device is module state.
  const { mountShader } = await import('./mount')
  const statuses: ShaderStatus[] = []
  const controller = mountShader(target.canvas, { ...options, onStatusChange: (status) => statuses.push(status) })
  controllers.push(controller)
  return { controller, statuses }
}

beforeEach(() => {
  vi.resetModules()
  browser = installFakeBrowser()
  controllers = []
})

afterEach(async () => {
  for (const controller of controllers) controller.dispose()
  await removeFakeGpu()
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('mountShader without WebGPU', () => {
  it('reports unsupported during the call and does nothing else', async () => {
    const target = stage()
    const { controller, statuses } = await mount(target, { shader: cells })
    expect(statuses).toEqual(['unsupported'])
    expect(browser.scheduled()).toBe(0)
    expect(browser.observers()).toBe(0)
    controller.update({ params: { scale: 3 } })
    controller.redraw()
    controller.dispose()
    expect(target.context.configure).not.toHaveBeenCalled()
  })

  it('reports unsupported when the browser gives no adapter', async () => {
    Object.defineProperty(navigator, 'gpu', { value: { requestAdapter: async () => null }, configurable: true })
    const { statuses } = await mount(stage(), { shader: cells })
    expect(statuses).toEqual([])
    await settle()
    expect(statuses).toEqual(['unsupported'])
  })

  it('reports unsupported when the canvas gives no context', async () => {
    installFakeGpu()
    const target = stage()
    target.canvas.getContext = (() => null) as unknown as HTMLCanvasElement['getContext']
    const { statuses } = await mount(target, { shader: cells })
    await settle()
    expect(statuses).toEqual(['unsupported'])
  })
})

describe('mountShader', () => {
  it('compiles, configures the canvas, draws a first frame and becomes ready', async () => {
    const log = installFakeGpu()
    const target = stage()
    const { statuses } = await mount(target, { shader: cells })
    expect(statuses).toEqual([])
    await settle()
    expect(statuses).toEqual(['ready'])
    expect(log.compiled).toHaveLength(1)
    expect(log.compiled[0]).toContain('struct Uniforms')
    expect(target.context.configure).toHaveBeenCalledTimes(1)
    expect(target.context.configure).toHaveBeenCalledWith(expect.objectContaining({ format: 'bgra8unorm', alphaMode: 'premultiplied' }))
    expect(log.frames).toHaveLength(1)
    expect(browser.scheduled()).toBe(1)
  })

  it('sizes a cell shader at one canvas pixel per cell, from the box of the parent', async () => {
    const log = installFakeGpu()
    const target = stage(401, 300)
    await mount(target, { shader: cells })
    await settle()
    const { canvas } = target
    // 401 / 4 rounds up: the canvas is a whole number of cells and the parent clips the rest.
    expect([canvas.width, canvas.height]).toEqual([101, 75])
    expect([canvas.style.width, canvas.style.height]).toEqual(['404px', '300px'])
    expect(canvas.style.imageRendering).toBe('pixelated')
    const data = log.frames[0]!
    expect([data[H.width], data[H.height], data[H.pixelRatio]]).toEqual([101, 75, 0.25])
  })

  it('sizes a device shader in device pixels, with a ratio of 2 at most', async () => {
    const log = installFakeGpu()
    vi.stubGlobal('devicePixelRatio', 3)
    const target = stage()
    await mount(target, { shader: smooth })
    await settle()
    const { canvas } = target
    expect([canvas.width, canvas.height]).toEqual([800, 600])
    expect([canvas.style.width, canvas.style.height]).toEqual(['100%', '100%'])
    expect(canvas.style.imageRendering).toBe('')
    expect(log.frames[0]![H.pixelRatio]).toBe(2)
  })

  it('keeps a device shader under the texture limit of the device: fewer pixels for a very tall box', async () => {
    const log = installFakeGpu()
    vi.stubGlobal('devicePixelRatio', 2)
    // 5000 CSS pixels at a ratio of 2 is 10000 canvas pixels: more than the 8192 of the device.
    const target = stage(400, 5000)
    await mount(target, { shader: smooth })
    await settle()
    const { canvas } = target
    expect([canvas.width, canvas.height]).toEqual([655, 8192])
    // The canvas still covers its box, and the shader knows the real ratio.
    expect([canvas.style.width, canvas.style.height]).toEqual(['100%', '100%'])
    expect(log.frames[0]![H.pixelRatio]).toBe(Math.fround(8192 / 5000))
    // A box at the limit keeps the full ratio.
    Object.defineProperty(target.parent, 'clientHeight', { value: 4096, configurable: true })
    browser.resize()
    browser.frame(1000)
    expect([canvas.width, canvas.height]).toEqual([800, 8192])
    expect(log.frames.at(-1)![H.pixelRatio]).toBe(2)
  })

  it('keeps a cell shader under the texture limit of the device: larger cells for a very large box', async () => {
    const log = installFakeGpu()
    // 20000 cells of 1px is more than the 8192 of the device: the cells become 3px.
    const target = stage(400, 20_000)
    await mount(target, { shader: cells, params: { cell: 1 } })
    await settle()
    const { canvas } = target
    expect([canvas.width, canvas.height]).toEqual([134, 6667])
    // Still a whole number of cells that covers the box.
    expect([canvas.style.width, canvas.style.height]).toEqual(['402px', '20001px'])
    expect(log.frames[0]![H.pixelRatio]).toBe(Math.fround(1 / 3))
  })

  it('draws at 30 frames per second at most and moves the time by the speed', async () => {
    const log = installFakeGpu()
    const { controller } = await mount(stage(), { shader: cells, params: { speed: 2 } })
    await settle()
    browser.frame(1000) // first frame of the loop: no time step yet
    browser.frame(1016) // too early
    expect(log.frames).toHaveLength(2)
    browser.frame(1033)
    expect(log.frames).toHaveLength(3)
    expect(log.frames[2]![H.time]).toBeCloseTo(0.066, 5)
    // A long gap (a sleeping tab) counts for 0.1 s only.
    browser.frame(9000)
    expect(log.frames[3]![H.time]).toBeCloseTo(0.066 + 0.2, 5)
    controller.update({ fps: 60 })
    browser.frame(9016)
    expect(log.frames).toHaveLength(5)
  })

  it('keeps the time at its real pace at a low fps', async () => {
    const log = installFakeGpu()
    await mount(stage(), { shader: cells, fps: 5 })
    await settle()
    // Display frames every 20 ms for 2 seconds: 5 frames per second draw one in ten.
    for (let now = 1000; now <= 3000; now += 20) browser.frame(now)
    expect(log.frames).toHaveLength(1 + 11)
    // Each frame counts for its 200 ms, not for the 100 ms that cap a frame at 30 fps.
    expect(log.frames.at(-1)![H.time]).toBeCloseTo(2, 5)
    // A long gap (a sleeping tab) still counts for one frame and a half only.
    browser.frame(60_000)
    expect(log.frames.at(-1)![H.time]).toBeCloseTo(2.3, 5)
  })

  it('applies new params on the next frame with no recompilation', async () => {
    const log = installFakeGpu()
    const { controller } = await mount(stage(), { shader: cells })
    await settle()
    const scale = (data: Float32Array) => data[(48 + 16) / 4]
    expect(scale(log.frames[0]!)).toBe(2)
    controller.update({ params: { scale: 7, color: '#00ff00' } })
    browser.frame(1000)
    const data = log.frames.at(-1)!
    expect(scale(data)).toBe(7)
    expect(Array.from(data.slice(12, 16))).toEqual([0, 1, 0, 1])
    // Leaving a key out puts it back to its default.
    controller.update({ params: {} })
    browser.frame(2000)
    expect(scale(log.frames.at(-1)!)).toBe(2)
    expect(log.compiled).toHaveLength(1)
  })

  it('sees a key that was left out when the new params hold another key set to undefined', async () => {
    const log = installFakeGpu()
    const { controller } = await mount(stage(), { shader: cells, params: { color: '#00ff00' }, paused: true })
    await settle()
    const color = () => Array.from(log.frames.at(-1)!.slice(12, 16))
    expect(color()).toEqual([0, 1, 0, 1])
    // One key before, one key after, and `undefined` on both sides for `scale`: still a change.
    controller.update({ params: { scale: undefined } })
    expect(log.frames).toHaveLength(2)
    expect(color()).toEqual([1, 0, 0, 1])
    // The same content again costs nothing.
    controller.update({ params: { scale: undefined } })
    expect(log.frames).toHaveLength(2)
  })

  it('resizes the canvas when the cell param or the box changes, and clamps the cell', async () => {
    installFakeGpu()
    const target = stage()
    const { controller } = await mount(target, { shader: cells })
    await settle()
    controller.update({ params: { cell: 8 } })
    browser.frame(1000)
    expect([target.canvas.width, target.canvas.style.width]).toEqual([50, '400px'])
    controller.update({ params: { cell: 0 } })
    browser.frame(2000)
    expect(target.canvas.width).toBe(400)
    controller.update({ params: { cell: 1000 } })
    browser.frame(3000)
    expect(target.canvas.width).toBe(7) // 400 / 64, rounded up
    controller.update({ params: {} })
    Object.defineProperty(target.parent, 'clientWidth', { value: 200, configurable: true })
    browser.resize()
    browser.frame(4000)
    expect(target.canvas.width).toBe(50)
  })

  it('switches shader live: the previous one draws until the new one is ready', async () => {
    const log = installFakeGpu()
    const target = stage()
    const { controller, statuses } = await mount(target, { shader: cells })
    await settle()
    controller.update({ shader: smooth, params: { color: '#0000ff' } })
    browser.frame(1000)
    // Still the cell shader, with the values it had.
    expect(log.frames.at(-1)!).toHaveLength(80 / 4)
    expect(Array.from(log.frames.at(-1)!.slice(12, 16))).toEqual([1, 0, 0, 1])
    await settle()
    browser.frame(2000)
    expect(log.compiled).toHaveLength(2)
    expect(log.frames.at(-1)!).toHaveLength(64 / 4)
    expect(Array.from(log.frames.at(-1)!.slice(12, 16))).toEqual([0, 0, 1, 1])
    expect(target.canvas.style.imageRendering).toBe('')
    // The layout changed size: the uniform buffer was replaced.
    expect(log.buffers.map((buffer) => [buffer.size, buffer.destroyed])).toEqual([
      [80, true],
      [64, false],
    ])
    expect(statuses).toEqual(['ready'])
    expect(target.context.configure).toHaveBeenCalledTimes(1)
    // Switching back uses the cached pipeline.
    controller.update({ shader: cells })
    await settle()
    expect(log.compiled).toHaveLength(2)
  })

  it('reports a shader that does not compile, keeps the previous one, and recovers', async () => {
    const log = installFakeGpu()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { controller, statuses } = await mount(stage(), { shader: cells })
    await settle()
    controller.update({ shader: broken })
    await settle()
    expect(statuses).toEqual(['ready', 'error'])
    expect(error).toHaveBeenCalledTimes(1)
    expect(String(error.mock.calls[0]![0])).toContain('shader "broken-test" did not compile')
    expect(String(error.mock.calls[0]![0])).toContain('error at 1:2: unresolved value BROKEN')
    browser.frame(1000)
    expect(log.frames.at(-1)!).toHaveLength(80 / 4)
    controller.update({ shader: smooth })
    await settle()
    expect(statuses).toEqual(['ready', 'error', 'ready'])
  })

  it('reports an error when the first shader does not compile, then accepts another', async () => {
    installFakeGpu()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const target = stage()
    const { controller, statuses } = await mount(target, { shader: broken })
    await settle()
    expect(statuses).toEqual(['error'])
    // Nothing to draw: the canvas was left alone.
    expect(target.context.configure).not.toHaveBeenCalled()
    expect(browser.scheduled()).toBe(0)
    controller.update({ shader: cells })
    await settle()
    expect(statuses).toEqual(['error', 'ready'])
    expect(target.context.configure).toHaveBeenCalledTimes(1)
  })

  it('ignores a shader request that a newer one replaced', async () => {
    const log = installFakeGpu()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { controller, statuses } = await mount(stage(), { shader: cells })
    await settle()
    // The broken shader fails after the next one was asked for: nobody waits for it any more.
    controller.update({ shader: broken })
    controller.update({ shader: smooth })
    await settle()
    expect(statuses).toEqual(['ready'])
    expect(log.frames.at(-1)!).toHaveLength(64 / 4)
  })

  it('never touches the canvas when it is disposed before the device is ready (React StrictMode)', async () => {
    const log = installFakeGpu()
    const target = stage()
    const first = await mount(target, { shader: cells })
    first.controller.dispose()
    const second = await mount(target, { shader: cells })
    await settle()
    expect(first.statuses).toEqual([])
    expect(second.statuses).toEqual(['ready'])
    expect(target.context.configure).toHaveBeenCalledTimes(1)
    // Both mounts share one device and one compiled pipeline.
    expect(log.devices).toHaveLength(1)
    expect(log.compiled).toHaveLength(1)
  })

  it('shares one device and one pipeline between two canvases', async () => {
    const log = installFakeGpu()
    await mount(stage(), { shader: cells })
    await mount(stage(), { shader: cells })
    await settle()
    expect(log.devices).toHaveLength(1)
    expect(log.compiled).toHaveLength(1)
    expect(log.buffers).toHaveLength(2)
  })

  it('stops drawing after dispose and frees its buffer', async () => {
    const log = installFakeGpu()
    const { controller } = await mount(stage(), { shader: cells })
    await settle()
    controller.dispose()
    expect(browser.scheduled()).toBe(0)
    expect(log.buffers[0]!.destroyed).toBe(true)
    const drawn = log.frames.length
    controller.update({ params: { scale: 9 } })
    controller.redraw()
    browser.frame(1000)
    expect(log.frames).toHaveLength(drawn)
  })

  it('pauses the loop, still draws param changes, and resumes with no time jump', async () => {
    const log = installFakeGpu()
    const { controller } = await mount(stage(), { shader: cells, paused: true })
    await settle()
    expect(browser.scheduled()).toBe(0)
    expect(log.frames).toHaveLength(1)
    controller.update({ params: { scale: 5 } })
    expect(log.frames).toHaveLength(2)
    expect(log.frames[1]![(48 + 16) / 4]).toBe(5)
    controller.update({ paused: false })
    browser.frame(50_000)
    browser.frame(50_040)
    expect(log.frames.at(-1)![H.time]).toBeCloseTo(0.04, 5)
    controller.update({ paused: true })
    expect(browser.scheduled()).toBe(0)
  })

  it('keeps the pointer effect as it is while paused, however many times it draws again', async () => {
    const log = installFakeGpu()
    const { controller } = await mount(stage(), { shader: cells, paused: true })
    await settle()
    const pointerState = () => Array.from(log.frames.at(-1)!.slice(H.mouseX, H.amount + 1))
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 10 + 200, clientY: 20 + 60 }))
    // A slider of a panel is dragged, the box changes, the theme changes: the last frame stays.
    for (let scale = 1; scale <= 30; scale++) controller.update({ params: { scale } })
    browser.resize()
    controller.redraw()
    expect(log.frames).toHaveLength(1 + 30 + 2)
    expect(pointerState()).toEqual([0, 0, 0, 0])
    // The effect comes in when the animation runs again, one step per frame.
    controller.update({ paused: false })
    browser.frame(1000)
    expect(pointerState()).toEqual([50, 60, 0, Math.fround(0.06)])
    // Paused again with the effect on screen: it does not move, and does not fade.
    controller.update({ paused: true })
    window.dispatchEvent(new Event('blur'))
    for (let scale = 1; scale <= 10; scale++) controller.update({ params: { scale } })
    expect(pointerState()).toEqual([50, 60, 0, Math.fround(0.06)])
  })

  it('stops the loop while the canvas is out of view', async () => {
    installFakeGpu()
    await mount(stage(), { shader: cells })
    await settle()
    expect(browser.scheduled()).toBe(1)
    browser.view(false)
    expect(browser.scheduled()).toBe(0)
    browser.view(true)
    expect(browser.scheduled()).toBe(1)
  })

  it('draws one still frame for reduced motion, and again when something changes', async () => {
    browser.reduceMotion()
    const log = installFakeGpu()
    const target = stage()
    const { controller } = await mount(target, { shader: cells })
    await settle()
    expect(browser.scheduled()).toBe(0)
    expect(log.frames).toHaveLength(1)
    expect(log.frames[0]![H.time]).toBe(14)
    // The pointer is ignored.
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 100 }))
    controller.update({ params: { scale: 3 } })
    expect(log.frames).toHaveLength(2)
    expect(log.frames[1]![H.amount]).toBe(0)
    browser.resize()
    expect(log.frames).toHaveLength(3)
    // Each shader has its own still frame.
    controller.update({ shader: smooth })
    await settle()
    expect(log.frames.at(-1)![H.time]).toBe(12)
  })

  it('follows reduced motion when the reader turns it on or off after the mount', async () => {
    const log = installFakeGpu()
    await mount(stage(), { shader: cells })
    await settle()
    // The animation runs, with the pointer effect on screen.
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 10 + 200, clientY: 20 + 60 }))
    browser.frame(1000)
    browser.frame(1040)
    expect(log.frames.at(-1)![H.time]).toBeCloseTo(0.04, 5)
    expect(log.frames.at(-1)![H.amount]).toBeGreaterThan(0)

    // On: the loop stops and the still frame of the shader is drawn at once, with no pointer.
    browser.reduceMotion()
    expect(browser.scheduled()).toBe(0)
    let drawn = log.frames.length
    expect([log.frames.at(-1)![H.time], log.frames.at(-1)![H.amount]]).toEqual([14, 0])
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 10 + 100, clientY: 20 + 100 }))
    browser.frame(2000)
    expect(log.frames).toHaveLength(drawn)

    // Off: the loop runs again from the still frame, and the old pointer effect does not come back.
    browser.reduceMotion(false)
    expect(browser.scheduled()).toBe(1)
    browser.frame(3000)
    browser.frame(3040)
    expect(log.frames.at(-1)![H.time]).toBeCloseTo(14.04, 5)
    expect(log.frames.at(-1)![H.amount]).toBe(0)
    // The pointer is followed again from its next move.
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 10 + 200, clientY: 20 + 60 }))
    browser.frame(3080)
    expect(log.frames.at(-1)![H.amount]).toBeCloseTo(0.06, 6)

    // A canvas that is gone does not listen any more.
    controllers[0]!.dispose()
    drawn = log.frames.length
    browser.reduceMotion()
    expect(log.frames).toHaveLength(drawn)
  })

  it('maps the pointer to canvas pixels with a bottom-left origin and eases its influence', async () => {
    const log = installFakeGpu()
    await mount(stage(), { shader: cells, params: { pointer: 0.5 } })
    await settle()
    // The canvas is at (10, 20) and 400x300 on screen, 100x75 cells.
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 10 + 200, clientY: 20 + 60 }))
    browser.frame(1000)
    let data = log.frames.at(-1)!
    expect([data[H.mouseX], data[H.mouseY]]).toEqual([50, 60])
    expect(data[H.amount]).toBeCloseTo(0.06 * 0.5, 6)
    browser.frame(1040)
    expect(log.frames.at(-1)![H.amount]).toBeGreaterThan(data[H.amount]!)
    // Outside the box of the canvas the influence fades.
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 5, clientY: 5 }))
    data = log.frames.at(-1)!
    browser.frame(1080)
    expect(log.frames.at(-1)![H.amount]).toBeLessThan(data[H.amount]!)
    // So does a blur of the window.
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 100 }))
    browser.frame(1120)
    data = log.frames.at(-1)!
    window.dispatchEvent(new Event('blur'))
    browser.frame(1160)
    expect(log.frames.at(-1)![H.amount]).toBeLessThan(data[H.amount]!)
  })

  it('gives the span of the focus element in canvas pixels', async () => {
    const log = installFakeGpu()
    const focus = document.createElement('main')
    focus.getBoundingClientRect = () => rect(110, 0, 200, 50)
    await mount(stage(), { shader: cells, focusElement: focus })
    await settle()
    const data = log.frames[0]!
    // 100px and 300px from the left edge of the canvas, at 4px per cell.
    expect([data[H.focusLeft], data[H.focusRight]]).toEqual([25, 75])
  })

  it('reads page colors again when the theme changes', async () => {
    const log = installFakeGpu()
    const target = stage()
    let ink = 'rgb(10, 20, 30)'
    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({ color: ink }) as CSSStyleDeclaration)
    await mount(target, { shader: smooth, params: { color: 'var(--ink)' } })
    await settle()
    expect(Array.from(log.frames[0]!.slice(12, 16))).toEqual([10, 20, 30, 255].map((value) => Math.fround(value / 255)))
    ink = 'rgb(200, 100, 50)'
    browser.mutate()
    browser.frame(1000)
    expect(Array.from(log.frames.at(-1)!.slice(12, 16))).toEqual([200, 100, 50, 255].map((value) => Math.fround(value / 255)))
    // The probe element does not stay in the page.
    expect(target.parent.children).toHaveLength(1)
  })

  it('reads page colors again for any theme attribute of html or body', async () => {
    const log = installFakeGpu()
    let ink = 'rgb(10, 20, 30)'
    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({ color: ink }) as CSSStyleDeclaration)
    await mount(stage(), { shader: smooth, params: { color: 'var(--ink)' }, paused: true })
    await settle()
    const color = () => Array.from(log.frames.at(-1)!.slice(12, 16))
    // Bootstrap, Mantine, MUI and Primer each have their own attribute.
    for (const [index, attribute] of ['data-bs-theme', 'data-mantine-color-scheme', 'data-color-mode', 'style'].entries()) {
      ink = `rgb(${index * 51}, 0, 0)`
      browser.mutate(attribute)
      expect(color()).toEqual([Math.fround(index / 5), 0, 0, 1])
    }
  })

  it('reads page colors again when a color transition above the canvas ends', async () => {
    const log = installFakeGpu()
    const target = stage()
    const aside = document.createElement('a')
    document.body.appendChild(aside)
    let ink = 'rgb(0, 0, 0)'
    const computed = vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({ color: ink }) as CSSStyleDeclaration)
    await mount(target, { shader: smooth, params: { color: 'currentColor' }, paused: true })
    await settle()
    const color = () => Array.from(log.frames.at(-1)!.slice(12, 16))
    const transition = (type: string, on: Element, propertyName: string) =>
      on.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), { propertyName }))
    // The theme changes, but `body` has a color transition: the color read is still the old one.
    browser.mutate()
    expect(color()).toEqual([0, 0, 0, 1])
    ink = 'rgb(255, 255, 255)'
    const reads = computed.mock.calls.length
    const drawn = log.frames.length
    // Not a color, or not above the canvas: nothing to read.
    transition('transitionend', document.body, 'opacity')
    transition('transitionend', aside, 'color')
    expect(computed.mock.calls).toHaveLength(reads)
    expect(log.frames).toHaveLength(drawn)
    transition('transitionend', document.body, 'color')
    expect(color()).toEqual([1, 1, 1, 1])
    // A transition that was cut short, and one of a registered custom property, count too.
    ink = 'rgb(255, 0, 0)'
    transition('transitioncancel', target.parent, 'color')
    expect(color()).toEqual([1, 0, 0, 1])
    ink = 'rgb(0, 0, 255)'
    transition('transitionend', document.documentElement, '--ink')
    expect(color()).toEqual([0, 0, 1, 1])
  })

  it('starts again on a new device when the device is lost', async () => {
    const log = installFakeGpu()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const target = stage()
    const { statuses } = await mount(target, { shader: cells })
    await settle()
    log.devices[0]!.lose()
    await settle()
    expect(statuses).toEqual(['ready', 'pending', 'ready'])
    expect(log.devices).toHaveLength(2)
    expect(target.context.configure).toHaveBeenCalledTimes(2)
    expect(log.buffers.map((buffer) => buffer.destroyed)).toEqual([true, false])
    expect(browser.scheduled()).toBe(1)
  })

  it('stays quiet when the device was destroyed on purpose', async () => {
    const log = installFakeGpu()
    const { statuses } = await mount(stage(), { shader: cells })
    await settle()
    log.devices[0]!.lose('destroyed')
    await settle()
    expect(statuses).toEqual(['ready'])
    expect(log.devices).toHaveLength(1)
  })

  it('leaves nothing on the shared device after dispose, so the canvas can be collected', async () => {
    const log = installFakeGpu()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const first = await mount(stage(), { shader: cells })
    const second = await mount(stage(), { shader: cells })
    await settle()
    // The same module as the mounts: the device they share.
    const { getGpu } = await import('./gpu')
    const gpu = (await getGpu())!
    expect(gpu.lostListeners.size).toBe(2)
    first.controller.dispose()
    expect(gpu.lostListeners.size).toBe(1)
    // The loss of the device starts the mount that is left again, and only that one.
    log.devices[0]!.lose()
    await settle()
    expect(first.statuses).toEqual(['ready'])
    expect(second.statuses).toEqual(['ready', 'pending', 'ready'])
    expect(gpu.lostListeners.size).toBe(0)
    const next = (await getGpu())!
    expect(next).not.toBe(gpu)
    expect(next.lostListeners.size).toBe(1)
    second.controller.dispose()
    expect(next.lostListeners.size).toBe(0)
  })
})
