import { DemoFrame, Example } from '../components/example'
import { Bullets, Code, DocSection, P } from '../components/prose'
import { TextColor, TokenColors, TransparentBackground } from '../examples/colors'
import source from '../examples/colors.tsx?raw'

/** What a color parameter takes, and how the colors follow the theme of the page. */
export function Colors() {
  return (
    <DocSection id="colors" title="Colors and themes" description="A color parameter takes any CSS color.">
      <P>
        Use a hex value, <Code>rgb()</Code>, <Code>oklch()</Code>, a named color, <Code>transparent</Code>,{' '}
        <Code>currentColor</Code>, or a token with <Code>var()</Code>.
      </P>
      <Example source={source} what="examples">
        <div className="grid gap-3 sm:grid-cols-3">
          <DemoFrame>
            <TokenColors />
          </DemoFrame>
          <DemoFrame>
            <TransparentBackground />
          </DemoFrame>
          <DemoFrame>
            <TextColor />
          </DemoFrame>
        </div>
      </Example>
      <Bullets>
        <li>
          A token and <Code>currentColor</Code> follow the theme. The shader reads its colors again when an attribute of{' '}
          <Code>html</Code> or <Code>body</Code> changes, and when a color transition above the canvas ends. Change the theme of
          this page to see it.
        </li>
        <li>
          The mid tone of a dither shader is <Code>'auto'</Code> by default: a mix of <Code>color</Code> and{' '}
          <Code>background</Code>. Give <Code>midColor</Code> a color to choose it yourself.
        </li>
        <li>
          A <Code>transparent</Code> background shows what is behind the shader.
        </li>
      </Bullets>
    </DocSection>
  )
}
