/**
 * `?webgpu=off` in the address shows the page as a browser with no WebGPU sees it: the shaders
 * report `unsupported` and the fallbacks render. Call it before the first shader mounts.
 */
export function applyWebGpuSwitch(): void {
  if (new URLSearchParams(window.location.search).get('webgpu') !== 'off') return
  // An own property hides the real one: the engine then finds no `navigator.gpu`.
  Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true })
}
