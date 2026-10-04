import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, Toaster, TooltipProvider } from 'ferry-ui'

import { App } from './app'
import { applyWebGpuSwitch } from './lib/webgpu-switch'
import './styles.css'

// Before the first shader mounts: `?webgpu=off` shows the page without WebGPU.
applyWebGpuSwitch()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system">
      <TooltipProvider>
        <App />
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
)
