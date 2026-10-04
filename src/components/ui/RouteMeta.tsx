import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n'
import type { Dict, PathsOf } from '../../i18n/types'

/**
 * 文档级 SEO：一二级页面各自设置 title / description / og:*。
 *
 * 本站是纯静态 SPA，index.html 里只有一份通用 description，
 * 于是「关于本院」「静心听经」等页面在搜索结果里全长一个样。
 * 这里按路由写入对应的标题与摘要；文章页（/articles/:slug）由
 * ArticleReader 自行设置（它知道文章标题），此处跳过。
 */

interface RouteMeta {
  /** 路由前缀（精确匹配，'/' 仅匹配首页） */
  path: string
  /** 词典里页面标题的 key */
  title: PathsOf<Dict>
  /** 词典里页面摘要的 key */
  desc: PathsOf<Dict>
}

const ROUTES: RouteMeta[] = [
  { path: '/', title: 'appName', desc: 'home.heroSubtitle' },
  { path: '/articles', title: 'articles.title', desc: 'articles.subtitle' },
  { path: '/dharma', title: 'dharma.title', desc: 'dharma.subtitle' },
  { path: '/prayer', title: 'prayer.title', desc: 'prayer.subtitle' },
  { path: '/lots', title: 'lots.title', desc: 'lots.subtitle' },
  { path: '/about', title: 'about.title', desc: 'about.story1' },
]

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** 摘要过长时截到第一个句末；仍超长则硬截，避免 meta 里塞整段 */
function firstSentence(s: string, max = 160): string {
  if (s.length <= max) return s
  const cut = s.split(/(?<=[。！？!?])/)[0] ?? s
  if (cut.length <= max) return cut
  const dot = s.indexOf('. ')
  if (dot > 40 && dot + 1 <= max) return s.slice(0, dot + 1)
  return `${s.slice(0, max - 1)}…`
}

export function RouteMeta() {
  const { t, lang } = useI18n()
  const { pathname } = useLocation()

  useEffect(() => {
    // 文章页自行管理标题与摘要
    if (/^\/articles\/.+/.test(pathname)) return

    const hit = ROUTES.find((r) => r.path === pathname) ?? ROUTES.find((r) => r.path === '/')!
    const title = t(hit.title)
    const desc = firstSentence(t(hit.desc))
    const site = t('appName')
    const fullTitle = hit.path === '/' ? `${site} · ${t('slogan')}` : `${title} · ${site}`

    document.title = fullTitle
    setMeta('name', 'description', desc)
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:type', 'website')
    setMeta('name', 'twitter:card', 'summary_large_image')
    void lang
  }, [pathname, lang, t])

  return null
}
