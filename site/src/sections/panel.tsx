import { DemoFrame, Example } from '../components/example'
import { Code, DocSection, P, SubHeading } from '../components/prose'
import { PanelDemo } from '../examples/panel-demo'
import demoSource from '../examples/panel-demo.tsx?raw'
import '../examples/panel-theme.css'
import themeSource from '../examples/panel-theme.css?raw'

/** The hook that holds the values, the built-in panel (live), its theme, and the custom panel. */
export function Panel() {
  return (
    <DocSection
      id="panel"
      title="Configure from a panel"
      description="A hook holds the values of the shader. A panel changes them. The canvas draws them."
    >
      <P>
        <Code>useShaderControls(shader)</Code> returns the controls of a shader. Give <Code>controls.shader</Code> and{' '}
        <Code>controls.values</Code> to <Code>ShaderCanvas</Code>, and <Code>controls</Code> to <Code>ShaderPanel</Code>. The panel
        builds one row per parameter from the schema, so it works for every shader.
      </P>
      <Example source={demoSource} what="example">
        <DemoFrame className="p-4">
          <PanelDemo />
        </DemoFrame>
      </Example>

      <SubHeading>Theme the panel</SubHeading>
      <P>
        Import <Code>shader-ui/styles.css</Code> once. The panel reads CSS variables: set them on <Code>:root</Code>, on a wrapper
        or on the panel. The panel above uses the ferry-ui tokens, with this mapping.
      </P>
      <Example source={themeSource} language="css" what="stylesheet" />
      <P>
        The other variables are <Code>--sui-shadow</Code>, <Code>--sui-width</Code>, <Code>--sui-scheme</Code> (<Code>light</Code>{' '}
        or <Code>dark</Code>: it forces the color scheme of the panel), <Code>--sui-offset</Code>, <Code>--sui-z</Code> and{' '}
        <Code>--sui-danger</Code>.
      </P>

      <SubHeading>Build your own panel</SubHeading>
      <P>
        A custom panel is built from <Code>controls.groups</Code>. A group has a title and a list of parameters. A parameter has a{' '}
        <Code>key</Code> and a definition (<Code>def</Code>) that gives its type, its label and its range. Read the value in{' '}
        <Code>controls.values</Code>, and change it with <Code>controls.set(key, value)</Code>. The panel of the playground is a
        custom panel: it uses ferry-ui components.
      </P>
    </DocSection>
  )
}
