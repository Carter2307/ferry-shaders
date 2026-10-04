import type { ReactNode } from 'react'
import { PageSection, cn } from 'ferry-ui'

/** Props of {@link DocSection}. */
export interface DocSectionProps {
  /** Anchor of the section: the top bar and the side menu link to it. */
  id: string
  title: string
  /** One sentence under the title. */
  description?: ReactNode
  children: ReactNode
}

/** One section of the documentation: a ferry-ui `PageSection` with an anchor that clears the sticky top bar. */
export function DocSection({ id, title, description, children }: DocSectionProps) {
  return (
    <PageSection id={id} title={title} description={description} className="mb-14 scroll-mt-20">
      {children}
    </PageSection>
  )
}

/** A heading inside a section, with an optional anchor. */
export function SubHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="mt-3 scroll-mt-20 text-base font-medium text-foreground">
      {children}
    </h3>
  )
}

/** A paragraph of the documentation. The line stays short enough to read. */
export function P({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn('max-w-[72ch] text-sm leading-relaxed text-foreground-light', className)}>{children}</p>
}

/** A short list of facts. */
export function Bullets({ children }: { children: ReactNode }) {
  return (
    <ul
      className={cn(
        'flex max-w-[72ch] list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-foreground-light',
        'marker:text-foreground-muted',
      )}
    >
      {children}
    </ul>
  )
}

/** A name of the code inside a sentence: a prop, a function, a value. */
export function Code({ children }: { children: ReactNode }) {
  return <code className="rounded-sm border bg-surface-200 px-1 py-px text-[12.5px] text-foreground">{children}</code>
}
