import type { ReactNode } from 'react'
import { Drift } from 'shader-ui'

/** A section with a shader behind its content. */
export function Hero({ children }: { children: ReactNode }) {
  return (
    <section className="relative h-64">
      <Drift className="absolute inset-0" scale={3} />
      <div className="relative p-6">{children}</div>
    </section>
  )
}
