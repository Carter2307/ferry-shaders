import { isWebGpuSupported } from './support'

/** `GPUShaderStage.FRAGMENT`: the uniforms are read by the fragment stage only. */
const STAGE_FRAGMENT = 0x2

/** What every canvas of the page shares: one device, one layout and the compiled pipelines. */
export interface Gpu {
  device: GPUDevice
  /** Preferred canvas format of the browser. */
  format: GPUTextureFormat
  /** Binding 0 is the uniform buffer. The same layout serves every shader. */
  bindGroupLayout: GPUBindGroupLayout
  pipelineLayout: GPUPipelineLayout
  /** Compiled (or compiling) pipelines by WGSL text, so a second canvas or a switch back is instant. */
  pipelines: Map<string, Promise<GPURenderPipeline>>
  /**
   * Called when the device is lost. A canvas adds its listener here and removes it when it goes
   * away: a wait on `device.lost` itself cannot be cancelled, and would keep the canvas in memory
   * for as long as the device lives.
   */
  lostListeners: Set<(info: GPUDeviceLostInfo) => void>
}

let shared: Promise<Gpu | null> | null = null

async function createGpu(): Promise<Gpu | null> {
  // Backgrounds are slow and small: the integrated GPU is enough and saves power.
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' })
  if (!adapter) return null
  const device = await adapter.requestDevice({ label: 'ferry-shaders' })
  // An explicit layout, shared by every shader: one bind group per canvas serves any pipeline.
  const bindGroupLayout = device.createBindGroupLayout({
    label: 'ferry-shaders uniforms layout',
    entries: [{ binding: 0, visibility: STAGE_FRAGMENT, buffer: { type: 'uniform' } }],
  })
  return {
    device,
    format: navigator.gpu.getPreferredCanvasFormat(),
    bindGroupLayout,
    pipelineLayout: device.createPipelineLayout({ label: 'ferry-shaders layout', bindGroupLayouts: [bindGroupLayout] }),
    pipelines: new Map(),
    lostListeners: new Set(),
  }
}

/**
 * The GPU device shared by every canvas of the page, or `null` when WebGPU is not available.
 * It never rejects. A device that was lost is forgotten, so the next call asks for a new one.
 */
export function getGpu(): Promise<Gpu | null> {
  if (!isWebGpuSupported()) return Promise.resolve(null)
  if (shared) return shared
  const pending: Promise<Gpu | null> = createGpu()
    .catch((error: unknown) => {
      console.error('[ferry-shaders] WebGPU init failed', error)
      return null
    })
    .then((gpu) => {
      const forget = () => {
        if (shared === pending) shared = null
      }
      // The browser can take the device back (the GPU process restarted): the next mount asks
      // again. The device is forgotten before the mounts are told, so they get a new one. This is
      // the only wait on `device.lost`: it holds the listeners of the mounted canvases and no more.
      if (gpu) {
        void gpu.device.lost.then((info) => {
          forget()
          // A copy: a listener removes itself, and a mount that starts again adds one elsewhere.
          for (const listener of [...gpu.lostListeners]) listener(info)
        })
      } else {
        // A refusal is not kept either: the next mount tries again.
        forget()
      }
      return gpu
    })
  shared = pending
  return pending
}

/** Logs why a shader did not compile, with the line of each message. */
async function reportCompilation(module: GPUShaderModule, label: string, error: unknown): Promise<void> {
  let details = ''
  try {
    const info = await module.getCompilationInfo()
    details = info.messages
      .map((message) => `  ${message.type} at ${message.lineNum}:${message.linePos}: ${message.message}`)
      .join('\n')
  } catch {
    // The device is gone: the error below is all there is.
  }
  console.error(`[ferry-shaders] shader "${label}" did not compile${details ? `\n${details}` : ''}`, error)
}

/**
 * The render pipeline of a WGSL module (entry points `vs_main` and `fs_main`), compiled once per
 * device and per source text. A failure is logged with the compiler messages, then forgotten so a
 * later request can try again, and the promise rejects.
 */
export function getPipeline(gpu: Gpu, code: string, label: string): Promise<GPURenderPipeline> {
  const cached = gpu.pipelines.get(code)
  if (cached) return cached

  const module = gpu.device.createShaderModule({ label: `${label} shader`, code })
  const pending = gpu.device
    .createRenderPipelineAsync({
      label: `${label} pipeline`,
      layout: gpu.pipelineLayout,
      vertex: { module, entryPoint: 'vs_main' },
      fragment: { module, entryPoint: 'fs_main', targets: [{ format: gpu.format }] },
      primitive: { topology: 'triangle-list' },
    })
    .catch(async (error: unknown) => {
      gpu.pipelines.delete(code)
      await reportCompilation(module, label, error)
      throw error
    })
  gpu.pipelines.set(code, pending)
  return pending
}
