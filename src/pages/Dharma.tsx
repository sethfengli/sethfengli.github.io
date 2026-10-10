import { lazy, useState, type ComponentType } from 'react'
import { useI18n } from '../i18n'
import { NAMED_PHOTOS } from '../lib/content'
import { TempleBell } from '../components/zen/TempleBell'
import type { Props as Bell3DProps } from '../components/zen3d/Bell3D'
import { Contained3D } from '../components/zen3d/Contained3D'
import { ChantPlayer } from '../components/zen/ChantPlayer'
import { Ornament, PageBanner, Section, SectionHeading } from '../components/ui/PageBanner'
import { Reveal } from '../components/ui/Reveal'
import { CHANTS } from '../data/chants'
import { storageGet, storageSet } from '../lib/storage'

/**
 * 3D 梵钟按需加载（第 9 轮）：`three.js` 是 707 KB 的独立 chunk，静态 import 会让
 * **每个路由的首屏**都先下它（实测 /dharma 首屏 1824 KB）。这里改为滚到才加载，
 * 并复用 `Bell3D` 原本就接受的 `fallback`（DOM 版 `TempleBell`）——
 * 所以 WebGL 缺失或还没加载完时，用户看到的仍是可敲的 DOM 钟，不是空白。
 * 类型仍取自真实组件（`import type`，不会产生运行时代码）。
 */
const Bell3D = lazy(() =>
  import('../components/zen3d/Bell3D').then((m) => ({ default: m.Bell3D })),
) as ComponentType<Bell3DProps>

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
            <h2 className="mt-5 font-serif text-2xl font-normal tracking-tight text-celadon-800 sm:text-3xl">
              {t('dharma.bellTitle')}
            </h2>
            <p className="mt-4 font-song text-sm leading-loose text-ink-700">{t('dharma.bellDesc')}</p>
            <blockquote className="mt-8 border-l-2 border-cinnabar-600 bg-rice-100/60 py-4 pl-6 font-serif text-sm leading-loose text-celadon-700">
              {t('dharma.bellVerse')}
            </blockquote>
          </div>
        </Reveal>
        <Reveal delay={120} className="lg:col-span-7">
          <div className="flex justify-center">
            {/* three.js 到位前先给可交互的 DOM 版梵钟；并且只在滚到附近才请求 three.js */}
            <Contained3D minHeight={360} placeholder={<TempleBell />}>
              <Bell3D fallback={<TempleBell />} />
            </Contained3D>
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
