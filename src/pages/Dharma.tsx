import { useState } from 'react'
import { useI18n } from '../i18n'
import { NAMED_PHOTOS } from '../lib/content'
import { TempleBell } from '../components/zen/TempleBell'
import { Bell3D } from '../components/zen3d/Bell3D'
import { ChantPlayer } from '../components/zen/ChantPlayer'
import { Ornament, PageBanner, Section, SectionHeading } from '../components/ui/PageBanner'
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
      {/* 页头：并置式题头 + 全明照片（无雾化遮罩） */}
      <PageBanner
        image={NAMED_PHOTOS.bell()}
        kicker={t('dharma.kicker')}
        title={t('dharma.title')}
        subtitle={t('dharma.subtitle')}
      />

      {/* 闻钟：左文右器，非对称栅格 */}
      <section className="container-page grid items-center gap-12 py-16 lg:grid-cols-12 lg:gap-16 sm:py-20">
        <Reveal className="lg:col-span-5">
          <div>
            <p className="section-kicker">{t('dharma.mantraTitle')}</p>
            <h2 className="mt-5 font-serif text-2xl font-normal tracking-tight text-sandalwood-800 sm:text-3xl">
              {t('dharma.bellTitle')}
            </h2>
            <p className="mt-4 font-serif text-sm leading-loose text-ink-700">{t('dharma.bellDesc')}</p>
            <blockquote className="mt-8 border-l-2 border-tibetan-600 bg-rice-100/60 py-4 pl-6 font-serif text-sm leading-loose text-sandalwood-700">
              {t('dharma.bellVerse')}
            </blockquote>
          </div>
        </Reveal>
        <Reveal delay={120} className="lg:col-span-7">
          <div className="flex justify-center">
            <Bell3D fallback={<TempleBell />} />
          </div>
        </Reveal>
      </section>

      <Ornament className="mx-auto my-2 flex w-fit" />

      {/* 圣号梵音 */}
      <Section>
        <Reveal>
          <SectionHeading title={t('dharma.chantTitle')} subtitle={t('dharma.chantDesc')} />
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {CHANTS.map((track, i) => (
            <Reveal key={track.id} delay={(i % 2) * 80} className="h-full">
              <ChantPlayer track={track} index={i} />
            </Reveal>
          ))}
        </div>
        {total > 0 && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span className="chip tabular-nums">{t('dharma.count', { n: total })}</span>
            <button
              type="button"
              onClick={resetCounts}
              className="btn-ghost text-xs underline underline-offset-4"
            >
              {t('dharma.resetCount')}
            </button>
          </div>
        )}
      </Section>
    </div>
  )
}
