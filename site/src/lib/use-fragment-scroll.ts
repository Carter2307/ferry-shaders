import { useEffect } from 'react'

/**
 * Scrolls to the section named by the fragment of the address (`/#api`) when the page loads. The
 * browser looks for the fragment before React renders the sections, finds nothing, and stays at
 * the top. Call it in the component that renders the sections: its effect runs once they exist.
 */
export function useFragmentScroll(): void {
  useEffect(() => {
    // The ids of the page are plain ASCII: no decoding, which throws on a malformed fragment.
    const target = document.getElementById(window.location.hash.slice(1))
    if (!target) return
    target.scrollIntoView()

    // The web fonts arrive after this first layout and change the height of the sections above.
    // Go there again, unless the page has moved since: the reader scrolled, or the browser
    // already followed the section.
    const landed = window.scrollY
    let stale = false
    void document.fonts.ready.then(() => {
      if (!stale && window.scrollY === landed) target.scrollIntoView()
    })
    return () => {
      stale = true
    }
  }, [])
}
