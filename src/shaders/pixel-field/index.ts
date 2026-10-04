import { defineShader } from '../../core/define'

import fragment from './pixel-field.wgsl?raw'

/**
 * Pixel field: a dense field of small pixels at one edge of the canvas that thins out to nothing.
 * The one shader that is not in the dither family: it draws at device resolution, on a transparent
 * background, with its own `fs_main`. It comes from the ferry-ui documentation site.
 */
export const pixelField = /* @__PURE__ */ defineShader({
  id: 'pixel-field',
  name: 'Pixel Field',
  technique: 'hashed dither fade',
  description: 'A dense field of small pixels at one edge that thins out to nothing, with drifting patches of accent color.',
  pointerEffect: 'None: this shader does not react to the pointer.',
  resolution: 'device',
  // The frame the original draws for a reader who asks for reduced motion.
  stillTime: 12,
  params: {
    color: {
      type: 'color',
      label: 'Color',
      description: 'Color of the neutral pixels. The default is the text color of the page, so it follows the theme.',
      group: 'Color',
      default: 'currentColor',
    },
    opacity: {
      type: 'number',
      label: 'Opacity',
      description: 'Strength of the neutral pixels. Lower it on a dark page: light pixels read stronger.',
      group: 'Color',
      default: 0.13,
      min: 0,
      max: 1,
      step: 0.01,
    },
    accent: {
      type: 'color',
      label: 'Accent',
      description: 'Color of the patches inside the neutral field.',
      group: 'Color',
      // The light value of the ferry-ui token --primary-bright, oklch(0.62 0.19 259.5), as a literal:
      // a literal needs no stylesheet, and the pure parser reads it on a server and in tests.
      default: '#3881f6',
    },
    accentOpacity: {
      type: 'number',
      label: 'Accent opacity',
      description: 'Strength of the accent pixels.',
      group: 'Color',
      default: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
    },
    origin: {
      type: 'select',
      label: 'Origin',
      description: 'The edge where the field is dense. It thins out toward the other edge.',
      group: 'Pattern',
      default: 'top',
      options: [
        { value: 'top', label: 'Top' },
        { value: 'bottom', label: 'Bottom' },
      ],
    },
    falloff: {
      type: 'number',
      label: 'Falloff',
      description: 'How fast the field thins out: a higher value gives a short dense band and a long tail of scattered pixels.',
      group: 'Pattern',
      default: 2.6,
      // Above 0: a power of 0 would light the whole canvas, and `pow(0, 0)` has no defined result.
      min: 0.5,
      max: 8,
      step: 0.1,
    },
    cell: {
      type: 'number',
      label: 'Cell size',
      description: 'Side of one pixel cell: the square and its gap.',
      group: 'Pattern',
      default: 4,
      min: 2,
      max: 16,
      step: 1,
      unit: 'px',
    },
    gap: {
      type: 'number',
      label: 'Gap',
      description: 'Share of a cell left empty on two of its sides. 0 joins the pixels.',
      group: 'Pattern',
      default: 0.25,
      min: 0,
      // A cell of two device pixels still lights one of them at 0.75.
      max: 0.75,
      step: 0.05,
    },
    wander: {
      type: 'number',
      label: 'Wander',
      description: 'How much the noise bends the edge of the fade. 0 gives a straight edge.',
      group: 'Pattern',
      default: 0.7,
      min: 0,
      max: 1.5,
      step: 0.05,
    },
    accentShare: {
      type: 'number',
      label: 'Accent share',
      description: 'How much of the field the accent patches take. 0 leaves only the neutral pixels.',
      group: 'Pattern',
      // The original starts a patch where the noise is above 0.52: 1 - 0.48.
      default: 0.48,
      min: 0,
      max: 1,
      step: 0.01,
    },
    breathing: {
      type: 'number',
      label: 'Breathing',
      description: 'How much each pixel fades in and out. 0 keeps the pixels steady.',
      group: 'Motion',
      default: 0.28,
      min: 0,
      // At 0.5 a pixel fades out completely; above, its strength would go below 0.
      max: 0.5,
      step: 0.01,
    },
    speed: {
      type: 'number',
      label: 'Speed',
      description: 'Time multiplier. 0 freezes the shader.',
      group: 'Motion',
      default: 1,
      min: 0,
      max: 3,
      step: 0.05,
    },
  },
  fragment,
})
