
import { CodeSample } from '../components/code-sample'
import { Example } from '../components/example'
import { Code, DocSection, P } from '../components/prose'
import imports from '../examples/imports.ts?raw'

/** How to get the library into an app, and what to import. */
export function Install() {
  return (
    <DocSection id="install" title="Install" description="ferry-shaders is on npm. Install it in your app.">
      <CodeSample prompt language="shell" code="npm install ferry-shaders" what="install command" />
      <P>
        Your app needs React 18 or React 19. The library has no other dependency. Import what you need from <Code>ferry-shaders</Code>.
      </P>
      <Example source={imports} what="imports" />
      <P>
        The examples on this page place the shaders with Tailwind CSS classes. Plain CSS works the same: a shader component is a{' '}
        <Code>div</Code>.
      </P>
    </DocSection>
  )
}
