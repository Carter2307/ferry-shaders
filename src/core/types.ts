/** A pair of numbers: a size or a position. */
export type Vec2 = readonly [number, number]

/** A color as sRGB values from 0 to 1, with a straight (not premultiplied) alpha: `[r, g, b, a]`. */
export type Rgba = readonly [number, number, number, number]

/** What every parameter has: the texts a panel shows. */
interface ParamBase {
  /** Short name shown next to the control ("Scale"). */
  label: string
  /** One sentence that says what the parameter changes. */
  description?: string
  /** Title of the panel section the parameter belongs to ("Color", "Pattern"). */
  group?: string
}

/** How an `auto` color is computed: a mix of two other color parameters. */
export interface AutoColor {
  /** Key of the color parameter at 0. It must be a color parameter with no `auto` of its own. */
  from: string
  /** Key of the color parameter at 1. It must be a color parameter with no `auto` of its own. */
  to: string
  /** Position between `from` (0) and `to` (1). */
  mix: number
}

/**
 * A color parameter. Its value is any CSS color string: `'#d9c4a3'`, `'rgb(217 196 163)'`,
 * `'oklch(0.8 0.05 80)'`, `'transparent'`, `'currentColor'`, `'var(--token)'`.
 * The shader reads it as a `vec4f` in sRGB with a straight alpha.
 */
export interface ColorParamDef extends ParamBase {
  type: 'color'
  /** A CSS color, or `'auto'` when {@link ColorParamDef.auto} is declared. */
  default: string
  /** When declared, the value may be the string `'auto'`: the color is then a mix of two other colors. */
  auto?: AutoColor
}

/** A number parameter. The shader reads it as an `f32`. */
export interface NumberParamDef extends ParamBase {
  type: 'number'
  default: number
  /** Lowest value a panel offers. The engine does not clamp to it. */
  min: number
  /** Highest value a panel offers. The engine does not clamp to it. */
  max: number
  /** Step of a slider or a number field. */
  step: number
  /** Unit shown after the value ("px"). */
  unit?: string
}

/** An on/off parameter. The shader reads it as an `f32`: 0 or 1. */
export interface BooleanParamDef extends ParamBase {
  type: 'boolean'
  default: boolean
}

/** One choice of a {@link SelectParamDef}. */
export interface SelectOption<V extends string = string> {
  /** Value stored in the params. */
  value: V
  /** Text shown in the panel. */
  label: string
}

/** A choice between named options. The shader reads it as an `f32`: the index of the option. */
export interface SelectParamDef<V extends string = string> extends ParamBase {
  type: 'select'
  default: V
  options: readonly SelectOption<V>[]
}

/** The definition of one parameter. `type` says which kind it is. */
export type ParamDef = ColorParamDef | NumberParamDef | BooleanParamDef | SelectParamDef

/**
 * The parameters of a shader, by key. The key is the name of the uniform in WGSL (`u.<key>`).
 * The order of the keys is the order a panel shows them in.
 */
export type ParamSchema = Record<string, ParamDef>

/** The value type of one parameter: a string for a color, the union of the option values for a select. */
export type ParamValue<D extends ParamDef = ParamDef> = D extends { type: 'color' }
  ? string
  : D extends { type: 'number' }
    ? number
    : D extends { type: 'boolean' }
      ? boolean
      : D extends { type: 'select'; options: readonly { value: infer V }[] }
        ? V
        : never

/** The values of every parameter of a schema, by key. */
export type ParamValues<S extends ParamSchema = ParamSchema> = { -readonly [K in keyof S]: ParamValue<S[K]> }

/**
 * Where a shader draws:
 * - `cell`: one canvas pixel per grid cell (the `cell` parameter, in CSS pixels), scaled up with hard
 *   edges. For pixel-art looks such as the dither shaders.
 * - `device`: one canvas pixel per device pixel (the ratio is capped at 2). For smooth or fine detail.
 */
export type ShaderResolution = 'cell' | 'device'

/**
 * A shader and everything a gallery or a panel needs to know about it. Create one with
 * `defineShader` or `defineDitherShader`: they check the parameter names.
 *
 * Three parameter names are read by the engine (and still sent to the shader as uniforms):
 * - `speed` (number): multiplies the time. 0 freezes the shader.
 * - `cell` (number, `resolution: 'cell'` only): side of one grid cell, in CSS pixels.
 * - `pointer` (number, 0 to 1): multiplies the influence of the pointer (`u.amount`). 0 turns it off.
 */
export interface ShaderDefinition<S extends ParamSchema = ParamSchema> {
  /** Stable identifier in kebab-case (`'pixel-field'`). */
  readonly id: string
  /** Display name, in English. */
  readonly name: string
  /** The technique in two or three words (`'fbm noise'`). */
  readonly technique: string
  /** One sentence that describes the picture. */
  readonly description: string
  /** One sentence that says what the pointer does. */
  readonly pointerEffect: string
  readonly resolution: ShaderResolution
  /** Time, in seconds, of the frame drawn when the reader asks for reduced motion. */
  readonly stillTime: number
  readonly params: S
  /**
   * WGSL code placed after the generated header (the `Uniforms` struct, the binding `u` and the
   * vertex stage). It must define the fragment entry point `fs_main`, which returns a
   * premultiplied color.
   */
  readonly fragment: string
}

/**
 * State of a mounted shader:
 * - `pending`: the GPU device or the shader is not ready yet. Nothing is drawn.
 * - `ready`: the shader draws.
 * - `unsupported`: the browser has no WebGPU, or gives no GPU adapter. Show something else.
 * - `error`: the shader did not compile (details are in the console).
 */
export type ShaderStatus = 'pending' | 'ready' | 'unsupported' | 'error'

/** The values written to the fixed header of the uniform buffer for each frame. */
export interface FrameUniforms {
  /** Canvas size in canvas pixels: grid cells for `cell`, device pixels for `device`. */
  resolution: Vec2
  /** Pointer position in canvas pixels, origin bottom-left. */
  mouse: Vec2
  /** Seconds, already multiplied by `speed`. */
  time: number
  /** Pointer influence from 0 to 1, eased and already multiplied by the `pointer` parameter. */
  amount: number
  /** Canvas pixels per CSS pixel: `1 / cell` for `cell`, the device pixel ratio for `device`. */
  pixelRatio: number
  /** Calm column `[left, right]` in canvas pixels. `left >= right` means there is none. */
  focus: Vec2
}

/** What the animation state provides for a frame. The mount adds the layout data (`pixelRatio`, `focus`). */
export type SceneUniforms = Pick<FrameUniforms, 'resolution' | 'mouse' | 'time' | 'amount'>
