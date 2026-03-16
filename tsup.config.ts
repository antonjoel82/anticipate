import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core/index.ts',
    react: 'src/react/index.ts',
    devtools: 'src/devtools/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react'],
})
