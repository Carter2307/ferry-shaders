import { DemoFrame, Example } from '../components/example'
import { Code, DocSection, P } from '../components/prose'
import { Page } from '../examples/page-background'
import source from '../examples/page-background.tsx?raw'

/** A shader fixed behind a whole page, and the calm column of `focusRef`. */
export function PageBackground() {
  return (
    <DocSection id="page-background" title="Page background" description="Fix the shader to the window, behind the content.">
      <P>
        The classes <Code>fixed inset-0 -z-10</Code> put the shader behind the whole page. The shader follows the pointer on the
        window, so it still reacts when the content is above it. It never takes a click or a text selection from the page.
      </P>
      <P>
        <Code>focusRef</Code> names the element that holds the text. A shader can keep that column calm. Rain does: its bricks
        are faint behind the column. The element is read once, when the canvas mounts.
      </P>
      <Example source={source} what="example">
        <DemoFrame className="h-80">
          <Page>
            <p className="text-sm font-medium text-foreground">The rain is faint behind this column.</p>
            <p className="mt-2 text-sm text-foreground-light">
              The text stays easy to read. Move the pointer over the box: the pointer is an umbrella, and the bricks break on it.
            </p>
          </Page>
        </DemoFrame>
      </Example>
    </DocSection>
  )
}
