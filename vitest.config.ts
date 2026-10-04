import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Unit tests live next to the code (src/**), the WebGPU tests (Dawn) in test/**.
// The default environment is Node; a test of a React component asks for the DOM itself, with
// `// @vitest-environment jsdom` on its first line.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^shader-ui\/core$/, replacement: fileURLToPath(new URL('./src/core/index.ts', import.meta.url)) },
      { find: /^shader-ui\/shaders$/, replacement: fileURLToPath(new URL('./src/shaders/index.ts', import.meta.url)) },
      { find: /^shader-ui$/, replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)) },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.ts'],
    css: false,
  },
})
