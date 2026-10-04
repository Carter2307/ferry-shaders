import type { ParamDef, ParamSchema, ParamValues, ShaderDefinition } from './types'

/** One parameter of a panel section. */
export interface ParamEntry {
  /** Key of the parameter in the schema and in the values. */
  key: string
  def: ParamDef
}

/** One section of a panel: the parameters that share a `group` title. */
export interface ParamGroup {
  /** Title of the section. An empty string for the parameters that declare no group. */
  group: string
  entries: ParamEntry[]
}

/** The value to use for one parameter: `value` when it is valid for the definition, else the default. */
function sanitise(def: ParamDef, value: unknown): string | number | boolean {
  switch (def.type) {
    case 'color':
      if (typeof value !== 'string' || value.trim() === '') return def.default
      // 'auto' only means something for a color that declares how to compute it.
      if (value === 'auto' && !def.auto) return def.default
      return value
    case 'number':
      // The range is guidance for panels: only a value that is not a number is refused.
      return typeof value === 'number' && Number.isFinite(value) ? value : def.default
    case 'boolean':
      return typeof value === 'boolean' ? value : def.default
    case 'select':
      return def.options.some((option) => option.value === value) ? (value as string) : def.default
  }
}

/** The default value of every parameter of a shader. */
export function defaultParams<S extends ParamSchema>(shader: ShaderDefinition<S>): ParamValues<S> {
  return resolveParams(shader)
}

/**
 * The complete values of a shader: the defaults, replaced by the valid entries of `partial`.
 *
 * It accepts untrusted data (a URL, `localStorage`): a value of the wrong type, a number that is
 * not finite, an unknown option or an empty color falls back to the default, and unknown keys are
 * dropped. Numbers are not clamped to `min` / `max`.
 */
export function resolveParams<S extends ParamSchema>(
  shader: ShaderDefinition<S>,
  partial?: Partial<ParamValues<S>> | Readonly<Record<string, unknown>> | null,
): ParamValues<S> {
  const source: Readonly<Record<string, unknown>> = partial ?? {}
  const values: Record<string, string | number | boolean> = {}
  for (const [key, def] of Object.entries(shader.params)) {
    values[key] = sanitise(def, source[key])
  }
  return values as ParamValues<S>
}

/**
 * The parameters of a schema as panel sections, in display order: the groups in the order they
 * first appear, and the parameters of a group in schema order.
 */
export function groupParams(schema: ParamSchema): ParamGroup[] {
  const groups = new Map<string, ParamEntry[]>()
  for (const [key, def] of Object.entries(schema)) {
    const group = def.group ?? ''
    const entries = groups.get(group)
    if (entries) entries.push({ key, def })
    else groups.set(group, [{ key, def }])
  }
  return Array.from(groups, ([group, entries]) => ({ group, entries }))
}
