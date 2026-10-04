import { Fragment, useMemo } from 'react'
import { CodeBlock, CodeBlockPrompt, type CodeBlockProps } from 'ferry-ui'

import { highlightCode, type CodeLanguage } from '../lib/highlight'

/** Props of {@link CodeSample}. */
export interface CodeSampleProps extends Omit<CodeBlockProps, 'children' | 'code' | 'copyValue' | 'prompt'> {
  /** The code, as plain text. It is also what the copy button copies. */
  code: string
  /** The language of the code. It chooses the syntax colors. */
  language: CodeLanguage
  /** Show a `$` before every line (shell commands). The prompt is never copied. */
  prompt?: boolean
}

/**
 * A code sample with syntax colors: the ferry-ui `CodeBlock` (its box and its copy button) around
 * highlighted code. `CodeBlock` itself has no syntax highlighting.
 */
export function CodeSample({ code, language, prompt = false, what, ...props }: CodeSampleProps) {
  const lines = useMemo(
    // A command list is highlighted line by line, so each line can take its prompt.
    () => (prompt ? code.split('\n').map((line) => highlightCode(line, language)) : [highlightCode(code, language)]),
    [code, language, prompt],
  )
  return (
    <CodeBlock copyValue={code} what={what ?? (prompt ? 'command' : 'code')} {...props}>
      {lines.map((html, index) => (
        <Fragment key={index}>
          {index > 0 && '\n'}
          {prompt && html !== '' && <CodeBlockPrompt />}
          <span dangerouslySetInnerHTML={{ __html: html }} />
        </Fragment>
      ))}
    </CodeBlock>
  )
}
