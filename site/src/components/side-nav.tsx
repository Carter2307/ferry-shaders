import { cn } from 'ferry-ui'

import { GUIDE, REFERENCE, type SectionLink } from '../lib/sections'
import { useActiveSection } from '../lib/use-active-section'

/** Every section the menu links to, in page order. */
const IDS = [...GUIDE, ...REFERENCE].map((section) => section.id)

interface NavGroupProps {
  title: string
  links: readonly SectionLink[]
  /** The id of the section the reader is in. */
  active: string | undefined
}

function NavGroup({ title, links, active }: NavGroupProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-2 text-[13px] font-medium text-foreground">{title}</p>
      <ul className="flex flex-col">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={`#${link.id}`}
              aria-current={active === link.id ? 'location' : undefined}
              className={cn(
                'block rounded-md px-2 py-1 text-[13px] text-foreground-light outline-none transition-colors',
                'hover:bg-surface-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                'aria-[current]:bg-selection aria-[current]:text-foreground',
              )}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The menu beside the documentation, on a wide screen: one link per section, and a mark on the
 * section the reader is in. It stays in view while the page scrolls.
 */
export function SideNav() {
  const active = useActiveSection(IDS)
  return (
    <nav
      aria-label="Documentation"
      className="sticky top-20 -ml-2 hidden max-h-[calc(100dvh-6rem)] flex-col gap-5 self-start overflow-y-auto lg:flex"
    >
      <NavGroup title="Guide" links={GUIDE} active={active} />
      <NavGroup title="Reference" links={REFERENCE} active={active} />
    </nav>
  )
}
