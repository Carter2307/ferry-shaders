import type { ComponentProps } from 'react'
import { cn } from 'ferry-ui'
import { Slider as SliderPrimitive } from 'radix-ui'

type RootProps = ComponentProps<typeof SliderPrimitive.Root>

/** Props of {@link Slider}. Every other prop of the Radix slider root (`min`, `max`, `step`, `disabled`…) passes through. */
export interface SliderProps extends Omit<RootProps, 'value' | 'defaultValue' | 'onValueChange' | 'onValueCommit' | 'children'> {
  /** The current value. */
  value: number
  /** Called with the new value while the thumb moves. */
  onValueChange: (value: number) => void
  /** Accessible name of the thumb, when no visible label is linked with `aria-labelledby`. */
  'aria-label'?: string
  /** Id of the visible label of the slider. */
  'aria-labelledby'?: string
  /** Id of the text that describes the slider. */
  'aria-describedby'?: string
  /** The value as text for assistive technology, for example "4 px". */
  'aria-valuetext'?: string
}

/**
 * A slider for one number, built on the Radix slider and styled with ferry-ui tokens. ferry-ui has
 * no slider of its own. It is 26px tall, like a `tiny` control, so it lines up with a `tiny` Input.
 */
export function Slider({
  value,
  onValueChange,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-valuetext': ariaValueText,
  ...props
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      value={[value]}
      onValueChange={([next]) => {
        if (next !== undefined) onValueChange(next)
      }}
      className={cn(
        'relative flex h-[26px] w-full min-w-0 touch-none items-center select-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track data-slot="slider-track" className="relative h-1 grow overflow-hidden rounded-full bg-foreground/[0.1]">
        <SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-primary-solid" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-valuetext={ariaValueText}
        className={cn(
          'block size-3.5 cursor-grab rounded-full border border-primary-solid-border bg-surface-100 shadow-card outline-none',
          'transition-shadow hover:ring-2 hover:ring-primary-soft focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
          // In dark, `--shadow-card` is `none`: in the shadow list of Tailwind it makes the whole
          // `box-shadow` invalid, and the ring is lost. `shadow-none` is a shadow the list accepts.
          'data-[disabled]:cursor-not-allowed dark:bg-foreground dark:shadow-none',
        )}
      />
    </SliderPrimitive.Root>
  )
}
