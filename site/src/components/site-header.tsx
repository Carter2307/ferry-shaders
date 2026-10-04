import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, ThemeMenu, TopBar, cn } from 'ferry-ui'
import { Menu } from 'lucide-react'

import { version } from '../../../package.json'
import { TOP_LINKS } from '../lib/sections'

/**
 * The top bar of the page: the name, links to the main sections, the version and the theme menu.
 * It stays at the top of the window, and the page shows through it, blurred. On a narrow screen
 * the links are in a menu.
 */
export function SiteHeader() {
  return (
    <div className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <TopBar
        navLabel="Sections"
        className="mx-auto w-full max-w-[1248px] border-b-0 bg-transparent px-4 sm:px-6 md:px-6 lg:px-10"
        logo={
          <a
            href="#top"
            className={cn(
              '-ml-1.5 rounded-md px-1.5 py-1 text-sm font-medium text-foreground',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            shader-ui
          </a>
        }
        actions={
          <>
            <Badge variant="outline" shape="square" case="normal" className="tabular">
              v{version}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" icon={<Menu />} aria-label="Sections" className="md:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {TOP_LINKS.map((link) => (
                  <DropdownMenuItem key={link.id} asChild>
                    <a href={`#${link.id}`}>{link.label}</a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* A square button, and no uppercase heading in the menu: the page has neither pills nor uppercase labels. */}
            <ThemeMenu className="rounded-md" contentClassName="[&>[data-slot=dropdown-menu-label]]:hidden" />
          </>
        }
      >
        <div className="ml-3 hidden items-center gap-0.5 md:flex">
          {TOP_LINKS.map((link) => (
            <Button key={link.id} variant="ghost" asChild>
              <a href={`#${link.id}`}>{link.label}</a>
            </Button>
          ))}
        </div>
      </TopBar>
    </div>
  )
}
