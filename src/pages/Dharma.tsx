import { useState } from 'react'
import { useI18n } from '../i18n'
import { TempleBell } from '../components/zen/TempleBell'
import { Bell3D } from '../components/zen3d/Bell3D'
import { ChantPlayer } from '../components/zen/ChantPlayer'
import { CoverImage } from '../components/zen/CoverImage'
import { CHANTS } from '../data/chants'
import { storageGet, storageSet } from '../lib/storage'

const CHANT_KEY = 'hdc.chantCount'

export function Dharma() {
  const { t, arr } = useI18n()
  const [counts, setCounts] = useState<Record<number, number>>(() =>
    storageGet<Record<number, number>>(CHANT_KEY, {}),
  )
  const talks = arr('dharma.talkLinks') as Array<{ name: string; desc: string; url: string }>

  const resetCounts = () => {
    setCounts({})
    storageSet(CHANT_KEY, {})
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div>
      {/* 页头 */}
      <header className="relative overflow-hidden bg-gradient-to-b from-sandalwood-900 to-sandalwood-800 py-16 text-center text-paper">
        <div className="absolute inset-0">
          <CoverImage src="/photos/bell.jpg" alt="" fallbackVariant="clouds" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sandalwood-900/45 via-sandalwood-900/0 to-sandalwood-900/75" />
        <div className="relative">
          <p className="font-serif text-sm tracking-[0.5em] text-gold-300">梵 呗</p>
          <h1 className="mt-3 font-brush text-4xl sm:text-5xl">{t('dharma.title')}</h1>
          <p className="mt-3 font-serif text-sm text-paper/80">{t('dharma.subtitle')}</p>
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
            <Bell3D fallback={<TempleBell />} />
          </div>
        </section>

        <div className="zen-divider mt-14">
          <span>❖</span>
        </div>

        {/* 圣号梵音 */}
        <section className="mt-12">
          <h2 className="text-center font-serif text-2xl font-bold text-sandalwood-800">{t('dharma.chantTitle')}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center font-serif text-sm leading-relaxed text-ink-700">
            {t('dharma.chantDesc')}
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {CHANTS.map((track, i) => (
              <ChantPlayer key={track.id} track={track} index={i} />
            ))}
          </div>
          {total > 0 && (
            <div className="mt-6 text-center">
              <span className="chip">📿 {t('dharma.count', { n: total })}</span>
              <button
                type="button"
                onClick={resetCounts}
                className="ml-3 cursor-pointer text-xs text-sandalwood-500 underline underline-offset-4 transition hover:text-tibetan-600"
              >
                {t('dharma.resetCount')}
              </button>
            </div>
          )}
        </section>

        <div className="zen-divider mt-14">
          <span>❖</span>
        </div>

        {/* 讲经开示 · 道场外链 */}
        <section className="mt-12">
          <h2 className="text-center font-serif text-2xl font-bold text-sandalwood-800">{t('dharma.talksTitle')}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center font-serif text-sm leading-relaxed text-ink-700">
            {t('dharma.talksDesc')}
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {talks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="card group flex flex-col p-6 text-center transition hover:-translate-y-1 hover:border-gold-400"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tibetan-50 text-2xl transition group-hover:scale-110">
                  {['📿', '🪷', '🕯', '⛰'][i]}
                </div>
                <p className="mt-4 font-serif font-bold text-sandalwood-800">{link.name}</p>
                <p className="mt-2 flex-1 font-serif text-sm leading-relaxed text-ink-700">{link.desc}</p>
                <span className="mt-4 inline-flex items-center justify-center gap-1 text-xs font-medium text-tibetan-600">
                  前往听经
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M7 17L17 7M9 7h8v8" />
                  </svg>
                </span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
