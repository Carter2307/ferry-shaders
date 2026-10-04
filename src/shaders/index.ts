import type { ShaderDefinition } from '../core/types'

import { aurora } from './aurora'
import { cells } from './cells'
import { drift } from './drift'
import { dunes } from './dunes'
import { grass } from './grass'
import { pixelField } from './pixel-field'
import { rain } from './rain'
import { relief } from './relief'
import { ripples } from './ripples'
import { stars } from './stars'

export { aurora, cells, drift, dunes, grass, pixelField, rain, relief, ripples, stars }

/**
 * Every shader of the library, in gallery order. To add a shader: create `src/shaders/<id>/`,
 * import its definition here, export it by name and add it to this list.
 */
export const shaders: readonly ShaderDefinition[] = [
  drift,
  ripples,
  relief,
  cells,
  rain,
  stars,
  dunes,
  grass,
  aurora,
  pixelField,
]

/** The shader with this id, or `undefined` when the library has none. */
export function getShader(id: string): ShaderDefinition | undefined {
  return shaders.find((shader) => shader.id === id)
}
