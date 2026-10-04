import { resolveColor, resolveColors, type ColorParamDef, type ParamSchema, type Rgba } from 'shader-ui'

/** The values of a shader, as a control reads them. */
export type Values = Readonly<Record<string, unknown>>

/** `#rrggbb`: the only form a native color input takes. */
function toHex([r, g, b]: Rgba): string {
  const pair = (channel: number) =>
    Math.round(Math.min(1, Math.max(0, channel)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${pair(r)}${pair(g)}${pair(b)}`
}

/**
 * The color the shader draws for the parameter `key`, as `#rrggbb`, an 'auto' mix included. It is
 * resolved next to `element`, so `var(--token)` and `currentColor` take the values they have there.
 */
export function drawnHex(schema: ParamSchema, values: Values, key: string, element: Element | null): string {
  const rgba = resolveColors(schema, values, (css) => resolveColor(css, element))[key]
  return rgba ? toHex(rgba) : '#000000'
}

/** The CSS color a swatch shows: the value itself, or the mix an 'auto' color stands for. */
export function swatchColor(def: ColorParamDef, value: string, values: Values): string {
  if (value !== 'auto' || !def.auto) return value
  const { from, to, mix } = def.auto
  const percent = Math.round(mix * 1000) / 10
  return `color-mix(in srgb, ${String(values[from])} ${100 - percent}%, ${String(values[to])} ${percent}%)`
}

/** True when `text` can be the value of the color: a CSS color, or 'auto' when the parameter has it. */
export function isColorValue(def: ColorParamDef, text: string): boolean {
  if (text === 'auto') return def.auto !== undefined
  return CSS.supports('color', text)
}
