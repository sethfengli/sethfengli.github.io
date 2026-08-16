import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { CATALOG, photoForSlug } from '../lib/content'
import { verseOfTheMoment } from '../data/verses'
import type { IllustrationVariant } from '../components/zen/ZenIllustration'
import { CoverImage } from '../components/zen/CoverImage'
import { IncenseBurner } from '../components/zen/IncenseBurner'
import { PhotoLogo } from '../components/zen/PhotoLogo'

const FEATURED_SLUGS = ['301jgj', '302xinj', '303liuzutanjing', '102lfsx', '001jznf', '001zyxuefo', '402nianfolun', '202bada']

const SCHOOLS: Array<{
  key: 'schoolJing' | 'schoolChan' | 'schoolXiuxue'
  to: string
  variant: IllustrationVariant
  photo: string
}> = [
  { key: 'schoolJing', to: '/articles?school=jing', variant: 'lotus', photo: '/photos/hero.jpg' },
  { key: 'schoolChan', to: '/articles?school=chan', variant: 'enso', photo: '/photos/garden.jpg' },
  { key: 'schoolXiuxue', to: '/articles?school=xiuxue', variant: 'mountains', photo: '/photos/blossom.jpg' },
]

export function Home() {
  const { t } = useI18n()
  const verse = verseOfTheMoment()

  const featured = FEATURED_SLUGS.map((s) => CATALOG.find((a) => a.slug === s)).filter(
    (a): a is NonNullable<typeof a> => Boolean(a),
  )

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-sandalwood-950 text-paper">
        <div className="absolute inset-0">
          <CoverImage src="/photos/hero.jpg" alt="" fallbackVariant="mountains" animated={false} className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sandalwood-950/35 via-sandalwood-950/0 to-sandalwood-950/70" />
        {/* 飘浮莲花 */}
        <div className="pointer-events-none absolute top-24 right-[8%] hidden animate-float md:block">
          <PhotoLogo className="h-20 w-20 opacity-90" />
        </div>
        <div className="pointer-events-none absolute bottom-32 left-[6%] hidden animate-float-slow md:block">
          <PhotoLogo className="h-14 w-14 opacity-60" />
        </div>

        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-20 pb-14 text-center sm:px-6">
          <p className="animate-fade-up font-serif text-sm tracking-[0.5em] text-gold-300">
            {t('home.heroKicker')}
          </p>
          <h1
            className="mt-5 animate-fade-up font-brush text-6xl tracking-[0.06em] text-paper drop-shadow-lg sm:text-7xl"
            style={{ animationDelay: '0.1s' }}
          >
            {t('home.heroTitle')}
          </h1>
          <p
            className="mt-3 animate-fade-up text-xs tracking-[0.4em] text-gold-200/90 uppercase"
            style={{ animationDelay: '0.2s' }}
          >
            {t('appNameEn')}
          </p>
          <div className="zen-divider mt-6 animate-fade-up" style={{ animationDelay: '0.25s' }}>
            <span className="text-lg">✦</span>
          </div>
          <p
            className="mt-6 max-w-2xl animate-fade-up font-serif text-base leading-loose text-paper/90 sm:text-lg"
            style={{ animationDelay: '0.3s' }}
          >
            {t('home.heroSubtitle')}
          </p>
          <div className="mt-9 flex animate-fade-up flex-wrap items-center justify-center gap-4" style={{ animationDelay: '0.4s' }}>
            <Link to="/articles" className="btn-gold">
              {t('home.ctaArticles')}
            </Link>
            <Link to="/lots" className="btn-secondary border-paper/40 text-paper hover:border-gold-300 hover:bg-paper/10 hover:text-gold-200">
              {t('home.ctaLots')}
            </Link>
          </div>

          {/* 每日法语 */}
          <blockquote
            className="mt-14 max-w-2xl animate-fade-up rounded-2xl border border-gold-400/25 bg-sandalwood-900/60 px-6 py-5 backdrop-blur-sm sm:px-8"
            style={{ animationDelay: '0.5s' }}
          >
            <p className="font-serif text-sm tracking-widest text-gold-300">{t('home.dailyVerseTitle')}</p>
            <p className="mt-3 font-brush text-xl leading-relaxed text-paper/95">「{verse.text}」</p>
            <footer className="mt-2 text-right font-serif text-xs text-paper/60">—— {verse.source}</footer>
          </blockquote>
        </div>
      </section>

      {/* ---------- 禅院导览 ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center font-brush text-3xl text-sandalwood-800 sm:text-4xl">
          {t('home.quickTitle')}
        </h2>
        <div className="zen-divider mt-4">
          <span className="text-gold-500">❖</span>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <QuickCard to="/articles" variant="sutra" photo="/photos/gate.jpg" title={t('nav.articles')} desc={t('home.quickArticlesDesc')} />
          <QuickCard to="/dharma" variant="bell" photo="/photos/bell.jpg" title={t('nav.dharma')} desc={t('home.quickDharmaDesc')} />
          <QuickCard to="/prayer" variant="incense" photo="/photos/lantern.jpg" title={t('nav.prayer')} desc={t('home.quickPrayerDesc')} />
          <QuickCard to="/lots" variant="koi" photo="/photos/guanyin.jpg" title={t('nav.lots')} desc={t('home.quickLotsDesc')} />
        </div>
      </section>

      {/* ---------- 精选经论 ---------- */}
      <section className="bg-rice-100/70 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center font-brush text-3xl text-sandalwood-800 sm:text-4xl">
            {t('home.featuredTitle')}
          </h2>
          <p className="mt-2 text-center font-serif text-sm text-sandalwood-500">{t('home.featuredSubtitle')}</p>
          <div className="zen-divider mt-4">
            <span className="text-gold-500">❖</span>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((a) => (
              <ArticleCard key={a.slug} slug={a.slug} title={a.title} excerpt={a.excerpt} illustration={a.illustration} author={a.author} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/articles" className="btn-secondary">
              {t('home.featuredAll')}
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- 三大修学门径 ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center font-brush text-3xl text-sandalwood-800 sm:text-4xl">
          {t('home.schoolsTitle')}
        </h2>
        <p className="mt-2 text-center font-serif text-sm text-sandalwood-500">{t('home.schoolsSubtitle')}</p>
        <div className="zen-divider mt-4">
          <span className="text-gold-500">❖</span>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {SCHOOLS.map((s) => (
            <div key={s.key} className="card overflow-hidden">
              <CoverImage src={s.photo} alt={t(`home.${s.key}`)} fallbackVariant={s.variant} className="h-36 w-full" />
              <div className="p-6">
                <h3 className="font-serif text-xl font-bold text-sandalwood-800">{t(`home.${s.key}`)}</h3>
                <p className="mt-3 font-serif text-sm leading-relaxed text-ink-700">{t(`home.${s.key}Desc`)}</p>
                <Link to={s.to} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-tibetan-600 transition hover:text-tibetan-500">
                  {t('home.enterSchool')}
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- 互动香炉 ---------- */}
      <section className="bg-gradient-to-b from-transparent to-rice-100/60 pb-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center sm:px-6">
          <IncenseBurner />
        </div>
      </section>
    </div>
  )
}

function QuickCard({
  to,
  variant,
  photo,
  title,
  desc,
}: {
  to: string
  variant: IllustrationVariant
  photo: string
  title: string
  desc: string
}) {
  return (
    <Link to={to} className="card group overflow-hidden">
      <div className="overflow-hidden">
        <CoverImage
          src={photo}
          alt={title}
          fallbackVariant={variant}
          className="h-32 w-full transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-5">
        <h3 className="font-serif text-lg font-bold text-sandalwood-800">{title}</h3>
        <p className="mt-2 font-serif text-sm leading-relaxed text-ink-700">{desc}</p>
      </div>
    </Link>
  )
}

function ArticleCard({
  slug,
  title,
  excerpt,
  illustration,
  author,
}: {
  slug: string
  title: string
  excerpt: string
  illustration: IllustrationVariant
  author: string
}) {
  return (
    <Link to={`/articles/${slug}`} className="card group flex flex-col overflow-hidden">
      <div className="relative overflow-hidden">
        <CoverImage src={photoForSlug(slug)} alt={`${title} · 配图`} fallbackVariant={illustration} className="h-36 w-full transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute right-3 bottom-3 rounded-full bg-sandalwood-950/70 px-2.5 py-1 text-[10px] tracking-wider text-gold-200">
          慧灯 · 法藏
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-lg font-bold text-sandalwood-800 transition group-hover:text-tibetan-700">
          《{title}》
        </h3>
        {author && <p className="mt-1 text-xs text-sandalwood-400">作者：{author}</p>}
        <p className="mt-3 line-clamp-3 flex-1 font-serif text-sm leading-relaxed text-ink-700">{excerpt}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-gold-600">
          <span className="h-px w-6 bg-gold-400" />
          阅读全文
        </span>
      </div>
    </Link>
  )
}
