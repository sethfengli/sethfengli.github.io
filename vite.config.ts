import { defineConfig } from 'vite'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: '/' + BrowserRouter => 干净 URL（无 #）。
// GitHub Pages 刷新深链：构建后把 index.html 复制为 404.html，
// Pages 对未知路径会回退渲染 404.html，SPA 随即按 pathname 恢复路由。
const rootDir = import.meta.dirname ?? process.cwd()

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'spa-404-fallback',
      apply: 'build',
      closeBundle() {
        copyFileSync(resolve(rootDir, 'dist/index.html'), resolve(rootDir, 'dist/404.html'))
      },
    },
  ],
  build: {
    // Vite 8 (Rolldown)：manualChunks 已废弃，使用 output.codeSplitting.groups
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
            },
          ],
        },
      },
    },
  },
})
