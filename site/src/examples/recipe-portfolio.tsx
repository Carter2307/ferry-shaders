import { Drift } from 'ferry-shaders'

/** The sand palette: the darkest tone, the mid tone and the page. */
const sand = { color: '#d9c4a3', midColor: '#eee0cb', background: '#fbf7f0' }

/** Sand clouds behind the whole page. Render it once, before the content. */
export function PortfolioBackground() {
  // The element has the color of the page: it shows before the first frame and without WebGPU.
  return <Drift className="fixed inset-0 -z-10" style={{ backgroundColor: sand.background }} {...sand} />
}
