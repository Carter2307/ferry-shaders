import { Cells, PixelField, Ripples } from 'shader-ui'

/** Tokens: the shader reads them again when the theme changes. */
export function TokenColors() {
  return <Cells className="h-40" color="var(--foreground)" background="var(--background)" />
}

/** Any CSS color, the 'auto' mid tone, and a transparent background: the page shows behind. */
export function TransparentBackground() {
  return <Ripples className="h-40" color="oklch(0.62 0.19 259.5)" midColor="auto" background="transparent" />
}

/** currentColor is the text color of the element: here, the one of its parent. */
export function TextColor() {
  return (
    <div className="text-primary">
      <PixelField className="h-40" color="currentColor" opacity={0.4} accentShare={0} />
    </div>
  )
}
