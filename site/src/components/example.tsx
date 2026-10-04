import type { ReactNode } from 'react'
import { cn } from 'ferry-ui'
import { isWebGpuSupported } from 'shader-ui'

import type { CodeLanguage } from '../lib/highlight'
import { snippet } from '../lib/snippet'

import { CodeSample } from './code-sample'

/** Props of {@link Example}. */
export interface ExampleProps {
  /** The text of an example file, imported with `?raw`. */
  source: string
  /** The language of the file. Defaults to `tsx` (TypeScript, with or without JSX). */
  language?: CodeLanguage
  /** What the copy button copies, for its accessible name ("Copy the quick start"). */
  what?: string
  /** The example itself, live: usually a {@link DemoFrame}. */
  children?: ReactNode
}

/**
 * A snippet of the documentation: the code of a real file of `site/src/examples`, with a copy
 * button, then the same file running.
 */
export function Example({ source, language = 'tsx', what, children }: ExampleProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <CodeSample code={snippet(source)} language={language} what={what} />
      {children}
    </div>
  )
}

/**
 * A bordered box that holds a live example. An element with `position: fixed` inside it is placed
 * in the box and not in the window (`contain: paint`), so a full-page background can run in it.
 * Without WebGPU, a note says why the box is empty.
 */
export function DemoFrame({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg border bg-background contain-paint', className)}>
      {children}
      {/* The page has no server render, so the answer is the same on every render. */}
      {isWebGpuSupported() ? null : (
        <p className="absolute right-3 bottom-2 rounded-sm bg-background px-1.5 text-xs text-foreground-lighter">
          No WebGPU: the shader is not drawn.
        </p>
      )}
    </div>
  )
}

/** A note on a surface that reads in both themes, to put above a shader in a demo. */
export function DemoNote({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p className={cn('w-fit rounded-md border bg-surface-100 px-3 py-2 text-[13px] text-foreground-light', className)}>{children}</p>
  )
}
