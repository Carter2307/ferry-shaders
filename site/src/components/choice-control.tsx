import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, ToggleGroup, ToggleGroupItem } from 'ferry-ui'
import type { BooleanParamDef, SelectParamDef } from 'shader-ui'

import type { ControlProps } from '../lib/control-props'

/** A select with this many options or fewer shows them all, side by side. */
const MAX_VISIBLE_OPTIONS = 3

/** The control of an on/off parameter: a switch. The value applies at once. */
export function BooleanControl({ value, onChange, labelId, descriptionId }: ControlProps<BooleanParamDef, boolean>) {
  return <Switch size="sm" checked={value} onCheckedChange={onChange} aria-labelledby={labelId} aria-describedby={descriptionId} />
}

/**
 * The control of a select parameter: a toggle group for two or three options, a select menu for
 * more.
 */
export function SelectControl({ def, value, onChange, labelId, descriptionId }: ControlProps<SelectParamDef, string>) {
  if (def.options.length <= MAX_VISIBLE_OPTIONS) {
    return (
      <ToggleGroup
        type="single"
        variant="outline"
        size="tiny"
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        value={value}
        // Single mode gives "" when the active item is clicked again: one option stays selected.
        onValueChange={(next) => {
          if (next) onChange(next)
        }}
      >
        {def.options.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    )
  }
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="tiny" className="w-full" aria-labelledby={labelId} aria-describedby={descriptionId}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {def.options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
