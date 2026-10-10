import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { CATALOG, NAMED_PHOTOS, PHOTO_NAMES, galleryPhotos } from '../lib/content'
import { CHANTS } from '../data/chants'
import { LOTS } from '../data/lots'
import { CoverImage } from '../components/zen/CoverImage'
import { PageBanner, SectionHeading, Section, Ornament } from '../components/ui/PageBanner'
import { Reveal } from '../components/ui/Reveal'
import { PlusIcon } from '../components/ui/Icons'

const SECTIONS = [
  { id: 'story', key: 'about.storyTitle' },
  { id: 'heritage', key: 'about.heritageTitle' },
  { id: 'contact', key: 'about.contactTitle' },
  { id: 'faq', key: 'about.faqTitle' },
  { id: 'copyright', key: 'about.copyrightTitle' },
] as const

/** 信封图形：细线内联 SVG，用于联系区块（取代旧版 emoji） */
function MailIcon({ className = 'h-5 w-5' }: { className?: string }) {
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
      <rect x="3" y="5.5" width="18" height="13" rx="1" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </svg>
  )
}

/** 书本图形：细线内联 SVG，用于文库入口（取代旧版 emoji） */
function BookIcon({ className = 'h-5 w-5' }: { className?: string }) {
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
      <path d="M4 4.5h5.5A2.5 2.5 0 0 1 12 7v12.5a2 2 0 0 0-2-2H4Z" />
      <path d="M20 4.5h-5.5A2.5 2.5 0 0 0 12 7v12.5a2 2 0 0 1 2-2h6Z" />
    </svg>
  )
}

export function About() {
  const { t, arr } = useI18n()
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [active, setActive] = useState('story')
  const faqs = arr('about.faq') as Array<{ q: string; a: string }>
  const heritage = arr('about.heritage') as Array<{ title: string; desc: string }>

  /* 分节导航滚动高亮 */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id)
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    )
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      {/* 页头：图文并置禅庭照片 */}
      <PageBanner image={NAMED_PHOTOS.garden()} kicker={t('about.kicker')} title={t('about.title')} subtitle={t('about.subtitle')} />

      {/* 数字带：发丝线分隔的统计行 */}
      <section className="border-b border-hairline bg-surface">
        <div className="container-page grid grid-cols-2 gap-8 py-10 text-center sm:grid-cols-4">
          <Stat value={String(CATALOG.length)} label={t('about.statArticles')} />
          <Stat value={String(PHOTO_NAMES.length)} label={t('about.statPhotos')} />
          <Stat value={String(CHANTS.length + 1)} label={t('about.statAudio')} />
          <Stat value={`${LOTS.length}+125`} label={t('about.statLots')} />
        </div>
      </section>

      <Section>
        <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-16">
          {/* 吸附分节导航 */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1" aria-label={t('about.sectionNav')}>
              {SECTIONS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-xs px-2 py-2.5 text-left font-sans text-sm transition-colors duration-200 ${
                    active === s.id ? 'text-cinnabar-700' : 'text-ink-500 hover:text-ink-900'
                  }`}
                >
                  {/* 序号：方形朱砂小印（替换旧版圆形徽章） */}
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-xs font-song text-xs ${
                      active === s.id ? 'bg-cinnabar-600 text-paper' : 'border border-hairline text-ink-300'
                    }`}
                  >
                    {i + 1}
                  </span>
                  {t(s.key)}
                </button>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 space-y-20 lg:space-y-24">
            {/* 缘起：图文并排 */}
            <Reveal>
              <section id="story" className="scroll-mt-24">
                <div className="grid items-start gap-10 md:grid-cols-[1fr_260px]">
                  <div>
                    <h2 className="section-title">{t('about.storyTitle')}</h2>
                    <div className="mt-8 space-y-6 font-song text-[15px] leading-loose text-ink-700">
                      <p className="text-indent-2em">{t('about.story1')}</p>
                      <p className="text-indent-2em">{t('about.story2')}</p>
                      <p className="text-indent-2em">{t('about.story3')}</p>
                    </div>
                  </div>
                  {/* 竖排照片拼贴：发丝描边，取消投影 */}
                  <div className="hidden gap-4 md:flex md:flex-col">
                    <CoverImage src={NAMED_PHOTOS.lotus()} alt="" fallbackVariant="lotus" className="h-44 w-full rounded-xs border border-hairline object-cover" />
                    <CoverImage src={NAMED_PHOTOS.gate()} alt="" fallbackVariant="clouds" className="h-56 w-full rounded-xs border border-hairline object-cover" />
                    <CoverImage src={NAMED_PHOTOS.blossom()} alt="" fallbackVariant="mountains" className="h-40 w-full rounded-xs border border-hairline object-cover" />
                  </div>
                </div>
              </section>
            </Reveal>

            {/* 一脉相承：发丝网格卡片行 */}
            <Reveal>
              <section id="heritage" className="scroll-mt-24">
                <p className="section-kicker">{t('about.kicker')}</p>
                <h2 className="section-title mt-3">{t('about.heritageTitle')}</h2>
                <div className="mt-8 grid gap-6 sm:grid-cols-3">
                  {heritage.map((h, i) => (
                    <div key={i} className="card-link group overflow-hidden">
                      <div className="card-media relative overflow-hidden border-b border-hairline">
                        <CoverImage
                          src={[NAMED_PHOTOS.lotus(), NAMED_PHOTOS.garden(), NAMED_PHOTOS.sutra()][i]}
                          alt={h.title}
                          fallbackVariant={(['lotus', 'enso', 'meditation'] as const)[i]}
                          className="h-32 w-full transition-transform duration-500 group-hover:scale-105"
                        />
                        <span className="absolute bottom-3 left-3 rounded-xs bg-celadon-950/80 px-2 py-1 font-song text-xs text-white">
                          0{i + 1}
                        </span>
                      </div>
                      <div className="p-5">
                        <h3 className="font-serif text-lg font-normal tracking-tight text-ink-900">{h.title}</h3>
                        <p className="mt-3 font-song text-sm leading-[1.9] text-ink-500">{h.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </Reveal>

            {/* 照片墙（2 大 4 小 交错） */}
            <Reveal>
              <section aria-label={t('about.galleryTitle')}>
                <SectionHeading align="left" title={t('about.galleryTitle')} subtitle={t('about.gallerySubtitle')} />
                <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 [grid-auto-rows:7rem] sm:[grid-auto-rows:8rem]">
                  {galleryPhotos().map((src, i) => {
                    const big = i % 4 === 0
                    return (
                      <div
                        key={src}
                        className={`group card-media relative overflow-hidden rounded-xs border border-hairline bg-rice-100 ${
                          big ? 'row-span-2' : ''
                        }`}
                      >
                        <img
                          src={src}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )
                  })}
                </div>
              </section>
            </Reveal>

            {/* 联系 */}
            <Reveal>
              <section id="contact" className="scroll-mt-24">
                <h2 className="section-title">{t('about.contactTitle')}</h2>
                <p className="mt-5 max-w-2xl font-song text-sm leading-loose text-ink-700">{t('about.contactDesc')}</p>
                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  <a
                    href="https://github.com/sethfengli/sethfengli.github.io/issues/new"
                    target="_blank"
                    rel="noreferrer"
                    className="card-link flex items-center gap-4 p-6"
                  >
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs border border-hairline text-celadon-600">
                      <MailIcon />
                    </span>
                    <span>
                      <span className="block font-song text-base text-ink-900">{t('about.contactEmail')}</span>
                      <span className="mt-1 block font-sans text-xs leading-relaxed text-ink-500">{t('about.contactEmailDesc')}</span>
                    </span>
                  </a>
                  <Link to="/articles" viewTransition className="card-link flex items-center gap-4 p-6">
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs border border-hairline text-celadon-600">
                      <BookIcon />
                    </span>
                    <span>
                      <span className="block font-song text-base text-ink-900">{t('about.contactBrowse')}</span>
                      <span className="mt-1 block font-sans text-xs leading-relaxed text-ink-500">{t('about.contactBrowseDesc')}</span>
                    </span>
                  </Link>
                </div>
              </section>
            </Reveal>

            {/* FAQ */}
            <Reveal>
              <section id="faq" className="scroll-mt-24">
                <h2 className="section-title">{t('about.faqTitle')}</h2>
                <div className="mt-8 border-t border-hairline">
                  {faqs.map((f, i) => (
                    <div key={i} className="border-b border-hairline">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left transition-colors duration-200"
                        aria-expanded={openFaq === i}
                      >
                        <span className="font-song text-base font-normal tracking-tight text-ink-900">{f.q}</span>
                        <span
                          className={`shrink-0 text-cinnabar-600 transition-transform duration-300 ${openFaq === i ? 'rotate-45' : ''}`}
                          aria-hidden
                        >
                          <PlusIcon />
                        </span>
                      </button>
                      {openFaq === i && (
                        <div className="pb-6">
                          <div className="max-w-2xl font-song text-sm leading-loose text-ink-500">{f.a}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </Reveal>

            {/* 版权与技术 */}
            <Reveal>
              <section id="copyright" className="scroll-mt-24 grid gap-6 sm:grid-cols-2">
                <div className="card p-6">
                  <h3 className="font-serif text-base font-normal tracking-tight text-ink-900">{t('about.copyrightTitle')}</h3>
                  <p className="mt-3 font-song text-sm leading-[1.9] text-ink-500">{t('about.copyright')}</p>
                </div>
                <div className="card p-6">
                  <h3 className="font-serif text-base font-normal tracking-tight text-ink-900">{t('about.techTitle')}</h3>
                  <p className="mt-3 font-song text-sm leading-[1.9] text-ink-500">{t('about.techDesc')}</p>
                </div>
                <div className="card p-6 sm:col-span-2">
                  <h3 className="font-serif text-base font-normal tracking-tight text-ink-900">{t('about.creditsTitle')}</h3>
                  <p className="mt-3 font-song text-sm leading-[1.9] text-ink-500">{t('about.creditsDesc')}</p>
                  <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-sans text-xs">
                    <a href="/photos/cn/CREDITS.md" target="_blank" rel="noreferrer" className="text-cinnabar-600 underline underline-offset-4 transition-colors duration-200 hover:text-cinnabar-500">
                      public/photos/cn/CREDITS.md
                    </a>
                    <a href="/audio/CREDITS.md" target="_blank" rel="noreferrer" className="text-cinnabar-600 underline underline-offset-4 transition-colors duration-200 hover:text-cinnabar-500">
                      public/audio/CREDITS.md
                    </a>
                  </p>
                </div>
              </section>
            </Reveal>
          </div>
        </div>

        <div className="mt-20 flex flex-col items-center gap-6">
          <Ornament />
          <p className="text-center font-song text-sm text-ink-500">「{t('slogan')}」</p>
        </div>
      </Section>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-song text-3xl font-normal tracking-tight text-cinnabar-600">{value}</p>
      <p className="mt-2 font-sans text-xs tracking-widest text-ink-500">{label}</p>
    </div>
  )
}
