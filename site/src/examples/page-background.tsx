import { useRef, type ReactNode } from 'react'
import { Rain } from 'shader-ui'

/** A page with the Rain shader behind it. The rain stays faint behind the text column. */
export function Page({ children }: { children: ReactNode }) {
  const column = useRef<HTMLDivElement>(null)
  return (
    <>
      <Rain
        className="fixed inset-0 -z-10"
        focusRef={column}
        color="var(--foreground)"
        background="var(--background)"
      />
      <div ref={column} className="relative mx-auto max-w-sm px-6 py-12">
        {children}
      </div>
    </>
  )
}
