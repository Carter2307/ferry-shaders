import { describe, expect, it } from 'vitest'

import { Scene } from './scene'

/** Runs `count` drawn frames. */
const ease = (scene: Scene, count: number) => {
  for (let index = 0; index < count; index++) scene.ease()
}

describe('Scene', () => {
  it('starts at time 0 with no pointer influence', () => {
    const scene = new Scene()
    expect(scene.uniforms(320, 180)).toEqual({ resolution: [320, 180], mouse: [0, 0], time: 0, amount: 0 })
  })

  it('moves the time forward at the given speed', () => {
    const scene = new Scene()
    scene.advance(0.5, 1)
    scene.advance(0.5, 2)
    expect(scene.time).toBe(1.5)
    scene.advance(10, 0)
    expect(scene.time).toBe(1.5)
  })

  it('jumps to the pointer when it comes back from idle', () => {
    const scene = new Scene()
    scene.pointerMove(100, 40)
    // No slide from (0, 0): the pointer is there at once, and its influence fades in.
    expect(scene.uniforms(1, 1).mouse).toEqual([100, 40])
    expect(scene.uniforms(1, 1).amount).toBe(0)
    scene.ease()
    expect(scene.uniforms(1, 1).mouse).toEqual([100, 40])
    expect(scene.uniforms(1, 1).amount).toBeCloseTo(0.06, 10)
  })

  it('eases toward the pointer once it is active', () => {
    const scene = new Scene()
    scene.pointerMove(100, 40)
    ease(scene, 200)
    expect(scene.uniforms(1, 1).amount).toBeCloseTo(1, 4)
    scene.pointerMove(200, 40)
    // Active: the position slides, 12% of the distance per frame.
    expect(scene.uniforms(1, 1).mouse[0]).toBeCloseTo(100, 6)
    scene.ease()
    expect(scene.uniforms(1, 1).mouse[0]).toBeCloseTo(112, 6)
    ease(scene, 200)
    expect(scene.uniforms(1, 1).mouse[0]).toBeCloseTo(200, 4)
  })

  it('fades the influence out when the pointer leaves, then jumps again', () => {
    const scene = new Scene()
    scene.pointerMove(100, 40)
    ease(scene, 200)
    scene.pointerLeave()
    scene.ease()
    expect(scene.uniforms(1, 1).amount).toBeCloseTo(0.94, 4)
    // Coming back while the influence is still visible slides from the old position.
    scene.pointerMove(300, 40)
    expect(scene.uniforms(1, 1).mouse[0]).toBeCloseTo(100, 4)
    scene.pointerLeave()
    ease(scene, 200)
    expect(scene.uniforms(1, 1).amount).toBeLessThan(0.02)
    scene.pointerMove(300, 90)
    expect(scene.uniforms(1, 1).mouse).toEqual([300, 90])
  })

  it('keeps one frame and hides the pointer when still (reduced motion)', () => {
    const scene = new Scene(true, 14)
    expect(scene.time).toBe(14)
    scene.advance(1, 1)
    expect(scene.time).toBe(14)
    scene.pointerMove(10, 10)
    ease(scene, 50)
    expect(scene.uniforms(64, 48)).toEqual({ resolution: [64, 48], mouse: [10, 10], time: 14, amount: 0 })
  })

  it('becomes still, then moves again from the frozen frame with no pointer effect', () => {
    const scene = new Scene()
    scene.advance(2, 1)
    scene.pointerMove(100, 40)
    ease(scene, 50)
    expect(scene.uniforms(1, 1).amount).toBeGreaterThan(0.9)
    scene.setStill(true, 14)
    expect(scene.uniforms(1, 1)).toMatchObject({ time: 14, amount: 0 })
    scene.advance(1, 1)
    expect(scene.time).toBe(14)
    // Asking twice changes nothing: the frame of another shader comes through setStillTime.
    scene.setStill(true, 3)
    expect(scene.time).toBe(14)
    scene.setStill(false, 14)
    scene.advance(1, 1)
    expect(scene.time).toBe(15)
    // The effect that was on screen before is gone: it does not fade out from its old value.
    expect(scene.uniforms(1, 1).amount).toBe(0)
    scene.ease()
    expect(scene.uniforms(1, 1).amount).toBe(0)
  })

  it('takes the still time of another shader only when still', () => {
    const still = new Scene(true, 14)
    still.setStillTime(3)
    expect(still.time).toBe(3)
    const moving = new Scene()
    moving.advance(2, 1)
    moving.setStillTime(3)
    expect(moving.time).toBe(2)
  })
})
