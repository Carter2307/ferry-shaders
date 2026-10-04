// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { defineShader } from '../core/define'
import type { ShaderDefinition } from '../core/types'

import { ShaderPanel, type ShaderPanelProps } from './shader-panel'
import { useShaderControls, type ShaderControls } from './use-shader-controls'

// One parameter of each kind. The groups are interleaved: the panel must gather them.
const demo = defineShader({
  id: 'panel-test',
  name: 'Demo',
  technique: 'none',
  description: 'A shader with every kind of parameter, for the panel tests.',
  pointerEffect: 'None.',
  resolution: 'device',
  params: {
    color: { type: 'color', label: 'Color', description: 'The darkest tone.', group: 'Color', default: '#000000' },
    scale: {
      type: 'number',
      label: 'Scale',
      description: 'Size of the pattern.',
      group: 'Pattern',
      default: 2,
      min: 0,
      max: 10,
      step: 0.5,
    },
    midColor: {
      type: 'color',
      label: 'Mid tone',
      group: 'Color',
      default: 'auto',
      auto: { from: 'color', to: 'background', mix: 0.2 },
    },
    background: { type: 'color', label: 'Background', group: 'Color', default: '#ffffff' },
    invert: { type: 'boolean', label: 'Invert', default: false },
    size: { type: 'number', label: 'Size', group: 'Pattern', default: 4, min: 2, max: 12, step: 1, unit: 'px' },
    origin: {
      type: 'select',
      label: 'Origin',
      group: 'Pattern',
      default: 'top',
      options: [
        { value: 'top', label: 'Top' },
        { value: 'bottom', label: 'Bottom' },
      ],
    },
  },
  fragment: '@fragment fn fs_main() -> @location(0) vec4f { return u.color; }',
})

const other = defineShader({
  id: 'panel-other',
  name: 'Other',
  technique: 'none',
  description: 'A second shader for the shader picker.',
  pointerEffect: 'None.',
  resolution: 'device',
  params: {
    glow: { type: 'number', label: 'Glow', default: 0.2, min: 0, max: 1, step: 0.1 },
  },
  fragment: '@fragment fn fs_main() -> @location(0) vec4f { return vec4f(u.glow); }',
})

interface HarnessProps extends Omit<ShaderPanelProps, 'controls'> {
  shader?: ShaderDefinition
  initial?: Record<string, string | number | boolean>
  /** Called with each change the panel asks for. */
  onSet?: (key: string, value: unknown) => void
}

/** The panel bound to real controls. The values are written next to it, for the tests to read. */
function Harness({ shader = demo as ShaderDefinition, initial, onSet, ...props }: HarnessProps) {
  const controls = useShaderControls(shader, { initial })
  const spied: ShaderControls = {
    ...controls,
    set: (key, value) => {
      onSet?.(key, value)
      controls.set(key, value)
    },
  }
  return (
    <>
      <ShaderPanel {...props} controls={spied} />
      <output data-testid="values">{JSON.stringify(controls.values)}</output>
    </>
  )
}

const values = () => JSON.parse(screen.getByTestId('values').textContent ?? '{}') as Record<string, unknown>
const row = (key: string) => document.querySelector<HTMLElement>(`[data-param="${key}"]`)!
const swatch = (key: string) => row(key).querySelector<HTMLElement>('.ferry-shaders-swatch')!.style.getPropertyValue('--ferry-shaders-swatch')

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ShaderPanel', () => {
  it('renders one section per group and one row per parameter, in display order', () => {
    const { container } = render(<Harness />)
    const sections = [...container.querySelectorAll('.ferry-shaders-group')]
    expect(sections.map((section) => section.querySelector('.ferry-shaders-group-title')?.textContent ?? '')).toEqual(['Color', 'Pattern', ''])

    const rows = [...container.querySelectorAll<HTMLElement>('.ferry-shaders-row')]
    expect(rows.map((item) => item.dataset.param)).toEqual(['color', 'midColor', 'background', 'scale', 'size', 'origin', 'invert'])
    expect(rows.map((item) => item.querySelector('.ferry-shaders-label')?.textContent)).toEqual([
      'Color',
      'Mid tone',
      'Background',
      'Scale',
      'Size',
      'Origin',
      'Invert',
    ])
    expect(rows.map((item) => item.className)).toEqual([
      'ferry-shaders-row ferry-shaders-row--color',
      'ferry-shaders-row ferry-shaders-row--color',
      'ferry-shaders-row ferry-shaders-row--color',
      'ferry-shaders-row ferry-shaders-row--number',
      'ferry-shaders-row ferry-shaders-row--number',
      'ferry-shaders-row ferry-shaders-row--select',
      'ferry-shaders-row ferry-shaders-row--boolean',
    ])

    // A section is a group named by its title, and holds the rows of its parameters.
    const pattern = within(screen.getByRole('group', { name: 'Pattern' }))
    expect(pattern.getByRole('slider', { name: 'Scale' })).toBeTruthy()
    expect(pattern.getByRole('combobox', { name: 'Origin' })).toBeTruthy()
    expect(within(screen.getByRole('group', { name: 'Color' })).getByRole('textbox', { name: 'Mid tone' })).toBeTruthy()
    // The parameters with no group have a section with no title.
    expect(screen.getAllByRole('group')).toHaveLength(2)
  })

  it('shows the name of the shader, or the title it is given', () => {
    const { rerender } = render(<Harness />)
    expect(screen.getByRole('button', { name: 'Demo' })).toBeTruthy()
    rerender(<Harness title={<em>Background</em>} />)
    expect(screen.getByRole('button', { name: 'Background' }).querySelector('em')).toBeTruthy()
  })

  it('gives every control a label and exposes the descriptions', () => {
    render(<Harness />)
    const slider = screen.getByRole('slider', { name: 'Scale' })
    expect(document.getElementById(slider.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Size of the pattern.')
    // The tooltip of a label starts with the whole label: the column can cut a long one.
    expect(row('scale').querySelector('.ferry-shaders-label')?.getAttribute('title')).toBe('Scale: Size of the pattern.')
    expect(row('invert').querySelector('.ferry-shaders-label')?.getAttribute('title')).toBe('Invert')
    const text = screen.getByRole('textbox', { name: 'Color' })
    expect(document.getElementById(text.getAttribute('aria-describedby') ?? '')?.textContent).toBe('The darkest tone.')
    // A parameter with no description points to nothing.
    expect(screen.getByRole('switch', { name: 'Invert' }).hasAttribute('aria-describedby')).toBe(false)

    expect(screen.getByRole('spinbutton', { name: 'Scale' })).toBeTruthy()
    expect(screen.getByLabelText('Color picker')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Auto Mid tone' }).getAttribute('title')).toBe('Mix of Color and Background')
  })

  it('binds a range and a number field to a number', () => {
    const onSet = vi.fn()
    render(<Harness onSet={onSet} />)
    const slider = screen.getByRole<HTMLInputElement>('slider', { name: 'Scale' })
    const field = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Scale' })
    expect([slider.min, slider.max, slider.step, slider.value]).toEqual(['0', '10', '0.5', '2'])
    expect([field.min, field.max, field.step, field.value]).toEqual(['0', '10', '0.5', '2'])
    expect(slider.style.getPropertyValue('--ferry-shaders-fill')).toBe('20%')

    fireEvent.change(slider, { target: { value: '5.5' } })
    expect(onSet).toHaveBeenLastCalledWith('scale', 5.5)
    expect(values().scale).toBe(5.5)
    expect(field.value).toBe('5.5')
    expect(slider.style.getPropertyValue('--ferry-shaders-fill')).toBe('55%')

    fireEvent.change(field, { target: { value: '3' } })
    expect(onSet).toHaveBeenLastCalledWith('scale', 3)
    expect(values().scale).toBe(3)
    expect(slider.value).toBe('3')
  })

  it('shows the unit after the number', () => {
    render(<Harness />)
    expect(row('size').querySelector('.ferry-shaders-unit')?.textContent).toBe('px')
    expect(row('scale').querySelector('.ferry-shaders-unit')).toBeNull()
    expect(screen.getByRole('slider', { name: 'Size' }).getAttribute('aria-valuetext')).toBe('4 px')
  })

  it('accepts a typed number outside the range, but not a text that is not a number', () => {
    const onSet = vi.fn()
    render(<Harness onSet={onSet} />)
    const slider = screen.getByRole<HTMLInputElement>('slider', { name: 'Scale' })
    const field = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Scale' })

    fireEvent.change(field, { target: { value: '25' } })
    expect(onSet).toHaveBeenLastCalledWith('scale', 25)
    expect(values().scale).toBe(25)
    expect(slider.style.getPropertyValue('--ferry-shaders-fill')).toBe('100%')

    onSet.mockClear()
    // The field can be emptied to type another number: nothing is sent meanwhile.
    fireEvent.change(field, { target: { value: '' } })
    expect(onSet).not.toHaveBeenCalled()
    expect(field.value).toBe('')
    expect(values().scale).toBe(25)
    fireEvent.blur(field)
    expect(field.value).toBe('25')

    fireEvent.change(field, { target: { value: '-1.5' } })
    expect(values().scale).toBe(-1.5)
  })

  it('commits the text of a color on Enter or on blur, and ignores empty text', () => {
    const onSet = vi.fn()
    render(<Harness onSet={onSet} />)
    const text = screen.getByRole<HTMLInputElement>('textbox', { name: 'Color' })
    expect(text.value).toBe('#000000')
    expect(swatch('color')).toBe('#000000')

    // Typing alone changes nothing.
    fireEvent.change(text, { target: { value: 'var(--primary)' } })
    expect(onSet).not.toHaveBeenCalled()
    fireEvent.keyDown(text, { key: 'Enter' })
    expect(onSet).toHaveBeenLastCalledWith('color', 'var(--primary)')
    expect(values().color).toBe('var(--primary)')
    // The swatch takes the CSS color as it is: the browser resolves the token.
    expect(swatch('color')).toBe('var(--primary)')

    fireEvent.change(text, { target: { value: '  oklch(0.8 0.05 80)  ' } })
    fireEvent.blur(text)
    expect(values().color).toBe('oklch(0.8 0.05 80)')
    expect(text.value).toBe('oklch(0.8 0.05 80)')

    onSet.mockClear()
    fireEvent.change(text, { target: { value: '   ' } })
    fireEvent.keyDown(text, { key: 'Enter' })
    fireEvent.blur(text)
    expect(onSet).not.toHaveBeenCalled()
    expect(text.value).toBe('oklch(0.8 0.05 80)')

    // Escape drops what was typed.
    fireEvent.change(text, { target: { value: 'red' } })
    fireEvent.keyDown(text, { key: 'Escape' })
    fireEvent.blur(text)
    expect(onSet).not.toHaveBeenCalled()
    expect(text.value).toBe('oklch(0.8 0.05 80)')
  })

  it('refuses a text the browser does not read as a color', () => {
    vi.stubGlobal('CSS', { supports: (_property: string, value: string) => value !== 'bleu' })
    const onSet = vi.fn()
    render(<Harness onSet={onSet} />)
    const text = screen.getByRole<HTMLInputElement>('textbox', { name: 'Color' })

    fireEvent.change(text, { target: { value: 'bleu' } })
    fireEvent.keyDown(text, { key: 'Enter' })
    expect(onSet).not.toHaveBeenCalled()
    expect(text.getAttribute('aria-invalid')).toBe('true')
    expect(text.value).toBe('bleu')
    fireEvent.blur(text)
    expect(text.hasAttribute('aria-invalid')).toBe(false)
    expect(text.value).toBe('#000000')

    // 'auto' is only a value for a color that declares how to compute it.
    fireEvent.change(text, { target: { value: 'auto' } })
    fireEvent.keyDown(text, { key: 'Enter' })
    expect(onSet).not.toHaveBeenCalled()

    fireEvent.change(text, { target: { value: 'blue' } })
    fireEvent.keyDown(text, { key: 'Enter' })
    expect(onSet).toHaveBeenLastCalledWith('color', 'blue')
  })

  it('opens the native picker on the color as #rrggbb, with no alpha, and takes what it picks', () => {
    const onSet = vi.fn()
    render(<Harness onSet={onSet} initial={{ color: 'rgb(18 52 86 / 50%)' }} />)
    const picker = screen.getByLabelText<HTMLInputElement>('Color picker')
    expect(picker.type).toBe('color')
    fireEvent.click(picker)
    expect(picker.value).toBe('#123456')

    fireEvent.change(picker, { target: { value: '#ff8800' } })
    expect(onSet).toHaveBeenLastCalledWith('color', '#ff8800')
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Color' }).value).toBe('#ff8800')
    expect(swatch('color')).toBe('#ff8800')

    // An 'auto' color opens on the mix it shows: a fifth of the way from the color to white.
    const mid = screen.getByLabelText<HTMLInputElement>('Mid tone picker')
    fireEvent.click(mid)
    expect(mid.value).toBe('#ffa033')
  })

  it('switches an auto color to a concrete color and back', () => {
    const onSet = vi.fn()
    render(<Harness onSet={onSet} />)
    const auto = screen.getByRole('button', { name: 'Auto Mid tone' })
    const text = screen.getByRole<HTMLInputElement>('textbox', { name: 'Mid tone' })
    expect(auto.getAttribute('aria-pressed')).toBe('true')
    expect(text.value).toBe('auto')
    expect(swatch('midColor')).toBe('color-mix(in srgb, #000000 80%, #ffffff 20%)')
    // Only a color that declares `auto` has the toggle.
    expect(screen.queryByRole('button', { name: 'Auto Color' })).toBeNull()

    // Off: the mix it showed becomes the color.
    fireEvent.click(auto)
    expect(onSet).toHaveBeenLastCalledWith('midColor', '#333333')
    expect(auto.getAttribute('aria-pressed')).toBe('false')
    expect(text.value).toBe('#333333')

    fireEvent.change(text, { target: { value: '#ff0000' } })
    fireEvent.keyDown(text, { key: 'Enter' })
    fireEvent.click(auto)
    expect(onSet).toHaveBeenLastCalledWith('midColor', 'auto')
    expect(values().midColor).toBe('auto')
    expect(auto.getAttribute('aria-pressed')).toBe('true')

    // Off again: back to the color it had.
    fireEvent.click(auto)
    expect(values().midColor).toBe('#ff0000')

    // 'auto' can also be typed.
    fireEvent.change(text, { target: { value: 'Auto' } })
    fireEvent.blur(text)
    expect(values().midColor).toBe('auto')
  })

  it('keeps the alpha of the mix when an auto color becomes concrete', () => {
    render(<Harness initial={{ color: '#ff0000', background: 'transparent' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Auto Mid tone' }))
    // 20% of the way to transparent: the color keeps its hue and loses a fifth of its alpha.
    expect(values().midColor).toBe('#ff0000cc')
  })

  it('binds a switch to a boolean and a select to its options', () => {
    const onSet = vi.fn()
    render(<Harness onSet={onSet} />)
    const invert = screen.getByRole<HTMLInputElement>('switch', { name: 'Invert' })
    expect(invert.type).toBe('checkbox')
    expect(invert.checked).toBe(false)
    fireEvent.click(invert)
    expect(onSet).toHaveBeenLastCalledWith('invert', true)
    expect(values().invert).toBe(true)
    expect(invert.checked).toBe(true)

    const origin = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Origin' })
    expect([...origin.options].map((option) => [option.value, option.text])).toEqual([
      ['top', 'Top'],
      ['bottom', 'Bottom'],
    ])
    fireEvent.change(origin, { target: { value: 'bottom' } })
    expect(onSet).toHaveBeenLastCalledWith('origin', 'bottom')
    expect(values().origin).toBe('bottom')
    expect(origin.value).toBe('bottom')
  })

  it('resets one parameter from its row', () => {
    render(<Harness />)
    const slider = screen.getByRole<HTMLInputElement>('slider', { name: 'Scale' })
    // The button is only there for a value that is not the default.
    expect(screen.queryByRole('button', { name: 'Reset Scale' })).toBeNull()
    expect(row('scale').hasAttribute('data-changed')).toBe(false)

    fireEvent.change(slider, { target: { value: '7' } })
    fireEvent.click(screen.getByRole('switch', { name: 'Invert' }))
    expect(row('scale').hasAttribute('data-changed')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Reset Scale' }))
    expect(values()).toMatchObject({ scale: 2, invert: true })
    expect(screen.queryByRole('button', { name: 'Reset Scale' })).toBeNull()
    // The button is gone: the focus is on the control of the row.
    expect(document.activeElement).toBe(slider)
  })

  it('resets every parameter with the Reset button', () => {
    render(<Harness />)
    const reset = screen.getByRole<HTMLButtonElement>('button', { name: 'Reset' })
    expect(reset.getAttribute('aria-disabled')).toBe('true')

    fireEvent.change(screen.getByRole('slider', { name: 'Scale' }), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Auto Mid tone' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Origin' }), { target: { value: 'bottom' } })
    expect(reset.hasAttribute('aria-disabled')).toBe(false)

    reset.focus()
    fireEvent.click(reset)
    expect(values()).toEqual({ color: '#000000', scale: 2, midColor: 'auto', background: '#ffffff', invert: false, size: 4, origin: 'top' })
    expect(reset.getAttribute('aria-disabled')).toBe('true')
    expect(document.querySelectorAll('.ferry-shaders-row-reset')).toHaveLength(0)
    // The button turned itself off. A `disabled` button would lose the focus: the reader keeps their place.
    expect(reset.disabled).toBe(false)
    expect(document.activeElement).toBe(reset)
  })

  it('does not reset again from a Reset button that is off', () => {
    const reset = vi.fn()
    function Spied() {
      const controls = useShaderControls(demo)
      return <ShaderPanel controls={{ ...controls, reset }} />
    }
    render(<Spied />)
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(reset).not.toHaveBeenCalled()

    // On: the click goes through.
    cleanup()
    function Changed() {
      const controls = useShaderControls(demo, { initial: { scale: 7 } })
      return <ShaderPanel controls={{ ...controls, reset }} />
    }
    render(<Changed />)
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(reset).toHaveBeenCalledTimes(1)
    expect(reset).toHaveBeenLastCalledWith()
  })

  it('shows a shader picker that calls onShaderChange', () => {
    const onShaderChange = vi.fn()
    const { rerender } = render(<Harness shaders={[demo, other]} onShaderChange={onShaderChange} />)
    const picker = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Shader' })
    expect(picker.value).toBe('panel-test')
    expect([...picker.options].map((option) => option.text)).toEqual(['Demo', 'Other'])

    fireEvent.change(picker, { target: { value: 'panel-other' } })
    expect(onShaderChange).toHaveBeenCalledTimes(1)
    expect(onShaderChange).toHaveBeenLastCalledWith(other)

    // The panel follows the controls: the rows are the ones of the new shader.
    rerender(<Harness shader={other} shaders={[demo, other]} onShaderChange={onShaderChange} />)
    expect(picker.value).toBe('panel-other')
    expect(screen.getByRole('button', { name: 'Other' })).toBeTruthy()
    expect(screen.getByRole('slider', { name: 'Glow' })).toBeTruthy()
    expect(screen.queryByRole('slider', { name: 'Scale' })).toBeNull()
  })

  it('keeps the ids of the rows apart from its own ids, for a parameter named body or shader', () => {
    const clash = defineShader({
      id: 'panel-clash',
      name: 'Clash',
      technique: 'none',
      description: 'A shader whose parameter keys are the names the panel uses for its own ids.',
      pointerEffect: 'None.',
      resolution: 'device',
      params: {
        body: { type: 'number', label: 'Body', default: 1, min: 0, max: 2, step: 0.1 },
        shader: { type: 'boolean', label: 'Shader on', default: false },
      },
      fragment: '@fragment fn fs_main() -> @location(0) vec4f { return vec4f(u.body * u.shader); }',
    })
    const { container } = render(<Harness shader={clash} shaders={[clash, other]} onShaderChange={() => {}} />)
    const ids = [...container.querySelectorAll('[id]')].map((element) => element.id)
    expect(new Set(ids).size).toBe(ids.length)

    // Each label names its own control.
    const slider = screen.getByRole<HTMLInputElement>('slider', { name: 'Body' })
    expect(row('body').querySelector<HTMLLabelElement>('.ferry-shaders-label')?.control).toBe(slider)
    expect(screen.getByRole('switch', { name: 'Shader on' })).toBeTruthy()
    expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Shader' }).value).toBe('panel-clash')
    // The header still points to the body of the panel.
    const toggle = screen.getByRole('button', { name: 'Clash' })
    expect(document.getElementById(toggle.getAttribute('aria-controls') ?? '')?.className).toBe('ferry-shaders-body')

    // The reset of the row finds the control through the label.
    fireEvent.change(slider, { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset Body' }))
    expect(document.activeElement).toBe(slider)
  })

  it('has no shader picker without both the list and the callback', () => {
    const { rerender } = render(<Harness shaders={[demo, other]} />)
    expect(screen.queryByRole('combobox', { name: 'Shader' })).toBeNull()
    rerender(<Harness onShaderChange={() => {}} />)
    expect(screen.queryByRole('combobox', { name: 'Shader' })).toBeNull()
    // A shader that is not in the list is still shown as the current choice.
    rerender(<Harness shaders={[other]} onShaderChange={() => {}} />)
    const picker = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Shader' })
    expect([...picker.options].map((option) => option.text)).toEqual(['Demo', 'Other'])
    expect(picker.value).toBe('panel-test')
  })

  it('folds and opens from the header', () => {
    const onOpenChange = vi.fn()
    const { container } = render(<Harness onOpenChange={onOpenChange} />)
    const root = container.querySelector<HTMLElement>('.ferry-shaders-panel')!
    const toggle = screen.getByRole('button', { name: 'Demo' })
    const body = document.getElementById(toggle.getAttribute('aria-controls') ?? '')!
    expect(body.className).toBe('ferry-shaders-body')
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(body.hidden).toBe(false)
    expect(root.dataset.state).toBe('open')

    fireEvent.click(toggle)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(body.hidden).toBe(true)
    expect(root.dataset.state).toBe('closed')
    // Folded, the panel is a tab: no control, no Reset button.
    expect(screen.queryByRole('slider', { name: 'Scale' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()

    fireEvent.click(toggle)
    expect(onOpenChange).toHaveBeenLastCalledWith(true)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('slider', { name: 'Scale' })).toBeTruthy()
  })

  it('starts folded with defaultOpen false, and keeps the values while it is folded', () => {
    render(<Harness defaultOpen={false} initial={{ scale: 7 }} />)
    const toggle = screen.getByRole('button', { name: 'Demo' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(screen.getByRole<HTMLInputElement>('slider', { name: 'Scale' }).value).toBe('7')
  })

  it('follows the open prop when it is controlled', () => {
    const onOpenChange = vi.fn()
    const { rerender } = render(<Harness open={false} onOpenChange={onOpenChange} />)
    const toggle = screen.getByRole('button', { name: 'Demo' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')

    // The header only asks: the panel stays as the prop says.
    fireEvent.click(toggle)
    expect(onOpenChange).toHaveBeenLastCalledWith(true)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')

    rerender(<Harness open onOpenChange={onOpenChange} />)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(toggle)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it('cannot fold when it is not collapsible', () => {
    const { container } = render(<Harness collapsible={false} open={false} />)
    expect(screen.queryByRole('button', { name: 'Demo' })).toBeNull()
    expect(container.querySelector('.ferry-shaders-heading')?.textContent).toBe('Demo')
    expect(container.querySelector<HTMLElement>('.ferry-shaders-panel')?.dataset.state).toBe('open')
    expect(screen.getByRole('slider', { name: 'Scale' })).toBeTruthy()
  })

  it('sets the placement class', () => {
    const { container, rerender } = render(<Harness />)
    const root = container.querySelector<HTMLElement>('.ferry-shaders-panel')!
    expect(root.className).toBe('ferry-shaders-panel ferry-shaders-panel--inline')
    for (const placement of ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const) {
      rerender(<Harness placement={placement} />)
      expect(root.className).toBe(`ferry-shaders-panel ferry-shaders-panel--${placement}`)
    }
  })

  it('passes the other props and the ref to the root element, and renders the footer', () => {
    const ref = React.createRef<HTMLDivElement>()
    function Typed() {
      // The typed controls of a shader fit the panel with no cast.
      const controls = useShaderControls(demo)
      const footer = <a href="#code">Code</a>
      // @ts-expect-error: the panel takes no children (they would not be rendered): extra content goes in `footer`.
      void (<ShaderPanel controls={controls}>extra</ShaderPanel>)
      return <ShaderPanel ref={ref} controls={controls} className="mine" aria-label="Shader settings" data-testid="panel" footer={footer} />
    }
    render(<Typed />)
    const root = screen.getByTestId('panel')
    expect(ref.current).toBe(root)
    expect(root.className).toBe('ferry-shaders-panel ferry-shaders-panel--inline mine')
    expect(root.getAttribute('aria-label')).toBe('Shader settings')
    // `title` is the heading, not the tooltip of the root.
    expect(root.hasAttribute('title')).toBe(false)
    expect(root.querySelector('.ferry-shaders-body > .ferry-shaders-footer')?.textContent).toBe('Code')
  })

  it('renders to a string', () => {
    const html = renderToString(<Harness shaders={[demo, other]} onShaderChange={() => {}} />)
    expect(html).toContain('class="ferry-shaders-panel ferry-shaders-panel--inline"')
    expect(html).toContain('--ferry-shaders-swatch:#000000')
  })
})
