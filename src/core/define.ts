import { HEADER_FIELDS } from './layout'
import type { ParamDef, ParamSchema, ShaderDefinition } from './types'

/** WGSL keywords (https://www.w3.org/TR/WGSL/#keyword-summary): not valid as a struct member name. */
const WGSL_KEYWORDS =
  'alias break case const const_assert continue continuing default diagnostic discard else enable false fn for if let loop override requires return struct switch true var while'

/** WGSL reserved words (https://www.w3.org/TR/WGSL/#reserved-words): not valid as a struct member name. */
const WGSL_RESERVED =
  'NULL Self abstract active alignas alignof as asm asm_fragment async attribute auto await become cast catch class co_await co_return co_yield coherent column_major common compile compile_fragment concept const_cast consteval constexpr constinit crate debugger decltype delete demote demote_to_helper do dynamic_cast enum explicit export extends extern external fallthrough filter final finally friend from fxgroup get goto groupshared highp impl implements import inline instanceof interface layout lowp macro macro_rules match mediump meta mod module move mut mutable namespace new nil noexcept noinline nointerpolation non_coherent noperspective null nullptr of operator package packoffset partition pass patch pixelfragment precise precision premerge priv protected pub public readonly ref regardless register reinterpret_cast require resource restrict self set shared sizeof smooth snorm static static_assert static_cast std subroutine super target template this thread_local throw trait try type typedef typeid typename typeof union unless unorm unsafe unsized use using varying virtual volatile wgsl where with writeonly yield'

const FORBIDDEN_KEYS = new Set([...WGSL_KEYWORDS.split(' '), ...WGSL_RESERVED.split(' ')])
const HEADER_KEYS = new Set<string>(HEADER_FIELDS)

const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
const KEY = /^[a-z][A-Za-z0-9]*$/
/** Parameters the engine reads itself: they must be numbers. */
const ENGINE_KEYS = ['speed', 'cell', 'pointer']

/** What `defineShader` takes: a {@link ShaderDefinition} whose `stillTime` may be left out. */
export type ShaderInit<S extends ParamSchema> = Omit<ShaderDefinition<S>, 'stillTime'> & {
  /** Time, in seconds, of the frame drawn for reduced motion. Defaults to 0. */
  stillTime?: number
}

/**
 * Checks that `key` can be the name of a member of the WGSL `Uniforms` struct, and throws an error
 * that says what to change when it cannot.
 */
function checkKey(fail: (message: string) => never, key: string): void {
  if (!KEY.test(key)) {
    fail(`parameter "${key}" needs a camelCase name: a lower-case letter, then letters and digits`)
  }
  if (HEADER_KEYS.has(key)) {
    fail(`parameter "${key}" has the name of a built-in uniform (${HEADER_FIELDS.join(', ')}). Rename it`)
  }
  if (FORBIDDEN_KEYS.has(key)) {
    fail(`parameter "${key}" is a keyword or a reserved word of WGSL, so "u.${key}" does not compile. Rename it`)
  }
}

function checkParam(fail: (message: string) => never, schema: ParamSchema, key: string, def: ParamDef): void {
  switch (def.type) {
    case 'color': {
      if (typeof def.default !== 'string' || def.default.trim() === '') {
        fail(`color "${key}" needs a CSS color as its default`)
      }
      if (def.default === 'auto' && !def.auto) {
        fail(`color "${key}" has the default 'auto' but declares no "auto" mix`)
      }
      if (def.auto) {
        for (const end of [def.auto.from, def.auto.to]) {
          const other = schema[end]
          // Both ends are plain colors: an `auto` color never depends on another `auto` color.
          if (end === key || other?.type !== 'color' || other.auto) {
            fail(`color "${key}": auto mixes "${end}", which must be another color parameter with no "auto" of its own`)
          }
        }
        if (!Number.isFinite(def.auto.mix)) fail(`color "${key}": auto.mix must be a number`)
      }
      return
    }
    case 'number': {
      const numbers = [def.default, def.min, def.max, def.step]
      if (!numbers.every((value) => typeof value === 'number' && Number.isFinite(value))) {
        fail(`number "${key}" needs finite numbers for default, min, max and step`)
      }
      if (def.min > def.max) fail(`number "${key}" has min above max`)
      if (def.step <= 0) fail(`number "${key}" needs a step above 0`)
      return
    }
    case 'boolean':
      if (typeof def.default !== 'boolean') fail(`boolean "${key}" needs true or false as its default`)
      return
    case 'select': {
      const values = def.options.map((option) => option.value)
      if (values.length === 0) fail(`select "${key}" needs at least one option`)
      if (new Set(values).size !== values.length) fail(`select "${key}" has two options with the same value`)
      if (!values.includes(def.default)) fail(`select "${key}": the default "${def.default}" is not one of its options`)
      return
    }
    default:
      fail(`parameter "${key}" has an unknown type: use 'color', 'number', 'boolean' or 'select'`)
  }
}

/**
 * Creates a shader definition and checks it.
 *
 * Use it for a shader that writes its own `fs_main` (for a dithered shader, use
 * `defineDitherShader`: it brings the palette, the dithering and the shared parameters). The
 * literal types of `params` are kept, so the values of a select are a union of its options.
 *
 * It throws when the definition cannot work: an id that is not kebab-case, a parameter name that
 * is not a valid WGSL member name (the name of a built-in uniform, a keyword or a reserved word
 * such as `from`, `filter` or `target`), an inconsistent parameter, or a fragment with no `fs_main`.
 */
export function defineShader<const S extends ParamSchema>(init: ShaderInit<S>): ShaderDefinition<S> {
  const fail = (message: string): never => {
    throw new Error(`[ferry-shaders] shader "${init.id}": ${message}.`)
  }

  if (!ID.test(init.id)) fail('the id must be kebab-case (lower-case letters, digits and single dashes)')
  if (init.resolution !== 'cell' && init.resolution !== 'device') fail(`resolution must be 'cell' or 'device'`)
  if (!/\bfn\s+fs_main\b/.test(init.fragment)) fail('the fragment must define the entry point "fs_main"')

  for (const [key, def] of Object.entries(init.params)) {
    checkKey(fail, key)
    checkParam(fail, init.params, key, def)
    if (ENGINE_KEYS.includes(key) && def.type !== 'number') {
      fail(`parameter "${key}" is read by the engine and must be a number`)
    }
  }

  const stillTime = init.stillTime ?? 0
  if (!Number.isFinite(stillTime)) fail('stillTime must be a number')

  // Frozen: the layout and the compiled pipeline of a definition are cached, so it must not change.
  return Object.freeze({ ...init, stillTime })
}
