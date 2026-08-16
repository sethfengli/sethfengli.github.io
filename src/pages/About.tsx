import { useState } from 'react'
import { useI18n } from '../i18n'
import { CoverImage } from '../components/zen/CoverImage'

export function About() {
  const { t, arr } = useI18n()
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const faqs = arr('about.faq') as Array<{ q: string; a: string }>
  const heritage = arr('about.heritage') as Array<{ title: string; desc: string }>

  return (
    <div>
      {/* 页头 */}
      <header className="relative overflow-hidden bg-gradient-to-b from-sandalwood-900 to-sandalwood-800 py-16 text-center text-paper">
        <div className="absolute inset-0">
          <CoverImage src="/photos/garden.jpg" alt="" fallbackVariant="bamboo" className="h-full w-full opacity-40" />
        </div>
        <div className="relative">
          <p className="font-serif text-sm tracking-[0.5em] text-gold-300">山 门</p>
          <h1 className="mt-3 font-brush text-4xl sm:text-5xl">{t('about.title')}</h1>
          <p className="mt-3 font-serif text-sm text-paper/85">{t('about.subtitle')}</p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        {/* 缘起 */}
        <section>
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

        {/* 一脉相承 */}
        <section className="mt-14">
          <h2 className="flex items-center gap-3 font-serif text-2xl font-bold text-sandalwood-800">
            <span className="h-6 w-1.5 rounded-full bg-gold-500" />
            {t('about.heritageTitle')}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {heritage.map((h, i) => (
              <div key={i} className="card p-6 text-center">
                <CoverImage
                  src={['/photos/lotus.jpg', '/photos/garden.jpg', '/photos/blossom.jpg'][i]}
                  alt={h.title}
                  fallbackVariant={(['lotus', 'enso', 'meditation'] as const)[i]}
                  className="mx-auto h-20 w-24 rounded-xl"
                />
                <h3 className="mt-4 font-serif text-lg font-bold text-sandalwood-800">{h.title}</h3>
                <p className="mt-2 font-serif text-sm leading-relaxed text-ink-700">{h.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 联系 */}
        <section className="mt-14">
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

        {/* FAQ */}
        <section className="mt-14">
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

        {/* 版权与技术 */}
        <section className="mt-14 grid gap-5 sm:grid-cols-2">
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
