import { useEffect, useState } from 'react'

/** A section is the current one once its top is above this line, in pixels from the top of the window. */
const READING_LINE = 120

/**
 * The id of the section the reader is in: the last one of `ids` (in page order) whose top is above
 * the reading line. `undefined` above the first section.
 */
export function useActiveSection(ids: readonly string[]): string | undefined {
  const [active, setActive] = useState<string>()

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      let current: string | undefined
      for (const id of ids) {
        const element = document.getElementById(id)
        if (element && element.getBoundingClientRect().top <= READING_LINE) current = id
      }
      setActive(current)
    }
    // One measure per frame, however many scroll events come.
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [ids])

  return active
}
