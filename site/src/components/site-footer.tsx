import { cn } from 'ferry-ui'
import { PixelField } from 'shader-ui'

/** The footer: the licence, what the page is built with, and a pixel field that rises from the bottom edge. */
export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t">
      {/* Before the text, so the text is above it. */}
      <PixelField
        className="absolute inset-x-0 bottom-0 h-56"
        origin="bottom"
        color="var(--foreground)"
        accent="var(--primary-bright)"
      />
      <div
        className={cn(
          'relative mx-auto flex w-full max-w-[1248px] flex-col gap-1 px-4 pt-10 pb-32 sm:px-6 lg:px-10',
          'text-[13px] text-foreground-light',
        )}
      >
        <p className="text-sm font-medium text-foreground">shader-ui</p>
        <p>MIT licence. Built with ferry-ui.</p>
      </div>
    </footer>
  )
}
