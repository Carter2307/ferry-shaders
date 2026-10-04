import type { SceneUniforms } from './types'

/** Share of the distance to the pointer covered by each drawn frame. */
const MOUSE_EASING = 0.12
/** Share of the distance to the target influence covered by each drawn frame. */
const AMOUNT_EASING = 0.06
/** Below this influence the pointer counts as gone: the next move jumps to it. */
const IDLE_AMOUNT = 0.02

/**
 * Pure animation state: the time and the eased pointer. No DOM and no GPU, so any loop can drive
 * it and a test can check it alone.
 *
 * A still scene (reduced motion) keeps one time and never shows the pointer.
 */
export class Scene {
  /** Seconds, already multiplied by the speed. */
  time: number

  private still: boolean
  private mouseX = 0
  private mouseY = 0
  private targetX = 0
  private targetY = 0
  private amount = 0
  private targetAmount = 0

  /**
   * @param still True when the reader asks for reduced motion: the time stays at `stillTime`.
   * @param stillTime Time of the frozen frame, in seconds.
   */
  constructor(still = false, stillTime = 0) {
    this.still = still
    this.time = still ? stillTime : 0
  }

  /**
   * Freezes the scene at `stillTime` (the reader now asks for reduced motion), or lets it move
   * again from the frozen frame. The pointer effect that was on screen does not come back.
   */
  setStill(still: boolean, stillTime: number): void {
    if (still === this.still) return
    this.still = still
    if (still) this.time = stillTime
    this.amount = 0
    this.targetAmount = 0
  }

  /** Changes the frozen frame (each shader has its own). A scene that moves ignores it. */
  setStillTime(time: number): void {
    if (this.still) this.time = time
  }

  /** The pointer is at `(x, y)`, in canvas pixels with a bottom-left origin. */
  pointerMove(x: number, y: number): void {
    this.targetX = x
    this.targetY = y
    // Coming back from idle: jump to the pointer instead of sliding in from afar.
    if (this.targetAmount === 0 && this.amount < IDLE_AMOUNT) {
      this.mouseX = x
      this.mouseY = y
    }
    this.targetAmount = 1
  }

  /** The pointer left: its influence eases back to 0. */
  pointerLeave(): void {
    this.targetAmount = 0
  }

  /** Moves the time forward by `seconds` at the given speed. A still scene does not move. */
  advance(seconds: number, speed: number): void {
    if (!this.still) this.time += seconds * speed
  }

  /**
   * Eases the pointer one step toward its target. Call it once per frame of the animation, and not
   * for a frame that is only drawn again (a paused canvas).
   */
  ease(): void {
    this.mouseX += (this.targetX - this.mouseX) * MOUSE_EASING
    this.mouseY += (this.targetY - this.mouseY) * MOUSE_EASING
    this.amount += (this.targetAmount - this.amount) * AMOUNT_EASING
  }

  /** The values of the current frame for a canvas of `width` by `height` canvas pixels. */
  uniforms(width: number, height: number): SceneUniforms {
    return {
      resolution: [width, height],
      mouse: [this.mouseX, this.mouseY],
      time: this.time,
      amount: this.still ? 0 : this.amount,
    }
  }
}
