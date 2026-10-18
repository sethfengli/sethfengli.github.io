import { lazy, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import {
  CATALOG,
  NAMED_PHOTOS,
  PHOTO_NAMES,
  localizedMeta,
  readingMinutes,
  schoolLabel,
} from '../lib/content'
import { VERSES, verseOfTheMoment } from '../data/verses'
import type { IllustrationVariant } from '../components/zen/ZenIllustration'
import { CoverImage } from '../components/zen/CoverImage'
import { IncenseBurner } from '../components/zen/IncenseBurner'
import { Contained3D } from '../components/zen3d/Contained3D'
import { Section, SectionHeading } from '../components/ui/PageBanner'
import { Reveal } from '../components/ui/Reveal'

/**
 * 3D 香炉按需加载（第 9 轮）：`three.js` 是 **707 KB（gzip 184 KB）** 的独立 chunk。
 * 它不是首屏内容，只是页面末尾「一炷心香」的点睛，因此仍用视口门控：
 * 首屏不下载 three，滚到那一段才请求。占位改用**可点的 2D 香炉**（不是空白方块），
 * 既避免版面跳动，也让这一段在 3D 到位前就能玩。
 */
const Incense3D = lazy(() =>
  import('../components/zen3d/Incense3D').then((m) => ({ default: m.Incense3D })),
)

/** 主推六篇：一部大经压阵，其余按「入门 → 禅 → 净」排开，不再堆成八条长名单 */
const FEATURED_SLUGS = ['301jgj', '302xinj', '303liuzutanjing', '102lfsx', '001jznf', '001zyxuefo']

/** 32 签 + 125 卦（数据分别在 data/lots.ts 与 content/lingqi.json；此处只作展示数字） */
const DIVINATION_COUNT = 157

type NowKey =
  | 'home.nowLate'
  | 'home.nowMorning'
  | 'home.nowNoon'
  | 'home.nowAfternoon'
  | 'home.nowEvening'

/** 按本地时辰给一句「此刻宜做什么」，让首页不是一张静态海报 */
function nowKey(): NowKey {
  const h = new Date().getHours()
  if (h < 5 || h >= 23) return 'home.nowLate'
  if (h < 11) return 'home.nowMorning'
  if (h < 14) return 'home.nowNoon'
  if (h < 18) return 'home.nowAfternoon'
  return 'home.nowEvening'
}

export function Home() {
  const { t, lang } = useI18n()
  const [verseIdx, setVerseIdx] = useState(() => {
    const found = VERSES.indexOf(verseOfTheMoment())
    return found < 0 ? 0 : found
  })
  const verse = VERSES[verseIdx]
  const verseText = lang === 'en' ? verse.en.text : verse.text
  const verseSource = lang === 'en' ? verse.en.source : verse.source

  const today = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-GB', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())

  const featured = FEATURED_SLUGS.map((s) => CATALOG.find((a) => a.slug === s)).filter(
    (a): a is NonNullable<typeof a> => Boolean(a),
  )
  const [lead, ...rest] = featured
  const leadMeta = lead ? localizedMeta(lead, lang) : null

  const doors: Array<{
    to: string
    variant: IllustrationVariant
    photo: string
    position: string
    title: string
    desc: string
  }> = [
    {
      to: '/articles',
      variant: 'sutra',
      photo: NAMED_PHOTOS.gate(),
      position: '50% 44%',
      title: t('nav.articles'),
      desc: t('home.quickArticlesDesc'),
    },
    {
      to: '/dharma',
      variant: 'bell',
      photo: NAMED_PHOTOS.bell(),
      position: '50% 42%',
      title: t('nav.dharma'),
      desc: t('home.quickDharmaDesc'),
    },
    {
      to: '/prayer',
      variant: 'incense',
      photo: NAMED_PHOTOS.lantern(),
      position: '50% 46%',
      title: t('nav.prayer'),
      desc: t('home.quickPrayerDesc'),
    },
    {
      to: '/lots',
      variant: 'koi',
      photo: NAMED_PHOTOS.guanyin(),
      position: '50% 30%',
      title: t('nav.lots'),
      desc: t('home.quickLotsDesc'),
    },
  ]

  return (
    <div>
      {/* ---------- Hero：左题右图，先把「这是一座什么样的庙」说清楚 ---------- */}
      <header className="border-b border-hairline">
        <div className="container-page grid items-center gap-10 pt-10 pb-14 lg:grid-cols-12 lg:gap-14 lg:pt-16 lg:pb-20">
          <div className="lg:col-span-5">
            <div className="flex flex-wrap items-center gap-3">
              <p className="section-kicker">{t('home.heroKicker')}</p>
              <span aria-hidden className="hidden h-px w-8 bg-hairline sm:block" />
              <p className="font-sans text-[11px] tracking-[0.16em] text-ink-300">{today}</p>
            </div>

            <h1 className="mt-6 font-serif text-[clamp(3rem,6.4vw,5.2rem)] leading-[1.05] font-normal tracking-[0.08em] text-ink-900">
              {t('home.heroTitle')}
            </h1>
            <p className="mt-6 max-w-xl font-serif text-base leading-[2] text-ink-500">
              {t('home.heroSubtitle')}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/articles" viewTransition className="btn-primary">
                {t('home.ctaArticles')}
              </Link>
              <Link to="/lots" viewTransition className="btn-secondary">
                {t('home.ctaLots')}
              </Link>
            </div>

            <p className="mt-7 inline-flex items-center gap-2.5 border border-hairline px-3 py-2">
              <span className="seal">{t('home.todayLabel')}</span>
              <span className="font-song text-sm text-ink-500">{t(nowKey())}</span>
            </p>

            <dl className="mt-9 grid grid-cols-3 divide-x divide-hairline border-y border-hairline py-5">
              <div className="pr-4">
                <dt className="font-serif text-2xl leading-none text-ink-900 tabular-nums">{CATALOG.length}</dt>
                <dd className="mt-2 font-sans text-[11px] tracking-wider text-ink-500">{t('home.statTexts')}</dd>
              </div>
              <div className="px-4">
                <dt className="font-serif text-2xl leading-none text-ink-900 tabular-nums">{PHOTO_NAMES.length}</dt>
                <dd className="mt-2 font-sans text-[11px] tracking-wider text-ink-500">{t('home.statPhotos')}</dd>
              </div>
              <div className="pl-4">
                <dt className="font-serif text-2xl leading-none text-ink-900 tabular-nums">{DIVINATION_COUNT}</dt>
                <dd className="mt-2 font-sans text-[11px] tracking-wider text-ink-500">{t('home.statLots')}</dd>
              </div>
            </dl>
            <p className="mt-3 font-sans text-[11px] tracking-wide text-ink-300">{t('home.heroTrust')}</p>
          </div>

          <div className="lg:col-span-7">
            <div className="relative">
              <span
                aria-hidden
                className="absolute -top-2.5 -right-2.5 hidden h-full w-full border border-celadon-300 lg:block"
              />
              <div className="relative aspect-[4/3] overflow-hidden border border-hairline bg-rice-100 sm:aspect-[16/10]">
                <CoverImage
                  src={NAMED_PHOTOS.hero()}
                  alt={t('home.heroTitle')}
                  fallbackVariant="moon"
                  priority
                  position="50% 46%"
                  className="h-full w-full"
                />
              </div>
            </div>
            <p className="mt-3 flex items-center justify-between gap-4 font-sans text-[10px] tracking-[0.18em] text-ink-300 uppercase">
              <span>{t('appNameEn')}</span>
              <span className="text-right">{t('slogan')}</span>
            </p>
          </div>
        </div>
      </header>

      {/* ---------- 四门：图片放大到 4:3，保证佛像/人物不被横条裁掉 ---------- */}
      <Section>
        <Reveal>
          <SectionHeading
            align="left"
            kicker={t('home.quickKicker')}
            title={t('home.quickTitle')}
            subtitle={t('home.quickSubtitle')}
          />
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {doors.map((card, i) => (
            <Reveal key={card.to} delay={i * 80} className="h-full">
              <DoorCard {...card} index={i} />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ---------- 每日一语 + 一分钟静坐：先给一句可带走的话，再给一件可做的事 ---------- */}
      <Section tone="muted" className="border-y border-hairline">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-14">
          <Reveal className="lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="section-kicker">{t('home.dailyVerseTitle')}</p>
              <span className="font-sans text-[11px] tracking-[0.16em] text-ink-300">
                {t('home.verseCount', { n: verseIdx + 1, total: VERSES.length })}
              </span>
            </div>
            <blockquote className="mt-7 font-serif text-[1.6rem] leading-[1.9] text-ink-900 text-balance sm:text-[2rem] sm:leading-[1.85]">
              {lang === 'zh' ? `「${verseText}」` : `“${verseText}”`}
            </blockquote>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
              <p className="flex items-center gap-3 font-sans text-xs tracking-wider text-ink-500">
                <span aria-hidden className="h-px w-6 bg-hairline" />
                {verseSource}
              </p>
              <button
                type="button"
                onClick={() => setVerseIdx((i) => (i + 1) % VERSES.length)}
                className="inline-flex cursor-pointer items-center gap-2 font-sans text-xs text-celadon-700 transition-colors duration-200 hover:text-cinnabar-600"
              >
                <RefreshIcon />
                {t('home.verseNext')}
              </button>
            </div>
            <p className="mt-6 max-w-lg font-song text-sm leading-[1.9] text-ink-500">{t('home.verseHint')}</p>
          </Reveal>

          <Reveal delay={90} className="lg:col-span-5">
            <SilentMinute />
          </Reveal>
        </div>
      </Section>

      {/* ---------- 今天，读一部经典：主推 + 次级条目 ---------- */}
      <Section>
        <Reveal>
          <SectionHeading
            align="left"
            kicker={t('articles.kicker')}
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
              school={schoolLabel(lead.school, lang)}
              minutes={readingMinutes(lead.chars)}
            />
          </Reveal>
        )}

        <ul className="mt-12 border-t border-hairline">
          {rest.map((a, i) => {
            const m = localizedMeta(a, lang)
            return (
              <Reveal key={a.slug} delay={(i % 3) * 70}>
                <ArticleRow
                  slug={a.slug}
                  title={m.title}
                  excerpt={m.excerpt}
                  author={m.author}
                  school={schoolLabel(a.school, lang)}
                  minutes={readingMinutes(a.chars)}
                />
              </Reveal>
            )
          })}
        </ul>

        <div className="mt-10 flex flex-wrap items-center gap-5">
          <Link to="/articles" viewTransition className="btn-secondary">
            {t('home.featuredAll')}
          </Link>
          <span className="font-sans text-[11px] tracking-wider text-ink-300">
            {t('articles.count', { n: CATALOG.length })}
          </span>
        </div>
      </Section>

      {/* ---------- 一炷心香：把 3D 香炉放进一个完整的收束段落，而不是孤零零一块空白 ---------- */}
      <Section tone="muted" className="border-t border-hairline" rhythm="loose">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <p className="section-kicker">{t('home.incenseKicker')}</p>
            <h2 className="section-title mt-3">{t('home.incenseTitle')}</h2>
            <p className="section-sub mt-4 max-w-md">{t('home.incenseBody')}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link to="/prayer" viewTransition className="btn-secondary">
                {t('home.incenseCta')}
              </Link>
              <Link
                to="/dharma"
                viewTransition
                className="inline-flex items-center gap-2 font-sans text-xs text-celadon-700 transition-colors duration-200 hover:text-cinnabar-600"
              >
                {t('nav.dharma')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <p className="mt-5 font-sans text-[11px] tracking-wide text-ink-300">{t('home.incenseHint')}</p>
          </div>

          <div className="flex justify-center lg:col-span-7">
            <Contained3D
              minHeight={420}
              placeholder={
                <div className="flex h-[420px] w-full max-w-[420px] items-center justify-center">
                  <IncenseBurner />
                </div>
              }
            >
              <Incense3D
                variant="sticks"
                distance={10}
                maxDistance={10}
                heightClass="h-[420px] w-full max-w-[420px]"
              />
            </Contained3D>
          </div>
        </div>
      </Section>
    </div>
  )
}

/** 一分钟静坐：真正可用的呼吸计时（不写 localStorage，不留任何记录） */
function SilentMinute() {
  const { t } = useI18n()
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [left, setLeft] = useState(60)

  useEffect(() => {
    if (phase !== 'running') return
    if (left <= 0) {
      setPhase('done')
      return
    }
    const id = window.setTimeout(() => setLeft((v) => v - 1), 1000)
    return () => window.clearTimeout(id)
  }, [phase, left])

  const start = () => {
    setLeft(60)
    setPhase('running')
  }
  const stop = () => {
    setPhase('idle')
    setLeft(60)
  }

  const progress = (60 - left) / 60
  const circumference = 2 * Math.PI * 70
  const breathing = (60 - left) % 10 < 4 ? t('home.minuteInhale') : t('home.minuteExhale')

  return (
    <div className="card flex h-full flex-col p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <p className="section-kicker">{t('home.minuteKicker')}</p>
        <span className="font-sans text-[10px] tracking-[0.18em] text-ink-300 uppercase tabular-nums">01:00</span>
      </div>

      <div className="mt-6 flex items-center gap-5 sm:gap-6">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 160 160" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
            <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="1" className="text-hairline" />
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={circumference}
              className="text-cinnabar-600"
              style={{
                strokeDashoffset: circumference * (1 - progress),
                transition: 'stroke-dashoffset 0.95s linear',
              }}
            />
          </svg>
          <div className="absolute inset-3 flex items-center justify-center">
            <div
              className={`flex h-full w-full flex-col items-center justify-center rounded-full bg-celadon-100/80 ${
                phase === 'running' ? 'breathe-orb' : ''
              }`}
            >
              <span className="font-serif text-3xl leading-none text-ink-900 tabular-nums">
                {phase === 'idle' ? 60 : left}
              </span>
              <span className="mt-1 font-sans text-[10px] tracking-widest text-ink-500">
                {t('home.minuteUnit')}
              </span>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="font-serif text-xl leading-snug text-ink-900">
            {phase === 'done' ? t('home.minuteDone') : t('home.minuteTitle')}
          </h3>
          <p className="mt-2 font-song text-sm leading-[1.8] text-ink-500">
            {phase === 'running'
              ? breathing
              : phase === 'done'
                ? t('home.minuteDoneDesc')
                : t('home.minuteDesc')}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-3 pt-6">
        {phase === 'running' ? (
          <button type="button" onClick={stop} className="btn-secondary">
            {t('home.minuteStop')}
          </button>
        ) : (
          <button type="button" onClick={start} className="btn-primary">
            {phase === 'done' ? t('home.minuteAgain') : t('home.minuteStart')}
          </button>
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {phase === 'done' ? t('home.minuteDone') : ''}
      </p>
      <p className="mt-4 font-sans text-[11px] leading-relaxed text-ink-300">
        {phase === 'running' ? t('home.minuteRemaining', { n: left }) : t('home.heroTrust')}
      </p>
    </div>
  )
}

/** 导览卡：4:3 大图 + 序号 + 一句说明，图片不再压成 128px 横条 */
function DoorCard({
  to,
  variant,
  photo,
  position,
  title,
  desc,
  index,
}: {
  to: string
  variant: IllustrationVariant
  photo: string
  position: string
  title: string
  desc: string
  index: number
}) {
  const { t } = useI18n()
  return (
    <Link
      to={to}
      viewTransition
      className="group flex h-full flex-row overflow-hidden border border-hairline bg-surface transition-colors duration-300 hover:border-celadon-400 sm:flex-col"
    >
      <div className="relative w-[42%] shrink-0 overflow-hidden border-r border-hairline bg-rice-100 sm:aspect-[4/3] sm:w-full sm:border-r-0 sm:border-b">
        <CoverImage
          src={photo}
          alt={title}
          fallbackVariant={variant}
          position={position}
          className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <span className="absolute top-3 left-3 inline-flex items-center justify-center bg-rice-50/90 px-1.5 py-1 font-sans text-[10px] tracking-[0.18em] text-ink-500 tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5 lg:p-6">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <h3 className="font-serif text-base leading-snug font-normal text-ink-900 transition-colors duration-200 group-hover:text-cinnabar-600 sm:text-lg">
            {title}
          </h3>
          <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-cinnabar-600 sm:h-4 sm:w-4" />
        </div>
        <p className="mt-2 line-clamp-2 font-song text-sm leading-[1.8] text-ink-500 sm:mt-3 sm:line-clamp-none sm:leading-[1.9]">
          {desc}
        </p>
        <span className="mt-auto pt-3 font-sans text-[11px] tracking-[0.16em] text-celadon-700 transition-colors duration-200 group-hover:text-cinnabar-600 sm:pt-5">
          {t('home.doorEnter')}
        </span>
      </div>
    </Link>
  )
}

/** 主推经典：左图右文；配图固定为《金刚经》写本，语义与图终于对得上 */
function ArticleLead({
  slug,
  title,
  excerpt,
  author,
  school,
  minutes,
}: {
  slug: string
  title: string
  excerpt: string
  author: string
  school: string
  minutes: number
}) {
  const { t, lang } = useI18n()
  const quoted = lang === 'en' ? title : `《${title}》`
  return (
    <Link
      to={`/articles/${slug}`}
      viewTransition
      className="group grid items-stretch border border-hairline bg-surface lg:grid-cols-12"
    >
      <div className="relative h-60 overflow-hidden border-b border-hairline bg-rice-100 sm:h-72 lg:col-span-6 lg:h-auto lg:min-h-[24rem] lg:border-r lg:border-b-0">
        <CoverImage
          src={NAMED_PHOTOS.diamond()}
          alt={t('home.coverAlt', { t: title })}
          fallbackVariant="sutra"
          position="50% 50%"
          className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-col justify-center p-7 lg:col-span-6 lg:p-11">
        <span className="seal self-start">{t('home.leadBadge')}</span>
        <h3 className="mt-6 font-serif text-2xl leading-snug font-normal text-ink-900 transition-colors duration-200 group-hover:text-cinnabar-600 sm:text-3xl">
          {quoted}
        </h3>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs tracking-wider text-ink-300">
          {author && <span>{t('common.authorBy', { name: author })}</span>}
          <span aria-hidden className="hidden h-3 w-px bg-hairline sm:block" />
          <span>{school}</span>
          <span aria-hidden className="h-3 w-px bg-hairline" />
          <span>{t('articles.readingTime', { n: minutes })}</span>
        </p>
        <p className="mt-6 line-clamp-4 font-song text-sm leading-[1.95] text-ink-500">{excerpt}</p>
        <span className="mt-8 inline-flex items-center gap-2 font-sans text-xs tracking-wider text-cinnabar-600">
          {t('home.readFull')}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  )
}

/** 次级经典：发丝线分隔的文字条目；补上院系与阅读时长，读者好判断要不要点 */
function ArticleRow({
  slug,
  title,
  excerpt,
  author,
  school,
  minutes,
}: {
  slug: string
  title: string
  excerpt: string
  author: string
  school: string
  minutes: number
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
          <h3 className="font-serif text-lg leading-snug font-normal text-ink-900 transition-colors duration-200 group-hover:text-cinnabar-600">
            {quoted}
          </h3>
          <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-sans text-[11px] tracking-wider text-ink-300">
            {author && <span>{t('common.authorBy', { name: author })}</span>}
            {author && <span aria-hidden className="h-2.5 w-px bg-hairline" />}
            <span>{school}</span>
            <span aria-hidden className="h-2.5 w-px bg-hairline" />
            <span>{t('articles.readingTime', { n: minutes })}</span>
          </p>
        </div>
        <p className="line-clamp-2 font-song text-sm leading-[1.9] text-ink-500 lg:col-span-7">{excerpt}</p>
        <div className="flex items-start lg:col-span-1 lg:justify-end lg:pt-1">
          <ArrowRight className="h-4 w-4 text-ink-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-cinnabar-600" />
        </div>
      </Link>
    </li>
  )
}

function ArrowRight({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function RefreshIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 11a8 8 0 1 0-2.6 5.4" />
      <path d="M20 5v6h-6" />
    </svg>
  )
}
