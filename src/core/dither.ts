import { defineShader } from './define'
import type { ColorParamDef, NumberParamDef, ParamSchema, ParamValues, ShaderDefinition } from './types'
import prelude from './wgsl/dither.wgsl?raw'

/** The parameters every dither shader has. */
export type DitherParamSchema = {
  color: ColorParamDef
  midColor: ColorParamDef
  background: ColorParamDef
  intensity: NumberParamDef
  tones: NumberParamDef
  cell: NumberParamDef
  speed: NumberParamDef
  pointer: NumberParamDef
}

/**
 * The parameters shared by every dither shader: the three tones of the palette, the dithering and
 * the motion. A dither shader shows them around its own parameters (see {@link defineDitherShader}).
 */
export const ditherParams: DitherParamSchema = {
  color: {
    type: 'color',
    label: 'Color',
    description: 'The darkest tone.',
    group: 'Color',
    default: '#000000',
  },
  midColor: {
    type: 'color',
    label: 'Mid tone',
    description: "The tone in the middle. 'auto' mixes the two others.",
    group: 'Color',
    default: 'auto',
    auto: { from: 'color', to: 'background', mix: 0.57 },
  },
  background: {
    type: 'color',
    label: 'Background',
    description: 'The lightest tone. It can be transparent.',
    group: 'Color',
    default: '#ffffff',
  },
  intensity: {
    type: 'number',
    label: 'Intensity',
    description: 'How strongly the pattern is drawn over the background.',
    group: 'Dither',
    default: 0.35,
    min: 0,
    max: 1,
    step: 0.01,
  },
  tones: {
    type: 'number',
    label: 'Tones',
    description: 'Number of tones the picture is reduced to.',
    group: 'Dither',
    default: 5,
    min: 2,
    max: 8,
    step: 1,
  },
  cell: {
    type: 'number',
    label: 'Cell size',
    description: 'Side of one dither cell.',
    group: 'Dither',
    default: 4,
    min: 2,
    max: 12,
    step: 1,
    unit: 'px',
  },
  speed: {
    type: 'number',
    label: 'Speed',
    description: 'Time multiplier. 0 freezes the shader.',
    group: 'Motion',
    default: 1,
    min: 0,
    max: 3,
    step: 0.05,
  },
  pointer: {
    type: 'number',
    label: 'Pointer',
    description: 'How much the pointer changes the picture. 0 turns it off.',
    group: 'Motion',
    default: 1,
    min: 0,
    max: 1,
    step: 0.05,
  },
}

/** The shared parameters shown before the parameters of the shader, and the ones shown after. */
const COLOR_KEYS = ['color', 'midColor', 'background'] as const
const ENGINE_KEYS = ['intensity', 'tones', 'cell', 'speed', 'pointer'] as const

/** Group of the parameters of a dither shader that declare none. */
const DEFAULT_GROUP = 'Pattern'

/**
 * The schema of a dither shader: the shared colors, then its own parameters `P`, then the other
 * shared parameters. This is the order a panel shows them in: Color, Pattern (and Pointer), Dither, Motion.
 */
export type DitherSchema<P extends ParamSchema = Record<never, never>> = Pick<DitherParamSchema, (typeof COLOR_KEYS)[number]> &
  P &
  Pick<DitherParamSchema, (typeof ENGINE_KEYS)[number]>

/** What {@link defineDitherShader} takes. */
export interface DitherShaderInit<P extends ParamSchema> {
  /** Stable identifier in kebab-case. */
  id: string
  /** Display name, in English. */
  name: string
  /** The technique in two or three words (`'fbm noise'`). */
  technique: string
  /** One sentence that describes the picture. */
  description: string
  /** One sentence that says what the pointer does. */
  pointerEffect: string
  /** The parameters of this shader only. A parameter with no `group` goes in "Pattern". */
  params?: P
  /**
   * WGSL that defines `fn field(px: vec2f, uv: vec2f) -> f32`: the luminance (0 = darkest tone,
   * 1 = lightest) at the cell `px` (cells, origin bottom-left) and at `uv` (`px` over the height).
   * It can call `backdrop`, `veil`, `pointer`, `hash`, `hash2`, `noise`, `fbm` and `bayer2/4/8`,
   * and reads the parameters on `u` (`u.intensity`, `u.time`, `u.amount`…).
   */
  body: string
  /** Time, in seconds, of the frame drawn for reduced motion. Defaults to 14. */
  stillTime?: number
  /** New defaults for shared parameters, for example `{ background: '#ffffff' }`. */
  overrides?: Partial<ParamValues<DitherParamSchema>>
}

/**
 * Creates a dither shader: a luminance field quantised to a few tones with an ordered (Bayer)
 * dither, drawn at one canvas pixel per cell.
 *
 * The shader only writes `field`; the palette, the dithering, the noise helpers and the shared
 * parameters ({@link ditherParams}) come with it. For a shader with its own `fs_main` (another
 * look, device resolution), use `defineShader`.
 */
export function defineDitherShader<const P extends ParamSchema = Record<never, never>>(
  init: DitherShaderInit<P>,
): ShaderDefinition<DitherSchema<P>> {
  const own: ParamSchema = {}
  for (const [key, def] of Object.entries(init.params ?? {})) {
    if (key in ditherParams) {
      throw new Error(`[shader-ui] shader "${init.id}": "${key}" is a shared dither parameter. Use "overrides" to change its default.`)
    }
    own[key] = { group: DEFAULT_GROUP, ...def }
  }

  const overrides: Readonly<Record<string, unknown>> = init.overrides ?? {}
  const shared = (keys: readonly (keyof DitherParamSchema)[]) =>
    Object.fromEntries(
      keys.map((key) => {
        const value = overrides[key]
        return [key, value === undefined ? ditherParams[key] : { ...ditherParams[key], default: value }]
      }),
    )

  return defineShader({
    id: init.id,
    name: init.name,
    technique: init.technique,
    description: init.description,
    pointerEffect: init.pointerEffect,
    resolution: 'cell',
    stillTime: init.stillTime ?? 14,
    // Colors first and engine settings last: a panel groups them around the pattern.
    params: { ...shared(COLOR_KEYS), ...own, ...shared(ENGINE_KEYS) } as DitherSchema<P>,
    fragment: `${prelude}\n${init.body}`,
  })
}
