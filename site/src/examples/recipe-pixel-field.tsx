import type { ReactNode } from 'react'
import { PixelField } from 'ferry-shaders'

/** The two colors of the field, as ferry-ui tokens: they follow the theme. */
const tokens = { color: 'var(--foreground)', accent: 'var(--primary-bright)' }

/** A page with a pixel field at its top and at its bottom. */
export function PixelFieldPage({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <PixelField className="absolute inset-x-0 top-0 h-40" origin="top" {...tokens} />
      <PixelField className="absolute inset-x-0 bottom-0 h-40" origin="bottom" {...tokens} />
      <div className="relative">{children}</div>
    </div>
  )
}
