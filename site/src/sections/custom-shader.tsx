import { useId, useState } from 'react'
import { shaderLayout } from 'ferry-shaders'

import { CodeSample } from '../components/code-sample'
import { CodeCell, DocRow, DocTable, TextCell } from '../components/doc-table'
import { DemoFrame, Example } from '../components/example'
import { Bullets, Code, DocSection, P, SubHeading } from '../components/prose'
import { Slider } from '../components/slider'
import { Stripes, stripes } from '../examples/custom-shader'
import source from '../examples/custom-shader.ts?raw'

/** The `Uniforms` struct the engine generates for Stripes: the part of the header before the binding. */
const STRIPES_UNIFORMS = shaderLayout(stripes).wgsl.split('\n\n')[0] ?? ''

/** The uniforms every shader has, before its own parameters: field, WGSL type, meaning. */
const BUILT_IN_UNIFORMS: readonly (readonly [string, string, string])[] = [
  ['u.resolution', 'vec2f', 'Size of the canvas, in canvas pixels: grid cells for a dither shader, device pixels otherwise.'],
  ['u.mouse', 'vec2f', 'Position of the pointer, in canvas pixels. The origin is the bottom left corner.'],
  ['u.time', 'f32', 'Seconds, already multiplied by the speed parameter.'],
  ['u.amount', 'f32', 'Influence of the pointer, from 0 to 1. It is eased, and already multiplied by the pointer parameter.'],
  ['u.pixelRatio', 'f32', 'Canvas pixels per CSS pixel.'],
  ['u.focus', 'vec2f', 'The calm column, as its left and right edges in canvas pixels. There is none when left is not below right.'],
  ['u.<color>', 'vec4f', 'A color parameter: sRGB values from 0 to 1, with a straight alpha.'],
  ['u.<other>', 'f32', 'Any other parameter: a number as it is, a boolean as 0 or 1, a select as the index of its option.'],
]

/** The stripes shader, live, with a slider bound to its own parameter. */
function StripesDemo() {
  const labelId = useId()
  const [count, setCount] = useState<number>(stripes.params.count.default)
  const { min, max, step } = stripes.params.count
  return (
    <DemoFrame>
      <Stripes className="h-48" count={count} />
      <div className="flex items-center gap-3 border-t px-4 py-2 text-[13px] text-foreground-light">
        <span id={labelId}>{stripes.params.count.label}</span>
        <Slider className="max-w-64" value={count} onValueChange={setCount} min={min} max={max} step={step} aria-labelledby={labelId} />
        <span className="tabular w-6 text-foreground">{count}</span>
      </div>
    </DemoFrame>
  )
}

/** A minimal dither shader, the uniforms a shader reads, and the rules for the names of the parameters. */
export function CustomShader() {
  return (
    <DocSection
      id="custom-shader"
      title="Write your own shader"
      description="A dither shader is one WGSL function and a list of parameters."
    >
      <P>
        <Code>defineDitherShader</Code> takes a function named <Code>field</Code>. It returns the luminance of a cell, from 0 (the
        darkest tone) to 1 (the lightest tone). The palette, the dithering and the shared parameters come with it. The function
        can call <Code>backdrop</Code>, <Code>veil</Code>, <Code>pointer</Code>, <Code>hash</Code>, <Code>hash2</Code>,{' '}
        <Code>noise</Code>, <Code>fbm</Code>, <Code>bayer2</Code>, <Code>bayer4</Code> and <Code>bayer8</Code>.
      </P>
      <Example source={source} what="shader">
        <StripesDemo />
      </Example>
      <P>
        A new shader works with <Code>ShaderCanvas</Code>, <Code>useShaderControls</Code> and <Code>ShaderPanel</Code>, like the
        shaders of the library.
      </P>

      <SubHeading>The uniforms a shader reads</SubHeading>
      <P>
        The shader reads a parameter by its key: <Code>u.count</Code>. The engine generates the <Code>Uniforms</Code> struct from
        the schema. This is the struct it generates for Stripes.
      </P>
      <CodeSample code={STRIPES_UNIFORMS} language="wgsl" what="struct" />
      <DocTable label="Built-in uniforms" columns={['Field', 'Type', 'Meaning']}>
        {BUILT_IN_UNIFORMS.map(([field, type, meaning]) => (
          <DocRow key={field}>
            <CodeCell>{field}</CodeCell>
            <CodeCell className="text-foreground-light">{type}</CodeCell>
            <TextCell>{meaning}</TextCell>
          </DocRow>
        ))}
      </DocTable>

      <SubHeading>Rules for the names of the parameters</SubHeading>
      <Bullets>
        <li>A key is in camelCase: a lower-case letter, then letters and digits.</li>
        <li>
          A key is not the name of a built-in uniform: <Code>resolution</Code>, <Code>mouse</Code>, <Code>time</Code>,{' '}
          <Code>amount</Code>, <Code>pixelRatio</Code>, <Code>focus</Code>.
        </li>
        <li>
          A key is not a keyword or a reserved word of WGSL, such as <Code>from</Code>, <Code>filter</Code>, <Code>target</Code>,{' '}
          <Code>type</Code>, <Code>layout</Code>, <Code>smooth</Code> or <Code>mod</Code>.
        </li>
        <li>
          The engine reads three keys itself: <Code>speed</Code>, <Code>cell</Code> and <Code>pointer</Code>. They must be numbers.
        </li>
        <li>
          A dither shader does not declare a shared parameter again. Use <Code>overrides</Code> to change the default of one.
        </li>
        <li>
          <Code>defineShader</Code> and <Code>defineDitherShader</Code> throw an error that says what to change.
        </li>
      </Bullets>
      <P>
        A shader that is not a dither shader writes its own <Code>fs_main</Code> and uses <Code>defineShader</Code>. Pixel Field
        is one.
      </P>
    </DocSection>
  )
}
