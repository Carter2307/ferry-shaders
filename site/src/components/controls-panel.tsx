import { Fragment, useId } from 'react'
import { Button, Card, CardAction, CardHeader, CardTitle } from 'ferry-ui'
import { RotateCcw } from 'lucide-react'
import type { ParamGroup, ShaderControls } from 'shader-ui'

import { PalettePresets, hasPalette } from './palette-presets'
import { ParamRow } from './param-row'

/** The group that holds the three tones of a dither shader: the palette presets go there. */
const COLOR_GROUP = 'Color'

interface GroupSectionProps {
  group: ParamGroup
  controls: ShaderControls
}

/** One section of the panel: the title of the group, then one row per parameter. */
function GroupSection({ group, controls }: GroupSectionProps) {
  const titleId = useId()
  return (
    <section aria-labelledby={group.group ? titleId : undefined} className="flex flex-col gap-1.5 border-b px-4 py-3 last:border-b-0">
      {group.group ? (
        <h4 id={titleId} className="text-[13px] font-medium text-foreground">
          {group.group}
        </h4>
      ) : null}
      {group.group === COLOR_GROUP && hasPalette(controls) ? <PalettePresets controls={controls} /> : null}
      {group.entries.map((entry) => (
        <ParamRow key={entry.key} entry={entry} controls={controls} />
      ))}
    </section>
  )
}

/**
 * The panel of the playground: a custom panel made with ferry-ui components and bound to
 * `useShaderControls`. It shows one section per group of `controls.groups`, in order, and a
 * "Reset" button that puts every parameter back to its default.
 */
export function ControlsPanel({ controls }: { controls: ShaderControls }) {
  return (
    <Card>
      <CardHeader className="px-4 md:px-4">
        <CardTitle>
          <h3>{controls.shader.name} settings</h3>
        </CardTitle>
        <CardAction>
          <Button size="tiny" icon={<RotateCcw />} disabled={controls.isDefault} onClick={() => controls.reset()}>
            Reset
          </Button>
        </CardAction>
      </CardHeader>
      {/* A new shader gets new rows: what was being typed for the previous one is dropped. */}
      <Fragment key={controls.shader.id}>
        {controls.groups.map((group) => (
          <GroupSection key={group.group} group={group} controls={controls} />
        ))}
      </Fragment>
    </Card>
  )
}
