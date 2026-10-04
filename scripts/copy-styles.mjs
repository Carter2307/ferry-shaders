// Copies the default panel stylesheet to dist/styles.css (the `ferry-shaders/styles.css` export).
import { cpSync, mkdirSync } from 'node:fs'

mkdirSync('dist', { recursive: true })
cpSync('src/styles/panel.css', 'dist/styles.css')
