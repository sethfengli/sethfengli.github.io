import { Suspense, lazy, useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { NAMED_PHOTOS } from '../lib/content'
import { Contained3D } from '../components/zen3d/Contained3D'
import {
  LOTS,
  clearSavedLots,
  drawLot,
  levelClass,
  loadSavedLots,
  localizedLot,
  saveLot,
  type GuanyinLot,
  type SavedLot,
} from '../data/lots'
import { LotCylinder } from '../components/zen/LotCylinder'
import type { Props as LotCylinder3DProps } from '../components/zen3d/LotCylinder3D'
import { IncenseBurner } from '../components/zen/IncenseBurner'
import type { Props as Incense3DProps } from '../components/zen3d/Incense3D'
import { LingQiBoard as LingQiBoardDirect } from '../components/zen/LingQiBoard'
import { PageBanner, Section } from '../components/ui/PageBanner'
import { Reveal } from '../components/ui/Reveal'

/**
 * 灵棋经面板按需加载（第 9 轮）：它**静态 import 了 361 KB 的卦辞数据**
 * （`lingqi.json` 122 KB + `lingqi-en.json` 239 KB）。之前这份数据进的是主包，
 * 于是**每个路由的首屏**都在为「另一个 tab 的卦辞」付费。改为 lazy 后，
 * 只有点了「灵棋经」这个 tab 才会请求（它没有 props，边界很干净）。
 */
// LingQiBoard 不吃 props；`lazy()` 返回的是 LazyExoticComponent，与 `() => Element`
// 差异在于它接受可选的 props，故先过 unknown 再断言（类型安全由调用点保证：无 props）。
const LingQiBoard = lazy(() =>
  import('../components/zen/LingQiBoard').then((m) => ({ default: m.LingQiBoard })),
) as unknown as typeof LingQiBoardDirect
/**
 * 灵签页的两个 3D 部件按需加载（第 9 轮）：three.js（707 KB）不再进首屏。
 * 两者本来就各自接受 `fallback`（DOM 签筒 `LotCylinder` / 香炉 `IncenseBurner`），
 * 这里再用 Suspense 把「还在下载 three.js」这段也交给它们，
 * 于是抽签与上香在任何阶段都是可用的界面，不会出现空白。
 * 类型取自真实组件（`import type` 不产生运行时代码）。
 */
const LotCylinder3D = lazy(() =>
  import('../components/zen3d/LotCylinder3D').then((m) => ({ default: m.LotCylinder3D })),
) as ComponentType<LotCylinder3DProps>
const Incense3D = lazy(() =>
  import('../components/zen3d/Incense3D').then((m) => ({ default: m.Incense3D })),
) as ComponentType<Incense3DProps>

type Phase = 'idle' | 'shaking' | 'revealed'
type Tab = 'lots' | 'lingqi'

/** 法门切换图标：内联发丝线 SVG，取代旧版 emoji */
const TAB_ICONS: Record<Tab, ReactNode> = {
  lots: (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3.5c1.9 2 3 4 3 5.8a3 3 0 0 1-6 0c0-1.8 1.1-3.8 3-5.8Z" />
      <path d="M5.5 12.5c2.6 1 4.3 2.4 5 4.2M18.5 12.5c-2.6 1-4.3 2.4-5 4.2" />
      <path d="M3.5 18.5c5 2 12 2 17 0" />
    </svg>
  ),
  lingqi: (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="1" />
      <circle cx="8.5" cy="8.5" r="1.2" />
      <circle cx="15.5" cy="15.5" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
    </svg>
  ),
}

export function Lots() {
  const { t, lang } = useI18n()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => (params.get('tab') === 'lingqi' ? 'lingqi' : 'lots'))
  const [phase, setPhase] = useState<Phase>('idle')
  const [lot, setLot] = useState<GuanyinLot | null>(null)
  const [saved, setSaved] = useState<SavedLot[]>(loadSavedLots)
  const [toast, setToast] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const drawnRef = useRef<number[]>([])
  const toastTimer = useRef<number>(0)

  useEffect(() => {
    return () => window.clearTimeout(toastTimer.current)
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2800)
  }

  const shake = useCallback(() => {
    if (phase === 'shaking') return
    setPhase('shaking')
    setLot(null)
    setModalOpen(false)
    window.setTimeout(() => {
      const exclude = [...new Set([...drawnRef.current, ...saved.map((s) => s.lotId)])]
      const picked = drawLot(exclude)
      drawnRef.current.push(picked.id)
      setLot(picked)
      setPhase('revealed')
      // 签文稍后居中弹出
      window.setTimeout(() => setModalOpen(true), 900)
    }, 1500)
  }, [phase, saved])

  const keep = (id: number) => {
    setSaved(saveLot(id))
    showToast(t('lots.savedNotice'))
  }

  const clear = () => {
    if (!window.confirm(t('lots.clearHistory'))) return
    clearSavedLots()
    setSaved([])
  }

  const openHistory = (id: number) => {
    const l = LOTS.find((x) => x.id === id)
    if (!l) return
    setLot(l)
    setModalOpen(true)
  }

  return (
    <div>
      {/* 页头：观音法门（并置式题头，照片全明） */}
      <PageBanner
        image={NAMED_PHOTOS.guanyin()}
        kicker={t('lots.kicker')}
        title={t('lots.title')}
        subtitle={t('lots.subtitle')}
      />

      <Section width="tight">
        {/* 法门切换：方角细边分段器（无胶囊、无投影） */}
        <div className="mx-auto flex w-fit items-center gap-1 rounded-xs border border-hairline bg-surface p-1">
          {(
            [
              { id: 'lots', label: t('lots.tabLots') },
              { id: 'lingqi', label: t('lots.tabLingqi') },
            ] as Array<{ id: Tab; label: string }>
          ).map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => {
                setTab(x.id)
                setParams(x.id === 'lingqi' ? { tab: 'lingqi' } : {})
              }}
              aria-pressed={tab === x.id}
              className={`flex cursor-pointer items-center gap-2 rounded-xs px-5 py-2.5 text-sm transition-colors duration-200 ${
                tab === x.id ? 'bg-cinnabar-600 text-paper' : 'text-ink-700 hover:text-cinnabar-600'
              }`}
            >
              <span aria-hidden>{TAB_ICONS[x.id]}</span>
              {x.label}
            </button>
          ))}
        </div>

        {/* ---------- 观音灵签 ---------- */}
        {tab === 'lots' ? (
          <div className="mt-14 space-y-16">
            <Reveal>
              <p className="section-sub mx-auto max-w-2xl text-center leading-loose">{t('lots.intro')}</p>
            </Reveal>

            {/* 抽签区：造像与签筒并置，发丝描边纸卡 */}
            <div className="grid gap-8 md:grid-cols-2">
              <Reveal>
                <div className="card flex h-full flex-col items-center gap-5 p-8 text-center">
                  <div className="overflow-hidden rounded-xs border border-hairline">
                    <img
                      src={NAMED_PHOTOS.guanyin()}
                      alt={t('lots.guanyinName')}
                      loading="lazy"
                      decoding="async"
                      className="h-72 w-52 object-cover sm:h-80 sm:w-56"
                    />
                  </div>
                  <p className="section-kicker">{t('lots.guanyinName')}</p>
                  <p className="max-w-xs font-song text-[13px] leading-relaxed text-ink-700">{t('lots.guanyinDesc')}</p>
                </div>
              </Reveal>

              <Reveal delay={100}>
                <div className="card flex h-full flex-col items-center justify-center gap-5 p-8">
                  <Contained3D
                    minHeight={360}
                    requireOptIn
                    optInLabel={t('common.enable3d')}
                    placeholder={<LotCylinder shaking={phase === 'shaking'} revealed={phase === 'revealed'} />}
                  >
                    <LotCylinder3D
                      shaking={phase === 'shaking'}
                      revealed={phase === 'revealed'}
                      onShake={shake}
                      fallback={<LotCylinder shaking={phase === 'shaking'} revealed={phase === 'revealed'} />}
                    />
                  </Contained3D>
                  <button
                    type="button"
                    onClick={shake}
                    disabled={phase === 'shaking'}
                    className="btn-primary !px-10 !py-3 text-base disabled:cursor-wait disabled:opacity-70"
                  >
                    {phase === 'shaking' ? t('lots.drawing') : phase === 'revealed' ? t('lots.again') : t('lots.draw')}
                  </button>
                  {phase !== 'shaking' && <p className="font-song text-xs text-celadon-500">{t('lots.shakeHint')}</p>}
                </div>
              </Reveal>
            </div>

            {/* 塔香点缀（3D 按需加载，未到位时先是同尺寸的 DOM 香炉） */}
            <Reveal>
              <div className="mx-auto max-w-sm">
                <Contained3D
                  minHeight={260}
                  requireOptIn
                  optInLabel={t('common.enable3d')}
                  placeholder={<IncenseBurner bare />}
                >
                  <Incense3D variant="cone" scale={0.9} distance={16} maxDistance={16} heightClass="h-[260px]" fallback={<IncenseBurner bare />} />
                </Contained3D>
              </div>
            </Reveal>

            {/* 我的签文 */}
            <Reveal>
              <section>
                <hr className="hairline" />
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-serif text-xl font-normal tracking-tight text-celadon-800">{t('lots.historyTitle')}</h2>
                  {saved.length > 0 && (
                    <button type="button" onClick={clear} className="btn-ghost text-xs underline underline-offset-4">
                      {t('lots.clearHistory')}
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-celadon-500">{t('lots.historyHint')}</p>

                {saved.length === 0 ? (
                  <p className="mt-8 rounded-card border border-dashed border-hairline bg-rice-100/50 p-10 text-center font-song text-celadon-500">
                    {t('lots.historyEmpty')}
                  </p>
                ) : (
                  <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {saved.map((s) => {
                      const l = LOTS.find((x) => x.id === s.lotId)
                      if (!l) return null
                      const lx = localizedLot(l, lang)
                      return (
                        <li key={`${s.lotId}-${s.drawnAt}`}>
                          <button
                            type="button"
                            onClick={() => openHistory(l.id)}
                            className="card-link flex w-full cursor-pointer items-center gap-4 p-4 text-left"
                          >
                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xs font-song text-sm ${levelClass(l.level)}`}>
                              {l.id}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-song text-celadon-800">
                                {t('lots.lotNumber', { n: l.id })} · {lx.title}
                              </span>
                              <span className="mt-1 block text-xs text-celadon-500">
                                {new Date(s.drawnAt).toLocaleString()}
                              </span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </Reveal>

            <p className="text-center font-song text-xs leading-relaxed text-celadon-500">{t('lots.disclaimer')}</p>
          </div>
        ) : (
          /* ---------- 灵棋经 ---------- */
          <Reveal>
            <div className="mt-14 space-y-10">
              <p className="section-sub mx-auto max-w-2xl text-center leading-loose">{t('lingqi.subtitle')}</p>
              <Suspense
                fallback={
                  <div className="card mx-auto max-w-2xl animate-pulse p-8" aria-hidden>
                    <div className="mx-auto h-40 w-40 rounded-full bg-rice-100" />
                    <div className="mx-auto mt-6 h-3 w-2/3 rounded-xs bg-rice-200" />
                    <div className="mx-auto mt-3 h-3 w-1/2 rounded-xs bg-rice-100" />
                  </div>
                }
              >
                <LingQiBoard />
              </Suspense>
              <a
                href="https://github.com/seth2000/linqijing"
                target="_blank"
                rel="noreferrer"
                className="card-link mx-auto flex max-w-xl items-center gap-5 p-6"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xs border border-hairline text-cinnabar-600"
                  aria-hidden
                >
                  <svg aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z" />
                    <path d="M8 7.5h7M8 11h5" />
                  </svg>
                </span>
                <span className="text-left">
                  <span className="block font-song text-celadon-800">{t('lingqi.fullText')}</span>
                  <span className="mt-1 block text-xs text-celadon-500">{t('lingqi.fullTextDesc')}</span>
                </span>
              </a>
            </div>
          </Reveal>
        )}
      </Section>

      {/* ---------- 签文浮动弹窗 ---------- */}
      {lot && modalOpen && (
        <LotModal
          lot={lot}
          saved={saved.some((s) => s.lotId === lot.id)}
          onSave={() => keep(lot.id)}
          onClose={() => setModalOpen(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up rounded-xs border border-celadon-700 bg-celadon-900 px-6 py-3 font-song text-sm text-paper">
          {toast}
        </div>
      )}
    </div>
  )
}

/* ---------- 居中浮动签文 ---------- */
function LotModal({
  lot,
  saved,
  onSave,
  onClose,
}: {
  lot: GuanyinLot
  saved: boolean
  onSave: () => void
  onClose: () => void
}) {
  const { t, lang } = useI18n()
  const [showMeaning, setShowMeaning] = useState(false)
  const lx = localizedLot(lot, lang)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    // 锁定背景滚动
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('lots.lotNumber', { n: lot.id })}>
      {/* 遮罩：不透明压暗，不再毛玻璃 */}
      <div className="absolute inset-0 bg-celadon-950/80" onClick={onClose} />
      {/* 光晕（装饰性圆形，保留圆） */}
      <div className="lot-rays pointer-events-none absolute h-[560px] w-[560px] rounded-full" aria-hidden />
      <div className="lot-modal-in relative max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-card border border-hairline bg-rice-50 p-7 shadow-lift sm:p-9">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('nav.closeMenu')}
          className="absolute top-4 right-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xs border border-hairline text-celadon-500 transition-colors duration-200 hover:border-celadon-500 hover:text-cinnabar-600"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className={`rounded-xs px-3 py-1 text-xs ${levelClass(lot.level)}`}>{lx.level}</span>
          <h3 className="font-serif text-2xl font-normal tracking-tight text-celadon-900 sm:text-3xl">{lx.title}</h3>
          <span className="text-sm text-celadon-500">{t('lots.lotNumber', { n: lot.id })}</span>
        </div>

        {/* 签诗 */}
        <div className="mt-8 rounded-card border border-hairline bg-surface px-6 py-7">
          <p className="section-kicker">{t('lots.poemLabel')}</p>
          <p className="mt-5 space-y-2 font-brush text-xl leading-relaxed text-ink-900 sm:text-2xl">
            {lx.poem.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </p>
        </div>

        {/* 解签按钮 → 解签与禅语祝福一体展开 */}
        {!showMeaning ? (
          <div className="mt-8 text-center">
            <button type="button" onClick={() => setShowMeaning(true)} className="btn-gold !px-8">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="10.5" cy="10.5" r="6" />
                <path d="m15 15 4.5 4.5" />
              </svg>
              {t('lots.interpretationLabel')}
            </button>
          </div>
        ) : (
          <div className="lot-fade-in mt-8 rounded-card border border-hairline bg-surface px-6 py-6">
            <p className="section-kicker">{t('lots.interpretationLabel')}</p>
            <p className="mt-4 font-song text-[15px] leading-loose text-ink-700">{lx.meaning}</p>
            {/* 禅语祝福：与解签一体 */}
            <div className="mt-6 border-t border-hairline pt-5">
              <p className="section-kicker">{t('lots.blessingLabel')}</p>
              <p className="mt-4 font-brush text-lg leading-relaxed text-cinnabar-600">{lx.blessing}</p>
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-3">
          <button type="button" onClick={onSave} disabled={saved} className={saved ? 'btn-secondary !cursor-default opacity-60' : 'btn-primary'}>
            {saved ? t('lots.savedLot') : t('lots.saveLot')}
          </button>
        </div>
      </div>
    </div>
  )
}
