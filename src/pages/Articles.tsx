import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { CATALOG, localizedMeta, photoForSlug, readingMinutes, schoolLabel, type School } from '../lib/content'
import { ZenIllustration } from '../components/zen/ZenIllustration'
import { CoverImage } from '../components/zen/CoverImage'
import { PageIntro, Section } from '../components/ui/PageBanner'
import { Reveal } from '../components/ui/Reveal'

const PAGE_SIZE = 24

export function Articles() {
  const { t, lang } = useI18n()
  const [params, setParams] = useSearchParams()
  const school = (params.get('school') as School | null) ?? null
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATALOG.filter((a) => {
      if (school && a.school !== school) return false
      if (!q) return true
      const m = localizedMeta(a, lang)
      return (
        m.title.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.slug.includes(q)
      )
    })
  }, [school, query, lang])

  const shown = filtered.slice(0, visible)

  const setSchool = (s: School | null) => {
    setVisible(PAGE_SIZE)
    if (s) setParams({ school: s })
    else setParams({})
  }

  return (
    <div>
      {/* 页头 */}
      <PageIntro kicker={t('articles.kicker')} title={t('articles.title')} subtitle={t('articles.subtitle')} />

      <Section rhythm="tight">
        {/* 筛选与搜索：发丝线工具栏，非胶囊组 */}
        <div className="flex flex-col gap-6 border-b border-hairline pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <FilterLink active={!school} onClick={() => setSchool(null)}>
              {t('articles.all')}
            </FilterLink>
            <FilterLink active={school === 'jing'} onClick={() => setSchool('jing')}>
              {t('articles.schoolJing')}
            </FilterLink>
            <FilterLink active={school === 'chan'} onClick={() => setSchool('chan')}>
              {t('articles.schoolChan')}
            </FilterLink>
            <FilterLink active={school === 'xiuxue'} onClick={() => setSchool('xiuxue')}>
              {t('articles.schoolXiuxue')}
            </FilterLink>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-full lg:w-64">
              <svg aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-300"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
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
                className="w-full rounded-xs border border-hairline bg-surface py-2 pr-3 pl-9 font-sans text-sm text-ink-900 transition-colors placeholder:text-ink-300 focus:border-tibetan-500 focus:outline-none"
              />
            </div>
            <p className="shrink-0 font-sans text-xs tabular-nums text-ink-300">
              {t('articles.count', { n: filtered.length })}
            </p>
          </div>
        </div>

        {/* 列表：发丝线分隔的条目式列表（替代卡片网格） */}
        {shown.length === 0 ? (
          <div className="py-24 text-center">
            <ZenIllustration variant="clouds" className="mx-auto h-32 w-64 rounded-xs" animated={false} />
            <p className="mt-8 font-song text-ink-500">{t('articles.noResults')}</p>
          </div>
        ) : (
          <ul className="mt-2">
            {shown.map((a, i) => {
              const m = localizedMeta(a, lang)
              const quoted = lang === 'zh' ? `《${m.title}》` : m.title
              return (
                <Reveal key={a.slug} as="li" delay={(i % 6) * 50} className="border-b border-hairline">
                  <Link
                    to={`/articles/${a.slug}`}
                    viewTransition
                    className="group grid grid-cols-[5rem_1fr] items-start gap-5 py-6 transition-colors duration-200 sm:grid-cols-[7rem_1fr] sm:gap-7"
                  >
                    <div className="card-media relative aspect-4/3 overflow-hidden rounded-xs border border-hairline bg-rice-100">
                      <CoverImage
                        src={photoForSlug(a.slug)}
                        alt={t('home.coverAlt', { t: m.title })}
                        fallbackVariant={a.illustration}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h2 className="font-serif text-base leading-snug font-normal text-ink-900 transition-colors duration-200 group-hover:text-tibetan-600 sm:text-lg">
                          {quoted}
                        </h2>
                        <span className="font-sans text-[10px] tracking-[0.18em] text-ink-300 uppercase">
                          {schoolLabel(a.school, lang)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 font-song text-sm leading-[1.9] text-ink-500">{m.excerpt}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-xs text-ink-300">
                        <span>{m.author ? t('common.authorBy', { name: m.author }) : t('reader.authorLabel')}</span>
                        <span aria-hidden className="h-3 w-px bg-hairline" />
                        <span>{t('articles.readingTime', { n: readingMinutes(a.chars) })}</span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              )
            })}
          </ul>
        )}

        {/* 加载更多 */}
        {visible < filtered.length && (
          <div className="mt-12 text-center">
            <button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)} className="btn-secondary">
              {t('articles.loadMore')}（{shown.length} / {filtered.length}）
            </button>
          </div>
        )}
      </Section>
    </div>
  )
}

/** 院系筛选：文字标签 + 朱砂下划线（替代胶囊按钮组） */
function FilterLink({
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
      aria-pressed={active}
      className={`relative cursor-pointer py-1 font-sans text-sm transition-colors duration-200 after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:bg-tibetan-600 after:transition-transform after:duration-300 ${
        active
          ? 'text-ink-900 after:scale-x-100'
          : 'text-ink-500 after:scale-x-0 hover:text-ink-900 hover:after:scale-x-100'
      }`}
    >
      {children}
    </button>
  )
}
