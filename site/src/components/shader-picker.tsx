import { RadioCard, RadioCardGroup } from 'ferry-ui'
import { ShaderCanvas, getShader, shaders, type ShaderDefinition } from 'shader-ui'

/** A preview is small and slow: 12 frames per second are enough to show that it moves. */
const PREVIEW_FPS = 12

/**
 * The previews use the tokens of the page, in a soft grey, so the row of tiles stays quiet in both
 * themes. Keys a shader does not have are ignored. Small cells keep the pattern readable in a
 * small tile.
 */
const PREVIEW_PARAMS = { color: 'var(--foreground-lighter)', background: 'var(--background)', cell: 2 }

/** What a preview needs to fit a small tile, by shader id. */
const PREVIEW_OVERRIDES: Readonly<Record<string, Readonly<Record<string, string | number>>>> = {
  grass: { height: 26 },
  stars: { spacing: 12 },
  'pixel-field': { cell: 3, color: 'var(--foreground)', accent: 'var(--primary-bright)', falloff: 1.6 },
}

/** One object per shader, made once: a new object on each render would be a new set of params. */
const previews = new Map(shaders.map((shader) => [shader.id, { ...PREVIEW_PARAMS, ...PREVIEW_OVERRIDES[shader.id] }]))

/** Props of {@link ShaderPicker}. */
export interface ShaderPickerProps {
  /** The selected shader. */
  shader: ShaderDefinition
  /** Called with the shader of the tile the reader chooses. */
  onShaderChange: (shader: ShaderDefinition) => void
}

/**
 * The ten shaders as a radio group of tiles: a small live preview, the name and the technique.
 * On a phone the tiles are one row that scrolls sideways.
 */
export function ShaderPicker({ shader, onShaderChange }: ShaderPickerProps) {
  return (
    <RadioCardGroup
      aria-label="Shader"
      indicator="none"
      value={shader.id}
      onValueChange={(id) => {
        const next = getShader(id)
        if (next) onShaderChange(next)
      }}
      // The padding leaves room for the ring of the selected tile inside the scrolling row.
      className="-m-1 flex overflow-x-auto p-1 sm:grid sm:grid-cols-5 sm:overflow-visible"
    >
      {shaders.map((item) => (
        <RadioCard
          key={item.id}
          value={item.id}
          label={item.name}
          description={item.technique}
          className="w-36 shrink-0 sm:w-auto"
          media={
            <ShaderCanvas
              shader={item}
              params={previews.get(item.id)}
              fps={PREVIEW_FPS}
              className="relative h-16 bg-background lg:h-20"
              fallback={<span className="absolute inset-0 bg-surface-200" />}
            />
          }
        />
      ))}
    </RadioCardGroup>
  )
}
