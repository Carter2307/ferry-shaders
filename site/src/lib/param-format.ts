import type { ParamDef } from 'shader-ui'

/** The value type of a parameter, as TypeScript: `number`, `string`, `boolean` or a union of options. */
export function paramType(def: ParamDef): string {
  switch (def.type) {
    case 'color':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'select':
      return def.options.map((option) => `'${option.value}'`).join(' | ')
  }
}

/** The default of a parameter, as it is written in code: `2.4`, `'#d9c4a3'`, `true`. */
export function paramDefault(def: ParamDef): string {
  return typeof def.default === 'string' ? `'${def.default}'` : String(def.default)
}

/** What a panel offers for a parameter: the range of a number, the kind of a color, the options of a select. */
export function paramRange(def: ParamDef): string {
  switch (def.type) {
    case 'color':
      return def.auto ? "A CSS color, or 'auto'" : 'A CSS color'
    case 'number': {
      const unit = def.unit ? ` ${def.unit}` : ''
      return `${def.min} to ${def.max}${unit}, step ${def.step}`
    }
    case 'boolean':
      return 'true or false'
    case 'select':
      return def.options.map((option) => option.label).join(', ')
  }
}
