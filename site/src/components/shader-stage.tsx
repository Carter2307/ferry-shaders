import { useState } from 'react'
import { Callout, Card, StatusBadge, type StatusTone } from 'ferry-ui'
import { MousePointer2 } from 'lucide-react'
import { ShaderCanvas, type ShaderControls, type ShaderStatus } from 'ferry-shaders'

/** What the badge says for each status of the mounted shader. */
const STATUS: Record<ShaderStatus, { tone: StatusTone; label: string; pulse?: boolean }> = {
  pending: { tone: 'neutral', label: 'Loading', pulse: true },
  ready: { tone: 'success', label: 'Ready' },
  unsupported: { tone: 'warning', label: 'Not supported' },
  error: { tone: 'destructive', label: 'Error' },
}

/**
 * The stage of the playground: the selected shader, large, with the current values of the panel.
 * Under the picture: the name of the shader, its status, what it draws and what the pointer does.
 * Without WebGPU, a callout takes the place of the picture.
 */
export function ShaderStage({ controls }: { controls: ShaderControls }) {
  const [status, setStatus] = useState<ShaderStatus>('pending')
  const { shader } = controls
  const badge = STATUS[status]

  return (
    <Card>
      <div className="relative h-[300px] bg-background sm:h-[400px] lg:h-[480px]">
        <ShaderCanvas shader={shader} params={controls.values} className="absolute inset-0" onStatusChange={setStatus} />
        {status === 'unsupported' || status === 'error' ? (
          // Outside the canvas element: that element is hidden from assistive technology.
          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
            {status === 'unsupported' ? (
              <Callout tone="warning" title="This browser has no WebGPU" className="max-w-md">
                The shaders cannot draw here. The panel, the code and the documentation still work. Open this page in a
                browser that has WebGPU to see the shaders.
              </Callout>
            ) : (
              <Callout tone="destructive" title="The shader did not compile" className="max-w-md">
                The messages of the compiler are in the console of the browser.
              </Callout>
            )}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5 border-t px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="text-sm font-medium text-foreground">{shader.name}</h3>
          <span className="text-[13px] text-foreground-lighter">{shader.technique}</span>
          {/* Sentence case: the page has no uppercase labels. */}
          <StatusBadge tone={badge.tone} label={badge.label} pulse={badge.pulse} className="ml-auto tracking-normal normal-case" />
        </div>
        <p className="text-[13px] text-foreground-light">{shader.description}</p>
        <p className="flex items-start gap-1.5 text-[13px] text-foreground-light">
          <MousePointer2 aria-hidden="true" className="mt-[3px] size-3.5 shrink-0 text-foreground-lighter" />
          <span className="sr-only">Pointer:</span>
          {shader.pointerEffect}
        </p>
      </div>
    </Card>
  )
}
