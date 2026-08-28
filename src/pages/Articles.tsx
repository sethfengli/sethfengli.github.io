import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { CATALOG, photoForSlug, readingMinutes, type School } from '../lib/content'
import { ZenIllustration } from '../components/zen/ZenIllustration'
import { CoverImage } from '../components/zen/CoverImage'
import { PageIntro } from '../components/ui/PageBanner'

const PAGE_SIZE = 24

export function Articles() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const school = (params.get('school') as School | null) ?? null
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATALOG.filter((a) => {
      if (school && a.school !== school) return false
      if (q && !a.title.toLowerCase().includes(q) && !a.slug.includes(q)) return false
      return true
    })
  }, [school, query])

  const shown = filtered.slice(0, visible)

  const setSchool = (s: School | null) => {
    setVisible(PAGE_SIZE)
    if (s) setParams({ school: s })
    else setParams({})
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* 页头 */}
      <PageIntro kicker="法 藏" title={t('articles.title')} subtitle={t('articles.subtitle')} />

      {/* 头图横幅（真实照片） */}
      <div className="mx-auto mt-8 h-40 max-w-3xl overflow-hidden rounded-3xl shadow-md shadow-sandalwood-900/10">
        <CoverImage src="/photos/gate.jpg" alt="" fallbackVariant="clouds" className="h-full w-full" />
      </div>

      {/* 筛选与搜索 */}
      <div className="mt-10 flex flex-col items-center gap-4">
        <div className="flex flex-wrap justify-center gap-2">
          <FilterChip active={!school} onClick={() => setSchool(null)}>
            {t('articles.all')}
          </FilterChip>
          <FilterChip active={school === 'jing'} onClick={() => setSchool('jing')}>
            {t('articles.schoolJing')}
          </FilterChip>
          <FilterChip active={school === 'chan'} onClick={() => setSchool('chan')}>
            {t('articles.schoolChan')}
          </FilterChip>
          <FilterChip active={school === 'xiuxue'} onClick={() => setSchool('xiuxue')}>
            {t('articles.schoolXiuxue')}
          </FilterChip>
        </div>
        <div className="relative w-full max-w-md">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-sandalwood-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <circle cx={11} cy={11} r={7} />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setVisible(PAGE_SIZE)
            }}
            placeholder={t('articles.searchPlaceholder')}
            aria-label={t('articles.searchPlaceholder')}
            className="w-full rounded-full border border-sandalwood-300/70 bg-surface py-2.5 pr-4 pl-11 font-sans text-sm text-ink-900 transition-colors placeholder:text-ink-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-300 focus:outline-none"
          />
        </div>
        <p className="text-xs tabular-nums text-sandalwood-400">
          {filtered.length} 篇
        </p>
      </div>

      {/* 列表 */}
      {shown.length === 0 ? (
        <div className="mt-16 text-center">
          <ZenIllustration variant="clouds" className="mx-auto h-40 w-72 rounded-2xl" animated={false} />
          <p className="mt-6 font-serif text-sandalwood-500">{t('articles.noResults')}</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((a) => (
            <Link key={a.slug} to={`/articles/${a.slug}`} viewTransition className="card-link group flex flex-col overflow-hidden">
              <div className="relative overflow-hidden">
                <CoverImage
                  src={photoForSlug(a.slug)}
                  alt={`${a.title} · 配图`}
                  fallbackVariant={a.illustration}
                  className="h-32 w-full transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-3 left-3 rounded-full bg-sandalwood-950/70 px-2.5 py-1 text-[10px] tracking-wider text-gold-200 backdrop-blur-sm">
                  {schoolName(a.school)}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-serif text-base font-bold text-sandalwood-800 transition group-hover:text-tibetan-700">
                  《{a.title}》
                </h2>
                <p className="mt-2 line-clamp-2 flex-1 font-serif text-sm leading-relaxed text-ink-700">{a.excerpt}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-sandalwood-400">
                  <span>{a.author ? `作者：${a.author}` : t('reader.authorLabel')}</span>
                  <span>{t('articles.readingTime', { n: readingMinutes(a.chars) })}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 加载更多 */}
      {visible < filtered.length && (
        <div className="mt-10 text-center">
          <button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)} className="btn-secondary">
            {t('articles.loadMore')}（{shown.length} / {filtered.length}）
          </button>
        </div>
      )}
    </div>
  )
}

function schoolName(school: School): string {
  switch (school) {
    case 'jing':
      return '净修院'
    case 'chan':
      return '禅修院'
    case 'xiuxue':
      return '修学园地'
  }
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full px-4 py-1.5 text-sm transition ${
        active
          ? 'bg-tibetan-600 font-medium text-paper shadow-md shadow-tibetan-900/20'
          : 'border border-sandalwood-300/70 bg-surface text-ink-700 hover:border-tibetan-400 hover:text-tibetan-600'
      }`}
    >
      {children}
    </button>
  )
}
