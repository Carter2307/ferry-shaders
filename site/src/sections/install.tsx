
import { CodeSample } from '../components/code-sample'
import { Example } from '../components/example'
import { Code, DocSection, P } from '../components/prose'
import imports from '../examples/imports.ts?raw'

/** How to get the library into an app while it is not on npm, and what to import. */
export function Install() {
  return (
    <DocSection id="install" title="Install" description="shader-ui is not on npm yet. Build it, then install it from its folder.">
      <P>First, build the library. Run these commands in the shader-ui folder.</P>
      <CodeSample prompt language="shell" code={'npm install\nnpm run build'} what="build commands" />
      <P>Then, install the folder in your app. The path goes from your app to the shader-ui folder.</P>
      <CodeSample prompt language="shell" code="npm install ../shader-ui" what="install command" />
      <P>
        Your app needs React 18 or React 19. The library has no other dependency. Import what you need from <Code>shader-ui</Code>.
      </P>
      <Example source={imports} what="imports" />
      <P>
        The examples on this page place the shaders with Tailwind CSS classes. Plain CSS works the same: a shader component is a{' '}
        <Code>div</Code>.
      </P>
    </DocSection>
  )
}
