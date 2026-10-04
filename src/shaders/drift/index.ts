import { defineDitherShader } from '../../core/dither'

import body from './drift.wgsl?raw'

/** Drift: soft clouds of warped noise that move slowly. The reference dither shader. */
export const drift = /* @__PURE__ */ defineDitherShader({
  id: 'drift',
  name: 'Drift',
  technique: 'warped fbm noise',
  description: 'Soft clouds of noise, warped twice, that drift slowly across the page.',
  pointerEffect: 'A wave spreads from the pointer and bends the noise, under a soft glow.',
  params: {
    scale: {
      type: 'number',
      label: 'Scale',
      description: 'Size of the noise: a higher value gives smaller clouds.',
      default: 2.4,
      min: 0.5,
      max: 8,
      step: 0.1,
    },
    warp: {
      type: 'number',
      label: 'Warp',
      description: 'How much the noise bends itself. 0 gives plain noise.',
      default: 2.6,
      min: 0,
      max: 6,
      step: 0.1,
    },
    glow: {
      type: 'number',
      label: 'Glow',
      description: 'Brightness of the halo under the pointer.',
      group: 'Pointer',
      default: 0.2,
      min: 0,
      max: 1,
      step: 0.01,
    },
  },
  body,
})
