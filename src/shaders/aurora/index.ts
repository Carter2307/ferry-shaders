import { defineDitherShader } from '../../core/dither'

import body from './aurora.wgsl?raw'

/** Aurora: soft curtains streaked with vertical rays that wave slowly. */
export const aurora = /* @__PURE__ */ defineDitherShader({
  id: 'aurora',
  name: 'Aurora',
  technique: 'layered noise curtains',
  description: 'Soft curtains that hang at different heights, streaked with fine vertical rays, and wave slowly.',
  pointerEffect: 'The curtains swell and shiver near the pointer.',
  params: {
    curtains: {
      type: 'number',
      label: 'Curtains',
      description: 'Number of curtains, from the lowest to the highest.',
      default: 3,
      min: 1,
      max: 3,
      step: 1,
    },
    rays: {
      type: 'number',
      label: 'Rays',
      description: 'Number of rays along a curtain: a higher value gives finer rays.',
      default: 55,
      min: 10,
      max: 120,
      step: 1,
    },
    rayContrast: {
      type: 'number',
      label: 'Ray contrast',
      description: 'How faint the gaps between the rays are. 0 gives plain curtains.',
      default: 0.75,
      min: 0,
      max: 1,
      step: 0.01,
    },
    fade: {
      type: 'number',
      label: 'Fade',
      description: 'How fast a curtain fades upward: a lower value gives taller curtains.',
      default: 3.5,
      min: 1,
      max: 12,
      step: 0.1,
    },
    sway: {
      type: 'number',
      label: 'Sway',
      description: 'How far the lower edge of a curtain waves up and down. 0 gives straight edges.',
      default: 0.08,
      min: 0,
      max: 0.2,
      step: 0.005,
    },
    swell: {
      type: 'number',
      label: 'Swell',
      description: 'How much denser the curtains get near the pointer.',
      group: 'Pointer',
      default: 0.8,
      min: 0,
      max: 2,
      step: 0.05,
    },
  },
  body,
})
