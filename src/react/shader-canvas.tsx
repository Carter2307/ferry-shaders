import * as React from 'react'

import { mountShader, type ShaderController } from '../core/mount'
import type { ParamSchema, ParamValues, ShaderDefinition, ShaderStatus } from '../core/types'

/** Props of {@link ShaderCanvas}. Every other `<div>` prop goes to the root element. */
export interface ShaderCanvasProps<S extends ParamSchema = ParamSchema>
  extends Omit<React.ComponentPropsWithoutRef<'div'>, 'children'> {
  /** The shader to draw. Changing it switches live: the previous shader stays until the new one is ready. */
  shader: ShaderDefinition<S>
  /** Values of the parameters. A parameter left out takes its default. */
  params?: Partial<ParamValues<S>>
  /** Stops the animation (the last frame stays). Parameter changes are still drawn. */
  paused?: boolean
  /** Frames per second, at most. Defaults to 30. */
  fps?: number
  /**
   * An element whose horizontal span the shader can keep calm for reading, for example the text
   * column in front of a full-page background. Read once, when the canvas mounts.
   */
  focusRef?: React.RefObject<Element | null>
  /** Shown in place of the canvas when the browser has no WebGPU or the shader did not compile. */
  fallback?: React.ReactNode
  /** Called when the status changes (`pending`, `ready`, `unsupported`, `error`). */
  onStatusChange?: (status: ShaderStatus) => void
}

const ROOT_STYLE: React.CSSProperties = {
  // With `resolution: 'cell'` the canvas is a few pixels larger than its box.
  overflow: 'hidden',
  // A background must not take clicks or text selection from the page, wherever it is stacked.
  // A `fallback` that needs the pointer sets `pointer-events: auto` on its own element.
  pointerEvents: 'none',
}

const CANVAS_STYLE: React.CSSProperties = {
  // The pointer is followed on the window: the canvas never takes a click from the page.
  pointerEvents: 'none',
  // The canvas appears once its first frame is drawn. `--shader-fade` changes the duration.
  transition: 'opacity var(--shader-fade, 700ms) ease-out',
}

function ShaderCanvasRoot<S extends ParamSchema>(
  { shader, params, paused, fps, focusRef, fallback, onStatusChange, style, ...props }: ShaderCanvasProps<S>,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const controllerRef = React.useRef<ShaderController | null>(null)
  // Server and first client render agree on `pending`: support is only known in the browser.
  const [status, setStatus] = React.useState<ShaderStatus>('pending')

  // The mount effect reads the latest props without running again when they change.
  const latest = React.useRef({ shader, params, paused, fps, onStatusChange })
  React.useEffect(() => {
    latest.current = { shader, params, paused, fps, onStatusChange }
  })

  // Mount once per canvas. React StrictMode runs this twice: the first mount is disposed before it
  // touches the canvas.
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const current = latest.current
    const controller = mountShader(canvas, {
      shader: current.shader,
      params: current.params,
      paused: current.paused,
      fps: current.fps,
      focusElement: focusRef?.current,
      onStatusChange: (next) => {
        setStatus(next)
        latest.current.onStatusChange?.(next)
      },
    })
    controllerRef.current = controller
    return () => {
      controller.dispose()
      controllerRef.current = null
    }
  }, [focusRef])

  // Later changes go to the mounted shader. An object with the same values is not a change there.
  React.useEffect(() => {
    controllerRef.current?.update({ shader, params, paused: paused ?? false, fps })
  }, [shader, params, paused, fps])

  const failed = status === 'unsupported' || status === 'error'
  return (
    <div aria-hidden="true" {...props} ref={ref} data-shader={shader.id} data-status={status} style={{ ...ROOT_STYLE, ...style }}>
      <canvas
        ref={canvasRef}
        style={{
          ...CANVAS_STYLE,
          // A canvas that failed leaves the layout: an invisible box would push a fallback that is in
          // the flow out of the root. The engine sizes the canvas from the root, so a later shader
          // that compiles still draws, and the canvas comes back.
          display: failed ? 'none' : 'block',
          opacity: status === 'ready' ? 1 : 0,
        }}
      />
      {failed ? fallback : null}
    </div>
  )
}

/**
 * Draws a shader in a `<div>` that you place and size with `className` (for example
 * `fixed inset-0` for a page background, `absolute inset-0` inside a `relative` section). The
 * element is decorative: it is hidden from assistive technology and never takes pointer events
 * from the page.
 *
 * The canvas fades in when its first frame is drawn. Without WebGPU (or when the shader fails) the
 * canvas takes no room and `fallback` is rendered in its place. `data-status` on the root says
 * which state it is in, and `data-shader` which shader.
 *
 * For a shader with typed props, use its own component (`<Drift scale={3} />`).
 */
export const ShaderCanvas = React.forwardRef(ShaderCanvasRoot) as (<S extends ParamSchema = ParamSchema>(
  props: ShaderCanvasProps<S> & React.RefAttributes<HTMLDivElement>,
) => React.ReactElement | null) & { displayName?: string }

ShaderCanvas.displayName = 'ShaderCanvas'
