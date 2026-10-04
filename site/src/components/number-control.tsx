import { useState } from 'react'
import { Input } from 'ferry-ui'
import type { NumberParamDef } from 'ferry-shaders'

import type { ControlProps } from '../lib/control-props'

import { Slider } from './slider'

/** The number of decimals of a step: 0.05 has 2. A value is rounded to them, so 0.1 + 0.2 shows as 0.3. */
function decimals(step: number): number {
  const text = String(step)
  const point = text.indexOf('.')
  return point === -1 ? 0 : text.length - point - 1
}

/**
 * The control of a number parameter: a slider and a small field. The slider stays in the range of
 * the schema. The field also takes a number outside the range: the range is guidance, not a limit.
 */
export function NumberControl({ def, value, onChange, labelId, descriptionId }: ControlProps<NumberParamDef, number>) {
  // The text being typed. "-", "1." and "" are steps on the way to a number: they stay in the
  // field, but only a number goes to the shader.
  const [draft, setDraft] = useState<string | null>(null)

  const type = (text: string) => {
    setDraft(text)
    // A reader with a French keyboard types "2,4".
    const next = Number(text.replace(',', '.'))
    if (text.trim() !== '' && Number.isFinite(next)) onChange(next)
  }

  /** One step up or down with the arrow keys, like a native number field. */
  const nudge = (direction: 1 | -1) => {
    setDraft(null)
    onChange(Number((value + direction * def.step).toFixed(decimals(def.step))))
  }

  return (
    <>
      <Slider
        value={value}
        onValueChange={onChange}
        min={def.min}
        max={def.max}
        step={def.step}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        aria-valuetext={def.unit ? `${value} ${def.unit}` : undefined}
      />
      {/* A text field, not a number field: a number field writes "2,4" in some languages, and the code needs "2.4". */}
      <Input
        size="tiny"
        inputMode="decimal"
        autoComplete="off"
        className="tabular w-[58px] shrink-0"
        aria-labelledby={labelId}
        value={draft ?? String(value)}
        onChange={(event) => type(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
          event.preventDefault()
          nudge(event.key === 'ArrowUp' ? 1 : -1)
        }}
        onBlur={() => setDraft(null)}
      />
      {def.unit ? <span className="shrink-0 text-xs text-foreground-lighter">{def.unit}</span> : null}
    </>
  )
}
