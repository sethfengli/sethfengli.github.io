import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { I18nProvider } from './i18n'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'
import { Articles } from './pages/Articles'
import { ArticleReader } from './pages/ArticleReader'
import { Dharma } from './pages/Dharma'
import { PrayerWall } from './pages/PrayerWall'
import { Lots } from './pages/Lots'
import { About } from './pages/About'
import { NotFound } from './pages/NotFound'

export default function App() {
  return (
    <I18nProvider>
      {/* BrowserRouter：URL 干净无 #。GitHub Pages 上由 404.html=index.html 兜底刷新 */}
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/articles/:slug" element={<ArticleReader />} />
            <Route path="/dharma" element={<Dharma />} />
            <Route path="/prayer" element={<PrayerWall />} />
            <Route path="/lots" element={<Lots />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  )
}
