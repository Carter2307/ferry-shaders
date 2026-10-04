import { useState } from 'react'
import { ShaderCanvas, ShaderPanel, ripples, shaders, useShaderControls, type ShaderDefinition } from 'ferry-shaders'
import 'ferry-shaders/styles.css'

export function PanelDemo() {
  const [shader, setShader] = useState<ShaderDefinition>(ripples)
  // The hook keeps the values of each shader: they come back when the shader does.
  const controls = useShaderControls(shader)
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <ShaderCanvas shader={controls.shader} params={controls.values} className="min-h-64 flex-1" />
      <ShaderPanel controls={controls} shaders={shaders} onShaderChange={setShader} />
    </div>
  )
}
