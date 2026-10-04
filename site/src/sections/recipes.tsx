import { DemoFrame, DemoNote, Example } from '../components/example'
import { Code, DocSection, P, SubHeading } from '../components/prose'
import { PixelFieldPage } from '../examples/recipe-pixel-field'
import pixelFieldSource from '../examples/recipe-pixel-field.tsx?raw'
import { PortfolioBackground } from '../examples/recipe-portfolio'
import portfolioSource from '../examples/recipe-portfolio.tsx?raw'

/** Two complete uses: a sand background for a whole page, and the pixel field of this page. */
export function Recipes() {
  return (
    <DocSection id="recipes" title="Recipes" description="Two backgrounds that you can copy.">
      <SubHeading>The portfolio background</SubHeading>
      <P>A dither shader with the sand palette, fixed behind the whole page.</P>
      <Example source={portfolioSource} what="recipe">
        <DemoFrame className="h-64">
          <PortfolioBackground />
          <div className="relative p-6">
            <DemoNote>The content of the page scrolls above the clouds.</DemoNote>
          </div>
        </DemoFrame>
      </Example>
      <P>
        The element has the color of the page as its own background. That color shows before the first frame, and it stays when
        the browser has no WebGPU.
      </P>

      <SubHeading>The ferry-ui pixel field</SubHeading>
      <P>
        <Code>PixelField</Code> at the top and at the bottom of a page, with ferry-ui tokens for its two colors. This page uses it.
      </P>
      <Example source={pixelFieldSource} what="recipe">
        <DemoFrame>
          <PixelFieldPage>
            <div className="flex h-96 items-center justify-center p-6">
              <DemoNote>The field is dense at each edge and thins out toward the content.</DemoNote>
            </div>
          </PixelFieldPage>
        </DemoFrame>
      </Example>
    </DocSection>
  )
}
