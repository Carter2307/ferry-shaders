import type { ComponentPropsWithoutRef } from 'react'
import { cn } from 'ferry-ui'
import {
  shaders,
  type MountOptions,
  type MountPatch,
  type ShaderCanvasProps,
  type ShaderController,
  type ShaderControls,
  type ShaderControlsOptions,
  type ShaderPanelProps,
} from 'shader-ui'

import { CodeCell, DocRow, DocTable, TextCell } from '../components/doc-table'
import { Code, DocSection, P, SubHeading } from '../components/prose'
import { componentName } from '../lib/format-jsx'

/** One row of an API table. */
interface ApiRow {
  /** The TypeScript type, as it is written in the library. */
  type: string
  /** The value used when the entry is left out. `required` when it cannot be left out. */
  default?: string
  description: string
}

type DivProps = ComponentPropsWithoutRef<'div'>

// The keys of each table are checked against the types of the library: a prop that is added,
// removed or renamed there stops the type checker here.

const SHADER_CANVAS = {
  shader: {
    type: 'ShaderDefinition<S>',
    default: 'required',
    description: 'The shader to draw. Changing it switches live: the previous shader stays until the new one is ready.',
  },
  params: {
    type: 'Partial<ParamValues<S>>',
    description: 'Values of the parameters. A parameter left out takes its default.',
  },
  paused: {
    type: 'boolean',
    default: 'false',
    description: 'Stops the animation (the last frame stays). Parameter changes are still drawn.',
  },
  fps: { type: 'number', default: '30', description: 'Frames per second, at most.' },
  focusRef: {
    type: 'RefObject<Element | null>',
    description:
      'An element whose horizontal span the shader can keep calm for reading, for example the text column in front of a full-page background. Read once, when the canvas mounts.',
  },
  fallback: {
    type: 'ReactNode',
    description: 'Shown in place of the canvas when the browser has no WebGPU or the shader did not compile.',
  },
  onStatusChange: {
    type: '(status: ShaderStatus) => void',
    description: "Called when the status changes: 'pending', 'ready', 'unsupported' or 'error'.",
  },
} satisfies Record<Exclude<keyof ShaderCanvasProps, keyof DivProps>, ApiRow>

const CONTROLS_OPTIONS = {
  initial: {
    type: 'Partial<ParamValues<S>>',
    description:
      'Starting values, used for a shader until one of its values is changed or reset. Read once, on the first render. Keys the shader does not have are ignored, so one object can serve several shaders.',
  },
  storageKey: {
    type: 'string',
    description:
      'Key of localStorage where the changed values are kept, for every shader, so they come back on the next visit. A browser that blocks storage keeps them in memory only.',
  },
} satisfies Record<keyof ShaderControlsOptions, ApiRow>

const CONTROLS = {
  shader: { type: 'ShaderDefinition<S>', description: 'The shader the controls are for: pass it to ShaderCanvas with values.' },
  schema: { type: 'S', description: 'The parameter schema of the shader.' },
  groups: { type: 'ParamGroup[]', description: 'The parameters as panel sections, in display order.' },
  values: {
    type: 'ParamValues<S>',
    description: 'The current value of every parameter: pass it to ShaderCanvas as params.',
  },
  set: { type: '(key: K, value: ParamValue<S[K]>) => void', description: 'Changes one value.' },
  setMany: { type: '(partial: Partial<ParamValues<S>>) => void', description: 'Changes several values at once.' },
  reset: {
    type: '(key?: keyof S) => void',
    description: 'Puts one parameter back to its default, or all of them when no key is given.',
  },
  isDefault: { type: 'boolean', description: 'True when every value is the default of the schema.' },
  toProps: {
    type: '() => Partial<ParamValues<S>>',
    description: 'Only the values that differ from the defaults: the props to write in a code sample.',
  },
} satisfies Record<keyof ShaderControls, ApiRow>

const SHADER_PANEL = {
  controls: {
    type: 'ShaderControls<S>',
    default: 'required',
    description: 'The state the panel shows and changes: what useShaderControls returns.',
  },
  title: { type: 'ReactNode', default: 'the name of the shader', description: 'Heading of the panel.' },
  shaders: {
    type: 'readonly ShaderDefinition[]',
    description: 'The shaders to choose from. With onShaderChange, the panel shows a shader picker.',
  },
  onShaderChange: {
    type: '(shader: ShaderDefinition) => void',
    description: 'Called with the shader chosen in the picker: give it to useShaderControls.',
  },
  collapsible: { type: 'boolean', default: 'true', description: 'Lets the header fold the panel to a small tab.' },
  defaultOpen: { type: 'boolean', default: 'true', description: 'Whether the panel starts open, when open is not given.' },
  open: {
    type: 'boolean',
    description: 'Whether the panel is open. Give it with onOpenChange to control the panel yourself.',
  },
  onOpenChange: {
    type: '(open: boolean) => void',
    description: 'Called when the header asks to open or to fold the panel.',
  },
  placement: {
    type: "'inline' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'",
    default: "'inline'",
    description: 'inline leaves the panel in the flow of the page. A corner fixes it to the window.',
  },
  footer: { type: 'ReactNode', description: 'Extra content under the controls.' },
} satisfies Record<Exclude<keyof ShaderPanelProps, Exclude<keyof DivProps, 'title'>>, ApiRow>

const MOUNT_OPTIONS = {
  shader: { type: 'ShaderDefinition<S>', default: 'required', description: 'The shader to draw.' },
  params: {
    type: 'Partial<ParamValues<S>>',
    description: 'Values of its parameters. A parameter left out, or with a value that is not valid, takes its default.',
  },
  paused: {
    type: 'boolean',
    default: 'false',
    description: 'Stops the animation (the last frame stays). Parameter changes are still drawn.',
  },
  fps: { type: 'number', default: '30', description: 'Frames per second, at most.' },
  focusElement: {
    type: 'Element | null',
    description: 'An element whose horizontal span the shader can keep calm for reading. Read once, at mount.',
  },
  onStatusChange: {
    type: '(status: ShaderStatus) => void',
    description:
      'Called when the status changes. The status starts at pending, which is not reported. unsupported is reported during the call to mountShader itself when the browser has no WebGPU.',
  },
} satisfies Record<keyof MountOptions, ApiRow>

const CONTROLLER = {
  update: {
    type: '(patch: MountPatch) => void',
    description: 'Applies new options. Parameter changes show on the next frame, with no recompilation.',
  },
  redraw: {
    type: '() => void',
    description:
      'Resolves the colors again and draws one frame now. Call it after a change the engine cannot see, for example a CSS variable set on an element other than html or body.',
  },
  dispose: {
    type: '() => void',
    description: 'Stops everything and frees the GPU buffer. Safe to call at any time, also before the first frame.',
  },
} satisfies Record<keyof ShaderController, ApiRow>

const MOUNT_PATCH = {
  shader: {
    type: 'ShaderDefinition',
    description: 'Switches to another shader. The current one keeps drawing until the new one is compiled.',
  },
  params: {
    type: 'Readonly<Record<string, unknown>>',
    description: 'Replaces the parameter values: a key left out goes back to its default.',
  },
  paused: { type: 'boolean', description: 'Stops or starts the animation.' },
  fps: { type: 'number', description: 'Frames per second, at most.' },
} satisfies Record<keyof MountPatch, ApiRow>

/** The props a shader component adds to, or takes from, `ShaderCanvas`. The generic type has no fixed keys. */
const SHADER_COMPONENT: Readonly<Record<string, ApiRow>> = {
  'each parameter': {
    type: 'its value type',
    default: 'the default of the schema',
    description:
      'The parameters of the shader are props, typed from the schema. A parameter wins over an HTML attribute of the same name, such as color.',
  },
  'paused, fps, focusRef, fallback, onStatusChange': {
    type: 'as for ShaderCanvas',
    description: 'The props of ShaderCanvas, without shader and params.',
  },
  'className, style, id…': { type: 'the props of a div', description: 'Every other prop goes to the root element.' },
}

/** A type longer than this many characters wraps in its cell. A shorter one stays on one line. */
const LONG_TYPE = 44

interface ApiTableProps {
  /** Accessible name of the table. */
  label: string
  /** Title of the first column: "Prop", "Option", "Key" or "Method". */
  name: string
  rows: Readonly<Record<string, ApiRow>>
}

/** A table of props, options or methods. The "Default" column shows only when a row has a default. */
function ApiTable({ label, name, rows }: ApiTableProps) {
  const entries = Object.entries(rows)
  const withDefault = entries.some(([, row]) => row.default !== undefined)
  return (
    <DocTable label={label} columns={withDefault ? [name, 'Type', 'Default', 'Description'] : [name, 'Type', 'Description']}>
      {entries.map(([key, row]) => (
        <DocRow key={key}>
          <CodeCell>{key}</CodeCell>
          <CodeCell className={cn('text-foreground-light', row.type.length > LONG_TYPE && 'max-w-72 whitespace-normal')}>{row.type}</CodeCell>
          {withDefault ? <CodeCell className="text-foreground-light">{row.default ?? '-'}</CodeCell> : null}
          <TextCell>{row.description}</TextCell>
        </DocRow>
      ))}
    </DocTable>
  )
}

/** The reference of the API: the props, options and methods of the public functions and components. */
export function ApiReference() {
  return (
    <DocSection id="api" title="API" description="The props, the options and the methods, as the library declares them.">
      <P>
        In the types, <Code>S</Code> is the parameter schema of the shader. The components come from <Code>shader-ui</Code>, and{' '}
        <Code>mountShader</Code> also comes from <Code>shader-ui/core</Code>.
      </P>

      <SubHeading id="api-shader-canvas">ShaderCanvas</SubHeading>
      <P>
        Draws a shader in a <Code>div</Code>. Every other prop of a <Code>div</Code> goes to the root element, and the ref too. The
        root has two attributes: <Code>data-status</Code> and <Code>data-shader</Code>. The canvas fades in when its first frame
        is drawn: the CSS variable <Code>--shader-fade</Code> sets the duration.
      </P>
      <ApiTable label="Props of ShaderCanvas" name="Prop" rows={SHADER_CANVAS} />

      <SubHeading id="api-shader-components">Shader components</SubHeading>
      <P>
        One component per shader: {shaders.map((shader) => componentName(shader.id)).join(', ')}.{' '}
        <Code>createShaderComponent(shader)</Code> makes the component of your own shader.
      </P>
      <ApiTable label="Props of a shader component" name="Prop" rows={SHADER_COMPONENT} />

      <SubHeading id="api-use-shader-controls">useShaderControls</SubHeading>
      <P>
        <Code>useShaderControls(shader, options)</Code> holds the values of a shader for a panel. It keeps the values of each
        shader: when the shader changes and later comes back, its values come back too.
      </P>
      <ApiTable label="Options of useShaderControls" name="Option" rows={CONTROLS_OPTIONS} />
      <P>It returns the controls.</P>
      <ApiTable label="Controls returned by useShaderControls" name="Key" rows={CONTROLS} />

      <SubHeading id="api-shader-panel">ShaderPanel</SubHeading>
      <P>
        A ready-made panel for any shader. Every other prop of a <Code>div</Code> goes to the root element. The root has the
        attribute <Code>data-state</Code>: <Code>open</Code> or <Code>closed</Code>.
      </P>
      <ApiTable label="Props of ShaderPanel" name="Prop" rows={SHADER_PANEL} />

      <SubHeading id="api-mount-shader">mountShader</SubHeading>
      <P>
        <Code>mountShader(canvas, options)</Code> draws a shader on a canvas and returns a controller. Call it in the browser only.
      </P>
      <ApiTable label="Options of mountShader" name="Option" rows={MOUNT_OPTIONS} />
      <P>The controller has three methods.</P>
      <ApiTable label="Methods of the controller" name="Method" rows={CONTROLLER} />
      <P>
        <Code>update</Code> takes a patch. A field left out keeps its value.
      </P>
      <ApiTable label="Fields of the patch of update" name="Field" rows={MOUNT_PATCH} />
    </DocSection>
  )
}
