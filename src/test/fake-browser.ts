import { vi } from 'vitest'

// Test doubles for what jsdom does not have: WebGPU, display frames and the observers.
// They record what the engine asks for; nothing is drawn. The real pixels are checked with Dawn
// in test/.

/** What the fake GPU was asked to do. */
export interface FakeGpuLog {
  /** One entry per device handed out. `lose()` makes the device report that it is lost. */
  devices: { lose: (reason?: string) => void }[]
  /** WGSL source of every pipeline that compiled. */
  compiled: string[]
  /** Every uniform buffer that was created. */
  buffers: { size: number; destroyed: boolean }[]
  /** One entry per drawn frame: the uniform buffer that was uploaded for it. */
  frames: Float32Array[]
}

/**
 * Puts a fake `navigator.gpu` in place. A shader whose source contains `BROKEN` does not compile.
 * Remove it with {@link removeFakeGpu}.
 */
export function installFakeGpu(): FakeGpuLog {
  const log: FakeGpuLog = { devices: [], compiled: [], buffers: [], frames: [] }

  const createDevice = () => {
    let lose!: (info: { reason: string; message: string }) => void
    const lost = new Promise<{ reason: string; message: string }>((resolve) => {
      lose = resolve
    })
    let upload = new Float32Array(0)
    log.devices.push({ lose: (reason = 'unknown') => lose({ reason, message: 'lost in a test' }) })
    return {
      lost,
      // The default limit of WebGPU: a canvas with a longer side draws nothing.
      limits: { maxTextureDimension2D: 8192 },
      createBindGroupLayout: () => ({}),
      createPipelineLayout: () => ({}),
      createBindGroup: () => ({}),
      createShaderModule: ({ code }: { code: string }) => ({
        code,
        getCompilationInfo: async () => ({
          messages: [{ type: 'error', lineNum: 1, linePos: 2, message: 'unresolved value BROKEN' }],
        }),
      }),
      createRenderPipelineAsync: async ({ vertex }: { vertex: { module: { code: string } } }) => {
        if (vertex.module.code.includes('BROKEN')) throw new Error('pipeline creation failed')
        log.compiled.push(vertex.module.code)
        return {}
      },
      createBuffer: ({ size }: { size: number }) => {
        const buffer = { size, destroyed: false, destroy: () => void (buffer.destroyed = true) }
        log.buffers.push(buffer)
        return buffer
      },
      createCommandEncoder: () => ({
        beginRenderPass: () => ({ setPipeline() {}, setBindGroup() {}, draw: () => void log.frames.push(upload), end() {} }),
        finish: () => ({}),
      }),
      queue: {
        writeBuffer: (_buffer: unknown, _offset: number, data: Float32Array) => void (upload = new Float32Array(data)),
        submit() {},
      },
    }
  }

  const gpu = {
    requestAdapter: async () => ({ requestDevice: async () => createDevice() }),
    getPreferredCanvasFormat: () => 'bgra8unorm',
  }
  Object.defineProperty(navigator, 'gpu', { value: gpu, configurable: true })
  return log
}

/**
 * Removes the fake `navigator.gpu`. With a log, its devices are also ended, so the engine forgets
 * the shared device and the next test starts from nothing.
 */
export async function removeFakeGpu(log?: FakeGpuLog): Promise<void> {
  for (const device of log?.devices ?? []) device.lose('destroyed')
  Reflect.deleteProperty(navigator, 'gpu')
  await settle()
}

/** Lets pending promises (device, pipeline) settle. */
export const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

/** A rectangle on screen, as `getBoundingClientRect` gives it. */
export const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }) as DOMRect

/** Gives `canvas` a fake WebGPU context and returns it. */
export function fakeContext(canvas: HTMLCanvasElement) {
  const context = { configure: vi.fn(), getCurrentTexture: () => ({ createView: () => ({}) }) }
  canvas.getContext = (() => context) as unknown as HTMLCanvasElement['getContext']
  return context
}

/** Controls of the fake browser installed by {@link installFakeBrowser}. */
export interface FakeBrowser {
  /** Runs the next display frame at time `now`, in milliseconds. */
  frame(now: number): void
  /** Number of frame callbacks waiting: 1 while a loop runs, 0 when it is stopped. */
  scheduled(): number
  /** Number of `ResizeObserver`s created. */
  observers(): number
  /** Reports a size change to every `ResizeObserver`. */
  resize(): void
  /** Reports to every `IntersectionObserver` that its target is in view, or not. */
  view(isIntersecting: boolean): void
  /**
   * Reports a change of `attribute` (`class` by default: a theme change) to every
   * `MutationObserver` that observes it.
   */
  mutate(attribute?: string): void
  /**
   * Makes `prefers-reduced-motion: reduce` match (or not, with `false`), and reports the change to
   * the listeners of the media query.
   */
  reduceMotion(reduce?: boolean): void
}

/**
 * Replaces `requestAnimationFrame`, `matchMedia` and the observers with doubles that a test drives
 * by hand. Undo it with `vi.unstubAllGlobals()`.
 */
export function installFakeBrowser(): FakeBrowser {
  let scheduled = new Map<number, FrameRequestCallback>()
  let nextId = 1
  let reducedMotion = false
  const resizes: (() => void)[] = []
  const views: ((entries: { isIntersecting: boolean }[]) => void)[] = []
  /** One entry per `MutationObserver`, with the attribute filter of each `observe` (none: every attribute). */
  const mutations: { callback: () => void; filters: (string[] | undefined)[] }[] = []
  const motionListeners = new Set<(event: { matches: boolean }) => void>()

  const observer = <T>(callbacks: T[]) =>
    class {
      constructor(callback: T) {
        callbacks.push(callback)
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }

  class FakeMutationObserver {
    private readonly entry: (typeof mutations)[number]
    constructor(callback: () => void) {
      this.entry = { callback, filters: [] }
      mutations.push(this.entry)
    }
    observe(_target: Node, options?: MutationObserverInit) {
      this.entry.filters.push(options?.attributeFilter)
    }
    disconnect() {
      this.entry.filters = []
    }
  }

  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    scheduled.set(nextId, callback)
    return nextId++
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => void scheduled.delete(id))
  vi.stubGlobal('matchMedia', (query: string) => {
    const motion = query.includes('reduced-motion')
    return {
      // Live, as in a browser: the list follows the preference after it was made.
      get matches() {
        return motion && reducedMotion
      },
      media: query,
      addEventListener(_type: string, listener: (event: { matches: boolean }) => void, options?: { signal?: AbortSignal }) {
        if (!motion) return
        motionListeners.add(listener)
        options?.signal?.addEventListener('abort', () => motionListeners.delete(listener))
      },
      removeEventListener(_type: string, listener: (event: { matches: boolean }) => void) {
        motionListeners.delete(listener)
      },
    }
  })
  vi.stubGlobal('ResizeObserver', observer(resizes))
  vi.stubGlobal('IntersectionObserver', observer(views))
  vi.stubGlobal('MutationObserver', FakeMutationObserver)

  return {
    frame(now) {
      const callbacks = [...scheduled.values()]
      scheduled = new Map()
      for (const callback of callbacks) callback(now)
    },
    scheduled: () => scheduled.size,
    observers: () => resizes.length,
    resize: () => resizes.forEach((callback) => callback()),
    view: (isIntersecting) => views.forEach((callback) => callback([{ isIntersecting }])),
    mutate: (attribute = 'class') =>
      mutations.forEach(({ callback, filters }) => {
        if (filters.some((filter) => !filter || filter.includes(attribute))) callback()
      }),
    reduceMotion: (reduce = true) => {
      if (reduce === reducedMotion) return
      reducedMotion = reduce
      for (const listener of [...motionListeners]) listener({ matches: reduce })
    },
  }
}
