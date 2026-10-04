import { defineDitherShader } from '../../core/dither'

import body from './stars.wgsl?raw'

/** Constellations: pixel stars that twinkle on two layers, linked by lines near the pointer. */
export const stars = /* @__PURE__ */ defineDitherShader({
  id: 'stars',
  name: 'Stars',
  technique: 'hashed star grid',
  description: 'Sparse pixel stars twinkle on two layers that drift at different speeds.',
  pointerEffect: 'Thin lines link the neighbouring stars around the pointer, like a printed star chart.',
  params: {
    spacing: {
      type: 'number',
      label: 'Spacing',
      description: 'Side of the square that holds one near star, in cells: a higher value spreads the stars out.',
      default: 18,
      min: 10,
      max: 40,
      step: 1,
    },
    density: {
      type: 'number',
      label: 'Density',
      description: 'Share of the squares that hold a star.',
      default: 0.55,
      // Below 0.3 two stars are seldom neighbours: the pointer has nothing to link.
      min: 0.3,
      max: 1,
      step: 0.05,
    },
    ink: {
      type: 'number',
      label: 'Ink',
      description: 'How dark the stars and the links are drawn on the page.',
      default: 0.85,
      min: 0.3,
      max: 1,
      step: 0.05,
    },
    linkRadius: {
      type: 'number',
      label: 'Link radius',
      description: 'Distance from the pointer within which the stars are linked, in cells.',
      group: 'Pointer',
      default: 56,
      min: 32,
      max: 120,
      step: 1,
    },
    linkLength: {
      type: 'number',
      label: 'Link length',
      description: 'Longest link, in star squares: a higher value links stars that are further apart.',
      group: 'Pointer',
      default: 1.5,
      // Links only join stars of adjacent squares: past 2 squares no pair is left to add.
      min: 1,
      max: 2,
      step: 0.1,
    },
  },
  body,
})
