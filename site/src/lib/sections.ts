/** A link to a section of the page. */
export interface SectionLink {
  /** The `id` of the section. */
  id: string
  label: string
}

/** The sections of the guide, in page order. */
export const GUIDE: readonly SectionLink[] = [
  { id: 'install', label: 'Install' },
  { id: 'quick-start', label: 'Quick start' },
  { id: 'run-time', label: 'Choose at run time' },
  { id: 'panel', label: 'Configure from a panel' },
  { id: 'colors', label: 'Colors and themes' },
  { id: 'page-background', label: 'Page background' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'accessibility', label: 'Accessibility and fallback' },
  { id: 'without-react', label: 'Without React' },
  { id: 'custom-shader', label: 'Write your own shader' },
]

/** The sections of the reference, in page order. */
export const REFERENCE: readonly SectionLink[] = [
  { id: 'shaders', label: 'Shaders' },
  { id: 'api', label: 'API' },
]

/** The links of the top bar: the main parts of the page. */
export const TOP_LINKS: readonly SectionLink[] = [
  { id: 'playground', label: 'Playground' },
  { id: 'install', label: 'Guide' },
  { id: 'shaders', label: 'Shaders' },
  { id: 'api', label: 'API' },
]
