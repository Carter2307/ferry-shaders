import * as React from 'react'

import { groupParams, resolveParams, type ParamGroup } from '../core/params'
import type { ParamSchema, ParamValue, ParamValues, ShaderDefinition } from '../core/types'

/** Options of {@link useShaderControls}. */
export interface ShaderControlsOptions<S extends ParamSchema = ParamSchema> {
  /**
   * Starting values, used for a shader until one of its values is changed or reset. Read once, on
   * the first render. Keys the shader does not have are ignored, so one object can serve several
   * shaders (`{ color: 'var(--primary)' }`).
   */
  initial?: Partial<ParamValues<S>>
  /**
   * Key of `localStorage` where the changed values are kept, for every shader, so they come back
   * on the next visit. Best effort: a browser that blocks storage keeps them in memory only. The
   * storage is read on the first render in the browser: in a server-rendered app, mount the panel
   * on the client only.
   */
  storageKey?: string
}

/** The state of a shader panel, returned by {@link useShaderControls}. */
export interface ShaderControls<S extends ParamSchema = ParamSchema> {
  /** The shader the controls are for: pass it to `ShaderCanvas` with `values`. */
  shader: ShaderDefinition<S>
  /** The parameter schema of the shader. */
  schema: S
  /** The parameters as panel sections, in display order. */
  groups: ParamGroup[]
  /** The current value of every parameter: pass it to `ShaderCanvas` as `params`. */
  values: ParamValues<S>
  /** Changes one value. */
  set<K extends keyof S>(key: K, value: ParamValue<S[K]>): void
  /** Changes several values at once. */
  setMany(partial: Partial<ParamValues<S>>): void
  /** Puts one parameter back to its default, or all of them when no key is given. */
  reset(key?: keyof S): void
  /** True when every value is the default of the schema. */
  isDefault: boolean
  /** Only the values that differ from the defaults: the props to write in a code sample. */
  toProps(): Partial<ParamValues<S>>
}

/** Changed values by shader id. */
type Store = Readonly<Record<string, Readonly<Record<string, unknown>>>>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function readStore(storageKey: string | undefined): Store {
  if (!storageKey || typeof window === 'undefined') return {}
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null')
    if (!isRecord(parsed)) return {}
    // The values themselves are checked against the schema each time they are read.
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1])))
  } catch {
    return {} // storage blocked (private mode, sandbox) or not JSON
  }
}

function writeStore(storageKey: string, store: Store): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(store))
  } catch {
    // Not critical: the values stay in memory for this visit.
  }
}

/**
 * Holds the parameter values of a shader for a panel: read them, change them, reset them.
 *
 * The values are kept per shader id: when `shader` changes (a shader picker) and later comes back,
 * its values are restored. Pass `shader` and `values` to `ShaderCanvas`, and bind the controls of
 * your panel to `groups`, `values` and `set`.
 *
 * It only holds state: it renders nothing and knows nothing about the GPU.
 */
export function useShaderControls<S extends ParamSchema>(
  shader: ShaderDefinition<S>,
  options: ShaderControlsOptions<S> = {},
): ShaderControls<S> {
  const { storageKey } = options
  // Read once, like the initial value of `useState`.
  const [initial] = React.useState<Readonly<Record<string, unknown>>>(() => options.initial ?? {})
  const [store, setStore] = React.useState<Store>(() => readStore(storageKey))

  React.useEffect(() => {
    if (storageKey) writeStore(storageKey, store)
  }, [storageKey, store])

  return React.useMemo(() => {
    const { id, params: schema } = shader
    const values = resolveParams(shader, store[id] ?? initial)

    /** Applies `change` to the entry of this shader. An untouched shader starts from `initial`. */
    const edit = (change: (entry: Readonly<Record<string, unknown>>) => Readonly<Record<string, unknown>>) =>
      setStore((previous) => ({ ...previous, [id]: change(previous[id] ?? initial) }))

    const toProps = () => {
      const changed: Record<string, unknown> = {}
      for (const [key, def] of Object.entries(schema)) {
        const value = (values as Record<string, unknown>)[key]
        if (value !== def.default) changed[key] = value
      }
      return changed as Partial<ParamValues<S>>
    }

    return {
      shader,
      schema,
      groups: groupParams(schema),
      values,
      set: (key, value) => edit((entry) => ({ ...entry, [key]: value })),
      setMany: (partial) => edit((entry) => ({ ...entry, ...partial })),
      reset: (key) =>
        edit((entry) => {
          // An empty entry (not a missing one): a reset goes to the defaults, not back to `initial`.
          if (key === undefined) return {}
          const { [key as string]: _removed, ...rest } = entry
          return rest
        }),
      isDefault: Object.keys(toProps()).length === 0,
      toProps,
    }
  }, [shader, store, initial])
}
