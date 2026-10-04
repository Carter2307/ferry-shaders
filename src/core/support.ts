/**
 * True when the browser exposes WebGPU. On a server it is false. It does not say that a device
 * will be granted: a browser can expose the API and still refuse an adapter.
 *
 * Use it for a first guess before a shader mounts. The status of the mounted shader
 * (`onStatusChange`) is the real answer.
 */
export function isWebGpuSupported(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator && navigator.gpu != null
}
