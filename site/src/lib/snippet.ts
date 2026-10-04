/** Everything above this line of an example file is left out of the page. */
const CUT = '// ---cut---'
/** Everything from this line of an example file is left out of the page. */
const CUT_AFTER = '// ---cut-after---'

/**
 * The part of an example file that the page shows. The file is imported as text (`?raw`) and is
 * also compiled by the type checker, so a snippet cannot drift from the API.
 *
 * A file can hide the lines that only make it compile: what is above `// ---cut---` and what is
 * from `// ---cut-after---` is not shown.
 */
export function snippet(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const end = lines.findIndex((line) => line.trim() === CUT_AFTER)
  const kept = end === -1 ? lines : lines.slice(0, end)
  const start = kept.findLastIndex((line) => line.trim() === CUT)
  return kept
    .slice(start + 1)
    .join('\n')
    .trim()
}
