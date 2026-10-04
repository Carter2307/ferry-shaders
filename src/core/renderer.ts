import { getPipeline, type Gpu } from './gpu'
import { shaderLayout, shaderSource } from './layout'
import type { ShaderDefinition } from './types'

/** `GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST`. */
const UNIFORM_BUFFER = 0x0040 | 0x0008

/**
 * Draws one shader on one canvas. It owns the canvas context, a uniform buffer and its bind group;
 * the device and the pipelines belong to the shared {@link Gpu}.
 *
 * It does not touch the canvas until a first shader is ready: React StrictMode mounts twice on the
 * same canvas, and a mount that was cancelled must leave the context to the next one.
 */
export class Renderer {
  private readonly gpu: Gpu
  private readonly context: GPUCanvasContext

  private pipeline: GPURenderPipeline | null = null
  private buffer: GPUBuffer | null = null
  private bindGroup: GPUBindGroup | null = null
  private active: ShaderDefinition | null = null
  private requested: ShaderDefinition | null = null
  private configured = false
  private destroyed = false

  private constructor(gpu: Gpu, context: GPUCanvasContext) {
    this.gpu = gpu
    this.context = context
  }

  /** A renderer for `canvas`, or `null` when the canvas cannot give a WebGPU context. */
  static create(gpu: Gpu, canvas: HTMLCanvasElement): Renderer | null {
    const context = canvas.getContext('webgpu')
    return context ? new Renderer(gpu, context) : null
  }

  /** The longest side the canvas can have, in canvas pixels: a larger one draws nothing. */
  get maxSize(): number {
    return this.gpu.device.limits.maxTextureDimension2D
  }

  /** The shader that is drawn now. The last one asked for may still be compiling. */
  get shader(): ShaderDefinition | null {
    return this.active
  }

  /**
   * Switches to `shader`, compiling it on first use. The previous shader keeps drawing until the
   * new one is ready.
   *
   * Resolves to `true` when `shader` is now the one drawn, and to `false` when a newer call (or
   * `destroy`) came first. Rejects when the shader does not compile: the previous one stays.
   */
  async setShader(shader: ShaderDefinition): Promise<boolean> {
    this.requested = shader
    let pipeline: GPURenderPipeline
    try {
      pipeline = await getPipeline(this.gpu, shaderSource(shader), shader.id)
    } catch (error) {
      // A request that was replaced has nothing to report.
      if (this.destroyed || this.requested !== shader) return false
      throw error
    }
    if (this.destroyed || this.requested !== shader) return false

    const { device, format, bindGroupLayout } = this.gpu
    const { byteSize } = shaderLayout(shader)
    // Each schema has its own layout: a buffer of another size cannot be reused.
    if (!this.buffer || this.buffer.size !== byteSize) {
      this.buffer?.destroy()
      this.buffer = device.createBuffer({ label: `${shader.id} uniforms`, size: byteSize, usage: UNIFORM_BUFFER })
      this.bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{ binding: 0, resource: { buffer: this.buffer } }],
      })
    }
    if (!this.configured) {
      // Every await succeeded and nothing cancelled this renderer: the canvas is ours.
      // Premultiplied alpha lets a shader leave parts of the page visible.
      this.context.configure({ device, format, alphaMode: 'premultiplied' })
      this.configured = true
    }
    this.pipeline = pipeline
    this.active = shader
    return true
  }

  /**
   * Draws one frame. `uniforms` is the whole uniform buffer of the active shader as 32-bit floats
   * (header and parameters). Does nothing until a shader is ready.
   */
  render(uniforms: Float32Array<ArrayBuffer>): void {
    if (this.destroyed || !this.pipeline || !this.buffer || !this.bindGroup) return
    const { device } = this.gpu
    device.queue.writeBuffer(this.buffer, 0, uniforms)

    const encoder = device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
        },
      ],
    })
    pass.setPipeline(this.pipeline)
    pass.setBindGroup(0, this.bindGroup)
    pass.draw(3)
    pass.end()
    device.queue.submit([encoder.finish()])
  }

  /**
   * Frees the uniform buffer. The device stays (the other canvases use it) and the context stays
   * configured: a newer renderer may already own the same canvas.
   */
  destroy(): void {
    this.destroyed = true
    this.buffer?.destroy()
    this.buffer = null
    this.bindGroup = null
    this.pipeline = null
  }
}
