import { useCallback, useEffect, useRef, useState } from 'react'
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
import { ZenIllustration } from '../components/zen/ZenIllustration'

type Phase = 'idle' | 'shaking' | 'revealed'

export function Lots() {
  const { t } = useI18n()
  const [phase, setPhase] = useState<Phase>('idle')
  const [lot, setLot] = useState<GuanyinLot | null>(null)
  const [saved, setSaved] = useState<SavedLot[]>(loadSavedLots)
  const [toast, setToast] = useState('')
  const [viewLotId, setViewLotId] = useState<number | null>(null)
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
    window.setTimeout(() => {
      const exclude = [...new Set([...drawnRef.current, ...saved.map((s) => s.lotId)])]
      const picked = drawLot(exclude)
      drawnRef.current.push(picked.id)
      setLot(picked)
      setPhase('revealed')
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
    setViewLotId(null)
  }

  const viewingLot = viewLotId != null ? LOTS.find((l) => l.id === viewLotId) ?? null : null

  return (
    <div>
      {/* 页头 */}
      <header className="relative overflow-hidden bg-gradient-to-b from-sandalwood-900 via-tibetan-800 to-tibetan-900 py-16 text-center text-rice-50">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <ZenIllustration variant="meditation" animated={false} className="h-full w-full" />
        </div>
        <div className="relative">
          <p className="font-serif text-sm tracking-[0.5em] text-gold-300">观 音 法 门</p>
          <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">{t('lots.title')}</h1>
          <p className="mt-3 font-serif text-sm text-rice-100/85">{t('lots.subtitle')}</p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <p className="mx-auto max-w-2xl text-center font-serif text-sm leading-loose text-ink-700">
          {t('lots.intro')}
        </p>

        {/* ---------- 抽签区 ---------- */}
        <section className="mt-10 flex flex-col items-center">
          {/* 签筒 */}
          <div className={`relative ${phase === 'shaking' ? 'lot-shaking' : ''}`}>
            <svg viewBox="0 0 160 220" className="h-56 w-40 drop-shadow-lg">
              {/* 签筒 */}
              <path d="M40 30h80l8 150a20 20 0 0 1-20 20H52a20 20 0 0 1-20-20z" fill="#8a5a31" />
              <ellipse cx={80} cy={30} rx={40} ry={10} fill="#a06f40" />
              <ellipse cx={80} cy={28} rx={32} ry={7} fill="#3e2818" />
              <path d="M46 60h68" stroke="#c9a227" strokeWidth={2} opacity={0.7} />
              <path d="M44 110h72" stroke="#c9a227" strokeWidth={2} opacity={0.5} />
              {/* 签条 */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <g key={i} className={phase === 'shaking' ? 'animate-float' : ''} style={{ animationDelay: `${i * 0.12}s` }}>
                  <rect
                    x={62 + i * 7 - (i % 2) * 4}
                    y={16 - (i % 3) * 5}
                    width={5}
                    height={46}
                    rx={2.5}
                    fill="#f0e3c8"
                    stroke="#c9a227"
                    strokeWidth={0.8}
                    transform={`rotate(${(i - 2.5) * 6} ${62 + i * 7} 24)`}
                  />
                </g>
              ))}
              <path d="M52 200h56" stroke="#2b1a10" strokeWidth={3} opacity={0.4} />
            </svg>
            {phase === 'shaking' && (
              <span className="absolute -right-6 top-2 animate-ping text-2xl" aria-hidden>✦</span>
            )}
          </div>

          {/* 抽签按钮 */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <button type="button" onClick={shake} disabled={phase === 'shaking'} className="btn-primary !px-10 !py-3 text-base disabled:cursor-wait disabled:opacity-70">
              {phase === 'shaking' ? t('lots.drawing') : phase === 'revealed' ? t('lots.again') : t('lots.draw')}
            </button>
            {phase !== 'shaking' && <p className="font-serif text-xs text-sandalwood-400">{t('lots.shakeHint')}</p>}
          </div>

          {/* ---------- 揭签（翻牌动画） ---------- */}
          {lot && (
            <div className={`flip-card mt-10 w-full max-w-2xl ${phase === 'revealed' ? 'flipped' : ''}`}>
              <div className="flip-card-inner relative min-h-[560px] w-full sm:min-h-[500px]">
                {/* 正面：签筒背面 */}
                <div className="flip-face absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-2 border-gold-500/60 bg-gradient-to-b from-sandalwood-900 to-tibetan-900 p-10 text-center text-rice-50 shadow-xl">
                  <ZenIllustration variant="enso" className="h-28 w-36 rounded-2xl opacity-90" animated={false} />
                  <p className="mt-6 font-serif text-2xl tracking-[0.5em] text-gold-300">观音灵签</p>
                  <p className="mt-3 font-serif text-sm text-rice-100/70">第 {lot.id} 签</p>
                </div>
                {/* 背面：签文 */}
                <div className="flip-back flip-face absolute inset-0 rounded-3xl border border-sandalwood-200 bg-rice-50 p-7 shadow-xl sm:p-10">
                  <LotContent lot={lot} saved={saved.some((s) => s.lotId === lot.id)} onSave={() => keep(lot.id)} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ---------- 我的签文 ---------- */}
        <section className="mt-16">
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
                      onClick={() => setViewLotId(l.id)}
                      className="card flex w-full cursor-pointer items-center gap-4 p-4 text-left"
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

          {/* 历史签详情 */}
          {viewingLot && (
            <div className="mt-8 rounded-3xl border border-sandalwood-200 bg-rice-50 p-7 shadow-sm sm:p-10">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-sandalwood-800">{t('lots.lotNumber', { n: viewingLot.id })}</h3>
                <button
                  type="button"
                  onClick={() => setViewLotId(null)}
                  className="cursor-pointer rounded-full p-2 text-sandalwood-400 hover:bg-sandalwood-100"
                  aria-label={t('nav.closeMenu')}
                >
                  ✕
                </button>
              </div>
              <LotContent lot={viewingLot} saved={saved.some((s) => s.lotId === viewingLot.id)} onSave={() => keep(viewingLot.id)} />
            </div>
          )}
        </section>

        <p className="mt-14 text-center font-serif text-xs leading-relaxed text-sandalwood-400">{t('lots.disclaimer')}</p>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up rounded-full bg-sandalwood-900/95 px-6 py-3 font-serif text-sm text-gold-200 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}

/* ---------- 签文内容 ---------- */
function LotContent({ lot, saved, onSave }: { lot: GuanyinLot; saved: boolean; onSave: () => void }) {
  const { t } = useI18n()
  return (
    <div className="text-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${levelClass(lot.level)}`}>{lot.level}</span>
        <h3 className="font-serif text-2xl font-bold text-sandalwood-900">{lot.title}</h3>
        <span className="text-sm text-sandalwood-400">{t('lots.lotNumber', { n: lot.id })}</span>
      </div>

      {/* 签诗 */}
      <div className="mt-6 rounded-2xl border border-gold-400/50 bg-gradient-to-b from-rice-100 to-rice-50 px-6 py-6">
        <p className="font-serif text-xs tracking-[0.4em] text-gold-600">{t('lots.poemLabel')}</p>
        <p className="mt-4 space-y-2 font-serif text-lg leading-relaxed text-ink-900 sm:text-xl">
          {lot.poem.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </p>
      </div>

      {/* 解签 */}
      <div className="mt-6 text-left">
        <p className="font-serif text-sm font-bold tracking-widest text-sandalwood-700">{t('lots.interpretationLabel')}</p>
        <p className="mt-2 font-serif text-[15px] leading-loose text-ink-700">{lot.meaning}</p>
      </div>

      {/* 禅语祝福 */}
      <div className="mt-6 rounded-2xl bg-tibetan-50 px-6 py-5">
        <p className="font-serif text-sm font-bold tracking-widest text-tibetan-600">{t('lots.blessingLabel')}</p>
        <p className="mt-2 font-serif text-base leading-relaxed text-tibetan-800">{lot.blessing}</p>
      </div>

      <button type="button" onClick={onSave} disabled={saved} className={`mt-6 ${saved ? 'btn-secondary !cursor-default opacity-60' : 'btn-gold'}`}>
        {saved ? `✓ ${t('lots.savedLot')}` : `✧ ${t('lots.saveLot')}`}
      </button>
    </div>
  )
}
