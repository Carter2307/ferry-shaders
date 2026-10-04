import { defineDitherShader } from '../../core/dither'

import body from './rain.wgsl?raw'

/** Rain: pixel bricks that fall on a white page, on two layers, and shatter where they land. */
export const rain = /* @__PURE__ */ defineDitherShader({
  id: 'rain',
  name: 'Rain',
  technique: 'stateless particles',
  description: 'Pixel bricks fall on a white page, on two parallax layers, and shatter into shards at the bottom.',
  pointerEffect: 'The pointer is an umbrella: the bricks that fall on it break there.',
  params: {
    drops: {
      type: 'number',
      label: 'Drops',
      description: 'Number of bricks that fall in each lane at the same time.',
      default: 3,
      min: 1,
      max: 6,
      step: 1,
    },
    brickSize: {
      type: 'number',
      label: 'Brick size',
      description: 'Side of a brick, in cells.',
      default: 3,
      min: 1,
      max: 6,
      step: 1,
    },
    shards: {
      type: 'number',
      label: 'Shards',
      description: 'Number of shards a brick breaks into. 0 leaves only a line of dust.',
      default: 10,
      min: 0,
      max: 20,
      step: 1,
    },
    burst: {
      type: 'number',
      label: 'Burst',
      description: 'Launch speed of the fastest shards, in cells per second: a higher value throws them further.',
      default: 80,
      min: 20,
      max: 160,
      step: 5,
    },
    calm: {
      type: 'number',
      label: 'Calm level',
      description: 'Share of the rain kept behind the calm column. 1 keeps all of it.',
      default: 0.2,
      min: 0,
      max: 1,
      step: 0.05,
    },
    umbrella: {
      type: 'number',
      label: 'Umbrella',
      description: 'Half-width of the shelter under the pointer, in cells.',
      group: 'Pointer',
      default: 10,
      min: 2,
      max: 40,
      step: 1,
    },
  },
  body,
})
