import { useState } from 'react'
import { PageSection } from 'ferry-ui'
import { drift, useShaderControls, type ShaderDefinition } from 'shader-ui'

import { CodeSample } from '../components/code-sample'
import { ControlsPanel } from '../components/controls-panel'
import { ShaderPicker } from '../components/shader-picker'
import { ShaderStage } from '../components/shader-stage'
import { formatUsage } from '../lib/format-jsx'

/** How the code sample places the shader: behind the content of a `relative` parent. */
const SAMPLE_CLASS_NAME = 'absolute inset-0'

/**
 * The playground: choose a shader, change its parameters in the panel, copy the code. The values
 * of each shader are kept by `useShaderControls`, so they come back when the shader does.
 */
export function Playground() {
  const [shader, setShader] = useState<ShaderDefinition>(drift)
  const controls = useShaderControls(shader)

  return (
    <PageSection
      id="playground"
      title="Playground"
      description="Choose a shader. Change its parameters. Copy the code."
      className="mb-16 scroll-mt-20 md:mb-20"
    >
      <ShaderPicker shader={shader} onShaderChange={setShader} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-4">
          <ShaderStage controls={controls} />
          <CodeSample code={formatUsage(shader.id, controls.toProps(), SAMPLE_CLASS_NAME)} language="tsx" what="code" />
        </div>
        <ControlsPanel controls={controls} />
      </div>
    </PageSection>
  )
}
