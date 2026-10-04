// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// resolveColor in a (fake) browser. jsdom computes no style and has no 2D canvas: both are doubles
// here, so these tests check how the browser is asked, not how it answers.

/** What the page gives as the computed color, by the value that was set on the probe. */
let computedColors: Record<string, string>
/** Colors painted on the 1x1 canvas, in order. */
let painted: string[]
/** The pixel the 1x1 canvas gives back, by color. */
let pixels: Record<string, [number, number, number, number]>
/** Where each probe was attached. */
let hosts: (Element | null)[]

async function load() {
  // A fresh module for each test: the color cache and the 1x1 canvas are module state.
  return import('./color')
}

beforeEach(() => {
  vi.resetModules()
  computedColors = {}
  painted = []
  pixels = {}
  hosts = []

  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
    const probe = element as HTMLElement
    hosts.push(probe.parentElement)
    return { color: computedColors[probe.style.color] ?? '' } as CSSStyleDeclaration
  })

  const context = {
    fillStyle: '',
    clearRect() {},
    fillRect() {
      painted.push(context.fillStyle)
    },
    getImageData: () => ({ data: new Uint8ClampedArray(pixels[context.fillStyle] ?? [0, 0, 0, 255]) }),
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => context) as unknown as HTMLCanvasElement['getContext'])
})

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

describe('resolveColor in a browser', () => {
  it('reads a literal without the DOM', async () => {
    const { resolveColor } = await load()
    expect(resolveColor('#ff0000', document.body)).toEqual([1, 0, 0, 1])
    expect(window.getComputedStyle).not.toHaveBeenCalled()
  })

  it('computes a token next to the element, and leaves nothing in the page', async () => {
    const { resolveColor } = await load()
    const parent = document.createElement('div')
    const canvas = document.createElement('canvas')
    parent.appendChild(canvas)
    document.body.appendChild(parent)
    computedColors['var(--ink)'] = 'rgb(10, 20, 30)'

    expect(resolveColor('var(--ink)', canvas)).toEqual([10 / 255, 20 / 255, 30 / 255, 1])
    // The probe was a sibling of the canvas, so it saw the same CSS variables.
    expect(hosts).toEqual([parent])
    expect(parent.children).toHaveLength(1)
    // rgb() is read from the text: no pixel was painted.
    expect(painted).toEqual([])
  })

  it('uses the body when it has no element', async () => {
    const { resolveColor } = await load()
    computedColors['currentcolor'] = 'rgb(1, 2, 3)'
    computedColors['currentColor'] = 'rgb(1, 2, 3)'
    expect(resolveColor('currentColor')).toEqual([1 / 255, 2 / 255, 3 / 255, 1])
    expect(hosts).toEqual([document.body])
  })

  it('paints a color the text does not give in sRGB', async () => {
    const { resolveColor } = await load()
    computedColors['var(--brand)'] = 'oklch(0.7 0.1 80)'
    pixels['oklch(0.7 0.1 80)'] = [204, 153, 102, 255]
    expect(resolveColor('var(--brand)', document.body)).toEqual([0.8, 0.6, 0.4, 1])
    expect(painted).toEqual(['oklch(0.7 0.1 80)'])
  })

  it('paints a translucent color opaque and takes the alpha from the text', async () => {
    const { resolveColor } = await load()
    computedColors['var(--ink)'] = 'oklch(0.7 0.1 80 / 0.13)'
    pixels['oklch(0.7 0.1 80)'] = [204, 153, 102, 255]
    expect(resolveColor('var(--ink)', document.body)).toEqual([0.8, 0.6, 0.4, 0.13])
    expect(painted).toEqual(['oklch(0.7 0.1 80)'])

    computedColors['var(--soft)'] = 'color(srgb 0.2 0.4 0.6 / 25%)'
    pixels['color(srgb 0.2 0.4 0.6)'] = [51, 102, 153, 255]
    expect(resolveColor('var(--soft)', document.body)).toEqual([0.2, 0.4, 0.6, 0.25])
  })

  it('converts each computed color once', async () => {
    const { resolveColor } = await load()
    computedColors['var(--a)'] = 'oklch(0.7 0.1 80)'
    computedColors['var(--b)'] = 'oklch(0.7 0.1 80)'
    resolveColor('var(--a)', document.body)
    resolveColor('var(--b)', document.body)
    resolveColor('var(--a)', document.body)
    expect(painted).toHaveLength(1)
    // The token itself is computed each time: its value can change with the theme.
    expect(window.getComputedStyle).toHaveBeenCalledTimes(3)
  })

  it('returns null for a value that is not a color', async () => {
    const { resolveColor } = await load()
    expect(resolveColor('12px', document.body)).toBeNull()
    expect(resolveColor('var(--missing)', document.body)).toBeNull()
  })

  it('returns null when the browser has no 2D canvas', async () => {
    const { resolveColor } = await load()
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation((() => null) as unknown as HTMLCanvasElement['getContext'])
    computedColors['var(--brand)'] = 'oklch(0.7 0.1 80)'
    expect(resolveColor('var(--brand)', document.body)).toBeNull()
  })
})
