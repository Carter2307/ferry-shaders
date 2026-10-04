import * as React from 'react'

import { resolveColor, resolveColors, TRANSPARENT } from '../core/color'
import type { ParamEntry } from '../core/params'
import type { BooleanParamDef, ColorParamDef, NumberParamDef, ParamSchema, Rgba, SelectParamDef, ShaderDefinition } from '../core/types'

import type { ShaderControls } from './use-shader-controls'

/** Where a {@link ShaderPanel} sits: in the flow of the page (`inline`), or fixed in a corner of the window. */
export type ShaderPanelPlacement = 'inline' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/**
 * Props of {@link ShaderPanel}. Every other `<div>` prop goes to the root element. The panel takes
 * no children: extra content goes in `footer`.
 */
export interface ShaderPanelProps<S extends ParamSchema = ParamSchema>
  extends Omit<React.ComponentPropsWithoutRef<'div'>, 'title' | 'children'> {
  /** The state the panel shows and changes: what `useShaderControls` returns. */
  controls: ShaderControls<S>
  /** Heading of the panel. Defaults to the name of the shader. */
  title?: React.ReactNode
  /** The shaders to choose from. With `onShaderChange`, the panel shows a shader picker. */
  shaders?: readonly ShaderDefinition[]
  /** Called with the shader chosen in the picker: give it to `useShaderControls`. */
  onShaderChange?: (shader: ShaderDefinition) => void
  /** Lets the header fold the panel to a small tab. Defaults to true. */
  collapsible?: boolean
  /** Whether the panel starts open, when `open` is not given. Defaults to true. */
  defaultOpen?: boolean
  /** Whether the panel is open. Give it with `onOpenChange` to control the panel yourself. */
  open?: boolean
  /** Called when the header asks to open or to fold the panel. */
  onOpenChange?: (open: boolean) => void
  /** `inline` (the default) leaves the panel in the flow of the page. A corner fixes it to the window. */
  placement?: ShaderPanelPlacement
  /** Extra content under the controls. */
  footer?: React.ReactNode
}

/** The values of a shader, as the rows read them: the panel works on any schema. */
type Values = Readonly<Record<string, string | number | boolean>>

/** A style object that sets custom properties the stylesheet reads. */
const cssVars = (vars: Record<`--ferry-shaders-${string}`, string>) => vars as React.CSSProperties

/** `#rrggbb`, the only form a native color input takes. With `alpha`, `#rrggbbaa` when the color is not opaque. */
function toHex([r, g, b, a]: Rgba, alpha = false): string {
  const pair = (channel: number) =>
    Math.round(Math.min(1, Math.max(0, channel)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${pair(r)}${pair(g)}${pair(b)}${alpha && a < 1 ? pair(a) : ''}`
}

/**
 * The color the shader draws for the parameter `key`, an 'auto' mix included. It is resolved next
 * to `element`, so `var(--token)` and `currentColor` take the values they have there.
 */
function drawnColor(schema: ParamSchema, values: Values, key: string, def: ColorParamDef, element: Element | null): Rgba {
  // Only the colors this one depends on: a color that is not a literal costs a style read of the page.
  const needed: ParamSchema = { [key]: def }
  for (const end of def.auto ? [def.auto.from, def.auto.to] : []) {
    const entry = schema[end]
    if (entry) needed[end] = entry
  }
  return resolveColors(needed, values, (css) => resolveColor(css, element))[key] ?? TRANSPARENT
}

/** The CSS color a swatch shows: the value itself, or the mix an 'auto' color stands for. */
function swatchColor(def: ColorParamDef, value: string, values: Values): string {
  if (value !== 'auto' || !def.auto) return value
  const { from, to, mix } = def.auto
  const percent = Math.round(mix * 1000) / 10
  // The browser mixes premultiplied sRGB values, like the engine does.
  return `color-mix(in srgb, ${String(values[from])} ${100 - percent}%, ${String(values[to])} ${percent}%)`
}

/** True when `text` can be the value of the color: a CSS color, or 'auto' when the definition has it. */
function isColorValue(def: ColorParamDef, text: string): boolean {
  if (text === 'auto') return def.auto !== undefined
  // With no `CSS.supports` (an old browser, a test) the text is taken as it is: the engine draws the
  // default for a color it cannot read.
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return true
  return CSS.supports('color', text)
}

function ChevronIcon() {
  return (
    <svg className="ferry-shaders-chevron" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
      <path
        d="M2.83 6.6A5.5 5.5 0 1 1 3.24 11.25M2.5 3.25v3.5H6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** What the control of a row receives. */
interface ControlProps<D, V> {
  /** Id of the main control: the label of the row points to it. */
  id: string
  /** Id of the element that holds the description, when the parameter has one. */
  describedBy: string | undefined
  def: D
  value: V
  onChange: (value: V) => void
}

function NumberControl({ id, describedBy, def, value, onChange }: ControlProps<NumberParamDef, number>) {
  // The text being typed. "-", "1." and "" are steps on the way to a number: they stay in the field
  // (a field bound to the value alone could not be emptied), but only a number goes to the shader.
  const [draft, setDraft] = React.useState<string | null>(null)
  const span = def.max - def.min
  // How far the value is along the track, as a percentage with one decimal.
  const fill = span > 0 ? Math.round(Math.min(1, Math.max(0, (value - def.min) / span)) * 1000) / 10 : 0

  const type = (text: string) => {
    setDraft(text)
    const next = Number(text)
    // The range is guidance: a number outside it is sent as it is.
    if (text.trim() !== '' && Number.isFinite(next)) onChange(next)
  }

  return (
    <>
      <input
        type="range"
        className="ferry-shaders-range"
        id={id}
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        aria-describedby={describedBy}
        aria-valuetext={def.unit ? `${value} ${def.unit}` : undefined}
        // The filled part of the track: browsers have no common way to draw it.
        style={cssVars({ '--ferry-shaders-fill': `${fill}%` })}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="ferry-shaders-field">
        <input
          type="number"
          className="ferry-shaders-number"
          aria-label={def.label}
          min={def.min}
          max={def.max}
          step={def.step}
          value={draft ?? String(value)}
          onChange={(event) => type(event.target.value)}
          onBlur={() => setDraft(null)}
        />
        {def.unit ? <span className="ferry-shaders-unit">{def.unit}</span> : null}
      </span>
    </>
  )
}

interface ColorControlProps extends ControlProps<ColorParamDef, string> {
  /** Key of the parameter. */
  name: string
  schema: ParamSchema
  /** Every value of the shader: an 'auto' color is a mix of two others. */
  values: Values
}

function ColorControl({ id, describedBy, def, value, onChange, name, schema, values }: ColorControlProps) {
  const swatch = React.useRef<HTMLSpanElement>(null)
  const [draft, setDraft] = React.useState<string | null>(null)
  const [invalid, setInvalid] = React.useState(false)
  const isAuto = def.auto !== undefined && value === 'auto'

  // The color to come back to when Auto is turned off.
  const concrete = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (value !== 'auto') concrete.current = value
  }, [value])

  const drawn = () => drawnColor(schema, values, name, def, swatch.current)

  const forget = () => {
    setDraft(null)
    setInvalid(false)
  }

  /** Sends the typed text to the shader. Text that is not a color stays in the field, marked invalid. */
  const commit = () => {
    if (draft === null) return
    const text = draft.trim()
    const next = text.toLowerCase() === 'auto' ? 'auto' : text
    // Empty text is not a color: the field goes back to the value.
    if (next === '' || next === value) return forget()
    if (!isColorValue(def, next)) return setInvalid(true)
    onChange(next)
    forget()
  }

  const toggleAuto = () => {
    // Back to the color it had before, else to the mix it shows now: the picture does not jump.
    if (isAuto) onChange(concrete.current ?? toHex(drawn(), true))
    else onChange('auto')
  }

  const ends = def.auto ? [schema[def.auto.from]?.label, schema[def.auto.to]?.label] : []

  return (
    <>
      <span className="ferry-shaders-swatch" ref={swatch} style={cssVars({ '--ferry-shaders-swatch': swatchColor(def, value, values) })}>
        <input
          type="color"
          className="ferry-shaders-color"
          aria-label={`${def.label} picker`}
          // Not bound to the value: the native picker needs #rrggbb, and to resolve a token reads the
          // page. The value is written when the picker opens (the click comes before it).
          defaultValue="#000000"
          onClick={(event) => {
            event.currentTarget.value = toHex(drawn())
          }}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
      <input
        type="text"
        className="ferry-shaders-text"
        id={id}
        value={draft ?? value}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onChange={(event) => {
          setDraft(event.target.value)
          setInvalid(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            // Enter must not submit a form the panel is in.
            event.preventDefault()
            commit()
          } else if (event.key === 'Escape') {
            forget()
          }
        }}
        onBlur={() => {
          commit()
          forget()
        }}
      />
      {def.auto ? (
        <button
          type="button"
          className="ferry-shaders-auto"
          aria-pressed={isAuto}
          aria-label={`Auto ${def.label}`}
          title={`Mix of ${ends.join(' and ')}`}
          onClick={toggleAuto}
        >
          Auto
        </button>
      ) : null}
    </>
  )
}

function BooleanControl({ id, describedBy, value, onChange }: ControlProps<BooleanParamDef, boolean>) {
  return (
    <input
      type="checkbox"
      role="switch"
      className="ferry-shaders-switch"
      id={id}
      checked={value}
      aria-describedby={describedBy}
      onChange={(event) => onChange(event.target.checked)}
    />
  )
}

function SelectControl({ id, describedBy, def, value, onChange }: ControlProps<SelectParamDef, string>) {
  return (
    <select className="ferry-shaders-select" id={id} value={value} aria-describedby={describedBy} onChange={(event) => onChange(event.target.value)}>
      {def.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

interface ParamRowProps {
  entry: ParamEntry
  controls: ShaderControls
  /** Id of the main control of the row. */
  id: string
}

function ParamRow({ entry: { key, def }, controls, id }: ParamRowProps) {
  const label = React.useRef<HTMLLabelElement>(null)
  const { schema, values } = controls
  const value = values[key]
  const describedBy = def.description ? `${id}-description` : undefined
  const common = { id, describedBy, onChange: (next: string | number | boolean) => controls.set(key, next) }

  // The values are checked against the schema by the controls: the default is only there for the types.
  let control: React.ReactNode
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
  // The column can cut a long label: the tooltip gives the whole label, then the description.
  const tooltip = def.description ? `${def.label}: ${def.description}` : def.label
  return (
    <div className={`ferry-shaders-row ferry-shaders-row--${def.type}`} data-param={key} data-changed={changed ? '' : undefined}>
      <label className="ferry-shaders-label" ref={label} htmlFor={id} title={tooltip}>
        {def.label}
      </label>
      <div className="ferry-shaders-control">{control}</div>
      {changed ? (
        <button
          type="button"
          className="ferry-shaders-row-reset"
          aria-label={`Reset ${def.label}`}
          title="Reset to the default"
          onClick={() => {
            controls.reset(key)
            // The button goes away with the change: the focus must not go with it.
            label.current?.control?.focus()
          }}
        >
          <ResetIcon />
        </button>
      ) : null}
      {def.description ? (
        // Hidden, but still read by assistive technology through `aria-describedby`.
        <span id={describedBy} hidden>
          {def.description}
        </span>
      ) : null}
    </div>
  )
}

function ShaderPanelRoot<S extends ParamSchema>(
  {
    controls: typedControls,
    title,
    shaders,
    onShaderChange,
    collapsible = true,
    defaultOpen = true,
    open,
    onOpenChange,
    placement = 'inline',
    footer,
    className,
    ...props
  }: ShaderPanelProps<S>,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  // The rows work on any schema: the typed controls fit the generic type.
  const controls: ShaderControls = typedControls
  const { shader, groups } = controls
  const baseId = React.useId()
  const bodyId = `${baseId}-body`
  const shaderId = `${baseId}-shader`

  const [ownOpen, setOwnOpen] = React.useState(defaultOpen)
  // A panel that cannot fold is always open.
  const isOpen = !collapsible || (open ?? ownOpen)
  const toggle = () => {
    if (open === undefined) setOwnOpen(!isOpen)
    onOpenChange?.(!isOpen)
  }

  // The current shader is always a choice, so the select never shows another name.
  const choices = shaders && onShaderChange ? (shaders.some((choice) => choice.id === shader.id) ? shaders : [shader, ...shaders]) : null
  const heading = <span className="ferry-shaders-title">{title ?? shader.name}</span>

  return (
    <div
      {...props}
      ref={ref}
      className={['ferry-shaders-panel', `ferry-shaders-panel--${placement}`, className].filter(Boolean).join(' ')}
      data-state={isOpen ? 'open' : 'closed'}
    >
      <div className="ferry-shaders-header">
        {collapsible ? (
          <button type="button" className="ferry-shaders-toggle" aria-expanded={isOpen} aria-controls={bodyId} onClick={toggle}>
            <ChevronIcon />
            {heading}
          </button>
        ) : (
          <div className="ferry-shaders-heading">{heading}</div>
        )}
        {isOpen ? (
          <button
            type="button"
            className="ferry-shaders-reset"
            // Not `disabled`: a reset disables this button, and a disabled button drops the focus it has.
            aria-disabled={controls.isDefault || undefined}
            onClick={() => {
              if (!controls.isDefault) controls.reset()
            }}
          >
            Reset
          </button>
        ) : null}
      </div>
      <div className="ferry-shaders-body" id={bodyId} hidden={!isOpen}>
        {choices ? (
          <div className="ferry-shaders-shader">
            <label className="ferry-shaders-label" htmlFor={shaderId}>
              Shader
            </label>
            <select
              className="ferry-shaders-select"
              id={shaderId}
              value={shader.id}
              onChange={(event) => {
                const next = choices.find((choice) => choice.id === event.target.value)
                if (next) onShaderChange?.(next)
              }}
            >
              {choices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {/* A new shader gets new rows: what was being typed for the previous one is dropped. */}
        <React.Fragment key={shader.id}>
          {groups.map((group, index) => {
            const titleId = `${baseId}-group-${index}`
            return (
              <div
                key={group.group}
                className="ferry-shaders-group"
                role={group.group ? 'group' : undefined}
                aria-labelledby={group.group ? titleId : undefined}
              >
                {group.group ? (
                  <div className="ferry-shaders-group-title" id={titleId}>
                    {group.group}
                  </div>
                ) : null}
                {group.entries.map((entry) => (
                  // `param-`: a parameter can be named `body` or `shader`, the ids of the panel itself.
                  <ParamRow key={entry.key} entry={entry} controls={controls} id={`${baseId}-param-${entry.key}`} />
                ))}
              </div>
            )
          })}
        </React.Fragment>
        {footer ? <div className="ferry-shaders-footer">{footer}</div> : null}
      </div>
    </div>
  )
}

/**
 * A ready-made control panel for any shader, built from its parameter schema: one section per
 * group, and one row per parameter (a slider and a number field, a color swatch and a text field,
 * a switch, a select). Bind it to `useShaderControls`, and give the same `shader` and `values` to
 * `ShaderCanvas`.
 *
 * It has a "Reset" button, a reset button on each changed row, an optional shader picker
 * (`shaders` + `onShaderChange`), and a header that folds it to a small tab. `placement` leaves it
 * in the flow of the page or fixes it to a corner of the window.
 *
 * The panel has no style of its own: import `ferry-shaders/styles.css` once, and theme it with the
 * `--ferry-shaders-*` CSS variables. `data-state` on the root is `open` or `closed`.
 */
export const ShaderPanel = React.forwardRef(ShaderPanelRoot) as (<S extends ParamSchema = ParamSchema>(
  props: ShaderPanelProps<S> & React.RefAttributes<HTMLDivElement>,
) => React.ReactElement | null) & { displayName?: string }

ShaderPanel.displayName = 'ShaderPanel'
