import type { ShaderDefinition } from 'ferry-shaders'

import { paramDefault, paramRange, paramType } from '../lib/param-format'

import { CodeCell, DocRow, DocTable, TextCell } from './doc-table'

/**
 * The parameters of a shader as a table: key, type, default, range and description. Every row is
 * read from the schema of the shader when the page runs, so the table cannot drift from the code.
 */
export function ParamTable({ shader }: { shader: ShaderDefinition }) {
  return (
    <DocTable label={`Parameters of ${shader.name}`} columns={['Key', 'Type', 'Default', 'Range', 'Description']}>
      {Object.entries(shader.params).map(([key, def]) => (
        <DocRow key={key}>
          <CodeCell>{key}</CodeCell>
          <CodeCell className="text-foreground-light">{paramType(def)}</CodeCell>
          <CodeCell>{paramDefault(def)}</CodeCell>
          <TextCell className="min-w-40 whitespace-nowrap">{paramRange(def)}</TextCell>
          <TextCell>{def.description}</TextCell>
        </DocRow>
      ))}
    </DocTable>
  )
}
