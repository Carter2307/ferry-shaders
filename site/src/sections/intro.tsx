import { shaders } from 'shader-ui'

import { CodeSample } from '../components/code-sample'

/**
 * The introduction: what the library is, in one title and two sentences, and how to install it.
 * The pixel field of the page is behind it.
 */
export function Intro() {
  return (
    <section id="top" className="flex max-w-2xl scroll-mt-20 flex-col gap-5 pt-8 pb-14 md:pt-14 md:pb-20">
      <h1 className="text-[28px] leading-[1.15] font-medium tracking-[-0.02em] text-balance text-foreground md:text-[38px]">
        WebGPU background shaders for React, each one configurable from a panel
      </h1>
      <p className="max-w-xl text-base text-foreground-light">
        {shaders.length} animated backgrounds, drawn by the GPU. Each one declares its parameters, so you can change them live.
      </p>
      <div className="flex max-w-md flex-col gap-2 pt-1">
        <CodeSample prompt language="shell" code="npm install ../shader-ui" copyPlacement="side" what="install command" className="bg-surface-100" />
        <p className="text-[13px] text-foreground-lighter">
          The package is not on npm yet.{' '}
          <a
            href="#install"
            className="rounded-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            Install it from its folder
          </a>
          .
        </p>
      </div>
    </section>
  )
}
