import { defineDitherShader } from '../../core/dither'

import body from './dunes.wgsl?raw'

/** Dunes: wind ripples on sand, each with a thin crest line and a shaded side. */
export const dunes = /* @__PURE__ */ defineDitherShader({
  id: 'dunes',
  name: 'Dunes',
  technique: 'meandering ripple lines',
  description: 'Wind ripples on sand: meandering crests with a thin dark line and a shaded side, over broad dunes.',
  pointerEffect: 'A gust around the pointer bends the ripples.',
  params: {
    ripples: {
      type: 'number',
      label: 'Ripples',
      description: 'Number of crests in the height of the page.',
      default: 22,
      min: 8,
      max: 40,
      step: 1,
    },
    crest: {
      type: 'number',
      label: 'Crest',
      description: 'Where the crest sits in each ripple: a lower value gives a longer shaded side.',
      default: 0.76,
      min: 0.3,
      max: 0.9,
      step: 0.01,
    },
    meander: {
      type: 'number',
      label: 'Meander',
      description: 'How much the crests wander. 0 gives straight lines.',
      default: 4,
      min: 0,
      max: 8,
      step: 0.1,
    },
    lee: {
      type: 'number',
      label: 'Lee shade',
      description: 'How dark the sheltered side of each ripple is.',
      default: 0.6,
      min: 0,
      max: 1,
      step: 0.01,
    },
    relief: {
      type: 'number',
      label: 'Relief',
      description: 'Strength of the broad light and shade of the dunes under the ripples.',
      default: 0.25,
      min: 0,
      max: 0.8,
      step: 0.01,
    },
    gust: {
      type: 'number',
      label: 'Gust',
      description: 'How far the pointer pushes the ripples around it.',
      group: 'Pointer',
      default: 3,
      min: 0,
      max: 8,
      step: 0.1,
    },
  },
  body,
})
