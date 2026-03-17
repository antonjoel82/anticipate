import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  base: '/anticipate/',
  build: {
    outDir: path.resolve(__dirname, '../demo-dist'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      'anticipate/react': path.resolve(__dirname, '../src/react/index.ts'),
      'anticipate/core': path.resolve(__dirname, '../src/core/index.ts'),
    },
  },
})
