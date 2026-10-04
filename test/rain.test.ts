import { describe, expect, it } from 'vitest'

import { rain } from '../src/shaders/rain'

import { comparePixels, describeDitherPort, FRAMES, gpuAvailable, renderDefinition, type Frame } from './fidelity'

// The original is registered with WHITE_BACKGROUND = 1: its lightest tone is pure white.
//
// The rain reads u.focus (it fades behind the calm column): three frames and the probe have one,
// so the `calm` param shows on the probe.
describeDitherPort(rain, {
  constants: { WHITE_BACKGROUND: 1 },
  params: { background: 'rgb(255 255 255)' },
  frames: [
    ...FRAMES,
    { width: 160, height: 120, time: 21, focus: [40, 110] },
    { width: 160, height: 120, time: 52.25, mouse: [60, 70], amount: 1, focus: [40, 110] },
    { width: 97, height: 61, time: 8.5, mouse: [70, 30], amount: 1, focus: [20, 60] },
  ],
  probe: { width: 160, height: 120, time: 37.5, mouse: [130, 70], amount: 1, focus: [40, 110] },
})

/** The rain with no early exit in front of the shard loop: every cell tests every shard. */
const everyShard = {
  ...rain,
  fragment: rain.fragment.replace(/\n {2}if \(abs\(px\.x - center\.x\) > spread[^\n]*\n {4}return dark;\n {2}\}/, ''),
}

describe.skipIf(!gpuAvailable)('rain: the early exit of the shard loop (WebGPU)', () => {
  // At full strength, so every shard shows. The umbrella breaks bricks in mid-air: the exit must
  // follow the shards there too.
  const times = [0, 3.3, 8.5, 14, 21, 37.5, 52.25, 77.7]
  const frames: Frame[] = times.flatMap((time) => [
    { width: 160, height: 120, time },
    { width: 160, height: 120, time, mouse: [60, 70], amount: 1 },
  ])

  it('is found in the source', () => {
    expect(everyShard.fragment).not.toBe(rain.fragment)
  })

  it.each([
    ['the defaults', {}],
    ['the heaviest rain', { drops: 6, shards: 20, burst: 160 }],
    ['the weakest burst, the widest bricks', { burst: 20, brickSize: 6, shards: 20 }],
  ])('hides no shard: %s', async (_name, params) => {
    for (const frame of frames) {
      const [expected, actual] = await Promise.all([
        renderDefinition(everyShard, { ...params, intensity: 1 }, frame),
        renderDefinition(rain, { ...params, intensity: 1 }, frame),
      ])
      expect(comparePixels(expected, actual, 0).differentRatio, `t=${frame.time}`).toBe(0)
    }
  })
})

describe.skipIf(!gpuAvailable)('rain: the `pointer` param (WebGPU)', () => {
  // The pointer is fully there, in the middle of the rain, at a time when bricks fall on each
  // width of the umbrella. renderDefinition multiplies the presence by the param, as the engine does.
  const frame: Frame = { width: 320, height: 200, time: 14, mouse: [160, 100], amount: 1 }
  const draw = (pointer: number) => renderDefinition(rain, { intensity: 1, pointer }, frame)

  it('opens the umbrella for any value above 0, and wider for a higher value', async () => {
    const [closed, narrow, half, wide] = await Promise.all([draw(0), draw(0.25), draw(0.5), draw(1)])
    // With a fixed `u.amount > 0.5`, 0.25 and 0.5 drew the closed umbrella, and 0.55 the whole one.
    expect(comparePixels(closed, narrow, 0).differentRatio).toBeGreaterThan(0)
    expect(comparePixels(narrow, half, 0).differentRatio).toBeGreaterThan(0)
    expect(comparePixels(half, wide, 0).differentRatio).toBeGreaterThan(0)
  })

  it('keeps the umbrella closed while the pointer is less than half there', async () => {
    const away = await renderDefinition(rain, { intensity: 1 }, { ...frame, amount: 0 })
    for (const pointer of [0.25, 1]) {
      const arriving = await renderDefinition(rain, { intensity: 1, pointer }, { ...frame, amount: 0.5 })
      expect(comparePixels(away, arriving, 0).differentRatio, `pointer ${pointer}`).toBe(0)
    }
  })
})
