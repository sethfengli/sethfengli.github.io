import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n'
import LINGQI_JSON from '../../content/lingqi.json'
import LINGQI_EN_JSON from '../../content/lingqi-en.json'
import { storageGet, storageSet } from '../../lib/storage'

/**
 * 灵棋经占卜（纯 2D，无 three 依赖）：
 * 十二枚棋子（上/中/下各四枚），掷出后统计三个层级各自「现字」的数量（0~4），
 * 依 上中下 计数得卦（如 121 = 一上二中一下），全文 125 卦见 src/content/lingqi.json。
 * 英文界面使用 src/content/lingqi-en.json（按 code 对齐，缺失时回退中文）。
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
const LINGQI_EN = LINGQI_EN_JSON as LingqiItem[]
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
  const { t, lang } = useI18n()
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

  /* 英文模式：按 code 找英文卦辞；个别字段缺失时回退中文 */
  const itemEn = lang === 'en' && item ? LINGQI_EN.find((q) => q.code === item.code) : undefined
  const view = item
    ? {
        name: itemEn?.name ?? item.name,
        image: itemEn?.image ?? item.image,
        xiang: itemEn?.xiang ?? item.xiang,
        shi: itemEn?.shi ?? item.shi,
        yan: itemEn?.yan ?? item.yan,
        he: itemEn?.he ?? item.he,
        chen: itemEn?.chen ?? item.chen,
        liu: itemEn?.liu ?? item.liu,
      }
    : null

  return (
    <div className="space-y-10">
      {/* 玩法说明 + 棋子 */}
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="card p-7 sm:p-9">
          <p className="section-kicker">{t('lingqi.howTitle')}</p>
          <p className="mt-5 font-serif text-[15px] leading-loose text-ink-700">{t('lingqi.howDesc')}</p>
          <ul className="mt-6 space-y-3 font-serif text-sm leading-relaxed text-ink-700">
            {[t('lingqi.how1'), t('lingqi.how2'), t('lingqi.how3')].map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-xs bg-tibetan-600 font-sans text-[10px] text-paper">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button type="button" onClick={cast} disabled={rolling} className="btn-primary disabled:cursor-wait disabled:opacity-70">
              {rolling ? t('lingqi.casting') : result ? t('lingqi.castAgain') : t('lingqi.castBtn')}
            </button>
            {result && (
              <button type="button" onClick={clearHistory} className="btn-ghost text-xs underline underline-offset-4">
                {t('lingqi.clearHistory')}
              </button>
            )}
          </div>
        </div>

        {/* 十二棋子 */}
        <div className="card p-7">
          <p className="font-sans text-[11px] tracking-[0.28em] text-sandalwood-500 uppercase text-center">{t('lingqi.chessTitle')}</p>
          <div className="mt-6 grid grid-cols-4 gap-3">
            {Array.from({ length: 12 }, (_, i) => {
              const level = Math.floor(i / 4)
              const shown = faces[i] === level
              const showChar = rolling || shown
              return (
                <div
                  key={i}
                  className={`relative flex aspect-square items-center justify-center rounded-xs border font-serif text-2xl transition-colors duration-300 ${
                    rolling
                      ? 'border-sandalwood-300 bg-rice-100 text-ink-300'
                      : shown
                        ? 'border-tibetan-600 bg-tibetan-600 text-paper'
                        : 'border-hairline bg-surface text-ink-300/70'
                  }`}
                >
                  <span className={rolling ? 'animate-bounce' : ''}>{showChar ? t(LVL_KEYS[Math.min(level, 2)]) : '·'}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-5 flex justify-center gap-5 font-sans text-xs text-ink-300">
            <span>{t('lingqi.level0')} ×4</span>
            <span>{t('lingqi.level1')} ×4</span>
            <span>{t('lingqi.level2')} ×4</span>
          </div>
        </div>
      </div>

      {/* 卦象结果 */}
      {item && result && (
        <div className="card relative overflow-hidden p-7 sm:p-9">
          <div className="relative flex flex-wrap items-center gap-10">
            <div className="mx-auto text-center sm:mx-0">
              <p className="section-kicker justify-center">{t('lingqi.resultLabel')}</p>
              <p className="mt-4 font-serif text-4xl font-normal tracking-tight text-tibetan-600">{view?.name}</p>
              <p className="mt-2 font-serif text-sm tracking-[0.25em] text-ink-500">{view?.image}</p>
              {/* 层级计数徽章 */}
              <div className="mt-5 flex justify-center gap-2">
                {counts.map((c, i) => (
                  <span key={i} className="chip tabular-nums">
                    {t(LVL_KEYS[i] ?? LVL_KEYS[0])} · {c}
                  </span>
                ))}
              </div>
            </div>
            <div className="min-w-0 flex-1 border-l-2 border-tibetan-600 bg-rice-100/60 px-6 py-5">
              <p className="section-kicker">{t('lingqi.xiang')}</p>
              <p className="mt-3 font-serif text-lg leading-relaxed text-ink-900">{view?.xiang}</p>
              {view?.shi && (
                <>
                  <p className="mt-6 border-t border-hairline pt-4 font-sans text-[11px] tracking-[0.28em] text-sandalwood-500 uppercase">{t('lingqi.shi')}</p>
                  <p className="mt-2 font-serif text-base leading-relaxed text-ink-700">{view.shi}</p>
                </>
              )}
            </div>
          </div>

          {/* 历代注疏（折叠） */}
          <div className="relative mt-8">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between rounded-xs border border-hairline bg-surface px-4 py-3 font-sans text-sm text-ink-700 transition-colors duration-200 hover:border-sandalwood-500"
              aria-expanded={expanded}
            >
              {t('lingqi.notes')}
              <span className={`text-tibetan-600 transition-transform duration-200 ${expanded ? 'rotate-45' : ''}`} aria-hidden>＋</span>
            </button>
            {expanded && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['yan', t('lingqi.yan'), view?.yan],
                  ['he', t('lingqi.he'), view?.he],
                  ['chen', t('lingqi.chen'), view?.chen],
                  ['liu', t('lingqi.liu'), view?.liu],
                ].map(([k, label, text]) =>
                  text ? (
                    <div key={k} className="border-l border-hairline bg-rice-100/60 px-4 py-3">
                      <p className="font-sans text-[11px] tracking-[0.24em] text-tibetan-600">{label}</p>
                      <p className="mt-2 font-serif text-[13px] leading-relaxed text-ink-700">{text}</p>
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
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-hairline pb-4">
          <h2 className="section-title">{t('lingqi.historyTitle')}</h2>
          {history.length > 0 && (
            <button type="button" onClick={clearHistory} className="btn-ghost text-xs underline underline-offset-4">
              {t('lingqi.clearHistory')}
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="mt-6 border border-hairline bg-rice-100/50 px-6 py-12 text-center font-serif text-sm text-ink-500">
            {t('lingqi.historyEmpty')}
          </p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((h) => {
              const q = LINGQI.find((x) => x.code === h.code)
              if (!q) return null
              const qEn = lang === 'en' ? LINGQI_EN.find((x) => x.code === h.code) : undefined
              const name = qEn?.name ?? q.name
              const image = qEn?.image ?? q.image
              return (
                <li key={`${h.code}-${h.at}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setResult({ code: q.code, counts: q.levelText.split('').map(Number) as [number, number, number] })
                      setExpanded(false)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="flex w-full cursor-pointer items-center gap-4 rounded-card border border-hairline bg-surface p-4 text-left transition-colors duration-200 hover:border-sandalwood-500"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs border border-hairline font-serif text-base text-tibetan-600">
                      {q.code}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-serif text-ink-900">
                        {name} · {image}
                      </span>
                      <span className="mt-1 block font-sans text-xs text-ink-300">
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
