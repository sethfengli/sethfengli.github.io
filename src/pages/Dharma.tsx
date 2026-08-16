import { useState } from 'react'
import { useI18n } from '../i18n'
import { TempleBell } from '../components/zen/TempleBell'
import { ZenIllustration } from '../components/zen/ZenIllustration'
import { storageGet, storageSet } from '../lib/storage'

const CHANT_KEY = 'hdc.chantCount'

const CHANT_ICONS = ['lotus', 'meditation', 'enso', 'incense'] as const

export function Dharma() {
  const { t, chantNames } = useI18n()
  const [counts, setCounts] = useState<Record<number, number>>(() =>
    storageGet<Record<number, number>>(CHANT_KEY, {}),
  )

  const addCount = (idx: number) => {
    setCounts((prev) => {
      const next = { ...prev, [idx]: (prev[idx] ?? 0) + 1 }
      storageSet(CHANT_KEY, next)
      return next
    })
  }

  const resetCounts = () => {
    setCounts({})
    try {
      localStorage.removeItem(CHANT_KEY)
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      {/* 页头 */}
      <header className="relative overflow-hidden bg-gradient-to-b from-sandalwood-900 to-sandalwood-800 py-16 text-center text-rice-50">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <ZenIllustration variant="clouds" animated={false} className="h-full w-full" />
        </div>
        <div className="relative">
          <p className="font-serif text-sm tracking-[0.5em] text-gold-300">梵 呗</p>
          <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">{t('dharma.title')}</h1>
          <p className="mt-3 font-serif text-sm text-rice-100/80">{t('dharma.subtitle')}</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {/* 闻钟 */}
        <section className="grid items-center gap-10 md:grid-cols-2">
          <div className="text-center md:text-left">
            <p className="font-serif text-sm tracking-[0.4em] text-gold-600">{t('dharma.mantraTitle')}</p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-sandalwood-800 sm:text-3xl">{t('dharma.bellTitle')}</h2>
            <p className="mt-4 font-serif text-sm leading-loose text-ink-700">{t('dharma.bellDesc')}</p>
            <blockquote className="mt-6 rounded-2xl border-l-4 border-gold-500 bg-rice-100/70 p-5 text-left font-serif text-sm leading-loose text-sandalwood-700">
              {t('dharma.bellVerse')}
            </blockquote>
          </div>
          <div className="flex justify-center">
            <TempleBell />
          </div>
        </section>

        <div className="zen-divider mt-14">
          <span>❖</span>
        </div>

        {/* 圣号持诵 */}
        <section className="mt-12">
          <h2 className="text-center font-serif text-2xl font-bold text-sandalwood-800">{t('dharma.chantTitle')}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center font-serif text-sm leading-relaxed text-ink-700">
            {t('dharma.chantDesc')}
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {chantNames.map((name, i) => (
              <button
                key={i}
                type="button"
                onClick={() => addCount(i)}
                className="card group cursor-pointer p-6 text-center"
                title={t('dharma.chantHint')}
              >
                <ZenIllustration
                  variant={CHANT_ICONS[i % CHANT_ICONS.length]}
                  className="mx-auto h-20 w-24 rounded-xl transition-transform duration-500 group-hover:scale-105"
                />
                <p className="mt-4 font-serif text-lg font-bold text-sandalwood-800">{name}</p>
                <p className="mt-2 text-xs text-sandalwood-500">
                  {t('dharma.count', { n: counts[i] ?? 0 })}
                </p>
              </button>
            ))}
          </div>
          <div className="mt-6 text-center">
            <button type="button" onClick={resetCounts} className="text-xs text-sandalwood-500 underline underline-offset-4 transition hover:text-tibetan-600">
              {t('dharma.resetCount')}
            </button>
          </div>
        </section>

        <div className="zen-divider mt-14">
          <span>❖</span>
        </div>

        {/* 讲经开示（预留位） */}
        <section className="mt-12">
          <h2 className="text-center font-serif text-2xl font-bold text-sandalwood-800">{t('dharma.talksTitle')}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center font-serif text-sm leading-relaxed text-ink-700">
            {t('dharma.talksDesc')}
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card flex flex-col items-center p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sandalwood-100 text-2xl text-sandalwood-400">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
                    <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                  </svg>
                </div>
                <p className="mt-4 font-serif text-sm text-sandalwood-700">{t('dharma.talksPlaceholder')}</p>
                <p className="mt-2 text-xs text-sandalwood-400">public/audio · public/video</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
