// The engine: no React, and no DOM access when the module loads (it imports fine on a server).
export type {
  AutoColor,
  BooleanParamDef,
  ColorParamDef,
  FrameUniforms,
  NumberParamDef,
  ParamDef,
  ParamSchema,
  ParamValue,
  ParamValues,
  Rgba,
  SceneUniforms,
  SelectOption,
  SelectParamDef,
  ShaderDefinition,
  ShaderResolution,
  ShaderStatus,
  Vec2,
} from './types'
export { defineShader, type ShaderInit } from './define'
export { defineDitherShader, ditherParams, type DitherParamSchema, type DitherSchema, type DitherShaderInit } from './dither'
export { defaultParams, groupParams, resolveParams, type ParamEntry, type ParamGroup } from './params'
export { mixColors, parseColor, resolveColor, resolveColors, type ColorResolver } from './color'
export { buildLayout, packParams, shaderLayout, shaderSource, writeFrame, HEADER_BYTES, type UniformLayout } from './layout'
export { isWebGpuSupported } from './support'
export { mountShader, type MountOptions, type MountPatch, type ShaderController } from './mount'
