import { defineConfig } from 'vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  root: 'sources/',
  publicDir: '../static/',
  base: './',
  server: { host: true, open: false },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false
  },
  plugins: [wasm(), topLevelAwait()]
})
