import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import pkg from './package.json' with { type: 'json' }

// React stays external: the consumer's bundle has one copy of it. The library has no other dependency.
const externals = Object.keys(pkg.peerDependencies)
const isExternal = (id: string) => externals.some((dep) => id === dep || id.startsWith(`${dep}/`))

/**
 * React Server Components: every module of `src/react` is a client module and starts with
 * `'use client'` (components, hooks, and the modules that create components when they load). The
 * engine (`core/`), the shader definitions and the barrels are not, so a server component can
 * read a definition (its name, its param schema) directly.
 */
const isClientModule = (fileName: string) => fileName.startsWith('react/')

export default defineConfig({
  plugins: [react()],
  build: {
    // Three entries: the whole library, the engine alone (`ferry-shaders/core`) and the shader
    // definitions alone (`ferry-shaders/shaders`). The last two import no React.
    lib: {
      entry: { index: 'src/index.ts', 'core/index': 'src/core/index.ts', 'shaders/index': 'src/shaders/index.ts' },
      formats: ['es'],
    },
    sourcemap: true,
    // Readable output: consumers minify their own bundles.
    minify: false,
    emptyOutDir: false,
    rollupOptions: {
      external: isExternal,
      output: {
        // One file per module: bundlers drop the shaders an app does not import.
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        banner: (chunk) => (isClientModule(chunk.fileName) ? "'use client';" : ''),
      },
    },
  },
})
