import { DemoFrame, Example } from '../components/example'
import { Bullets, Code, DocSection, P, SubHeading } from '../components/prose'
import { Banner } from '../examples/fallback'
import source from '../examples/fallback.tsx?raw'

/** What the library does for a reader who cannot see the shader, and for a browser that cannot draw it. */
export function Accessibility() {
  return (
    <DocSection
      id="accessibility"
      title="Accessibility and fallback"
      description="A shader is decoration. The page must work without it."
    >
      <Bullets>
        <li>
          The element of a shader has <Code>aria-hidden="true"</Code>: assistive technology does not read it. Do not put content
          in it.
        </li>
        <li>When the reader asks for reduced motion, the shader draws one still frame and does not follow the pointer.</li>
        <li>
          The canvas stops when it is out of view. Set <Code>paused</Code> to stop it yourself.
        </li>
        <li>
          Without WebGPU, the canvas stays invisible and <Code>fallback</Code> is rendered in the element. Keep the fallback
          decorative too.
        </li>
        <li>
          <Code>onStatusChange</Code> gives the status of the shader: <Code>ready</Code>, <Code>unsupported</Code> or{' '}
          <Code>error</Code>. The status is <Code>pending</Code> before the first frame.
        </li>
        <li>
          <Code>isWebGpuSupported()</Code> is a first guess before a shader mounts. It is false on a server. In a server-rendered
          app, do not choose what to render from a direct call: the server and the browser then disagree. Read it as{' '}
          <Code>Decoration</Code> does below.
        </li>
      </Bullets>
      <Example source={source} what="example">
        <DemoFrame className="p-4 text-sm text-foreground-light [&_p]:mt-3">
          <Banner />
        </DemoFrame>
      </Example>
      <P>
        To see this page without WebGPU, add <Code>?webgpu=off</Code> to its address.
      </P>

      <SubHeading>Browsers that have WebGPU</SubHeading>
      <P>
        The current versions of Chrome, Edge, Safari and Firefox ship WebGPU. It also depends on the operating system and on the
        graphics hardware: the same browser can draw the shader on one device and not on another.
      </P>
      <P>
        The library does not look at the name or the version of the browser. It tests that <Code>navigator.gpu</Code> exists, then
        asks for a GPU device. A browser with no WebGPU, or one that gives no device, gets the fallback.
      </P>
    </DocSection>
  )
}
