import { defineDitherShader } from '../../core/dither'

import body from './grass.wgsl?raw'

/** Grass: a fringe of pixel grass along the bottom of the page that sways in the wind. */
export const grass = /* @__PURE__ */ defineDitherShader({
  id: 'grass',
  name: 'Grass',
  technique: 'bent polyline blades',
  description: 'A fringe of pixel grass along the bottom of the page that sways in the wind.',
  pointerEffect: 'The pointer parts the blades like a hand through grass.',
  params: {
    spacing: {
      type: 'number',
      label: 'Spacing',
      description: 'Distance between two blades: a lower value gives thicker grass.',
      default: 3,
      min: 2,
      max: 12,
      step: 0.5,
      unit: 'cells',
    },
    height: {
      type: 'number',
      label: 'Height',
      description: 'Length of the tallest blades. Most blades are shorter.',
      default: 36,
      min: 8,
      max: 72,
      step: 1,
      unit: 'cells',
    },
    sway: {
      type: 'number',
      label: 'Sway',
      description: 'How far the wind bends the blades. 0 gives still grass.',
      default: 0.25,
      min: 0,
      max: 0.5,
      step: 0.01,
    },
    ink: {
      type: 'number',
      label: 'Ink',
      description: 'How dark the blades are against the page.',
      default: 0.6,
      min: 0.3,
      max: 1,
      step: 0.01,
    },
    partRadius: {
      type: 'number',
      label: 'Reach',
      description: 'How far from the pointer the blades part.',
      group: 'Pointer',
      default: 28,
      min: 4,
      max: 80,
      step: 1,
      unit: 'cells',
    },
  },
  body,
})
