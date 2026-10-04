import { highlight } from 'sugar-high'
import { parse, render } from 'sugar-high/core'

/** The languages of the code samples of the page. */
export type CodeLanguage = 'tsx' | 'css' | 'shell' | 'wgsl'

// WGSL is not a language of sugar-high: its parser gets the keywords and the types of WGSL.
const WGSL_KEYWORDS = new Set(
  'alias break case const const_assert continue continuing default diagnostic discard else enable false fn for if let loop override requires return struct switch true var while'.split(
    ' ',
  ),
)
const WGSL_TYPES = new Set(
  'bool f16 f32 i32 u32 vec2f vec3f vec4f vec2i vec3i vec4i vec2u vec3u vec4u vec2 vec3 vec4 mat2x2f mat3x3f mat4x4f array atomic ptr sampler texture_2d'.split(
    ' ',
  ),
)

/**
 * A code sample as HTML: one `<span>` per token, colored by the `--sh-*` variables of styles.css.
 * The text is escaped by the highlighter, so the result is safe to set as inner HTML.
 */
export function highlightCode(code: string, language: CodeLanguage): string {
  switch (language) {
    case 'tsx':
      return highlight(code, { lang: 'typescript' })
    case 'css':
      return highlight(code, { lang: 'css' })
    case 'shell':
      return highlight(code, { lang: 'shell' })
    case 'wgsl':
      return render(parse(code, { keywords: WGSL_KEYWORDS, typeKeywords: WGSL_TYPES }))
  }
}
