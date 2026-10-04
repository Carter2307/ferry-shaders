import { PageContainer } from 'ferry-ui'
import { PixelField } from 'ferry-shaders'

import { SideNav } from './components/side-nav'
import { SiteFooter } from './components/site-footer'
import { SiteHeader } from './components/site-header'
import { useFragmentScroll } from './lib/use-fragment-scroll'
import { Accessibility } from './sections/accessibility'
import { ApiReference } from './sections/api-reference'
import { Colors } from './sections/colors'
import { CustomShader } from './sections/custom-shader'
import { Install } from './sections/install'
import { Intro } from './sections/intro'
import { PageBackground } from './sections/page-background'
import { Panel } from './sections/panel'
import { Playground } from './sections/playground'
import { QuickStart } from './sections/quick-start'
import { Recipes } from './sections/recipes'
import { RunTime } from './sections/run-time'
import { ShaderReference } from './sections/shader-reference'
import { WithoutReact } from './sections/without-react'

/**
 * The documentation page of ferry-shaders: one page that is the documentation and the live demo. The
 * pixel field behind the top of the page is the library, used on its own page.
 */
export function App() {
  // A link to a section (`/#api`) works on a full load of the page too.
  useFragmentScroll()

  return (
    <div className="relative isolate min-h-dvh">
      {/* Before the content, so the content is above it. It starts at the very top, under the top bar. */}
      <PixelField
        className="absolute inset-x-0 top-0 h-[340px] md:h-[520px]"
        origin="top"
        color="var(--foreground)"
        accent="var(--primary-bright)"
      />
      <SiteHeader />
      <main className="relative">
        <PageContainer>
          <Intro />
          <Playground />
          <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
            <SideNav />
            <div className="min-w-0">
              <Install />
              <QuickStart />
              <RunTime />
              <Panel />
              <Colors />
              <PageBackground />
              <Recipes />
              <Accessibility />
              <WithoutReact />
              <CustomShader />
              <ShaderReference />
              <ApiReference />
            </div>
          </div>
        </PageContainer>
      </main>
      <SiteFooter />
    </div>
  )
}
