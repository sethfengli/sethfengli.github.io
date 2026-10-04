import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/**
 * 视觉预览构建：把「只用 SVG / 无路由依赖」的组件单独打包成一个静态页，
 * 用无头浏览器截图肉眼核对（见 scripts/shoot-preview.mjs）。
 *
 * 与正式构建互不影响：产物在 preview-dist/，源码通过别名指回 src/。
 */
const root = import.meta.dirname ?? process.cwd()
const repo = path.resolve(root, '..')

export default defineConfig({
  root,
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.join(repo, 'src'),
      '@data': path.join(repo, 'src', 'data'),
    },
  },
  build: {
    outDir: path.join(repo, 'preview-dist'),
    emptyOutDir: true,
  },
})
