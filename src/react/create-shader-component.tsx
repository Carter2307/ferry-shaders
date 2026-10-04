import * as React from 'react'

import type { ParamSchema, ParamValues, ShaderDefinition } from '../core/types'

import { ShaderCanvas, type ShaderCanvasProps } from './shader-canvas'

/**
 * Props of a component made by {@link createShaderComponent}: the parameters of the shader as
 * props, plus the props of `ShaderCanvas` (without `shader` and `params`). A parameter wins over
 * an HTML attribute of the same name, such as `color`.
 */
export type ShaderComponentProps<S extends ParamSchema> = Partial<ParamValues<S>> &
  Omit<ShaderCanvasProps<S>, 'shader' | 'params' | keyof S>

/** A component made by {@link createShaderComponent}. The ref goes to the root `<div>`. */
export type ShaderComponent<S extends ParamSchema> = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ShaderComponentProps<S>> & React.RefAttributes<HTMLDivElement>
>

/** `pixel-field` -> `PixelField`. */
const pascalCase = (id: string) =>
  id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

/**
 * Makes the component of one shader: its parameters are props (`<Drift scale={3} color="#333" />`),
 * typed from the schema. Everything else is a `ShaderCanvas` prop (`className`, `paused`,
 * `fallback`…).
 *
 * Call it once, at module level. Use `ShaderCanvas` instead when the shader is chosen at run time.
 */
export function createShaderComponent<S extends ParamSchema>(shader: ShaderDefinition<S>): ShaderComponent<S> {
  const paramKeys = new Set(Object.keys(shader.params))
  const Component = React.forwardRef<HTMLDivElement, ShaderComponentProps<S>>(function ShaderComponent(props, ref) {
    const params: Record<string, unknown> = {}
    const rest: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(props)) {
      if (paramKeys.has(key)) params[key] = value
      else rest[key] = value
    }
    return <ShaderCanvas {...rest} ref={ref} shader={shader} params={params as Partial<ParamValues<S>>} />
  })
  Component.displayName = pascalCase(shader.id)
  return Component
}
