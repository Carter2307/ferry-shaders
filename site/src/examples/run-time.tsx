import { ShaderCanvas, drift, getShader, shaders } from 'ferry-shaders'

/** A menu of every shader of the library. */
export function ShaderSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {shaders.map((shader) => (
        <option key={shader.id} value={shader.id}>
          {shader.name}
        </option>
      ))}
    </select>
  )
}

/** Draws the shader with this id. The id can come from a setting, a URL or a menu. */
export function Background({ shaderId }: { shaderId: string }) {
  // getShader gives undefined for an id the library does not have.
  const shader = getShader(shaderId) ?? drift
  return <ShaderCanvas shader={shader} params={{ speed: 0.5 }} className="fixed inset-0 -z-10" />
}
