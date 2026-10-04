import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { themeInitScript } from 'ferry-ui'
import { defineConfig, type Plugin } from 'vite'

const root = fileURLToPath(new URL('.', import.meta.url))
const source = (path: string) => fileURLToPath(new URL(`../src/${path}`, import.meta.url))

/**
 * Puts the theme script of ferry-ui in the `<head>`: it applies the stored theme before the first
 * paint, so a dark page does not flash white while the app loads.
 */
const themeInit = (): Plugin => ({
  name: 'site:theme-init',
  transformIndexHtml: () => [{ tag: 'script', children: themeInitScript(), injectTo: 'head' }],
})

// The documentation page of ferry-shaders, built with ferry-ui components.
// `ferry-shaders` resolves to the sources (../src), so the page always shows the current code.
export default defineConfig({
  root,
  // Served from a sub-path (GitHub Pages: /<repo>/)? Build with SITE_BASE=/<repo>/.
  base: process.env.SITE_BASE ?? '/',
  plugins: [react(), tailwindcss(), themeInit()],
  resolve: {
    // The most specific name first.
    alias: [
      { find: /^ferry-shaders\/styles\.css$/, replacement: source('styles/panel.css') },
      { find: /^ferry-shaders\/core$/, replacement: source('core/index.ts') },
      { find: /^ferry-shaders\/shaders$/, replacement: source('shaders/index.ts') },
      { find: /^ferry-shaders$/, replacement: source('index.ts') },
    ],
  },
  // 5173 to 5181 are taken by other projects of this machine.
  server: { port: 5182 },
  preview: { port: 4182 },
  build: { outDir: 'dist', emptyOutDir: true },
})
