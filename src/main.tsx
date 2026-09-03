import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initSiteTheme } from './lib/siteTheme'
import '@fontsource/ma-shan-zheng'
import '@fontsource/long-cang'
// 可读的西文字体：英文正文/界面使用 Noto Sans & Noto Serif，中文仍回退到汉字字体
import '@fontsource/noto-sans/latin-400.css'
import '@fontsource/noto-sans/latin-500.css'
import '@fontsource/noto-sans/latin-600.css'
import '@fontsource/noto-sans/latin-700.css'
import '@fontsource/noto-serif/latin-400.css'
import '@fontsource/noto-serif/latin-700.css'
import 'lxgw-wenkai-webfont/style.css'
import './index.css'

// 在首次渲染前应用配色主题，避免闪烁
initSiteTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
