import { useId, useRef, useState, type ReactNode } from 'react'
import { Button, Tooltip, TooltipContent, TooltipTrigger } from 'ferry-ui'
import { RotateCcw } from 'lucide-react'
import type { ParamEntry, ShaderControls } from 'ferry-shaders'

import { BooleanControl, SelectControl } from './choice-control'
import { ColorControl } from './color-control'
import { NumberControl } from './number-control'

/** The first control of a row that takes the focus: where the focus goes after a reset. */
const MAIN_CONTROL = '[role="slider"], input:not([type="color"]), [role="switch"], [role="combobox"], [role="radio"]'

/** Props of {@link ParamRow}. */
export interface ParamRowProps {
  /** The parameter of the row: its key and its definition. */
  entry: ParamEntry
  /** The state the row reads and changes: what `useShaderControls` returns. */
  controls: ShaderControls
}

/**
 * One parameter of the panel: its label, the control that fits its type, and a reset button when
 * the value is not the default. The description shows in a tooltip, when the pointer is on the
 * label or when the keyboard focus is in the row.
 */
export function ParamRow({ entry: { key, def }, controls }: ParamRowProps) {
  const row = useRef<HTMLDivElement>(null)
  const id = useId()
  const labelId = `${id}-label`
  const descriptionId = def.description ? `${id}-description` : undefined
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)

  const { schema, values } = controls
  const value = values[key]
  const common = { labelId, descriptionId, onChange: (next: string | number | boolean) => controls.set(key, next) }

  // The values are checked against the schema by the hook: the default is only there for the types.
  let control: ReactNode
  switch (def.type) {
    case 'number':
      control = <NumberControl {...common} def={def} value={typeof value === 'number' ? value : def.default} />
      break
    case 'color':
      control = (
        <ColorControl
          {...common}
          def={def}
          value={typeof value === 'string' ? value : def.default}
          name={key}
          schema={schema}
          values={values}
        />
      )
      break
    case 'boolean':
      control = <BooleanControl {...common} def={def} value={typeof value === 'boolean' ? value : def.default} />
      break
    case 'select':
      control = <SelectControl {...common} def={def} value={typeof value === 'string' ? value : def.default} />
      break
  }

  const changed = value !== def.default
  const label = (
    <span id={labelId} className={def.description ? 'cursor-help truncate' : 'truncate'}>
      {def.label}
    </span>
  )

  return (
    <div
      ref={row}
      data-param={key}
      className="grid min-h-[30px] grid-cols-[minmax(0,6rem)_minmax(0,1fr)_26px] items-center gap-x-2 text-[13px] text-foreground-light"
      // The focus of the keyboard, not of a click. A popover of the row is not in the row.
      onFocus={(event) => setFocused(event.currentTarget.contains(event.target) && event.target.matches(':focus-visible'))}
      onBlur={() => setFocused(false)}
    >
      {def.description ? (
        <Tooltip open={hovered || focused} onOpenChange={setHovered}>
          <TooltipTrigger asChild>{label}</TooltipTrigger>
          <TooltipContent side="top" align="start">
            {def.description}
          </TooltipContent>
        </Tooltip>
      ) : (
        label
      )}
      <div className="flex min-w-0 items-center gap-2">{control}</div>
      {changed ? (
        <Button
          variant="ghost"
          size="icon-tiny"
          icon={<RotateCcw />}
          aria-label={`Reset ${def.label}`}
          onClick={() => {
            controls.reset(key)
            // The button goes away with the change: the focus must not go with it.
            row.current?.querySelector<HTMLElement>(MAIN_CONTROL)?.focus()
          }}
        />
      ) : null}
      {def.description ? (
        <span id={descriptionId} className="sr-only">
          {def.description}
        </span>
      ) : null}
    </div>
  )
}
