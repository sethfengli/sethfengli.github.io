import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { CATALOG, photoForSlug } from '../lib/content'
import { verseOfTheMoment } from '../data/verses'
import type { IllustrationVariant } from '../components/zen/ZenIllustration'
import { CoverImage } from '../components/zen/CoverImage'
import { Incense3D } from '../components/zen3d/Incense3D'
import { PhotoLogo } from '../components/zen/PhotoLogo'
import { PageBanner, SectionHeading } from '../components/ui/PageBanner'
import { Reveal } from '../components/ui/Reveal'

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
      <PageBanner
        image="/photos/hero.jpg"
        kicker={t('home.heroKicker')}
        title={t('home.heroTitle')}
        gradient="from-sandalwood-950/35 via-sandalwood-950/10 to-sandalwood-950/75"
        decor={
          <>
            {/* 飘浮莲花 */}
            <div className="pointer-events-none absolute top-24 right-[8%] hidden animate-float md:block" aria-hidden>
              <PhotoLogo className="h-20 w-20 opacity-90" />
            </div>
            <div className="pointer-events-none absolute bottom-32 left-[6%] hidden animate-float-slow md:block" aria-hidden>
              <PhotoLogo className="h-14 w-14 opacity-60" />
            </div>
          </>
        }
      >
        <div className="flex flex-col items-center pt-16 pb-2 sm:pt-20">
          <p className="animate-fade-up banner-text text-xs tracking-[0.4em] text-gold-200/90 uppercase" style={{ animationDelay: '0.15s' }}>
            {t('appNameEn')}
          </p>
          <div className="zen-divider mt-6 animate-fade-up" style={{ animationDelay: '0.25s' }}>
            <span className="text-lg">✦</span>
          </div>
          <p
            className="mt-6 max-w-2xl banner-text animate-fade-up font-serif text-base leading-loose text-paper sm:text-lg"
            style={{ animationDelay: '0.3s' }}
          >
            {t('home.heroSubtitle')}
          </p>
          <div className="mt-9 flex animate-fade-up flex-wrap items-center justify-center gap-4" style={{ animationDelay: '0.4s' }}>
            <Link to="/articles" viewTransition className="btn-gold">
              {t('home.ctaArticles')}
            </Link>
            <Link to="/lots" viewTransition className="btn-secondary border-paper/40 text-paper hover:border-gold-300 hover:bg-paper/10 hover:text-gold-200">
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

          {/* 滚动提示 */}
          <div className="mt-10 animate-fade-up" style={{ animationDelay: '0.65s' }} aria-hidden>
            <div className="mx-auto flex h-9 w-5 items-start justify-center rounded-full border border-paper/40 p-1">
              <div className="h-2 w-1 animate-bounce rounded-full bg-gold-300" />
            </div>
          </div>
        </div>
      </PageBanner>

      {/* ---------- 禅院导览 ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <SectionHeading title={t('home.quickTitle')} />
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/articles', variant: 'sutra' as const, photo: '/photos/gate.jpg', title: t('nav.articles'), desc: t('home.quickArticlesDesc') },
            { to: '/dharma', variant: 'bell' as const, photo: '/photos/bell.jpg', title: t('nav.dharma'), desc: t('home.quickDharmaDesc') },
            { to: '/prayer', variant: 'incense' as const, photo: '/photos/lantern.jpg', title: t('nav.prayer'), desc: t('home.quickPrayerDesc') },
            { to: '/lots', variant: 'koi' as const, photo: '/photos/guanyin.jpg', title: t('nav.lots'), desc: t('home.quickLotsDesc') },
          ].map((card, i) => (
            <Reveal key={card.to} delay={i * 90}>
              <QuickCard {...card} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- 精选经论 ---------- */}
      <section className="bg-rice-100/70 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <SectionHeading title={t('home.featuredTitle')} subtitle={t('home.featuredSubtitle')} />
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((a, i) => (
              <Reveal key={a.slug} delay={(i % 3) * 90}>
                <ArticleCard slug={a.slug} title={a.title} excerpt={a.excerpt} illustration={a.illustration} author={a.author} />
              </Reveal>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/articles" viewTransition className="btn-secondary">
              {t('home.featuredAll')}
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- 三大修学门径 ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <SectionHeading title={t('home.schoolsTitle')} subtitle={t('home.schoolsSubtitle')} />
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {SCHOOLS.map((s, i) => (
            <Reveal key={s.key} delay={i * 110}>
              <div className="card-link overflow-hidden">
                <CoverImage src={s.photo} alt={t(`home.${s.key}`)} fallbackVariant={s.variant} className="h-36 w-full" />
                <div className="p-6">
                  <h3 className="font-serif text-xl font-bold text-sandalwood-800">{t(`home.${s.key}`)}</h3>
                  <p className="mt-3 font-serif text-sm leading-relaxed text-ink-700">{t(`home.${s.key}Desc`)}</p>
                  <Link to={s.to} viewTransition className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-tibetan-600 transition hover:gap-2 hover:text-tibetan-500">
                    {t('home.enterSchool')}
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- 互动香炉 ---------- */}
      <section className="bg-gradient-to-b from-transparent to-rice-100/60 pb-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center sm:px-6">
          <Reveal>
            <p className="font-serif text-sm text-sandalwood-500">{t('home.incenseHint')}</p>
          </Reveal>
          <Incense3D variant="sticks" distance={16} heightClass="h-[440px] w-[440px] max-w-full" />
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
    <Link to={to} viewTransition className="card-link group overflow-hidden">
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
    <Link to={`/articles/${slug}`} viewTransition className="card-link group flex flex-col overflow-hidden">
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
