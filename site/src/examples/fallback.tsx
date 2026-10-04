import { useState, useSyncExternalStore } from 'react'
import { Aurora, isWebGpuSupported, type ShaderStatus } from 'ferry-shaders'

/** A banner that says what its shader does. */
export function Banner() {
  const [status, setStatus] = useState<ShaderStatus>('pending')
  return (
    <div>
      <Aurora
        className="relative h-40"
        // Rendered in the element when the browser has no WebGPU, or when the shader fails.
        fallback={<div className="absolute inset-0 bg-surface-200" />}
        onStatusChange={setStatus}
      />
      <p>Status: {status}</p>
    </div>
  )
}

// WebGPU does not come or go while the page is open: there is nothing to listen to.
const subscribe = () => () => {}

/** A first guess, before a shader mounts: do not render the decoration when it cannot draw. */
export function Decoration() {
  // False on a server and while React hydrates, then the answer of the browser: a server-rendered
  // app gets the same first render on both sides.
  const supported = useSyncExternalStore(subscribe, isWebGpuSupported, () => false)
  if (!supported) return null
  return <Aurora className="absolute inset-0" />
}
