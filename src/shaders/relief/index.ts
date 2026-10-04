import { defineDitherShader } from '../../core/dither'

import body from './relief.wgsl?raw'

/** Relief: a height map that shifts slowly, drawn as a terraced chart with contour lines. */
export const relief = /* @__PURE__ */ defineDitherShader({
  id: 'relief',
  name: 'Relief',
  technique: 'terraced contour map',
  description: 'A height map that shifts slowly, drawn as a terraced topographic chart with contour lines.',
  pointerEffect: 'The pointer raises a hill, and contour rings gather around it.',
  params: {
    contours: {
      type: 'number',
      label: 'Contours',
      description: 'Number of height levels: a higher value gives more lines, closer together.',
      default: 14,
      min: 4,
      max: 28,
      step: 1,
    },
    scale: {
      type: 'number',
      label: 'Scale',
      description: 'Size of the terrain: a higher value gives smaller hills.',
      default: 1.6,
      min: 0.5,
      // Above 3 the finest octaves of the noise are smaller than a cell: the lines turn into grain.
      max: 3,
      step: 0.1,
    },
    lineWidth: {
      type: 'number',
      label: 'Line width',
      description: 'Width of the contour lines, in dither cells.',
      default: 1.2,
      // Under 0.8 a line is thinner than a cell and breaks into dots.
      min: 0.8,
      max: 3,
      step: 0.1,
    },
    lineStrength: {
      type: 'number',
      label: 'Line strength',
      description: 'How dark the contour lines are: 0 leaves only the terraces.',
      default: 0.38,
      min: 0,
      max: 1,
      step: 0.01,
    },
    shading: {
      type: 'number',
      label: 'Shading',
      description: 'How much the tone changes from one level to the next: 0 leaves only the lines.',
      default: 0.45,
      min: 0,
      max: 1,
      step: 0.01,
    },
    hill: {
      type: 'number',
      label: 'Hill',
      description: 'Height of the hill that the pointer raises.',
      group: 'Pointer',
      default: 0.35,
      min: 0,
      // A higher hill packs more rings than the cells around the pointer can show.
      max: 0.8,
      step: 0.01,
    },
  },
  body,
})
