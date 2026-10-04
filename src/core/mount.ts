import { hasPageColors, resolveColor, resolveColors } from './color'
import { getGpu } from './gpu'
import { packParams, shaderLayout, writeFrame, type UniformLayout } from './layout'
import { resolveParams } from './params'
import { Renderer } from './renderer'
import { Scene } from './scene'
import { isWebGpuSupported } from './support'
import type { ParamSchema, ParamValues, ShaderDefinition, ShaderStatus, Vec2 } from './types'

/** 30 frames per second is plenty for a slow background and halves the GPU cost. */
const DEFAULT_FPS = 30
/**
 * Longest step of time for one frame: a tab that was asleep does not make the shader jump. A low
 * `fps` raises it to one frame and a half.
 */
const MAX_FRAME_SECONDS = 0.1
/** Display frames are never exactly on time: accept a frame that comes this much early. */
const FRAME_SLACK_MS = 2
/** A background does not need more than two device pixels per CSS pixel. */
const MAX_PIXEL_RATIO = 2
const DEFAULT_CELL = 4
const MIN_CELL = 1
const MAX_CELL = 64

/** Param values as a caller gives them: any subset, checked by the engine before use. */
type ParamInput = Readonly<Record<string, unknown>>

/** Options of {@link mountShader}. */
export interface MountOptions<S extends ParamSchema = ParamSchema> {
  /** The shader to draw. */
  shader: ShaderDefinition<S>
  /** Values of its parameters. A parameter left out, or with a value that is not valid, takes its default. */
  params?: Partial<ParamValues<S>>
  /** Stops the animation (the last frame stays). Parameter changes are still drawn. Defaults to `false`. */
  paused?: boolean
  /** Frames per second, at most. Defaults to 30. */
  fps?: number
  /**
   * An element whose horizontal span the shader can keep calm for reading (the `focus` uniform),
   * for example the text column in front of a full-page background. Read once, at mount.
   */
  focusElement?: Element | null
  /**
   * Called when the status changes. The status starts at `pending` (not reported). `unsupported`
   * is reported during the call to `mountShader` itself when the browser has no WebGPU.
   */
  onStatusChange?: (status: ShaderStatus) => void
}

/** What {@link ShaderController.update} can change. Fields left out keep their value. */
export interface MountPatch {
  /** Switches to another shader. The current one keeps drawing until the new one is compiled. */
  shader?: ShaderDefinition
  /**
   * Replaces the parameter values: a key left out goes back to its default. An object with the
   * same values as the previous one costs nothing.
   */
  params?: ParamInput
  paused?: boolean
  fps?: number
}

/** Handle of a mounted shader, returned by {@link mountShader}. */
export interface ShaderController {
  /** Applies new options. Parameter changes show on the next frame, with no recompilation. */
  update(patch: MountPatch): void
  /**
   * Resolves the colors again and draws one frame now. Call it after a change the engine cannot
   * see, for example a CSS variable set on an element other than `<html>` or `<body>`.
   */
  redraw(): void
  /** Stops everything and frees the GPU buffer. Safe to call at any time, also before the first frame. */
  dispose(): void
}

/** The shader the renderer draws now, with its packed uniforms. */
interface ActiveShader {
  shader: ShaderDefinition
  layout: UniformLayout
  /** The whole uniform buffer: header and parameters. */
  data: Float32Array<ArrayBuffer>
  /** Time multiplier (the `speed` parameter, never negative). */
  speed: number
  /** Side of a grid cell in CSS pixels (the `cell` parameter, rounded and clamped). */
  cell: number
  /** Multiplier of the pointer influence (the `pointer` parameter). */
  pointer: number
  /** True when a color depends on the page: the colors are read again when the theme changes. */
  themed: boolean
}

const numberOr = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

/** Same keys with the same values: a new object with equal content is not a change. */
function sameParams(a: ParamInput | undefined, b: ParamInput | undefined): boolean {
  if (a === b) return true
  const left = a ?? {}
  const right = b ?? {}
  const keys = Object.keys(left)
  if (keys.length !== Object.keys(right).length) return false
  // The key must be there too: a key that is missing reads as `undefined`, like a key set to it.
  return keys.every((key) => Object.hasOwn(right, key) && Object.is(left[key], right[key]))
}

const INERT: ShaderController = { update() {}, redraw() {}, dispose() {} }

/**
 * Draws a shader on a canvas and keeps it alive: size, pointer, frame loop, reduced motion, theme
 * changes and the loss of the GPU device. It needs no framework.
 *
 * The canvas fills its parent element, which should clip it (`overflow: hidden`): with
 * `resolution: 'cell'` the canvas is a few pixels larger than its parent so every cell is a
 * perfect square. Every canvas of the page shares one GPU device.
 *
 * - The pointer is followed on the window, so the canvas can sit behind content.
 * - The animation stops while the canvas is out of view and while `paused` is set.
 * - A reader who asks for reduced motion gets one still frame (`stillTime` of the shader), drawn
 *   again when the parameters, the colors or the size change. The preference is followed live:
 *   the animation stops, or starts again, when the reader changes it.
 *
 * Call it in the browser only (it reads `window`). Always call `dispose()` when the canvas goes away.
 */
export function mountShader<S extends ParamSchema>(canvas: HTMLCanvasElement, initial: MountOptions<S>): ShaderController {
  const { onStatusChange, focusElement = null } = initial

  let status: ShaderStatus = 'pending'
  const setStatus = (next: ShaderStatus) => {
    if (next === status) return
    status = next
    onStatusChange?.(next)
  }

  if (!isWebGpuSupported()) {
    setStatus('unsupported')
    return INERT
  }

  const options = {
    shader: initial.shader as ShaderDefinition,
    params: initial.params as ParamInput | undefined,
    paused: initial.paused ?? false,
    fps: initial.fps,
  }
  const aborter = new AbortController()
  const { signal } = aborter
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  let reducedMotion = motionPreference.matches
  const scene = new Scene(reducedMotion, options.shader.stillTime)
  // The canvas takes the size of its parent. A canvas with no parent keeps its own box.
  const box: Element = canvas.parentElement ?? canvas

  let renderer: Renderer | null = null
  let active: ActiveShader | null = null
  let paramsDirty = true
  let sizeDirty = true
  let visible = true
  let raf = 0
  let lastTick = 0
  let lastDraw = 0

  /** The backing store of the canvas. `key` says what it was sized for. */
  const grid = { key: '', width: 1, height: 1, ratio: 1 }
  /** Last pointer position, in viewport pixels. It is mapped to the canvas when a frame is drawn. */
  const pointer = { x: 0, y: 0, present: false }

  const resolveCss = (value: string) => resolveColor(value, canvas)

  const repack = (state: ActiveShader) => {
    const { shader, layout } = state
    const values: Readonly<Record<string, unknown>> = resolveParams(shader, options.params)
    packParams(layout, shader.params, values, resolveColors(shader.params, values, resolveCss), state.data)
    // The engine only guards what would break it: the ranges of the schema are guidance for panels.
    state.speed = Math.max(0, numberOr(values.speed, 1))
    state.pointer = numberOr(values.pointer, 1)
    const cell = Math.min(MAX_CELL, Math.max(MIN_CELL, Math.round(numberOr(values.cell, DEFAULT_CELL))))
    if (cell !== state.cell) sizeDirty = true
    state.cell = cell
    state.themed = hasPageColors(shader.params, values)
    paramsDirty = false
  }

  /**
   * Sizes the canvas for its box. `limit` is the longest side the device can draw: past it the
   * canvas would stay blank with no error to catch, so a very large box gets larger cells, or fewer
   * canvas pixels per CSS pixel, and is still covered.
   */
  const fit = (state: ActiveShader, limit: number) => {
    const boxWidth = box.clientWidth
    const boxHeight = box.clientHeight
    // The cell of the params, unless the box is too large for it.
    const cell = Math.max(state.cell, Math.ceil(boxWidth / limit), Math.ceil(boxHeight / limit))
    let width: number
    let height: number
    let ratio: number
    let key: string
    if (state.shader.resolution === 'cell') {
      // One canvas pixel per cell: CSS scales it up with hard edges.
      width = Math.max(1, Math.ceil(boxWidth / cell))
      height = Math.max(1, Math.ceil(boxHeight / cell))
      ratio = 1 / cell
      key = `cell:${cell}:${width}:${height}`
    } else {
      const wanted = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
      ratio = Math.min(wanted, limit / Math.max(1, boxWidth), limit / Math.max(1, boxHeight))
      width = Math.min(limit, Math.max(1, Math.round(boxWidth * ratio)))
      height = Math.min(limit, Math.max(1, Math.round(boxHeight * ratio)))
      key = `device:${width}:${height}`
    }
    sizeDirty = false
    // Setting the size of a canvas clears it: only do it for a real change.
    if (key === grid.key) return
    Object.assign(grid, { key, width, height, ratio })
    canvas.width = width
    canvas.height = height
    if (state.shader.resolution === 'cell') {
      // A whole number of cells: the canvas may be a little larger than its parent, which clips it.
      canvas.style.width = `${width * cell}px`
      canvas.style.height = `${height * cell}px`
      canvas.style.imageRendering = 'pixelated'
    } else {
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.style.imageRendering = ''
    }
  }

  /**
   * Maps the focus element, and the pointer when `withPointer` is set, to canvas pixels. Returns
   * the focus span.
   */
  const measure = (withPointer: boolean): Vec2 => {
    const needsPointer = withPointer && pointer.present && !reducedMotion
    if (!needsPointer && !focusElement) return [0, 0]
    // The rectangle on screen, so it also works for a canvas that is scaled or behind content.
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return [0, 0]
    const scaleX = grid.width / rect.width
    const scaleY = grid.height / rect.height
    if (needsPointer) {
      const x = (pointer.x - rect.left) * scaleX
      const y = (rect.bottom - pointer.y) * scaleY
      if (x >= 0 && x <= grid.width && y >= 0 && y <= grid.height) scene.pointerMove(x, y)
      else scene.pointerLeave()
    }
    if (!focusElement) return [0, 0]
    const span = focusElement.getBoundingClientRect()
    return [(span.left - rect.left) * scaleX, (span.right - rect.left) * scaleX]
  }

  /**
   * Draws one frame. `animate` is set for a frame of the loop: only those move the pointer effect.
   * A redraw of a paused canvas (new params, new size, new theme) keeps the effect as it was.
   */
  const draw = (animate = false) => {
    const state = active
    if (!renderer || !state) return
    // While another shader compiles, the current one keeps the values it was drawn with.
    if (paramsDirty && state.shader === options.shader) repack(state)
    if (sizeDirty) fit(state, renderer.maxSize)
    const focus = measure(animate)
    if (animate) scene.ease()
    const frame = scene.uniforms(grid.width, grid.height)
    writeFrame(state.data, { ...frame, amount: frame.amount * state.pointer, pixelRatio: grid.ratio, focus })
    renderer.render(state.data)
  }

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    const fps = numberOr(options.fps, DEFAULT_FPS)
    const interval = 1000 / (fps > 0 ? fps : DEFAULT_FPS)
    if (now - lastDraw < interval - FRAME_SLACK_MS) return
    // Under 10 frames per second a normal frame is longer than the cap: without the room for one
    // frame and a half, `fps` would also slow the time down.
    const longest = Math.max(MAX_FRAME_SECONDS, (1.5 * interval) / 1000)
    const seconds = lastTick ? Math.min(longest, (now - lastTick) / 1000) : 0
    lastTick = now
    lastDraw = now
    // Read a new speed before the time moves.
    if (active && paramsDirty && active.shader === options.shader) repack(active)
    scene.advance(seconds, active?.speed ?? 1)
    draw(true)
  }

  const stopLoop = () => {
    cancelAnimationFrame(raf)
    raf = 0
  }

  /** Runs the loop when there is something to animate and someone to see it. */
  const syncLoop = () => {
    const run = !reducedMotion && renderer !== null && active !== null && !options.paused && visible
    if (!run) {
      stopLoop()
    } else if (!raf) {
      lastTick = 0 // no time jump after a pause
      raf = requestAnimationFrame(loop)
    }
  }

  /** With no loop (reduced motion, paused) nothing draws by itself: draw when something changed. */
  const drawIfIdle = () => {
    if (!raf && visible) draw()
  }

  const applyShader = (shader: ShaderDefinition) => {
    const target = renderer
    if (!target) return
    target.setShader(shader).then(
      (switched) => {
        if (!switched || signal.aborted || renderer !== target) return
        const layout = shaderLayout(shader)
        active = {
          shader,
          layout,
          data: new Float32Array(layout.byteSize / 4),
          speed: 1,
          cell: DEFAULT_CELL,
          pointer: 1,
          themed: false,
        }
        paramsDirty = true
        sizeDirty = true
        scene.setStillTime(shader.stillTime)
        draw()
        setStatus('ready')
        syncLoop()
      },
      () => {
        // The compiler messages are already in the console (see getPipeline).
        if (!signal.aborted && renderer === target) setStatus('error')
      },
    )
  }

  const start = async () => {
    const gpu = await getGpu()
    if (signal.aborted) return
    // Past this point the mount is still wanted: it may take the canvas context.
    const next = gpu && Renderer.create(gpu, canvas)
    if (!gpu || !next) {
      setStatus('unsupported')
      return
    }
    renderer = next
    applyShader(options.shader)

    // Not `await gpu.device.lost`: the device lives as long as the page, so that wait would keep
    // this canvas (and the page around it) in memory long after dispose().
    const onLost = (info: GPUDeviceLostInfo) => {
      unwatch()
      if (signal.aborted || info.reason === 'destroyed') return
      console.warn('[ferry-shaders] GPU device lost, starting again:', info.message)
      stopLoop()
      next.destroy()
      renderer = null
      active = null
      setStatus('pending')
      void start()
    }
    const unwatch = () => {
      gpu.lostListeners.delete(onLost)
      signal.removeEventListener('abort', unwatch)
    }
    gpu.lostListeners.add(onLost)
    signal.addEventListener('abort', unwatch)
  }

  // --- Pointer -------------------------------------------------------------
  // Always followed: a still frame does not show the pointer (see measure), but the reader can turn
  // reduced motion off while the canvas is mounted.
  const leave = () => {
    pointer.present = false
    scene.pointerLeave()
  }
  // A finger that lifts is gone: without this the effect would stay where the last touch was.
  const lift = (event: PointerEvent) => {
    if (event.pointerType === 'touch') leave()
  }
  window.addEventListener(
    'pointermove',
    (event) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.present = true
    },
    { passive: true, signal },
  )
  window.addEventListener('pointerup', lift, { passive: true, signal })
  window.addEventListener('pointercancel', lift, { passive: true, signal })
  document.addEventListener('pointerleave', leave, { signal })
  window.addEventListener('blur', leave, { signal })

  // --- Reduced motion ------------------------------------------------------
  // The reader can change the preference at any time, often because the background moves: the
  // canvas must follow at once, as the CSS of the page does.
  motionPreference.addEventListener(
    'change',
    (event) => {
      reducedMotion = event.matches
      scene.setStill(reducedMotion, (active?.shader ?? options.shader).stillTime)
      // The effect starts from nothing when the motion comes back.
      pointer.present = false
      syncLoop()
      drawIfIdle()
    },
    { signal },
  )

  // --- Size and visibility -------------------------------------------------
  const onResize = () => {
    sizeDirty = true
    drawIfIdle()
  }
  // The window event also covers a change of zoom or of screen (device pixel ratio).
  window.addEventListener('resize', onResize, { signal })
  if (typeof ResizeObserver !== 'undefined') {
    const sizes = new ResizeObserver(onResize)
    sizes.observe(box)
    if (focusElement) sizes.observe(focusElement)
    signal.addEventListener('abort', () => sizes.disconnect())
  }
  if (typeof IntersectionObserver !== 'undefined') {
    const views = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? true
      syncLoop()
      drawIfIdle()
    })
    views.observe(canvas)
    signal.addEventListener('abort', () => views.disconnect())
  }

  // --- Theme ---------------------------------------------------------------
  // Tokens and `currentColor` change with the theme: read them again.
  const onTheme = () => {
    if (!active?.themed) return
    paramsDirty = true
    drawIfIdle()
  }
  if (typeof MutationObserver !== 'undefined') {
    const themes = new MutationObserver(onTheme)
    // Any attribute: each library names its theme attribute its own way (`class`, `data-theme`,
    // `data-bs-theme`, `data-color-mode`…). Two elements and no subtree: it stays cheap.
    const attributes = { attributes: true }
    themes.observe(document.documentElement, attributes)
    if (document.body) themes.observe(document.body, attributes)
    signal.addEventListener('abort', () => themes.disconnect())
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onTheme, { signal })
  // `currentColor` (and a registered custom property) is inherited: while an element above the
  // canvas runs a color transition, the color read is the old one or one between the two themes.
  // Read again when the transition is over.
  const onTransition = (event: TransitionEvent) => {
    const { propertyName, target } = event
    if (propertyName !== 'color' && !propertyName.startsWith('--')) return
    // Only an element above the canvas (also through a shadow root) gives it a color: a page where
    // every link has a color transition must not make the shader read its colors at each hover.
    for (let node: Node | null = canvas; node; node = node.parentNode ?? (node as Partial<ShadowRoot>).host ?? null) {
      if (node !== target) continue
      onTheme()
      return
    }
  }
  document.addEventListener('transitionend', onTransition, { signal })
  document.addEventListener('transitioncancel', onTransition, { signal })

  void start()

  return {
    update(patch) {
      if (signal.aborted) return
      if ('fps' in patch) options.fps = patch.fps
      if (patch.paused !== undefined) options.paused = patch.paused
      if ('params' in patch && !sameParams(patch.params, options.params)) {
        options.params = patch.params
        paramsDirty = true
      }
      if (patch.shader && patch.shader !== options.shader) {
        options.shader = patch.shader
        applyShader(patch.shader)
      }
      syncLoop()
      if (paramsDirty) drawIfIdle()
    },
    redraw() {
      if (signal.aborted) return
      paramsDirty = true
      if (!raf) draw()
    },
    dispose() {
      aborter.abort()
      stopLoop()
      renderer?.destroy()
      renderer = null
      active = null
    },
  }
}
