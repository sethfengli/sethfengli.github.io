import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { CATALOG, localizedMeta, photoForSlug } from '../lib/content'
import { verseOfTheMoment } from '../data/verses'
import type { IllustrationVariant } from '../components/zen/ZenIllustration'
import { CoverImage } from '../components/zen/CoverImage'
import { Incense3D } from '../components/zen3d/Incense3D'
import { PhotoLogo } from '../components/zen/PhotoLogo'
import { PageBanner, SectionHeading } from '../components/ui/PageBanner'
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

  return (
    <div>
      {/* ---------- Hero（明快浅色调） ---------- */}
      <PageBanner
        image="/photos/blossom.jpg"
        kicker={t('home.heroKicker')}
        title={t('home.heroTitle')}
        subtitle={t('home.heroSubtitle')}
        decor={
          <>
            {/* 飘浮莲花 */}
            <div className="pointer-events-none absolute top-24 right-[8%] hidden animate-float md:block" aria-hidden>
              <PhotoLogo className="h-20 w-20 opacity-70" />
            </div>
            <div className="pointer-events-none absolute bottom-24 left-[6%] hidden animate-float-slow md:block" aria-hidden>
              <PhotoLogo className="h-14 w-14 opacity-45" />
            </div>
          </>
        }
      >
        <div className="flex flex-col items-center pt-6 pb-2">
          <div className="zen-divider mt-4 animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <span className="text-lg">✦</span>
          </div>
          <div className="mt-8 flex animate-fade-up flex-wrap items-center justify-center gap-4" style={{ animationDelay: '0.25s' }}>
            <Link to="/articles" viewTransition className="btn-gold">
              {t('home.ctaArticles')}
            </Link>
            <Link to="/lots" viewTransition className="btn-secondary border-sandalwood-500/50 bg-rice-50/70 text-sandalwood-800 hover:border-tibetan-500 hover:bg-rice-50 hover:text-tibetan-700">
              {t('home.ctaLots')}
            </Link>
          </div>

          {/* 每日法语 */}
          <blockquote
            className="mt-12 max-w-2xl animate-fade-up rounded-2xl border border-gold-500/40 bg-paper/80 px-6 py-5 shadow-lg shadow-sandalwood-900/5 backdrop-blur-sm sm:px-8"
            style={{ animationDelay: '0.35s' }}
          >
            <p className="font-serif text-sm tracking-widest text-tibetan-600">{t('home.dailyVerseTitle')}</p>
            <p className="mt-3 font-brush text-xl leading-relaxed text-ink-900">
              {lang === 'zh' ? `「${verseText}」` : `“${verseText}”`}
            </p>
            <footer className="mt-2 text-right font-serif text-xs text-ink-500">—— {verseSource}</footer>
          </blockquote>

          {/* 滚动提示 */}
          <div className="mt-10 animate-fade-up" style={{ animationDelay: '0.45s' }} aria-hidden>
            <div className="mx-auto flex h-9 w-5 items-start justify-center rounded-full border border-sandalwood-600/50 p-1">
              <div className="h-2 w-1 animate-bounce rounded-full bg-tibetan-500" />
            </div>
          </div>
        </div>
      </PageBanner>

      {/* ---------- 从这里开始（导览卡片） ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <SectionHeading title={t('home.quickTitle')} subtitle={t('home.quickSubtitle')} />
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

      {/* ---------- 读一部经典 ---------- */}
      <section className="bg-rice-100/70 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <SectionHeading title={t('home.featuredTitle')} subtitle={t('home.featuredSubtitle')} />
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((a, i) => {
              const m = localizedMeta(a, lang)
              return (
                <Reveal key={a.slug} delay={(i % 3) * 90}>
                  <ArticleCard slug={a.slug} title={m.title} excerpt={m.excerpt} illustration={a.illustration} author={m.author} />
                </Reveal>
              )
            })}
          </div>
          <div className="mt-10 text-center">
            <Link to="/articles" viewTransition className="btn-secondary">
              {t('home.featuredAll')}
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- 小憩：一炷心香 ---------- */}
      <section className="bg-gradient-to-b from-transparent to-rice-100/60 pb-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center sm:px-6">
          <Reveal>
            <p className="font-serif text-sm text-sandalwood-500">{t('home.incenseHint')}</p>
          </Reveal>
          {/* 起始即全景（最小缩放），用户可自行拉近 */}
          <Incense3D variant="sticks" distance={16} maxDistance={16} heightClass="h-[440px] w-[440px] max-w-full" />
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
  const { t, lang } = useI18n()
  const quoted = lang === 'en' ? title : `《${title}》`
  return (
    <Link to={`/articles/${slug}`} viewTransition className="card-link group flex flex-col overflow-hidden">
      <div className="relative overflow-hidden">
        <CoverImage src={photoForSlug(slug)} alt={t('home.coverAlt', { t: title })} fallbackVariant={illustration} className="h-36 w-full transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute right-3 bottom-3 rounded-full bg-sandalwood-950/70 px-2.5 py-1 text-[10px] tracking-wider text-gold-200">
          {t('home.badge')}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-lg font-bold text-sandalwood-800 transition group-hover:text-tibetan-700">
          {quoted}
        </h3>
        {author && <p className="mt-1 text-xs text-sandalwood-400">{t('common.authorBy', { name: author })}</p>}
        <p className="mt-3 line-clamp-3 flex-1 font-serif text-sm leading-relaxed text-ink-700">{excerpt}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-gold-600">
          <span className="h-px w-6 bg-gold-400" />
          {t('home.readFull')}
        </span>
      </div>
    </Link>
  )
}
