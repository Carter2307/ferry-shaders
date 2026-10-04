// Adds explicit `.js` extensions to the relative imports of the emitted declaration files
// (`from './button'` -> `from './button.js'`). tsc keeps the extensionless specifiers of the
// sources, which "moduleResolution": "bundler" accepts but "node16" / "nodenext" consumers
// cannot resolve inside a `"type": "module"` package.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const root = 'dist'
// A relative specifier: `./x`, `../x`, and the bare `.` or `..` that tsc writes for an inferred
// type it found through a barrel (`import("..").ParamDef`).
const specifier = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}(?:\/[^'"]*)?)\2/g

function* declarationFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* declarationFiles(path)
    else if (entry.name.endsWith('.d.ts')) yield path
  }
}

let rewritten = 0
for (const file of declarationFiles(root)) {
  const source = readFileSync(file, 'utf8')
  const output = source.replace(specifier, (match, prefix, quote, spec) => {
    if (/\.(js|mjs|cjs|json|css)$/.test(spec)) return match
    const target = resolve(dirname(file), spec)
    let next
    if (existsSync(`${target}.d.ts`)) next = `${spec}.js`
    else if (existsSync(join(target, 'index.d.ts'))) next = `${spec}/index.js`
    else throw new Error(`${file}: cannot resolve declaration for "${spec}"`)
    rewritten++
    return `${prefix}${quote}${next}${quote}`
  })
  if (output !== source) writeFileSync(file, output)
}
console.log(`add-dts-extensions: ${rewritten} relative specifiers rewritten`)
