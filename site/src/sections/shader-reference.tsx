import type { ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'ferry-ui'
import { shaders, type ShaderDefinition } from 'ferry-shaders'

import { ParamTable } from '../components/param-table'
import { Code, DocSection } from '../components/prose'
import { componentName } from '../lib/format-jsx'

/** `pixel-field` -> `pixelField`: the name the definition of a shader is exported under. */
const definitionName = (id: string) => id.replace(/-(.)/g, (_, letter: string) => letter.toUpperCase())

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="mt-2 text-foreground-lighter first:mt-0 sm:mt-0">{label}</dt>
      <dd className="text-foreground-light">{children}</dd>
    </>
  )
}

/** What one shader draws, what the pointer does, how to import it, and its parameters. */
function ShaderFacts({ shader }: { shader: ShaderDefinition }) {
  return (
    <dl className="grid max-w-[80ch] grid-cols-1 gap-x-6 text-sm leading-relaxed sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-y-2">
      <Fact label="Picture">{shader.description}</Fact>
      <Fact label="Pointer">{shader.pointerEffect}</Fact>
      <Fact label="Technique">{shader.technique}</Fact>
      <Fact label="Component">
        <Code>{`<${componentName(shader.id)} />`}</Code>
      </Fact>
      <Fact label="Definition">
        <Code>{definitionName(shader.id)}</Code>
      </Fact>
    </dl>
  )
}

/**
 * The reference of the shaders: one tab per shader. The texts and the table of parameters are read
 * from the definition of the shader when the page runs.
 */
export function ShaderReference() {
  const first = shaders[0]
  if (!first) return null
  return (
    <DocSection id="shaders" title="Shaders" description="What each shader draws, what the pointer does, and its parameters.">
      <Tabs defaultValue={first.id}>
        <TabsList aria-label="Shaders">
          {shaders.map((shader) => (
            <TabsTrigger key={shader.id} value={shader.id}>
              {shader.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {shaders.map((shader) => (
          <TabsContent key={shader.id} value={shader.id} className="flex flex-col gap-4">
            <ShaderFacts shader={shader} />
            <ParamTable shader={shader} />
          </TabsContent>
        ))}
      </Tabs>
    </DocSection>
  )
}
