import { useId } from 'react'
import { ToggleGroup, ToggleGroupItem } from 'ferry-ui'
import type { ShaderControls } from 'shader-ui'

/** The two colors a preset sets. The mid tone is always 'auto': a mix of the two. */
interface Palette {
  id: string
  label: string
  /** The darkest tone: the pattern. */
  color: string
  /** The lightest tone: the page. */
  background: string
}

/** The presets after "Black". "Black" is the default palette of the shader, read from its schema. */
const PALETTES: readonly Palette[] = [
  // The palette of the portfolio the dither shaders come from.
  { id: 'sand', label: 'Sand', color: '#d9c4a3', background: '#fbf7f0' },
  // Tokens: the shader reads them again when the theme changes.
  { id: 'theme', label: 'Theme', color: 'var(--foreground)', background: 'var(--background)' },
  // Light pattern on a dark page: the roles of the two tones are the other way round.
  { id: 'night', label: 'Night', color: '#8fb1ff', background: '#0c1222' },
]

/** True when the shader has the three tones of the dither family. */
export function hasPalette(controls: ShaderControls): boolean {
  const { color, midColor, background } = controls.schema
  return color?.type === 'color' && midColor?.type === 'color' && background?.type === 'color'
}

/**
 * Palette presets for a dither shader. A preset sets `color` and `background` and puts `midColor`
 * back to 'auto', in one call to `setMany`. Render it only when {@link hasPalette} is true.
 */
export function PalettePresets({ controls }: { controls: ShaderControls }) {
  const labelId = useId()
  const { schema, values } = controls
  const black: Palette = {
    id: 'black',
    label: 'Black',
    color: String(schema.color?.default),
    background: String(schema.background?.default),
  }
  const palettes = [black, ...PALETTES]
  const active = palettes.find(
    (palette) => values.color === palette.color && values.background === palette.background && values.midColor === 'auto',
  )

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-[13px] text-foreground-light">
        Palette
      </span>
      <ToggleGroup
        type="single"
        variant="outline"
        size="tiny"
        spacing={1.5}
        className="flex-wrap"
        aria-labelledby={labelId}
        value={active?.id ?? ''}
        onValueChange={(id) => {
          const palette = palettes.find((item) => item.id === id)
          if (palette) controls.setMany({ color: palette.color, midColor: 'auto', background: palette.background })
        }}
      >
        {palettes.map((palette) => (
          <ToggleGroupItem key={palette.id} value={palette.id}>
            <span
              aria-hidden="true"
              className="flex size-3 items-center justify-center rounded-sm border border-border-strong"
              style={{ background: palette.background }}
            >
              <span className="size-1.5 rounded-full" style={{ background: palette.color }} />
            </span>
            {palette.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
