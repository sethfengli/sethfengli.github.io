import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n'
import { CATALOG, PHOTO_NAMES } from '../lib/content'
import { CHANTS } from '../data/chants'
import { LOTS } from '../data/lots'
import { CoverImage } from '../components/zen/CoverImage'

const SECTIONS = [
  { id: 'story', key: 'about.storyTitle' },
  { id: 'heritage', key: 'about.heritageTitle' },
  { id: 'contact', key: 'about.contactTitle' },
  { id: 'faq', key: 'about.faqTitle' },
  { id: 'copyright', key: 'about.copyrightTitle' },
] as const

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
      {/* 页头：明亮禅庭照片 */}
      <header className="relative overflow-hidden bg-sandalwood-900 py-16 text-center text-paper sm:py-20">
        <div className="absolute inset-0">
          <CoverImage src="/photos/garden.jpg" alt="" fallbackVariant="bamboo" className="h-full w-full" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-sandalwood-900/45 via-sandalwood-900/10 to-sandalwood-900/80" />
        <div className="relative">
          <p className="banner-text font-serif text-sm tracking-[0.5em] text-gold-300">山 门</p>
          <h1 className="mt-3 banner-text font-brush text-4xl sm:text-5xl">{t('about.title')}</h1>
          <p className="mt-3 banner-text font-serif text-sm text-paper">{t('about.subtitle')}</p>
        </div>
      </header>

      {/* 数字带 */}
      <section className="border-b border-sandalwood-200/60 bg-surface">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 py-8 text-center sm:grid-cols-4 sm:px-6">
          <Stat value={String(CATALOG.length)} label="佛学文章" />
          <Stat value={String(PHOTO_NAMES.length)} label="免版权照片" />
          <Stat value={String(CHANTS.length + 1)} label="梵呗音档" />
          <Stat value={String(LOTS.length)} label="观音灵签" />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
          {/* 吸附分节导航 */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1 text-sm" aria-label="页面分节导航">
              {SECTIONS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left transition ${
                    active === s.id
                      ? 'bg-sandalwood-100 font-semibold text-tibetan-700'
                      : 'text-ink-700 hover:bg-rice-100'
                  }`}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${active === s.id ? 'bg-tibetan-600 text-on-accent' : 'bg-sandalwood-100 text-sandalwood-600'}`}>
                    {i + 1}
                  </span>
                  {t(s.key)}
                </button>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 space-y-16">
            {/* 缘起 */}
            <Reveal>
              <section id="story" className="scroll-mt-24">
                <h2 className="flex items-center gap-3 font-serif text-2xl font-bold text-sandalwood-800">
                  <span className="h-6 w-1.5 rounded-full bg-tibetan-600" />
                  {t('about.storyTitle')}
                </h2>
                <div className="mt-6 space-y-5 font-serif text-[15px] leading-loose text-ink-700">
                  <p className="text-indent-2em">{t('about.story1')}</p>
                  <p className="text-indent-2em">{t('about.story2')}</p>
                  <p className="text-indent-2em">{t('about.story3')}</p>
                </div>
              </section>
            </Reveal>

            {/* 一脉相承 */}
            <Reveal>
              <section id="heritage" className="scroll-mt-24">
                <h2 className="flex items-center gap-3 font-serif text-2xl font-bold text-sandalwood-800">
                  <span className="h-6 w-1.5 rounded-full bg-gold-500" />
                  {t('about.heritageTitle')}
                </h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {heritage.map((h, i) => (
                    <div key={i} className="card overflow-hidden">
                      <CoverImage
                        src={['/photos/lotus.jpg', '/photos/garden.jpg', '/photos/blossom.jpg'][i]}
                        alt={h.title}
                        fallbackVariant={(['lotus', 'enso', 'meditation'] as const)[i]}
                        className="h-32 w-full"
                      />
                      <div className="p-5 text-center">
                        <h3 className="font-serif text-lg font-bold text-sandalwood-800">{h.title}</h3>
                        <p className="mt-2 font-serif text-sm leading-relaxed text-ink-700">{h.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </Reveal>

            {/* 照片墙 */}
            <Reveal>
              <section aria-label="禅院掠影">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="group overflow-hidden rounded-2xl shadow-sm">
                      <img
                        src={`/photos/${PHOTO_NAMES[(i * 11) % PHOTO_NAMES.length]}`}
                        alt=""
                        loading="lazy"
                        className="h-32 w-full object-cover transition duration-500 group-hover:scale-110 sm:h-40"
                      />
                    </div>
                  ))}
                </div>
              </section>
            </Reveal>

            {/* 联系 */}
            <Reveal>
              <section id="contact" className="scroll-mt-24">
                <h2 className="flex items-center gap-3 font-serif text-2xl font-bold text-sandalwood-800">
                  <span className="h-6 w-1.5 rounded-full bg-moon-500" />
                  {t('about.contactTitle')}
                </h2>
                <p className="mt-4 font-serif text-sm leading-loose text-ink-700">{t('about.contactDesc')}</p>
                <a
                  href="https://github.com/sethfengli/sethfengli.github.io/issues/new"
                  target="_blank"
                  rel="noreferrer"
                  className="card mt-5 flex items-center gap-4 p-5 transition hover:border-gold-400"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sandalwood-100 text-2xl">✉️</span>
                  <span>
                    <span className="block font-serif font-bold text-sandalwood-800">{t('about.contactEmail')}</span>
                    <span className="mt-0.5 block text-xs text-sandalwood-500">{t('about.contactEmailDesc')}</span>
                  </span>
                </a>
              </section>
            </Reveal>

            {/* FAQ */}
            <Reveal>
              <section id="faq" className="scroll-mt-24">
                <h2 className="flex items-center gap-3 font-serif text-2xl font-bold text-sandalwood-800">
                  <span className="h-6 w-1.5 rounded-full bg-tibetan-600" />
                  {t('about.faqTitle')}
                </h2>
                <div className="mt-6 space-y-3">
                  {faqs.map((f, i) => (
                    <div key={i} className="overflow-hidden rounded-2xl border border-sandalwood-200/70 bg-surface">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
                        aria-expanded={openFaq === i}
                      >
                        <span className="font-serif font-bold text-sandalwood-800">{f.q}</span>
                        <span className={`text-gold-600 transition-transform ${openFaq === i ? 'rotate-45' : ''}`} aria-hidden>
                          ＋
                        </span>
                      </button>
                      {openFaq === i && (
                        <p className="border-t border-sandalwood-100 px-5 py-4 font-serif text-sm leading-loose text-ink-700">{f.a}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </Reveal>

            {/* 版权与技术 */}
            <Reveal>
              <section id="copyright" className="scroll-mt-24 grid gap-5 sm:grid-cols-2">
                <div className="rounded-2xl border border-sandalwood-200/70 bg-rice-100/60 p-6">
                  <h3 className="font-serif font-bold text-sandalwood-800">📜 {t('about.copyrightTitle')}</h3>
                  <p className="mt-3 font-serif text-sm leading-relaxed text-ink-700">{t('about.copyright')}</p>
                </div>
                <div className="rounded-2xl border border-sandalwood-200/70 bg-rice-100/60 p-6">
                  <h3 className="font-serif font-bold text-sandalwood-800">🛠 {t('about.techTitle')}</h3>
                  <p className="mt-3 font-serif text-sm leading-relaxed text-ink-700">{t('about.techDesc')}</p>
                </div>
                <div className="rounded-2xl border border-sandalwood-200/70 bg-rice-100/60 p-6 sm:col-span-2">
                  <h3 className="font-serif font-bold text-sandalwood-800">🖼 {t('about.creditsTitle')}</h3>
                  <p className="mt-3 font-serif text-sm leading-relaxed text-ink-700">{t('about.creditsDesc')}</p>
                  <p className="mt-2 font-sans text-sm">
                    <a href="/photos/CREDITS.md" target="_blank" rel="noreferrer" className="text-tibetan-600 underline underline-offset-4 hover:text-tibetan-500">
                      📷 public/photos/CREDITS.md
                    </a>
                    <span className="mx-3 text-sandalwood-300">·</span>
                    <a href="/audio/CREDITS.md" target="_blank" rel="noreferrer" className="text-tibetan-600 underline underline-offset-4 hover:text-tibetan-500">
                      🎵 public/audio/CREDITS.md
                    </a>
                  </p>
                </div>
              </section>
            </Reveal>
          </div>
        </div>

        <div className="zen-divider mt-14">
          <span>❖</span>
        </div>
        <p className="mt-6 text-center font-serif text-sm text-sandalwood-500">
          「{t('slogan')}」
        </p>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-brush text-3xl text-tibetan-600">{value}</p>
      <p className="mt-1 font-serif text-xs tracking-widest text-sandalwood-500">{label}</p>
    </div>
  )
}

/** 滚动渐入 */
function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.08 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={shown ? 'animate-fade-up' : 'opacity-0'}>
      {children}
    </div>
  )
}
