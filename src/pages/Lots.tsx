import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import {
  LOTS,
  clearSavedLots,
  drawLot,
  levelClass,
  loadSavedLots,
  saveLot,
  type GuanyinLot,
  type SavedLot,
} from '../data/lots'
import { LotCylinder } from '../components/zen/LotCylinder'
import { LotCylinder3D } from '../components/zen3d/LotCylinder3D'
import { IncenseBurner } from '../components/zen/IncenseBurner'
import { Incense3D } from '../components/zen3d/Incense3D'
import { LingQiBoard } from '../components/zen/LingQiBoard'
import { PageBanner } from '../components/ui/PageBanner'
import { Reveal } from '../components/ui/Reveal'

type Phase = 'idle' | 'shaking' | 'revealed'
type Tab = 'lots' | 'lingqi'

export function Lots() {
  const { t } = useI18n()
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
      {/* 页头：观音法门（明亮浅色调） */}
      <PageBanner
        image="/photos/guanyin.jpg"
        kicker="双 法 门 · 随 缘 问 卦"
        title={t('lots.title')}
        subtitle={t('lots.subtitle')}
      />

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {/* 法门切换 */}
        <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-sandalwood-200/80 bg-surface p-1 shadow-sm">
          {(
            [
              { id: 'lots', label: t('lots.tabLots'), icon: '🪷' },
              { id: 'lingqi', label: t('lots.tabLingqi'), icon: '🎲' },
            ] as Array<{ id: Tab; label: string; icon: string }>
          ).map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => {
                setTab(x.id)
                setParams(x.id === 'lingqi' ? { tab: 'lingqi' } : {})
              }}
              aria-pressed={tab === x.id}
              className={`flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                tab === x.id
                  ? 'bg-tibetan-600 text-paper shadow-md shadow-tibetan-900/25'
                  : 'text-ink-700 hover:bg-rice-100'
              }`}
            >
              <span aria-hidden>{x.icon}</span>
              {x.label}
            </button>
          ))}
        </div>

        {/* ---------- 观音灵签 ---------- */}
        {tab === 'lots' ? (
          <div className="mt-12 space-y-14">
            <Reveal>
              <p className="mx-auto max-w-2xl text-center font-serif text-[15px] leading-loose text-ink-700">
                {t('lots.intro')}
              </p>
            </Reveal>

            {/* 抽签区：两栏卡片，不再拥挤 */}
            <div className="grid gap-6 md:grid-cols-2">
              <Reveal>
                <div className="card-link flex h-full flex-col items-center gap-3 p-6 text-center">
                  <div className="overflow-hidden rounded-2xl ring-4 ring-gold-400/50 shadow-md">
                    <img
                      src="/photos/guanyin.jpg"
                      alt="南无观世音菩萨"
                      loading="lazy"
                      decoding="async"
                      className="h-72 w-52 object-cover sm:h-80 sm:w-56"
                    />
                  </div>
                  <p className="font-serif text-xs tracking-[0.3em] text-sandalwood-400">南无观世音菩萨</p>
                  <p className="max-w-xs font-serif text-[13px] leading-relaxed text-ink-700">{t('lots.guanyinDesc')}</p>
                </div>
              </Reveal>

              <Reveal delay={100}>
                <div className="card-link flex h-full flex-col items-center justify-center gap-4 p-6">
                  <LotCylinder3D
                    shaking={phase === 'shaking'}
                    revealed={phase === 'revealed'}
                    onShake={shake}
                    fallback={<LotCylinder shaking={phase === 'shaking'} revealed={phase === 'revealed'} />}
                  />
                  <button
                    type="button"
                    onClick={shake}
                    disabled={phase === 'shaking'}
                    className="btn-primary !px-10 !py-3 text-base disabled:cursor-wait disabled:opacity-70"
                  >
                    {phase === 'shaking' ? t('lots.drawing') : phase === 'revealed' ? t('lots.again') : t('lots.draw')}
                  </button>
                  {phase !== 'shaking' && <p className="font-serif text-xs text-sandalwood-400">{t('lots.shakeHint')}</p>}
                </div>
              </Reveal>
            </div>

            {/* 塔香点缀 */}
            <Reveal>
              <div className="mx-auto max-w-sm">
                <Incense3D variant="cone" scale={0.9} distance={16} maxDistance={16} heightClass="h-[260px]" fallback={<IncenseBurner bare />} />
              </div>
            </Reveal>

            {/* 我的签文 */}
            <Reveal>
              <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-serif text-xl font-bold text-sandalwood-800">{t('lots.historyTitle')}</h2>
                  {saved.length > 0 && (
                    <button type="button" onClick={clear} className="cursor-pointer text-xs text-tibetan-500 underline underline-offset-4 transition hover:text-tibetan-700">
                      {t('lots.clearHistory')}
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-sandalwood-400">{t('lots.historyHint')}</p>

                {saved.length === 0 ? (
                  <p className="mt-6 rounded-2xl border-2 border-dashed border-sandalwood-200 bg-rice-100/50 p-10 text-center font-serif text-sandalwood-500">
                    {t('lots.historyEmpty')}
                  </p>
                ) : (
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {saved.map((s) => {
                      const l = LOTS.find((x) => x.id === s.lotId)
                      if (!l) return null
                      return (
                        <li key={`${s.lotId}-${s.drawnAt}`}>
                          <button
                            type="button"
                            onClick={() => openHistory(l.id)}
                            className="card-link flex w-full cursor-pointer items-center gap-4 p-4 text-left"
                          >
                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${levelClass(l.level)}`}>
                              {l.id}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-serif font-bold text-sandalwood-800">
                                {t('lots.lotNumber', { n: l.id })} · {l.title}
                              </span>
                              <span className="mt-0.5 block text-xs text-sandalwood-400">
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

            <p className="text-center font-serif text-xs leading-relaxed text-sandalwood-400">{t('lots.disclaimer')}</p>
          </div>
        ) : (
          /* ---------- 灵棋经 ---------- */
          <Reveal>
            <div className="mt-12 space-y-10">
              <p className="mx-auto max-w-2xl text-center font-serif text-[15px] leading-loose text-ink-700">
                {t('lingqi.subtitle')}
              </p>
              <LingQiBoard />
              <a
                href="https://github.com/seth2000/linqijing"
                target="_blank"
                rel="noreferrer"
                className="card-link mx-auto flex max-w-xl items-center gap-4 p-5 text-center"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-100 text-2xl" aria-hidden>📖</span>
                <span className="text-left">
                  <span className="block font-serif font-bold text-sandalwood-800">{t('lingqi.fullText')}</span>
                  <span className="mt-0.5 block text-xs text-sandalwood-500">{t('lingqi.fullTextDesc')}</span>
                </span>
              </a>
            </div>
          </Reveal>
        )}
      </div>

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
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up rounded-full bg-sandalwood-900/95 px-6 py-3 font-serif text-sm text-gold-200 shadow-xl">
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
  const { t } = useI18n()
  const [showMeaning, setShowMeaning] = useState(false)

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
      <div className="absolute inset-0 bg-sandalwood-950/60 backdrop-blur-sm" onClick={onClose} />
      {/* 光晕 */}
      <div className="lot-rays pointer-events-none absolute h-[560px] w-[560px] rounded-full" aria-hidden />
      <div className="lot-modal-in relative max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-3xl border-2 border-gold-400/70 bg-rice-50 p-7 shadow-2xl sm:p-9">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('nav.closeMenu')}
          className="absolute top-3 right-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sandalwood-500 transition hover:bg-sandalwood-100"
        >
          ✕
        </button>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${levelClass(lot.level)}`}>{lot.level}</span>
          <h3 className="font-brush text-3xl text-sandalwood-900">{lot.title}</h3>
          <span className="text-sm text-sandalwood-400">{t('lots.lotNumber', { n: lot.id })}</span>
        </div>

        {/* 签诗 */}
        <div className="mt-6 rounded-2xl border border-gold-400/50 bg-gradient-to-b from-rice-100 to-rice-50 px-6 py-6">
          <p className="font-serif text-xs tracking-[0.4em] text-gold-600">{t('lots.poemLabel')}</p>
          <p className="mt-4 space-y-2 font-brush text-xl leading-relaxed text-ink-900 sm:text-2xl">
            {lot.poem.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </p>
        </div>

        {/* 解签按钮 → 解签与禅语祝福一体展开 */}
        {!showMeaning ? (
          <div className="mt-6 text-center">
            <button type="button" onClick={() => setShowMeaning(true)} className="btn-gold !px-8">
              🔎 {t('lots.interpretationLabel')}
            </button>
          </div>
        ) : (
          <div className="lot-fade-in mt-6 rounded-2xl bg-tibetan-50 px-6 py-5">
            <p className="font-serif text-sm font-bold tracking-widest text-tibetan-600">{t('lots.interpretationLabel')}</p>
            <p className="mt-2 font-serif text-[15px] leading-loose text-ink-700">{lot.meaning}</p>
            {/* 禅语祝福：与解签一体 */}
            <div className="mt-5 border-t border-tibetan-200/70 pt-4">
              <p className="font-serif text-sm font-bold tracking-widest text-tibetan-600">{t('lots.blessingLabel')}</p>
              <p className="mt-2 font-brush text-lg leading-relaxed text-tibetan-600">{lot.blessing}</p>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button type="button" onClick={onSave} disabled={saved} className={saved ? 'btn-secondary !cursor-default opacity-60' : 'btn-primary'}>
            {saved ? `✓ ${t('lots.savedLot')}` : `✧ ${t('lots.saveLot')}`}
          </button>
        </div>
      </div>
    </div>
  )
}
