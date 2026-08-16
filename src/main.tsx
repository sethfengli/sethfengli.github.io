import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initSiteTheme } from './lib/siteTheme'
import './index.css'

// 在首次渲染前应用配色主题，避免闪烁
initSiteTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
