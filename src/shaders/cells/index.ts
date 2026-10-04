import { defineDitherShader } from '../../core/dither'

import body from './cells.wgsl?raw'

/** Cells: Voronoi cells that move slowly, lighter at their core, with dark seams. */
export const cells = /* @__PURE__ */ defineDitherShader({
  id: 'cells',
  name: 'Cells',
  technique: 'animated Voronoi',
  description: 'Voronoi cells that move slowly, lighter at their core, with dark seams between them.',
  pointerEffect: 'The pointer pushes the cells outward like a lens and lights the ones beneath it.',
  params: {
    scale: {
      type: 'number',
      label: 'Scale',
      description: 'Number of cells across the height: a higher value gives smaller cells.',
      default: 5,
      min: 2,
      max: 16,
      step: 0.5,
    },
    jitter: {
      type: 'number',
      label: 'Jitter',
      description: 'How far each cell strays from a regular grid: 0 gives still squares.',
      default: 0.4,
      min: 0,
      // MAX_JITTER in cells.wgsl: further than 0.4 of a square, the 3x3 search misses neighbours
      // and the seams break at the borders of the squares.
      max: 0.4,
      step: 0.01,
    },
    seamWidth: {
      type: 'number',
      label: 'Seam width',
      description: 'Width of the dark seams between the cells.',
      default: 0.14,
      // Above SEAM_CORE (0.03) in cells.wgsl: the seam fades from the one to the other.
      min: 0.05,
      max: 0.5,
      step: 0.01,
    },
    seamStrength: {
      type: 'number',
      label: 'Seam strength',
      description: 'How dark the seams between the cells are.',
      default: 0.35,
      // Under 0.1 the seams fade out and nothing tells one cell from the next.
      min: 0.1,
      max: 1,
      step: 0.01,
    },
    push: {
      type: 'number',
      label: 'Push',
      description: 'How strongly the pointer pushes the cells away.',
      group: 'Pointer',
      default: 0.08,
      min: 0,
      // A stronger push folds the lattice over itself in a wide ring around the pointer.
      max: 0.12,
      step: 0.005,
    },
    glow: {
      type: 'number',
      label: 'Glow',
      description: 'Brightness of the light under the pointer.',
      group: 'Pointer',
      default: 0.18,
      min: 0,
      // Above 0.5 the light is a plain white disc that hides the cells.
      max: 0.5,
      step: 0.01,
    },
  },
  body,
})
