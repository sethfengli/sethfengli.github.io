import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n'
import LINGQI_JSON from '../../content/lingqi.json'
import { storageGet, storageSet } from '../../lib/storage'

/**
 * 灵棋经占卜（纯 2D，无 three 依赖）：
 * 十二枚棋子（上/中/下各四枚），掷出后统计三个层级各自「现字」的数量（0~4），
 * 依 上中下 计数得卦（如 121 = 一上二中一下），全文 125 卦见 src/content/lingqi.json。
 */

interface LingqiItem {
  code: string
  levelText: string
  name: string
  image: string
  note?: string
  xiang: string
  yan?: string
  he?: string
  chen?: string
  liu?: string
  shi: string
}

const LINGQI = LINGQI_JSON as LingqiItem[]
const KEY = 'hdc.lingqiHistory'

export interface LingqiRecord {
  code: string
  at: number
}

function loadHistory(): LingqiRecord[] {
  return storageGet<LingqiRecord[]>(KEY, [])
}

/** 掷卦：上/中/下各得 0~4（每层四枚棋子，现字即计 1） */
function castLingqi(): { code: string; counts: [number, number, number] } {
  const rnd = () => Math.floor(Math.random() * 2)
  const counts: [number, number, number] = [rnd() + rnd() + rnd() + rnd(), rnd() + rnd() + rnd() + rnd(), rnd() + rnd() + rnd() + rnd()]
  return { code: counts.join(''), counts }
}

const LVL_KEYS = ['lingqi.level0', 'lingqi.level1', 'lingqi.level2'] as const

export function LingQiBoard() {
  const { t } = useI18n()
  const [rolling, setRolling] = useState(false)
  const [result, setResult] = useState<{ code: string; counts: [number, number, number] } | null>(null)
  const [history, setHistory] = useState<LingqiRecord[]>(loadHistory)
  const [expanded, setExpanded] = useState(false)
  // 每个棋子当前显示的状态：-1=空面, 0/1/2=显示上/中/下 → 用于动画乱跳
  const [faces, setFaces] = useState<number[]>(() => Array(12).fill(-1))
  const timerRef = useRef(0)

  useEffect(() => () => window.clearInterval(timerRef.current), [])

  const cast = () => {
    if (rolling) return
    setRolling(true)
    setExpanded(false)
    // 乱跳动画 ~1.15s
    const iv = window.setInterval(() => setFaces(randomFaces()), 130)
    timerRef.current = iv
    window.setTimeout(() => {
      window.clearInterval(iv)
      const res = castLingqi()
      // faces 对应 12 枚：前 4 上、4 中、4 下；按计数填充（现字在前，空面在后）
      setFaces(Array.from({ length: 12 }, (_, i) => {
        const level = Math.floor(i / 4)
        const idx = i % 4
        return idx < res.counts[level] ? level : -1
      }))
      setResult(res)
      setRolling(false)
      setHistory((h) => {
        const next = [{ code: res.code, at: Date.now() }, ...h].slice(0, 12)
        storageSet(KEY, next)
        return next
      })
    }, 1150)
  }

  const clearHistory = () => {
    setHistory([])
    storageSet(KEY, [])
  }

  const item = result ? LINGQI.find((q) => q.code === result.code) : undefined
  const counts = result?.counts ?? [0, 0, 0]

  return (
    <div className="space-y-10">
      {/* 玩法说明 + 棋子 */}
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="card-link p-7 sm:p-9">
          <p className="font-serif text-sm tracking-[0.3em] text-tibetan-600">{t('lingqi.howTitle')}</p>
          <p className="mt-4 font-serif text-[15px] leading-loose text-ink-700">{t('lingqi.howDesc')}</p>
          <ul className="mt-5 space-y-2 font-serif text-sm leading-relaxed text-ink-700">
            {[t('lingqi.how1'), t('lingqi.how2'), t('lingqi.how3')].map((s, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-100 text-[10px] font-bold text-gold-700">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={cast} disabled={rolling} className="btn-primary !px-8 disabled:cursor-wait disabled:opacity-70">
              {rolling ? t('lingqi.casting') : result ? t('lingqi.castAgain') : t('lingqi.castBtn')}
            </button>
            {result && (
              <button type="button" onClick={clearHistory} className="cursor-pointer text-xs text-sandalwood-500 underline underline-offset-4 transition hover:text-tibetan-600">
                {t('lingqi.clearHistory')}
              </button>
            )}
          </div>
        </div>

        {/* 十二棋子 */}
        <div className="card-link p-7">
          <p className="text-center font-serif text-sm text-sandalwood-500">{t('lingqi.chessTitle')}</p>
          <div className="mt-5 grid grid-cols-4 gap-3">
            {Array.from({ length: 12 }, (_, i) => {
              const level = Math.floor(i / 4)
              const shown = faces[i] === level
              const showChar = rolling || shown
              return (
                <div
                  key={i}
                  className={`relative flex aspect-square items-center justify-center rounded-full border-2 font-serif text-2xl font-bold transition-all duration-300 ${
                    rolling
                      ? 'border-gold-400 bg-gold-100 text-gold-600'
                      : shown
                        ? 'border-tibetan-500 bg-tibetan-600 text-paper shadow-md shadow-tibetan-900/25'
                        : 'border-sandalwood-300 bg-surface text-sandalwood-400/70'
                  }`}
                >
                  <span className={rolling ? 'animate-bounce' : ''}>{showChar ? t(LVL_KEYS[Math.min(level, 2)]) : '·'}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex justify-center gap-5 text-xs text-sandalwood-400">
            <span>{t('lingqi.level0')} ×4</span>
            <span>{t('lingqi.level1')} ×4</span>
            <span>{t('lingqi.level2')} ×4</span>
          </div>
        </div>
      </div>

      {/* 卦象结果 */}
      {item && result && (
        <div className="card-link relative overflow-hidden p-7 sm:p-9">
          {/* 光晕装饰 */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gold-200/40 blur-3xl" aria-hidden />
          <div className="relative flex flex-wrap items-center gap-8">
            <div className="mx-auto text-center sm:mx-0">
              <p className="font-serif text-xs tracking-[0.35em] text-gold-600">{t('lingqi.resultLabel')}</p>
              <p className="mt-3 font-brush text-5xl text-tibetan-600">{item.name}</p>
              <p className="mt-2 font-serif text-sm tracking-[0.25em] text-sandalwood-600">{item.image}</p>
              {/* 层级计数徽章 */}
              <div className="mt-4 flex justify-center gap-2">
                {counts.map((c, i) => (
                  <span key={i} className="chip tabular-nums">
                    {t(LVL_KEYS[i] ?? LVL_KEYS[0])} · {c}
                  </span>
                ))}
              </div>
            </div>
            <div className="min-w-0 flex-1 rounded-2xl border border-gold-400/40 bg-gradient-to-b from-rice-100/70 to-rice-50 px-6 py-5">
              <p className="font-serif text-xs tracking-[0.3em] text-tibetan-600">{t('lingqi.xiang')}</p>
              <p className="mt-3 font-brush text-lg leading-relaxed text-ink-900 sm:text-xl">{item.xiang}</p>
              {item.shi && (
                <>
                  <p className="mt-5 border-t border-gold-400/30 pt-4 font-serif text-xs tracking-[0.3em] text-gold-700">{t('lingqi.shi')}</p>
                  <p className="mt-2 font-brush text-base leading-relaxed text-sandalwood-800">{item.shi}</p>
                </>
              )}
            </div>
          </div>

          {/* 历代注疏（折叠） */}
          <div className="relative mt-6">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-sandalwood-200/70 bg-surface px-4 py-3 text-sm font-medium text-sandalwood-700 transition hover:border-gold-400/70"
              aria-expanded={expanded}
            >
              {t('lingqi.notes')}
              <span className={`text-gold-600 transition-transform ${expanded ? 'rotate-45' : ''}`} aria-hidden>＋</span>
            </button>
            {expanded && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  ['yan', t('lingqi.yan'), item.yan],
                  ['he', t('lingqi.he'), item.he],
                  ['chen', t('lingqi.chen'), item.chen],
                  ['liu', t('lingqi.liu'), item.liu],
                ].map(([k, label, text]) =>
                  text ? (
                    <div key={k} className="rounded-xl bg-rice-100/70 px-4 py-3">
                      <p className="font-serif text-xs font-bold tracking-widest text-tibetan-600">{label}</p>
                      <p className="mt-1.5 font-serif text-[13px] leading-relaxed text-ink-700">{text}</p>
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 卦历 */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-bold text-sandalwood-800">{t('lingqi.historyTitle')}</h2>
          {history.length > 0 && (
            <button type="button" onClick={clearHistory} className="cursor-pointer text-xs text-tibetan-500 underline underline-offset-4 transition hover:text-tibetan-700">
              {t('lingqi.clearHistory')}
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="mt-5 rounded-2xl border-2 border-dashed border-sandalwood-200 bg-rice-100/50 p-10 text-center font-serif text-sandalwood-500">
            {t('lingqi.historyEmpty')}
          </p>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((h) => {
              const q = LINGQI.find((x) => x.code === h.code)
              if (!q) return null
              return (
                <li key={`${h.code}-${h.at}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setResult({ code: q.code, counts: q.levelText.split('').map(Number) as [number, number, number] })
                      setExpanded(false)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="card-link flex w-full cursor-pointer items-center gap-4 p-4 text-left"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tibetan-50 font-brush text-lg text-tibetan-600">
                      {q.code}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-serif font-bold text-sandalwood-800">
                        {q.name} · {q.image}
                      </span>
                      <span className="mt-0.5 block text-xs text-sandalwood-400">
                        {new Date(h.at).toLocaleString()}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function randomFaces(): number[] {
  return Array.from({ length: 12 }, (_, i) => (Math.random() < 0.5 ? Math.floor(i / 4) : -1))
}
