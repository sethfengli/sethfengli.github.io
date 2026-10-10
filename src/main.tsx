import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initSiteTheme } from './lib/siteTheme'
// 书法体：改用**项目子集**（public/fonts/ma-shan-zheng-subset.woff2，约 380 KB）。
// 原先 import '@fontsource/ma-shan-zheng' 会带上 92 个 unicode-range 分片、5.99 MB；
// 书法体全站只用于签文诗句/祝福语/zen3d 画布题字，实际用字不到 1000 个，
// 因此按用字子集化后只留一个文件（重建脚本 scripts/make-brush-subset.mjs）。
// 同理移除的还有 lxgw-wenkai-webfont（27.9 MB）与 @fontsource/long-cang（6.4 MB）：
// 前者只是标题楷体的回退项，后者全站零引用。
// 可读的西文字体：英文正文/界面使用 Noto Sans & Noto Serif，中文仍回退到汉字字体
import '@fontsource/noto-sans/latin-400.css'
import '@fontsource/noto-sans/latin-500.css'
import '@fontsource/noto-sans/latin-600.css'
import '@fontsource/noto-sans/latin-700.css'
import '@fontsource/noto-serif/latin-400.css'
import '@fontsource/noto-serif/latin-700.css'
import './index.css'

// 在首次渲染前应用配色主题，避免闪烁
initSiteTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
