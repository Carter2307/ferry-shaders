import { mountShader } from 'ferry-shaders/core'
import { drift } from 'ferry-shaders/shaders'

/** Draws Drift on a canvas. The canvas fills its parent, which needs a size and `overflow: hidden`. */
export function startBackground(canvas: HTMLCanvasElement) {
  const controller = mountShader(canvas, {
    shader: drift,
    params: { scale: 3, color: '#1f2937' },
    onStatusChange: (status) => {
      // Without WebGPU, or when the shader fails, nothing is drawn: hide the canvas.
      canvas.hidden = status === 'unsupported' || status === 'error'
    },
  })

  // New values show on the next frame. A key left out goes back to its default.
  const setScale = (scale: number) => controller.update({ params: { scale, color: '#1f2937' } })

  // Call stop when the canvas goes away.
  return { setScale, stop: () => controller.dispose() }
}
