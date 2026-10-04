import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import {
  photoForSlug,
  loadArticleForLang,
  hasEnglish,
  neighborsOf,
  readingMinutes,
  tocOf,
  localizedMeta,
  schoolLabel,
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
import { Ornament } from '../components/ui/PageBanner'
import { FontSizeIcon } from '../components/ui/Icons'

const THEMES: Array<{
  id: ReaderTheme
  labelKey: 'reader.themeLight' | 'reader.themeDark' | 'reader.themeSepia' | 'reader.themeParchment' | 'reader.themeMoon'
  swatch: string
}> = [
  { id: 'light', labelKey: 'reader.themeLight', swatch: '#fbfaf7' },
  { id: 'dark', labelKey: 'reader.themeDark', swatch: '#17191c' },
  { id: 'sepia', labelKey: 'reader.themeSepia', swatch: '#f6f1e6' },
  { id: 'parchment', labelKey: 'reader.themeParchment', swatch: '#f3ecdc' },
  { id: 'moon', labelKey: 'reader.themeMoon', swatch: '#eef3f7' },
]

/** 阅读器内的发丝色：随阅读主题取用，保证 5 种底色下都克制且可辨 */
const READER_TOOLBAR_BG = 'color-mix(in srgb, var(--reader-bg) 86%, var(--reader-ink))'

export function ArticleReader() {
  const { slug = '' } = useParams()
  const { t, lang } = useI18n()
  const [doc, setDoc] = useState<ArticleDoc | null>(null)
  const [nativeEn, setNativeEn] = useState(false)
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
    void loadArticleForLang(slug, lang).then((d) => {
      if (!alive) return
      setDoc(d)
      setNativeEn(lang === 'en' && hasEnglish(slug))
      setLoading(false)
      window.scrollTo({ top: 0 })
      if (d) {
        document.title = t('reader.docTitle', { title: d.title })
        const saved = getProgress(d.slug)
        setRestorePct(saved > 3 ? saved : null)
        setProgressState(0)
      } else {
        document.title = `${t('common.notFoundTitle')} · ${t('appName')}`
      }
      // 让“恢复进度”的防抖冷静期过后再激活进度记录
      window.setTimeout(() => {
        suppressedRef.current = false
      }, 600)
    })
    return () => {
      alive = false
    }
  }, [slug, lang, t])

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

  const toc = useMemo(() => (doc ? tocOf(doc, lang) : []), [doc, lang])
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
        <div className="flex flex-col items-center gap-4 text-ink-500">
          <div className="h-6 w-6 animate-spin rounded-full border border-hairline border-t-tibetan-600" />
          <p className="font-serif text-sm">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <ZenIllustration variant="enso" className="h-32 w-64 rounded-xs" animated={false} />
        <p className="mt-8 font-serif text-xl text-ink-900">{t('reader.notFound')}</p>
        <Link to="/articles" className="btn-secondary mt-8">
          {t('reader.backToList')}
        </Link>
        <Link to="/" className="mt-4 text-sm text-ink-500 underline underline-offset-4 transition-colors hover:text-tibetan-600">
          {t('reader.backHome')}
        </Link>
      </div>
    )
  }

  const readerStyle = {
    '--reader-font-size': `${prefs.fontSize}px`,
    '--reader-line-height': prefs.lineHeight,
    background: 'var(--reader-bg)',
    color: 'var(--reader-ink)',
  } as CSSProperties

  return (    <div className={`reader-theme-${prefs.theme}`} style={{ background: 'var(--reader-bg)' }}>
      {/* 顶部阅读进度条 */}
      <div className="reader-progress" style={{ width: `${progress}%` }} role="progressbar" aria-label={t('reader.progressLabel')} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} />

      <div className="container-page pt-8 pb-24">
        {/* 面包屑 */}
        <nav className="flex items-center gap-2 font-sans text-xs tracking-wider text-sandalwood-500">
          <Link to="/articles" className="inline-flex items-center gap-1.5 transition-colors hover:text-tibetan-600">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            {t('reader.backToList')}
          </Link>
          <span aria-hidden className="h-3 w-px bg-hairline" />
          <span className="truncate">{doc.title}</span>
        </nav>

        <div className="mt-10 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          {/* ---------- 目录（桌面） ---------- */}
          <aside className="sticky top-20 hidden max-h-[calc(100vh-7rem)] self-start overflow-y-auto pb-6 xl:block">
            <h2 className="font-sans text-[11px] tracking-[0.28em] text-sandalwood-500 uppercase">
              {t('reader.toc')}
            </h2>
            {toc.length === 0 ? (
              <p className="mt-4 text-xs text-ink-300">{t('reader.tocEmpty')}</p>
            ) : (
              <ul className="mt-5 space-y-px border-l border-hairline text-[13px] leading-relaxed">
                {toc.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => scrollToHeading(item.id)}
                      className={`block w-full cursor-pointer py-1.5 pr-2 text-left transition-colors hover:text-tibetan-600 ${
                        item.level === 2
                          ? 'pl-3 text-ink-700'
                          : item.level === 3
                            ? 'pl-6 text-ink-500'
                            : 'pl-9 text-ink-300'
                      } ${activeToc === item.id ? 'toc-active' : ''}`}
                    >
                      {item.num && (
                        <span className={`mr-1 ${item.level === 2 ? 'text-tibetan-600' : 'text-ink-300'}`}>
                          {item.num}
                        </span>
                      )}
                      {item.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* ---------- 正文 ---------- */}
          <div ref={articleRef} className="flex min-w-0 flex-col xl:max-w-4xl">
            {/* 封面照片 */}
            <div className="relative aspect-21/9 overflow-hidden rounded-xs border border-hairline bg-rice-100">
              <CoverImage src={photoForSlug(doc.slug)} alt={t('reader.coverAlt', { t: doc.title })} fallbackVariant={doc.illustration} className="absolute inset-0 h-full w-full object-cover" />
            </div>

            {/* 题头：左对齐 + 朱砂印点题 */}
            <header className="mt-10 border-b border-hairline pb-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="seal">{schoolLabel(doc.school, lang)}</span>
                {doc.author && (
                  <span className="font-sans text-xs tracking-wider text-ink-300">
                    {t('common.authorBy', { name: doc.author })}
                  </span>
                )}
              </div>
              <h1 className="mt-6 font-serif text-3xl leading-[1.25] font-normal tracking-tight text-ink-900 text-balance sm:text-4xl lg:text-[2.6rem]">
                {t('reader.titleWithQuotes', { title: doc.title })}
              </h1>
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 font-sans text-xs tracking-wider text-ink-300">
                <span>{t('articles.readingTime', { n: readingMinutes(doc.chars) })}</span>
                <span aria-hidden className="h-3 w-px bg-hairline" />
                <span>{t('reader.wordCount', { n: doc.chars.toLocaleString() })}</span>
              </div>
              {lang === 'en' && !nativeEn && (
                <p className="mt-6 border-l-2 border-tibetan-500 bg-rice-100/70 px-5 py-3.5 font-serif text-xs leading-relaxed text-ink-500">
                  {t('reader.untranslatedFallback')}
                </p>
              )}
            </header>

            {/* 阅读工具栏（吸附）：实底 + 发丝线，取代毛玻璃胶囊 */}
            <div
              className="sticky top-16 z-30 mt-6 flex flex-wrap items-center justify-between gap-3 border border-hairline px-4 py-2.5"
              style={{ background: READER_TOOLBAR_BG }}
            >
              <div className="flex items-center gap-3">
                <IconButton className="lg:hidden" label={t('reader.toc')} onClick={() => setTocOpen(true)}>
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </IconButton>
                <IconButton
                  label={t('reader.settings')}
                  onClick={() => setSettingsOpen((v) => !v)}
                  expanded={settingsOpen}
                >
                  <path d="M4 8h10M18 8h2M4 16h4M12 16h8" />
                  <circle cx={16} cy={8} r={2} />
                  <circle cx={10} cy={16} r={2} />
                </IconButton>
                <span className="hidden font-sans text-xs tabular-nums text-ink-300 sm:inline">
                  {Math.round(progress)}%
                </span>
              </div>
              {!(lang === 'en' && nativeEn) && <TranslateWidget />}
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
            <div className="mt-10" style={readerStyle}>
              <ArticleBody doc={doc} />
              <Ornament className="mt-14 flex justify-center" />
              <p className="mt-6 text-center font-serif text-sm text-ink-500">
                {t('reader.likeNote')}
              </p>
            </div>

            {/* 上一篇 / 下一篇 */}
            <nav className="mt-14 grid gap-4 sm:grid-cols-2">
              {prev ? (
                <Link to={`/articles/${prev.slug}`} viewTransition className="group rounded-card border border-hairline bg-surface p-6 transition-colors duration-200 hover:border-sandalwood-500">
                  <p className="font-sans text-[11px] tracking-[0.2em] text-ink-300 uppercase">{t('reader.prevArticle')}</p>
                  <p className="mt-3 font-serif text-base leading-snug text-ink-900 transition-colors duration-200 group-hover:text-tibetan-600">
                    {t('reader.titleWithQuotes', { title: localizedMeta(prev, lang).title })}
                  </p>
                </Link>
              ) : (
                <span className="hidden sm:block" />
              )}
              {next && (
                <Link to={`/articles/${next.slug}`} viewTransition className="group rounded-card border border-hairline bg-surface p-6 transition-colors duration-200 hover:border-sandalwood-500 sm:text-right">
                  <p className="font-sans text-[11px] tracking-[0.2em] text-ink-300 uppercase">{t('reader.nextArticle')}</p>
                  <p className="mt-3 font-serif text-base leading-snug text-ink-900 transition-colors duration-200 group-hover:text-tibetan-600">
                    {t('reader.titleWithQuotes', { title: localizedMeta(next, lang).title })}
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
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 cursor-pointer rounded-xs border border-hairline bg-surface px-5 py-2.5 font-sans text-sm text-ink-700 transition-colors duration-200 hover:border-tibetan-500 hover:text-tibetan-600"
        >
          {t('reader.restore', { p: restorePct })}
        </button>
      )}

      {/* 移动端目录抽屉 */}
      {tocOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('reader.toc')}>
          <div className="absolute inset-0 bg-sandalwood-950/50" onClick={() => setTocOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto border-r border-hairline bg-rice-50 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-[11px] tracking-[0.28em] text-sandalwood-500 uppercase">{t('reader.toc')}</h2>
              <IconButton label={t('nav.closeMenu')} onClick={() => setTocOpen(false)}>
                <path d="M6 6l12 12M18 6L6 18" />
              </IconButton>
            </div>
            <ul className="mt-5 space-y-px text-sm">
              {toc.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => scrollToHeading(item.id)}
                    className={`block w-full cursor-pointer border-l py-2 pl-3 text-left transition-colors hover:text-tibetan-600 ${
                      item.level === 2
                        ? 'text-ink-700'
                        : item.level === 3
                          ? 'pl-7 text-ink-500'
                          : 'pl-10 text-ink-300'
                    } ${activeToc === item.id ? 'border-l-2 border-tibetan-600 font-medium text-tibetan-600' : 'border-hairline'}`}
                  >
                    {item.num && (
                      <span className={`mr-1 ${item.level === 2 ? 'text-tibetan-600' : 'text-ink-300'}`}>
                        {item.num}
                      </span>
                    )}
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

/** 极简图标按钮（细边方角，取代 ☰ / ⚙ / ✕ 字符） */
function IconButton({
  children,
  label,
  onClick,
  expanded,
  className = '',
}: {
  children: ReactNode
  label: string
  onClick: () => void
  expanded?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-expanded={expanded}
      className={`cursor-pointer rounded-xs border border-hairline p-1.5 text-ink-500 transition-colors duration-200 hover:border-sandalwood-500 hover:text-tibetan-600 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
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
    <div className="mt-4 rounded-card border border-hairline bg-surface p-6">
      <div className="flex items-center justify-between border-b border-hairline pb-4">
        <h3 className="font-sans text-[11px] tracking-[0.28em] text-sandalwood-500 uppercase">{t('reader.settings')}</h3>
        <IconButton label={t('nav.closeMenu')} onClick={onClose}>
          <path d="M6 6l12 12M18 6L6 18" />
        </IconButton>
      </div>

      <div className="mt-6 grid gap-8 sm:grid-cols-3">
        {/* 字号 */}
        <div>
          <p className="font-sans text-xs text-ink-500">
            {t('reader.fontSize')} <span className="ml-1 tabular-nums text-tibetan-600">{prefs.fontSize}px</span>
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xs border border-hairline text-ink-700 transition-colors hover:border-sandalwood-500"
              onClick={() => onChange({ fontSize: Math.max(FONT_SIZE_RANGE.min, prefs.fontSize - 1) })}
              aria-label="A-"
            >
              <FontSizeIcon />
            </button>
            <input
              type="range"
              min={FONT_SIZE_RANGE.min}
              max={FONT_SIZE_RANGE.max}
              step={FONT_SIZE_RANGE.step}
              value={prefs.fontSize}
              onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
              className="w-full accent-tibetan-600"
            />
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xs border border-hairline text-ink-700 transition-colors hover:border-sandalwood-500"
              onClick={() => onChange({ fontSize: Math.min(FONT_SIZE_RANGE.max, prefs.fontSize + 1) })}
              aria-label="A+"
            >
              <FontSizeIcon plus />
            </button>
          </div>
        </div>

        {/* 行距 */}
        <div>
          <p className="font-sans text-xs text-ink-500">
            {t('reader.lineHeight')} <span className="ml-1 tabular-nums text-tibetan-600">{prefs.lineHeight.toFixed(1)}</span>
          </p>
          <input
            type="range"
            min={LINE_HEIGHT_RANGE.min}
            max={LINE_HEIGHT_RANGE.max}
            step={LINE_HEIGHT_RANGE.step}
            value={prefs.lineHeight}
            onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
            className="mt-5 w-full accent-tibetan-600"
            aria-label={t('reader.lineHeight')}
          />
        </div>

        {/* 背景主题 */}
        <div>
          <p className="font-sans text-xs text-ink-500">{t('reader.theme')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {THEMES.map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => onChange({ theme: th.id })}
                title={t(th.labelKey)}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xs border transition-colors duration-200 ${
                  prefs.theme === th.id ? 'border-tibetan-600' : 'border-hairline hover:border-sandalwood-500'
                }`}
                style={{ background: th.swatch }}
                aria-label={t(th.labelKey)}
                aria-pressed={prefs.theme === th.id}
              >
                {prefs.theme === th.id && (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-tibetan-600" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 12.5l5.5 5.5L20 6.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <p className="mt-2 font-sans text-[11px] text-ink-300">
            {t(THEMES.find((x) => x.id === prefs.theme)?.labelKey ?? 'reader.themeLight')}
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-hairline pt-4 text-right">
        <button
          type="button"
          onClick={() => {
            onReset()
            onClose()
          }}
          className="cursor-pointer font-sans text-xs text-ink-500 underline underline-offset-4 transition-colors hover:text-tibetan-600"
        >
          {t('common.themeReset')}
        </button>
      </div>
    </div>
  )
}
