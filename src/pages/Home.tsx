import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { CATALOG, NAMED_PHOTOS, localizedMeta, photoForSlug } from '../lib/content'
import { verseOfTheMoment } from '../data/verses'
import type { IllustrationVariant } from '../components/zen/ZenIllustration'
import { CoverImage } from '../components/zen/CoverImage'
import { Incense3D } from '../components/zen3d/Incense3D'
import { PageBanner, Section, SectionHeading, Ornament } from '../components/ui/PageBanner'
import { Reveal } from '../components/ui/Reveal'

const FEATURED_SLUGS = ['301jgj', '302xinj', '303liuzutanjing', '102lfsx', '001jznf', '001zyxuefo', '402nianfolun', '202bada']

export function Home() {
  const { t, lang } = useI18n()
  const verse = verseOfTheMoment()
  const verseText = lang === 'en' ? verse.en.text : verse.text
  const verseSource = lang === 'en' ? verse.en.source : verse.source

  const featured = FEATURED_SLUGS.map((s) => CATALOG.find((a) => a.slug === s)).filter(
    (a): a is NonNullable<typeof a> => Boolean(a),
  )

  const [lead, ...rest] = featured
  const leadMeta = lead ? localizedMeta(lead, lang) : null

  return (
    <div>
      {/* ---------- Hero：图文并置题头 ---------- */}
      <PageBanner
        image={NAMED_PHOTOS.hero()}
        kicker={t('home.heroKicker')}
        title={t('home.heroTitle')}
        subtitle={t('home.heroSubtitle')}
      >
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link to="/articles" viewTransition className="btn-primary">
            {t('home.ctaArticles')}
          </Link>
          <Link to="/lots" viewTransition className="btn-secondary">
            {t('home.ctaLots')}
          </Link>
        </div>
      </PageBanner>

      {/* ---------- 每日法语：单栏左对齐，小标在上、引文在下（不再左右拉扯） ---------- */}
      <section className="border-b border-hairline">
        <div className="container-page py-16 lg:py-20">
          <div className="max-w-3xl">
            <p className="section-kicker">{t('home.dailyVerseTitle')}</p>
            <blockquote className="mt-7 font-serif text-xl leading-[2] text-ink-900 text-balance sm:text-2xl">
              {lang === 'zh' ? `「${verseText}」` : `“${verseText}”`}
            </blockquote>
            <footer className="mt-6 flex items-center gap-3 font-sans text-xs tracking-wider text-ink-500">
              <span className="h-px w-6 bg-hairline" />
              {verseSource}
            </footer>
          </div>
        </div>
      </section>

      {/* ---------- 从这里开始（导览） ---------- */}
      <Section>
        <Reveal>
          <SectionHeading
            align="left"
            kicker={t('nav.home')}
            title={t('home.quickTitle')}
            subtitle={t('home.quickSubtitle')}
          />
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/articles', variant: 'sutra' as const, photo: NAMED_PHOTOS.gate(), title: t('nav.articles'), desc: t('home.quickArticlesDesc') },
            { to: '/dharma', variant: 'bell' as const, photo: NAMED_PHOTOS.bell(), title: t('nav.dharma'), desc: t('home.quickDharmaDesc') },
            { to: '/prayer', variant: 'incense' as const, photo: NAMED_PHOTOS.lantern(), title: t('nav.prayer'), desc: t('home.quickPrayerDesc') },
            { to: '/lots', variant: 'koi' as const, photo: NAMED_PHOTOS.guanyin(), title: t('nav.lots'), desc: t('home.quickLotsDesc') },
          ].map((card, i) => (
            <Reveal key={card.to} delay={i * 90} className="h-full">
              <QuickCard {...card} index={i} />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ---------- 读一部经典：主推 + 次级列表 ---------- */}
      <Section tone="muted" className="border-y border-hairline">
        <Reveal>
          <SectionHeading
            align="left"
            kicker={t('nav.articles')}
            title={t('home.featuredTitle')}
            subtitle={t('home.featuredSubtitle')}
          />
        </Reveal>

        {lead && leadMeta && (
          <Reveal className="mt-10">
            <ArticleLead
              slug={lead.slug}
              title={leadMeta.title}
              excerpt={leadMeta.excerpt}
              author={leadMeta.author}
              illustration={lead.illustration}
            />
          </Reveal>
        )}

        <ul className="mt-12 border-t border-hairline">
          {rest.map((a, i) => {
            const m = localizedMeta(a, lang)
            return (
              <Reveal key={a.slug} delay={(i % 4) * 70}>
                <ArticleRow slug={a.slug} title={m.title} excerpt={m.excerpt} author={m.author} />
              </Reveal>
            )
          })}
        </ul>

        <div className="mt-10">
          <Link to="/articles" viewTransition className="btn-secondary">
            {t('home.featuredAll')}
          </Link>
        </div>
      </Section>

      {/* ---------- 小憩：一炷心香 ---------- */}
      <Section width="narrow" rhythm="loose">
        <div className="flex flex-col items-center gap-8 text-center">
          <Reveal>
            <Ornament />
          </Reveal>
          <Reveal delay={80}>
            <p className="max-w-md font-song text-sm leading-relaxed text-ink-500">{t('home.incenseHint')}</p>
          </Reveal>
          <Reveal delay={140}>
            {/* 起始即全景（最小缩放），用户可自行拉近 */}
            <Incense3D variant="sticks" distance={16} maxDistance={16} heightClass="h-[420px] w-[420px] max-w-full" />
          </Reveal>
        </div>
      </Section>
    </div>
  )
}

/** 导览卡：统一高度，以序号 + 发丝描边建立层级 */
function QuickCard({
  to,
  variant,
  photo,
  title,
  desc,
  index,
}: {
  to: string
  variant: IllustrationVariant
  photo: string
  title: string
  desc: string
  index: number
}) {
  return (
    <Link
      to={to}
      viewTransition
      className="card-link group flex h-full flex-col overflow-hidden"
    >
      <div className="card-media relative h-32 shrink-0 overflow-hidden border-b border-hairline bg-rice-100">
        <CoverImage
          src={photo}
          alt={title}
          fallbackVariant={variant}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <span className="font-sans text-[11px] tracking-[0.2em] text-ink-300">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h3 className="mt-3 font-serif text-lg font-normal text-ink-900 transition-colors duration-200 group-hover:text-tibetan-600">
          {title}
        </h3>
        <p className="mt-3 font-song text-sm leading-[1.9] text-ink-500">{desc}</p>
      </div>
    </Link>
  )
}

/** 主推经典：左图右文的大幅非对称编排 */
function ArticleLead({
  slug,
  title,
  excerpt,
  author,
  illustration,
}: {
  slug: string
  title: string
  excerpt: string
  author: string
  illustration: IllustrationVariant
}) {
  const { t, lang } = useI18n()
  const quoted = lang === 'en' ? title : `《${title}》`
  return (
    <Link
      to={`/articles/${slug}`}
      viewTransition
      className="group grid items-stretch border border-hairline bg-surface lg:grid-cols-12"
    >
      <div className="card-media relative h-56 overflow-hidden bg-rice-100 sm:h-64 lg:col-span-6 lg:h-auto lg:min-h-[22rem]">
        <CoverImage
          src={photoForSlug(slug)}
          alt={t('home.coverAlt', { t: title })}
          fallbackVariant={illustration}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-col justify-center border-t border-hairline p-8 lg:col-span-6 lg:border-t-0 lg:border-l lg:p-12">
        <span className="seal self-start">{t('home.badge')}</span>
        <h3 className="mt-6 font-serif text-2xl leading-snug font-normal text-ink-900 transition-colors duration-200 group-hover:text-tibetan-600 sm:text-3xl">
          {quoted}
        </h3>
        {author && (
          <p className="mt-3 font-sans text-xs tracking-wider text-ink-300">
            {t('common.authorBy', { name: author })}
          </p>
        )}
        <p className="mt-6 line-clamp-4 font-song text-sm leading-[1.95] text-ink-500">{excerpt}</p>
        <span className="mt-8 inline-flex items-center gap-2 font-sans text-xs tracking-wider text-tibetan-600">
          {t('home.readFull')}
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </Link>
  )
}

/** 次级经典：发丝线分隔的文字条目（替代卡片网格） */
function ArticleRow({
  slug,
  title,
  excerpt,
  author,
}: {
  slug: string
  title: string
  excerpt: string
  author: string
}) {
  const { t, lang } = useI18n()
  const quoted = lang === 'en' ? title : `《${title}》`
  return (
    <li className="border-b border-hairline">
      <Link
        to={`/articles/${slug}`}
        viewTransition
        className="group grid gap-3 py-7 transition-colors duration-200 lg:grid-cols-12 lg:items-start lg:gap-8"
      >
        <div className="lg:col-span-4">
          <h3 className="font-serif text-lg leading-snug font-normal text-ink-900 transition-colors duration-200 group-hover:text-tibetan-600">
            {quoted}
          </h3>
          {author && (
            <p className="mt-2 font-sans text-xs tracking-wider text-ink-300">
              {t('common.authorBy', { name: author })}
            </p>
          )}
        </div>
        <p className="line-clamp-2 font-song text-sm leading-[1.9] text-ink-500 lg:col-span-7">{excerpt}</p>
        <div className="flex items-start lg:col-span-1 lg:justify-end lg:pt-1">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-tibetan-600" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
      </Link>
    </li>
  )
}
