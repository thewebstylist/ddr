import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 1024 * 1024,
    cssCodeSplit: false,
    rollupOptions: { output: { manualChunks: undefined } },
  },
})
