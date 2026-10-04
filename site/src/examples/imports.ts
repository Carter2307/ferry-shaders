// React: the components, the hook and the panel.
import { Drift, ShaderCanvas, ShaderPanel, useShaderControls } from 'ferry-shaders'
// The stylesheet of ShaderPanel. Import it once.
import 'ferry-shaders/styles.css'
// The engine alone. It does not import React.
import { mountShader } from 'ferry-shaders/core'
// ---cut-after---

/** Not shown on the page: the names above are used, so the type checker reads this file. */
export const imported = { Drift, ShaderCanvas, ShaderPanel, useShaderControls, mountShader }
