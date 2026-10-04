/** What the control of a parameter row receives. `D` is the parameter definition, `V` its value type. */
export interface ControlProps<D, V> {
  def: D
  value: V
  onChange: (value: V) => void
  /** Id of the visible label of the row: the control takes its name from it. */
  labelId: string
  /** Id of the hidden text that holds the description, when the parameter has one. */
  descriptionId: string | undefined
}
