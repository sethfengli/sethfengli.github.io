import { defineConfig } from 'vite'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: '/' + BrowserRouter => 干净 URL（无 #）。
// GitHub Pages 刷新深链：构建后把 index.html 复制为 404.html，
// Pages 对未知路径会回退渲染 404.html，SPA 随即按 pathname 恢复路由。
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'spa-404-fallback',
      apply: 'build',
      closeBundle() {
        copyFileSync(resolve(__dirname, 'dist/index.html'), resolve(__dirname, 'dist/404.html'))
      },
    },
  ],
  build: {
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
