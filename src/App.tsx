import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { I18nProvider } from './i18n'
import { Layout } from './components/layout/Layout'
import { RouteFallback } from './components/ui/RouteFallback'

/**
 * 路由级代码分割（第 9 轮）。
 *
 * 之前 7 个页面全是静态 import，全部塞进唯一的 `index-*.js`（836 KB）：
 * 首屏要为「灵签 + 观音灵签 361 KB 数据 + 阅读器 + 祈福墙」一起买单，
 * 而首页只需要其中的目录与 3D 香炉。改为 `lazy()` 后：
 *   - 首页只下发 Layout + Home + 共享 chunk（目录 / 图版清单 / i18n）；
 *   - 其它页面各自成块，点进去才下（`viewTransition` 的过渡期间正好覆盖请求）；
 *   - 深链（直接打开 /articles/:slug）不再为首页/灵签付费。
 *
 * ⚠ 两个刻意的取舍：
 *   1) `RouteFallback` 是有尺寸骨架（不是 `null`）——否则切换路由会出现空白帧，
 *      而验收判据明确要求「不出现明显空白」；
 *   2) 不用 `React.lazy` 的 `import()` 预取魔法（`webpackPrefetch` 之类），
 *      在本项目里没有等价物，靠 `Link` 的 hover 也无从触发，故不做预取。
 */
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })))
const Articles = lazy(() => import('./pages/Articles').then((m) => ({ default: m.Articles })))
const ArticleReader = lazy(() => import('./pages/ArticleReader').then((m) => ({ default: m.ArticleReader })))
const Dharma = lazy(() => import('./pages/Dharma').then((m) => ({ default: m.Dharma })))
const PrayerWall = lazy(() => import('./pages/PrayerWall').then((m) => ({ default: m.PrayerWall })))
const Lots = lazy(() => import('./pages/Lots').then((m) => ({ default: m.Lots })))
const About = lazy(() => import('./pages/About').then((m) => ({ default: m.About })))
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })))

export default function App() {
  return (
    <I18nProvider>
      {/* BrowserRouter：URL 干净无 #。GitHub Pages 上由 404.html=index.html 兜底刷新 */}
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route
              path="/"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <Home />
                </Suspense>
              }
            />
            <Route
              path="/articles"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <Articles />
                </Suspense>
              }
            />
            <Route
              path="/articles/:slug"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <ArticleReader />
                </Suspense>
              }
            />
            <Route
              path="/dharma"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <Dharma />
                </Suspense>
              }
            />
            <Route
              path="/prayer"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <PrayerWall />
                </Suspense>
              }
            />
            <Route
              path="/lots"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <Lots />
                </Suspense>
              }
            />
            <Route
              path="/about"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <About />
                </Suspense>
              }
            />
            <Route
              path="*"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <NotFound />
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  )
}
