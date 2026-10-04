import { Example } from '../components/example'
import { Bullets, Code, DocSection, P } from '../components/prose'
import source from '../examples/mount-shader.ts?raw'

/** The engine alone: `mountShader` on a canvas, with no framework. */
export function WithoutReact() {
  return (
    <DocSection id="without-react" title="Without React" description="The engine draws on any canvas. It needs no framework.">
      <P>
        <Code>ferry-shaders/core</Code> is the engine alone: it does not import React. <Code>mountShader(canvas, options)</Code> draws
        a shader on a canvas and returns a controller.
      </P>
      <Example source={source} what="example" />
      <Bullets>
        <li>
          <Code>update(patch)</Code> changes the shader, the values, <Code>paused</Code> or <Code>fps</Code>.
        </li>
        <li>
          <Code>redraw()</Code> reads the colors again and draws one frame. Call it after a change that the engine cannot see.
        </li>
        <li>
          <Code>dispose()</Code> stops everything. Always call it when the canvas goes away.
        </li>
        <li>Every canvas of the page shares one GPU device.</li>
      </Bullets>
      <P>
        The shaders of the library come from <Code>ferry-shaders/shaders</Code>. That entry does not import React either.
      </P>
    </DocSection>
  )
}
