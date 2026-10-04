/** A line of JSX longer than this is written with one prop per line. */
const MAX_LINE = 88

/** `pixel-field` -> `PixelField`: the name of the component of a shader. */
export function componentName(shaderId: string): string {
  return shaderId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/** One prop as JSX: `scale={3}`, `color="#1f2937"`, `flag` or `flag={false}`. */
function formatProp(key: string, value: unknown): string {
  if (typeof value === 'string') {
    // A double quote cannot be written inside a JSX string: use an expression.
    return value.includes('"') ? `${key}={${JSON.stringify(value)}}` : `${key}="${value}"`
  }
  if (value === true) return key
  return `${key}={${String(value)}}`
}

/**
 * The JSX of a shader component with the given props, then `className`:
 * `<Drift scale={3} color="#1f2937" className="absolute inset-0" />`.
 */
export function formatJsx(name: string, props: Readonly<Record<string, unknown>>, className: string): string {
  const parts = [...Object.entries(props).map(([key, value]) => formatProp(key, value)), `className="${className}"`]
  const line = `<${name} ${parts.join(' ')} />`
  if (line.length <= MAX_LINE) return line
  return [`<${name}`, ...parts.map((part) => `  ${part}`), '/>'].join('\n')
}

/** The code sample of the playground: the import, then the component with the current settings. */
export function formatUsage(shaderId: string, props: Readonly<Record<string, unknown>>, className: string): string {
  const name = componentName(shaderId)
  return `import { ${name} } from 'shader-ui'\n\n${formatJsx(name, props, className)}`
}
