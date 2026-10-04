/** A WGSL file imported as text (`?raw` is resolved by Vite at build time, so `dist` holds plain strings). */
declare module '*.wgsl?raw' {
  const source: string
  export default source
}
