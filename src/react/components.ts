import { aurora } from '../shaders/aurora'
import { cells } from '../shaders/cells'
import { drift } from '../shaders/drift'
import { dunes } from '../shaders/dunes'
import { grass } from '../shaders/grass'
import { pixelField } from '../shaders/pixel-field'
import { rain } from '../shaders/rain'
import { relief } from '../shaders/relief'
import { ripples } from '../shaders/ripples'
import { stars } from '../shaders/stars'

import { createShaderComponent } from './create-shader-component'

// One component per shader of the library: its parameters are typed props.
// To add a shader, add its component here, named after its id in PascalCase.

/** The Drift shader as a component: `<Drift className="absolute inset-0" scale={3} />`. */
export const Drift = /* @__PURE__ */ createShaderComponent(drift)
/** The Ripples shader as a component: `<Ripples className="absolute inset-0" frequency={32} />`. */
export const Ripples = /* @__PURE__ */ createShaderComponent(ripples)
/** The Relief shader as a component: `<Relief className="absolute inset-0" contours={20} />`. */
export const Relief = /* @__PURE__ */ createShaderComponent(relief)
/** The Cells shader as a component: `<Cells className="absolute inset-0" scale={8} />`. */
export const Cells = /* @__PURE__ */ createShaderComponent(cells)
/** The Rain shader as a component: `<Rain className="fixed inset-0" focusRef={columnRef} />`. */
export const Rain = /* @__PURE__ */ createShaderComponent(rain)
/** The Stars shader as a component: `<Stars className="absolute inset-0" density={0.8} />`. */
export const Stars = /* @__PURE__ */ createShaderComponent(stars)
/** The Dunes shader as a component: `<Dunes className="absolute inset-0" ripples={30} />`. */
export const Dunes = /* @__PURE__ */ createShaderComponent(dunes)
/** The Grass shader as a component: `<Grass className="absolute inset-0" height={48} />`. */
export const Grass = /* @__PURE__ */ createShaderComponent(grass)
/** The Aurora shader as a component: `<Aurora className="absolute inset-0" curtains={2} />`. */
export const Aurora = /* @__PURE__ */ createShaderComponent(aurora)
/** The Pixel Field shader as a component: `<PixelField className="absolute inset-x-0 top-0 h-96" origin="top" />`. */
export const PixelField = /* @__PURE__ */ createShaderComponent(pixelField)
