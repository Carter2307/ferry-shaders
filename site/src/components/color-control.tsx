import { useEffect, useId, useRef, useState } from 'react'
import { Button, Input, Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger, Switch, cn } from 'ferry-ui'
import type { ColorParamDef, ParamSchema } from 'shader-ui'

import { drawnHex, isColorValue, swatchColor, type Values } from '../lib/color'
import type { ControlProps } from '../lib/control-props'

/** CSS colors that are not hex values: one click shows that the shader takes them. */
const CSS_COLORS = ['var(--foreground)', 'var(--primary-bright)', 'currentColor', 'transparent']

/** Props of {@link ColorControl}. */
export interface ColorControlProps extends ControlProps<ColorParamDef, string> {
  /** Key of the parameter. */
  name: string
  schema: ParamSchema
  /** Every value of the shader: an 'auto' color is a mix of two others. */
  values: Values
}

/**
 * The control of a color parameter: a swatch that opens a popover with the native color picker, a
 * field that takes any CSS color, and an "Auto" switch when the parameter can be computed.
 */
export function ColorControl({ def, value, onChange, labelId, descriptionId, name, schema, values }: ColorControlProps) {
  const swatch = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  const isAuto = def.auto !== undefined && value === 'auto'

  // The color to come back to when Auto is turned off.
  const concrete = useRef<string | null>(null)
  useEffect(() => {
    if (value !== 'auto') concrete.current = value
  }, [value])

  const forget = () => {
    setDraft(null)
    setInvalid(false)
  }

  /** Sends the typed text to the shader. Text that is not a color stays in the field, marked invalid. */
  const commit = () => {
    if (draft === null) return
    const text = draft.trim()
    const next = text.toLowerCase() === 'auto' ? 'auto' : text
    if (next === '' || next === value) return forget()
    if (!isColorValue(def, next)) return setInvalid(true)
    onChange(next)
    forget()
  }

  const toggleAuto = (auto: boolean) => {
    // Back to the color it had before, else to the mix it shows now: the picture does not jump.
    if (auto) onChange('auto')
    else onChange(concrete.current ?? drawnHex(schema, values, name, swatch.current))
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <button
            ref={swatch}
            type="button"
            aria-label={`Pick the color of ${def.label}`}
            // The text color is the one of the stage, so a swatch of `currentColor` shows what the shader draws.
            className={cn(
              'relative size-[26px] shrink-0 cursor-pointer overflow-hidden rounded-md border border-border-strong text-foreground',
              // The dots show through a color that is transparent.
              'bg-dot-grid bg-[length:6px_6px] outline-none hover:border-border-stronger focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <span className="absolute inset-0" style={{ background: swatchColor(def, value, values) }} />
          </button>
        </PopoverTrigger>
        {/* The popover is a dialog: its visible title is its accessible name. */}
        <PopoverContent align="start" aria-labelledby={titleId} className="flex w-64 flex-col gap-3">
          <PopoverHeader>
            <PopoverTitle id={titleId}>{def.label}</PopoverTitle>
            {def.description ? <PopoverDescription>{def.description}</PopoverDescription> : null}
          </PopoverHeader>
          <input
            type="color"
            aria-label={`${def.label} picker`}
            className={cn(
              'h-9 w-full cursor-pointer rounded-md border border-border-strong bg-surface-100 p-1',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            // Not bound to the value: the native picker needs #rrggbb, and a token is resolved by
            // reading the page. The value is written when the input mounts and after each change.
            defaultValue="#000000"
            ref={(input) => {
              if (input) input.value = drawnHex(schema, values, name, swatch.current)
            }}
            onChange={(event) => onChange(event.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-foreground-lighter">Any CSS color works. Try one of these.</p>
            <div className="flex flex-wrap gap-1.5">
              {CSS_COLORS.map((color) => (
                <Button key={color} size="tiny" variant="outline" className="font-mono" onClick={() => onChange(color)}>
                  {color}
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Input
        size="tiny"
        mono
        className="min-w-0 flex-1"
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        aria-invalid={invalid || undefined}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        value={draft ?? value}
        onChange={(event) => {
          setDraft(event.target.value)
          setInvalid(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
          else if (event.key === 'Escape') forget()
        }}
        onBlur={() => {
          commit()
          forget()
        }}
      />
      {def.auto ? (
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-foreground-light">
          <Switch size="sm" checked={isAuto} onCheckedChange={toggleAuto} aria-label={`Auto ${def.label}`} />
          Auto
        </label>
      ) : null}
    </>
  )
}
