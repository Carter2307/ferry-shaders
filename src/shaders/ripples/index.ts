import { defineDitherShader } from '../../core/dither'

import body from './ripples.wgsl?raw'

/** Ripples: rings from three wandering wave sources that cross each other. */
export const ripples = /* @__PURE__ */ defineDitherShader({
  id: 'ripples',
  name: 'Ripples',
  technique: 'wave interference',
  description: 'Rings spread from three slow, wandering sources and cross each other.',
  pointerEffect: 'The pointer becomes a fourth, faster source of rings.',
  params: {
    frequency: {
      type: 'number',
      label: 'Frequency',
      description: 'How tight the rings are: a higher value gives more rings, closer together.',
      default: 26,
      // Under 12 a ring is wider than half the page: the picture turns into a plain gradient.
      min: 12,
      max: 60,
      step: 1,
    },
    falloff: {
      type: 'number',
      label: 'Falloff',
      description: 'How fast a wave fades as it moves away from its source.',
      default: 2,
      min: 0,
      // Above 5 the rings die out before they cross each other.
      max: 5,
      step: 0.1,
    },
    contrast: {
      type: 'number',
      label: 'Contrast',
      description: 'How far the rings go from light to dark.',
      default: 0.3,
      // Under 0.15 the rings are too faint to survive the dithering.
      min: 0.15,
      max: 1,
      step: 0.01,
    },
    wobble: {
      type: 'number',
      label: 'Wobble',
      description: 'How much noise bends the rings: 0 gives perfect circles.',
      default: 0.025,
      min: 0,
      max: 0.2,
      step: 0.005,
    },
    pointerWave: {
      type: 'number',
      label: 'Wave',
      description: 'Strength of the rings that start at the pointer.',
      group: 'Pointer',
      default: 1.4,
      min: 0,
      max: 3,
      step: 0.1,
    },
  },
  body,
})
