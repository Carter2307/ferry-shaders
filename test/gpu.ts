import { create, globals } from 'webgpu'

// Dawn brings the WebGPU constants (GPUBufferUsage, GPUTextureUsage, GPUMapMode…) to Node.
Object.assign(globalThis, globals)

/** Rows of a texture copied to a buffer start on a multiple of 256 bytes. */
const ROW_ALIGNMENT = 256

/** `GPUShaderStage.FRAGMENT`: the same visibility as the engine (src/core/gpu.ts). */
const STAGE_FRAGMENT = 0x2

// Kept for the life of the process: Dawn crashes when its GPU instance is garbage-collected
// while a device made from it is still in use.
const gpu = create([])

let shared: Promise<GPUDevice | null> | null = null

/** One real GPU device (Dawn) for every test, or `null` when this machine cannot give one. */
export function getDevice(): Promise<GPUDevice | null> {
  shared ??= (async () => {
    try {
      const adapter = await gpu.requestAdapter()
      return adapter ? await adapter.requestDevice({ label: 'ferry-shaders tests' }) : null
    } catch {
      return null
    }
  })()
  return shared
}

async function requireDevice(): Promise<GPUDevice> {
  const device = await getDevice()
  if (!device) throw new Error('No WebGPU device: the GPU tests cannot run on this machine.')
  return device
}

/** One picture to draw: a WGSL module, its uniform buffer and the size of the target. */
export interface RenderRequest {
  /** The complete WGSL module. */
  code: string
  /** The whole uniform buffer (group 0, binding 0). */
  uniforms: Float32Array
  width: number
  height: number
  /** Defaults to `vs_main`. */
  vertexEntry?: string
  /** Defaults to `fs_main`. */
  fragmentEntry?: string
  /** Pipeline-overridable constants of the fragment stage. */
  constants?: Record<string, number>
}

/** The messages of the WGSL compiler for `code` (errors, warnings and infos). Empty when it is clean. */
export async function compileMessages(code: string): Promise<string[]> {
  const device = await requireDevice()
  const info = await device.createShaderModule({ code }).getCompilationInfo()
  return info.messages.map((message) => `${message.type} at ${message.lineNum}:${message.linePos}: ${message.message}`)
}

/**
 * Draws one frame to an `rgba8unorm` texture with no blending and returns its pixels as RGBA bytes,
 * row by row from the top. The values are what the shader returned: a premultiplied color stays
 * premultiplied. Throws when WebGPU reports a validation error.
 */
export async function renderToPixels(request: RenderRequest): Promise<Uint8Array> {
  const device = await requireDevice()
  const { code, uniforms, width, height, vertexEntry = 'vs_main', fragmentEntry = 'fs_main', constants } = request

  device.pushErrorScope('validation')

  const module = device.createShaderModule({ code })
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: STAGE_FRAGMENT, buffer: { type: 'uniform' } }],
  })
  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: { module, entryPoint: vertexEntry },
    fragment: { module, entryPoint: fragmentEntry, targets: [{ format: 'rgba8unorm' }], constants },
    primitive: { topology: 'triangle-list' },
  })

  const uniformBuffer = device.createBuffer({
    size: Math.ceil(uniforms.byteLength / 16) * 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  device.queue.writeBuffer(uniformBuffer, 0, uniforms.buffer as ArrayBuffer, uniforms.byteOffset, uniforms.byteLength)
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  })

  const texture = device.createTexture({
    size: [width, height],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  })
  const bytesPerRow = Math.ceil((width * 4) / ROW_ALIGNMENT) * ROW_ALIGNMENT
  const readback = device.createBuffer({
    size: bytesPerRow * height,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  })

  const encoder = device.createCommandEncoder()
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      { view: texture.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } },
    ],
  })
  pass.setPipeline(pipeline)
  pass.setBindGroup(0, bindGroup)
  pass.draw(3)
  pass.end()
  encoder.copyTextureToBuffer({ texture }, { buffer: readback, bytesPerRow }, [width, height])
  device.queue.submit([encoder.finish()])

  const error = await device.popErrorScope()
  if (error) throw new Error(`WebGPU validation error: ${error.message}`)

  await readback.mapAsync(GPUMapMode.READ)
  const padded = new Uint8Array(readback.getMappedRange())
  const pixels = new Uint8Array(width * height * 4)
  for (let row = 0; row < height; row++) {
    pixels.set(padded.subarray(row * bytesPerRow, row * bytesPerRow + width * 4), row * width * 4)
  }
  readback.unmap()
  readback.destroy()
  uniformBuffer.destroy()
  texture.destroy()
  return pixels
}
