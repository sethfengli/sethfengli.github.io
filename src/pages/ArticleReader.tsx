import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import {
  photoForSlug,
  loadArticle,
  neighborsOf,
  readingMinutes,
  tocOf,
  SCHOOL_LABEL_ZH,
  type ArticleDoc,
} from '../lib/content'
import {
  DEFAULT_PREFS,
  FONT_SIZE_RANGE,
  LINE_HEIGHT_RANGE,
  getProgress,
  loadPrefs,
  resetReadingPrefs,
  savePrefs,
  setProgress,
  type ReaderTheme,
} from '../lib/readingPrefs'
import { ArticleBody } from '../components/reader/ArticleBody'
import { TranslateWidget } from '../components/reader/TranslateWidget'
import { ZenIllustration } from '../components/zen/ZenIllustration'
import { CoverImage } from '../components/zen/CoverImage'

const THEMES: Array<{
  id: ReaderTheme
  labelKey: 'reader.themeLight' | 'reader.themeDark' | 'reader.themeSepia' | 'reader.themeParchment' | 'reader.themeMoon'
  swatch: string
}> = [
  { id: 'light', labelKey: 'reader.themeLight', swatch: '#ffffff' },
  { id: 'dark', labelKey: 'reader.themeDark', swatch: '#211d18' },
  { id: 'sepia', labelKey: 'reader.themeSepia', swatch: '#f5ecd7' },
  { id: 'parchment', labelKey: 'reader.themeParchment', swatch: '#f4ecd8' },
  { id: 'moon', labelKey: 'reader.themeMoon', swatch: '#e9f0f8' },
]

export function ArticleReader() {
  const { slug = '' } = useParams()
  const { t } = useI18n()
  const [doc, setDoc] = useState<ArticleDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState(loadPrefs)
  const [progress, setProgressState] = useState(0)
  const [restorePct, setRestorePct] = useState<number | null>(null)
  const [tocOpen, setTocOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const articleRef = useRef<HTMLDivElement>(null)
  const lastSaveRef = useRef(0)
  const suppressedRef = useRef(false)

  /* ---------- 加载文章 ---------- */
  useEffect(() => {
    let alive = true
    setLoading(true)
    setDoc(null)
    setSettingsOpen(false)
    setTocOpen(false)
    suppressedRef.current = true
    void loadArticle(slug).then((d) => {
      if (!alive) return
      setDoc(d)
      setLoading(false)
      window.scrollTo({ top: 0 })
      if (d) {
        document.title = `《${d.title}》 · 慧灯禅院`
        const saved = getProgress(d.slug)
        setRestorePct(saved > 3 ? saved : null)
        setProgressState(0)
      } else {
        document.title = '文章未找到 · 慧灯禅院'
      }
      // 让“恢复进度”的防抖冷静期过后再激活进度记录
      window.setTimeout(() => {
        suppressedRef.current = false
      }, 600)
    })
    return () => {
      alive = false
    }
  }, [slug])

  /* ---------- 阅读进度 ---------- */
  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current
      if (!el || !doc) return
      const top = el.getBoundingClientRect().top
      const height = el.offsetHeight
      const pct = Math.min(100, Math.max(0, ((window.innerHeight * 0.5 - top) / height) * 100))
      setProgressState(pct)
      if (!suppressedRef.current) {
        const now = Date.now()
        if (now - lastSaveRef.current > 1500) {
          lastSaveRef.current = now
          setProgress(doc.slug, pct)
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [doc])

  const toc = useMemo(() => (doc ? tocOf(doc) : []), [doc])
  const { prev, next } = useMemo(
    () => (doc ? neighborsOf(doc.slug, doc.school) : { prev: null, next: null }),
    [doc],
  )
  const [activeToc, setActiveToc] = useState('')

  /* ---------- 目录高亮（IntersectionObserver） ---------- */
  useEffect(() => {
    if (!doc || toc.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveToc(e.target.id)
        }
      },
      { rootMargin: '-72px 0px -65% 0px' },
    )
    for (const item of toc) {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [doc, toc])

  /* ---------- 偏好更新 ---------- */
  const updatePrefs = useCallback((patch: Partial<typeof prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch }
      savePrefs(next)
      return next
    })
  }, [])

  const scrollToHeading = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTocOpen(false)
  }

  const restoreReading = () => {
    const el = articleRef.current
    if (!el || restorePct == null) return
    const target = (el.offsetHeight * restorePct) / 100 - window.innerHeight * 0.2
    window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
    setRestorePct(null)
  }

  /* ---------- 状态视图 ---------- */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-sandalwood-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sandalwood-300 border-t-tibetan-600" />
          <p className="font-serif text-sm">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <ZenIllustration variant="enso" className="h-40 w-72 rounded-2xl" animated={false} />
        <p className="mt-6 font-serif text-xl font-bold text-sandalwood-800">{t('reader.notFound')}</p>
        <Link to="/articles" className="btn-secondary mt-6">
          {t('reader.backToList')}
        </Link>
        <Link to="/" className="mt-3 text-sm text-sandalwood-500 underline underline-offset-4 hover:text-tibetan-600">
          {t('reader.backHome')}
        </Link>
      </div>
    )
  }

  const readerStyle = {
    '--reader-font-size': `${prefs.fontSize}px`,
    '--reader-line-height': prefs.lineHeight,
    background: 'var(--reader-bg)',
  } as CSSProperties

  return (
    <div className={`reader-theme-${prefs.theme}`} style={{ background: 'var(--reader-bg)' }}>
      {/* 顶部阅读进度条 */}
      <div className="reader-progress" style={{ width: `${progress}%` }} role="progressbar" aria-label={t('reader.progressLabel')} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} />

      <div className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6">
        {/* 面包屑 */}
        <nav className="flex items-center gap-2 text-sm text-sandalwood-500">
          <Link to="/articles" className="transition hover:text-tibetan-600">
            ← {t('reader.backToList')}
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate">{doc.title}</span>
        </nav>

        <div className="mt-8 lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-10">
          {/* ---------- 目录（桌面） ---------- */}
          <aside className="sticky top-20 hidden max-h-[calc(100vh-7rem)] self-start overflow-y-auto pb-6 lg:block">
            <h2 className="flex items-center gap-2 font-serif text-sm font-bold tracking-widest text-sandalwood-700">
              <span className="h-4 w-1 rounded-full bg-tibetan-600" />
              {t('reader.toc')}
            </h2>
            {toc.length === 0 ? (
              <p className="mt-3 text-xs text-sandalwood-400">{t('reader.tocEmpty')}</p>
            ) : (
              <ul className="mt-4 space-y-0.5 border-l border-sandalwood-200 text-[13px] leading-relaxed">
                {toc.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => scrollToHeading(item.id)}
                      className={`block w-full cursor-pointer py-1 pr-2 text-left text-ink-700 transition hover:text-tibetan-600 ${
                        item.level === 2 ? 'pl-3' : item.level === 3 ? 'pl-6 text-ink-500' : 'pl-9 text-ink-500'
                      } ${activeToc === item.id ? 'toc-active' : ''}`}
                    >
                      {item.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* ---------- 正文 ---------- */}
          <div ref={articleRef} className="min-w-0">
            {/* 封面插画 */}
            <div className="overflow-hidden rounded-3xl shadow-md shadow-sandalwood-900/10">
              <CoverImage src={photoForSlug(doc.slug)} alt={`${doc.title} · 封面`} fallbackVariant={doc.illustration} className="h-44 w-full sm:h-56" />
            </div>

            {/* 题头 */}
            <header className="mt-8 text-center">
              <p className="font-serif text-xs tracking-[0.4em] text-sandalwood-500">{SCHOOL_LABEL_ZH[doc.school]}</p>
              <h1 className="mt-3 font-serif text-3xl font-bold leading-snug text-sandalwood-900 sm:text-4xl">
                《{doc.title}》
              </h1>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-sandalwood-500">
                {doc.author && (
                  <span>
                    {t('reader.authorLabel')}：{doc.author}
                  </span>
                )}
                <span>
                  {t('articles.readingTime', { n: readingMinutes(doc.chars) })}
                </span>
                <span className="hidden sm:inline">约 {doc.chars.toLocaleString()} 字</span>
              </div>
              <div className="zen-divider mt-5">
                <span>❖</span>
              </div>
            </header>

            {/* 阅读工具栏（吸附） */}
            <div className="sticky top-16 z-30 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sandalwood-200/70 bg-rice-50/95 px-4 py-2.5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary !px-3.5 !py-1.5 text-xs lg:hidden"
                  onClick={() => setTocOpen(true)}
                  aria-label={t('reader.toc')}
                >
                  ☰ {t('reader.toc')}
                </button>
                <button
                  type="button"
                  className="btn-secondary !px-3.5 !py-1.5 text-xs"
                  onClick={() => setSettingsOpen((v) => !v)}
                  aria-expanded={settingsOpen}
                >
                  ⚙ {t('reader.settings')}
                </button>
                <span className="hidden text-xs text-sandalwood-400 sm:inline">
                  {Math.round(progress)}%
                </span>
              </div>
              <TranslateWidget />
            </div>

            {/* 设置面板 */}
            {settingsOpen && (
              <ReaderSettings
                prefs={prefs}
                onChange={updatePrefs}
                onReset={() => {
                  resetReadingPrefs()
                  setPrefs(DEFAULT_PREFS)
                }}
                onClose={() => setSettingsOpen(false)}
              />
            )}

            {/* 正文 */}
            <div className="mt-8 rounded-2xl px-1 py-6 sm:px-6" style={readerStyle}>
              <ArticleBody doc={doc} />
              <div className="zen-divider mt-12">
                <span>❖</span>
              </div>
              <p className="mt-6 text-center font-serif text-sm text-sandalwood-500">
                {t('reader.likeNote')}
              </p>
            </div>

            {/* 上一篇 / 下一篇 */}
            <nav className="mt-10 grid gap-4 sm:grid-cols-2">
              {prev ? (
                <Link to={`/articles/${prev.slug}`} className="card group p-5">
                  <p className="text-xs text-sandalwood-400">← {t('reader.prevArticle')}</p>
                  <p className="mt-2 font-serif font-bold text-sandalwood-800 transition group-hover:text-tibetan-700">
                    《{prev.title}》
                  </p>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link to={`/articles/${next.slug}`} className="card group p-5 text-right">
                  <p className="text-xs text-sandalwood-400">{t('reader.nextArticle')} →</p>
                  <p className="mt-2 font-serif font-bold text-sandalwood-800 transition group-hover:text-tibetan-700">
                    《{next.title}》
                  </p>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* 恢复进度浮标 */}
      {restorePct != null && (
        <button
          type="button"
          onClick={restoreReading}
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 cursor-pointer rounded-full border border-gold-400/70 bg-rice-50/95 px-5 py-2.5 text-sm text-sandalwood-700 shadow-lg shadow-sandalwood-900/20 transition hover:bg-gold-50"
        >
          {t('reader.restore', { p: restorePct })}
        </button>
      )}

      {/* 移动端目录抽屉 */}
      {tocOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('reader.toc')}>
          <div className="absolute inset-0 bg-sandalwood-950/50" onClick={() => setTocOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-rice-50 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-base font-bold text-sandalwood-800">{t('reader.toc')}</h2>
              <button
                type="button"
                onClick={() => setTocOpen(false)}
                className="cursor-pointer rounded-full p-2 text-sandalwood-500 hover:bg-sandalwood-100"
                aria-label={t('nav.closeMenu')}
              >
                ✕
              </button>
            </div>
            <ul className="mt-4 space-y-1 text-sm">
              {toc.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => scrollToHeading(item.id)}
                    className={`block w-full cursor-pointer rounded-lg px-3 py-2 text-left transition hover:bg-sandalwood-100 ${
                      item.level === 2 ? 'font-medium text-ink-900' : item.level === 3 ? 'pl-7 text-ink-700' : 'pl-10 text-ink-500'
                    } ${activeToc === item.id ? 'bg-sandalwood-100 text-tibetan-700' : ''}`}
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================= 阅读设置面板 ================= */
function ReaderSettings({
  prefs,
  onChange,
  onReset,
  onClose,
}: {
  prefs: { fontSize: number; lineHeight: number; theme: ReaderTheme }
  onChange: (patch: { fontSize?: number; lineHeight?: number; theme?: ReaderTheme }) => void
  onReset: () => void
  onClose: () => void
}) {
  const { t } = useI18n()

  return (
    <div className="mt-3 rounded-2xl border border-sandalwood-200/70 bg-rice-50/95 p-5 shadow-md">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-sm font-bold text-sandalwood-800">{t('reader.settings')}</h3>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-full p-1.5 text-sandalwood-400 hover:bg-sandalwood-100"
          aria-label={t('nav.closeMenu')}
        >
          ✕
        </button>
      </div>

      <div className="mt-5 grid gap-6 sm:grid-cols-3">
        {/* 字号 */}
        <div>
          <p className="text-xs font-medium text-sandalwood-600">
            {t('reader.fontSize')} <span className="ml-1 text-gold-600">{prefs.fontSize}px</span>
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              className="btn-secondary !h-8 !w-8 !rounded-lg !px-0 !py-0 text-base"
              onClick={() => onChange({ fontSize: Math.max(FONT_SIZE_RANGE.min, prefs.fontSize - 1) })}
              aria-label="A-"
            >
              A−
            </button>
            <input
              type="range"
              min={FONT_SIZE_RANGE.min}
              max={FONT_SIZE_RANGE.max}
              step={FONT_SIZE_RANGE.step}
              value={prefs.fontSize}
              onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
              className="w-full accent-gold-500"
            />
            <button
              type="button"
              className="btn-secondary !h-8 !w-8 !rounded-lg !px-0 !py-0 text-base"
              onClick={() => onChange({ fontSize: Math.min(FONT_SIZE_RANGE.max, prefs.fontSize + 1) })}
              aria-label="A+"
            >
              A＋
            </button>
          </div>
        </div>

        {/* 行距 */}
        <div>
          <p className="text-xs font-medium text-sandalwood-600">
            {t('reader.lineHeight')} <span className="ml-1 text-gold-600">{prefs.lineHeight.toFixed(1)}</span>
          </p>
          <input
            type="range"
            min={LINE_HEIGHT_RANGE.min}
            max={LINE_HEIGHT_RANGE.max}
            step={LINE_HEIGHT_RANGE.step}
            value={prefs.lineHeight}
            onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
            className="mt-3.5 w-full accent-gold-500"
            aria-label={t('reader.lineHeight')}
          />
        </div>

        {/* 背景主题 */}
        <div>
          <p className="text-xs font-medium text-sandalwood-600">{t('reader.theme')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {THEMES.map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => onChange({ theme: th.id })}
                title={t(th.labelKey)}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 transition ${
                  prefs.theme === th.id ? 'scale-110 border-tibetan-600' : 'border-sandalwood-300 hover:border-gold-500'
                }`}
                style={{ background: th.swatch }}
                aria-label={t(th.labelKey)}
                aria-pressed={prefs.theme === th.id}
              >
                {prefs.theme === th.id && <span className="text-xs text-tibetan-700">✓</span>}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-sandalwood-500">
            {t(THEMES.find((x) => x.id === prefs.theme)?.labelKey ?? 'reader.themeLight')}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-sandalwood-200/60 pt-3 text-right">
        <button
          type="button"
          onClick={() => {
            onReset()
            onClose()
          }}
          className="cursor-pointer text-xs text-sandalwood-500 underline underline-offset-4 transition hover:text-tibetan-600"
        >
          {t('common.themeReset')}
        </button>
      </div>
    </div>
  )
}
