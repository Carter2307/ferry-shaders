import { DemoFrame, DemoNote, Example } from '../components/example'
import { Code, DocSection, P } from '../components/prose'
import { Hero } from '../examples/quick-start'
import source from '../examples/quick-start.tsx?raw'

/** The shortest use: the component of a shader, placed and sized with `className`. */
export function QuickStart() {
  return (
    <DocSection id="quick-start" title="Quick start" description="Each shader has a component. Its parameters are props.">
      <P>
        Place and size the component with <Code>className</Code>. It is a <Code>div</Code>, and the canvas fills it. The content
        comes after the shader and has <Code>position: relative</Code>, so it is above the shader.
      </P>
      <Example source={source} what="quick start">
        <DemoFrame>
          <Hero>
            <DemoNote>The content is above the shader. Move the pointer over the box.</DemoNote>
          </Hero>
        </DemoFrame>
      </Example>
      <P>The props are typed from the schema of the shader. A parameter that you leave out takes its default.</P>
    </DocSection>
  )
}
