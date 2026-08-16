import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: './' + HashRouter => the build works at any sub-path,
// which is the safest setup for GitHub Pages (user/project sites alike).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    // Article JSON lives in many small chunks; raise the limit so a few
    // large long-form articles still get split sanely.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
