import { useState } from 'react'
import { useI18n } from '../i18n'
import { TempleBell } from '../components/zen/TempleBell'
import { Bell3D } from '../components/zen3d/Bell3D'
import { ChantPlayer } from '../components/zen/ChantPlayer'
import { PageBanner, SectionHeading } from '../components/ui/PageBanner'
import { Reveal } from '../components/ui/Reveal'
import { CHANTS } from '../data/chants'
import { storageGet, storageSet } from '../lib/storage'

const CHANT_KEY = 'hdc.chantCount'

export function Dharma() {
  const { t } = useI18n()
  const [counts, setCounts] = useState<Record<number, number>>(() =>
    storageGet<Record<number, number>>(CHANT_KEY, {}),
  )

  const resetCounts = () => {
    setCounts({})
    storageSet(CHANT_KEY, {})
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div>
      {/* 页头（明亮浅色调） */}
      <PageBanner
        image="/photos/bell.jpg"
        kicker={t('dharma.kicker')}
        title={t('dharma.title')}
        subtitle={t('dharma.subtitle')}
      />

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {/* 闻钟 */}
        <section className="grid items-center gap-10 md:grid-cols-2">
          <Reveal>
            <div className="text-center md:text-left">
              <p className="font-serif text-sm tracking-[0.4em] text-gold-600">{t('dharma.mantraTitle')}</p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-sandalwood-800 sm:text-3xl">{t('dharma.bellTitle')}</h2>
              <p className="mt-4 font-serif text-sm leading-loose text-ink-700">{t('dharma.bellDesc')}</p>
              <blockquote className="mt-6 rounded-2xl border-l-4 border-gold-500 bg-rice-100/70 p-5 text-left font-serif text-sm leading-loose text-sandalwood-700">
                {t('dharma.bellVerse')}
              </blockquote>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="flex justify-center">
              <Bell3D fallback={<TempleBell />} />
            </div>
          </Reveal>
        </section>

        <div className="zen-divider mt-14">
          <span>❖</span>
        </div>

        {/* 圣号梵音 */}
        <section className="mt-12">
          <Reveal>
            <SectionHeading title={t('dharma.chantTitle')} />
          </Reveal>
          <p className="mx-auto mt-3 max-w-2xl text-center font-serif text-sm leading-relaxed text-ink-700">
            {t('dharma.chantDesc')}
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {CHANTS.map((track, i) => (
              <Reveal key={track.id} delay={(i % 2) * 80}>
                <ChantPlayer track={track} index={i} />
              </Reveal>
            ))}
          </div>
          {total > 0 && (
            <div className="mt-6 text-center">
              <span className="chip tabular-nums">📿 {t('dharma.count', { n: total })}</span>
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
      </div>
    </div>
  )
}
