import type { ParamSchema, Rgba } from './types'

/** Fully transparent: what a color that cannot be resolved becomes. */
export const TRANSPARENT: Rgba = [0, 0, 0, 0]

/** Turns a CSS color string into sRGB values, or `null` when it cannot. */
export type ColorResolver = (value: string) => Rgba | null

const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/
const RGB = /^rgba?\(\s*([^()]+?)\s*\)$/
const COMPONENT = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%?)$/

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** One part of `rgb()`: a number (out of `scale`) or a percentage, as a value from 0 to 1. */
function component(text: string, scale: number): number | null {
  const match = COMPONENT.exec(text)
  if (!match) return null
  const value = Number(match[1])
  return clamp01(match[2] === '%' ? value / 100 : value / scale)
}

function parseHex(digits: string): Rgba {
  // #rgb and #rgba are the short forms: each digit is doubled.
  const full = digits.length <= 4 ? [...digits].map((digit) => digit + digit).join('') : digits
  const channel = (index: number) => parseInt(full.slice(index * 2, index * 2 + 2), 16) / 255
  return [channel(0), channel(1), channel(2), full.length === 8 ? channel(3) : 1]
}

function parseRgb(body: string): Rgba | null {
  let channels: string[]
  let alpha: string | undefined
  if (body.includes(',')) {
    // Legacy syntax: rgb(217, 196, 163) and rgba(217, 196, 163, 0.5).
    const parts = body.split(',').map((part) => part.trim())
    if (parts.length !== 3 && parts.length !== 4) return null
    channels = parts.slice(0, 3)
    alpha = parts[3]
  } else {
    // Modern syntax: rgb(217 196 163) and rgb(217 196 163 / 50%).
    const [left = '', right, ...extra] = body.split('/')
    if (extra.length > 0) return null
    channels = left.trim().split(/\s+/)
    alpha = right?.trim()
    if (channels.length !== 3) return null
  }
  const [r, g, b] = channels.map((channel) => component(channel, 255))
  const a = alpha === undefined ? 1 : component(alpha, 1)
  if (r == null || g == null || b == null || a == null) return null
  return [r, g, b, a]
}

/**
 * Reads a literal CSS color with no help from the browser: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`,
 * `rgb()` / `rgba()` (commas or spaces, alpha as a number or a percentage) and `transparent`.
 *
 * Returns `[r, g, b, a]` from 0 to 1 (sRGB, straight alpha), or `null` for every other syntax
 * (named colors, `hsl()`, `oklch()`, `currentColor`, `var(--token)`): use {@link resolveColor} for
 * those. It is pure, so it also works on a server and in tests.
 */
export function parseColor(value: string): Rgba | null {
  const text = value.trim().toLowerCase()
  if (text === 'transparent') return TRANSPARENT
  const hex = HEX.exec(text)
  if (hex?.[1]) return parseHex(hex[1])
  const rgb = RGB.exec(text)
  if (rgb?.[1]) return parseRgb(rgb[1])
  return null
}

/** Computed color string to sRGB values. The same strings come back at every theme change. */
const cache = new Map<string, Rgba>()

/** 1x1 canvas used to convert a computed color to sRGB. `null` when the browser has no 2D canvas. */
let raster: CanvasRenderingContext2D | null | undefined

/** The alpha of a computed color in the modern syntax: `oklch(0.7 0.1 80 / 0.13)`. */
const SLASH_ALPHA = /^(.*\S)\s*\/\s*([^\s/()]+)\s*\)$/

/** Paints one pixel with `color` and reads it back as 8-bit sRGB. */
function paint(color: string): Uint8ClampedArray | null {
  if (raster === undefined) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    raster = canvas.getContext('2d', { willReadFrequently: true })
  }
  if (!raster) return null
  raster.clearRect(0, 0, 1, 1)
  // An unknown color leaves `fillStyle` as it was: start from a known value.
  raster.fillStyle = '#000'
  raster.fillStyle = color
  raster.fillRect(0, 0, 1, 1)
  return raster.getImageData(0, 0, 1, 1).data
}

/**
 * Converts a computed color to sRGB by painting one pixel. Chrome keeps `oklch()`, `lab()` and
 * `color()` as they are in computed values, so reading the string is not enough.
 */
function rasterize(color: string): Rgba | null {
  // A canvas stores premultiplied 8-bit values: at a low alpha the color read back is coarse.
  // Paint the color opaque and take the alpha from the text.
  const translucent = SLASH_ALPHA.exec(color)
  const alpha = translucent?.[2] ? component(translucent[2], 1) : null
  const pixel = paint(translucent && alpha !== null ? `${translucent[1]})` : color)
  if (!pixel) return null
  const [r = 0, g = 0, b = 0, a = 0] = pixel
  return [r / 255, g / 255, b / 255, alpha ?? a / 255]
}

/** The computed value of `color: <value>` next to `element`, or `null` when the value is not a color. */
function computeColor(value: string, element: Element | null | undefined): string | null {
  const host = element?.parentElement ?? element ?? document.body
  if (!host) return null
  // A new element for each read: an element that stays would animate through the `transition`
  // rules of the page and give a color between the two themes. This only covers the transitions
  // of the probe itself: a value it inherits (`currentColor`) still follows the transition of an
  // element above it, so mountShader reads the colors again when such a transition ends.
  const probe = document.createElement('span')
  probe.style.display = 'none'
  probe.style.color = value
  // The browser drops a declaration it cannot parse.
  if (probe.style.color === '') return null
  host.appendChild(probe)
  const computed = getComputedStyle(probe).color
  probe.remove()
  return computed === '' ? null : computed
}

/**
 * Resolves any CSS color to sRGB values: literals through {@link parseColor}, everything else
 * (named colors, `hsl()`, `oklch()`, `color-mix()`, `currentColor`, `var(--token)`) through the
 * browser.
 *
 * `element` gives the context: the value is computed on a hidden element placed next to it, so CSS
 * variables and `currentColor` take the values they have there. Returns `null` when the value is
 * not a color, or when there is no DOM (server, tests) and the value is not a literal.
 */
export function resolveColor(value: string, element?: Element | null): Rgba | null {
  const literal = parseColor(value)
  if (literal) return literal
  if (typeof document === 'undefined') return null
  const computed = computeColor(value, element)
  if (computed === null) return null
  const known = cache.get(computed)
  if (known) return known
  const rgba = parseColor(computed) ?? rasterize(computed)
  if (rgba) cache.set(computed, rgba)
  return rgba
}

/**
 * Mixes two colors: `t = 0` gives `a`, `t = 1` gives `b`. The mix is done on premultiplied values,
 * so mixing with `transparent` fades the color out and does not darken it. For two opaque colors
 * it is the plain sRGB mix.
 */
export function mixColors(a: Rgba, b: Rgba, t: number): Rgba {
  const alpha = a[3] + (b[3] - a[3]) * t
  if (alpha <= 0) return TRANSPARENT
  const channel = (index: 0 | 1 | 2) => (a[index] * a[3] * (1 - t) + b[index] * b[3] * t) / alpha
  return [channel(0), channel(1), channel(2), alpha]
}

/**
 * Resolves every color parameter of a schema to sRGB values, `auto` colors included.
 *
 * `values` are the sanitised values (`resolveParams`). `resolve` turns one CSS string into a color:
 * {@link parseColor} by default (pure), or a function built on {@link resolveColor} in a browser.
 * A value that cannot be resolved falls back to the default of the parameter, then to transparent.
 */
export function resolveColors(
  schema: ParamSchema,
  values: Readonly<Record<string, unknown>>,
  resolve: ColorResolver = parseColor,
): Record<string, Rgba> {
  // A color given as a CSS string (the two ends of an `auto` mix are always plain colors).
  const plain = (key: string): Rgba => {
    const def = schema[key]
    if (def?.type !== 'color') return TRANSPARENT
    const value = values[key]
    const resolved = typeof value === 'string' && value !== 'auto' ? resolve(value) : null
    if (resolved) return resolved
    return (def.default === 'auto' ? null : resolve(def.default)) ?? TRANSPARENT
  }

  const colors: Record<string, Rgba> = {}
  for (const [key, def] of Object.entries(schema)) {
    if (def.type !== 'color') continue
    const value = values[key]
    const resolved = typeof value === 'string' && value !== 'auto' ? resolve(value) : null
    if (resolved) {
      colors[key] = resolved
    } else if (def.auto && (value === 'auto' || def.default === 'auto')) {
      colors[key] = mixColors(plain(def.auto.from), plain(def.auto.to), def.auto.mix)
    } else {
      colors[key] = plain(key)
    }
  }
  return colors
}

/**
 * True when at least one color depends on the page (a token, `currentColor`, a named color…) and
 * not only on its own text. Such colors must be resolved again when the theme changes.
 */
export function hasPageColors(schema: ParamSchema, values: Readonly<Record<string, unknown>>): boolean {
  return Object.entries(schema).some(([key, def]) => {
    if (def.type !== 'color') return false
    const value = values[key]
    return typeof value === 'string' && value !== 'auto' && parseColor(value) === null
  })
}
