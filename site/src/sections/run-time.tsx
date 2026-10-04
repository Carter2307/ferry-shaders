import { Example } from '../components/example'
import { Code, DocSection, P } from '../components/prose'
import source from '../examples/run-time.tsx?raw'

/** `ShaderCanvas` with a shader that is chosen when the app runs. */
export function RunTime() {
  return (
    <DocSection
      id="run-time"
      title="Choose the shader at run time"
      description="ShaderCanvas takes the shader as a prop, so the choice can come from data."
    >
      <P>
        <Code>shaders</Code> is the list of the shaders of the library. <Code>getShader(id)</Code> finds one by its id. When the{' '}
        <Code>shader</Code> prop changes, the canvas switches live: the previous shader stays until the new one is ready.
      </P>
      <Example source={source} what="example" />
      <P>The playground of this page works this way.</P>
    </DocSection>
  )
}
