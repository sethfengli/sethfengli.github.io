import { useCallback, useState } from 'react'

/**
 * 互动香炉：点击点燃心香，青烟升起、香头炭火明灭。
 * bare=true 时不带卡片外框，可直接嵌在场景图（如许愿树旁）中。
 */

export function IncenseBurner({ bare = false }: { bare?: boolean }) {
  const [lit, setLit] = useState(false)
  const [count, setCount] = useState(0)

  const light = useCallback(() => {
    setLit(true)
    setCount((c) => c + 1)
  }, [])

  const inner = (
    <>
      <svg viewBox="0 0 200 150" className="h-32 w-48">
        {/* 底座 */}
        <path d="M40 124h120l-8 16H48z" fill="#543620" opacity="0.9" />
        <ellipse cx={100} cy={124} rx={62} ry={8} fill="#3e2818" />
        {/* 炉身 */}
        <path d="M52 122l-4-18h104l-4 18z" fill="#8a5a31" />
        <ellipse cx={100} cy={104} rx={54} ry={9} fill="#a06f40" />
        <ellipse cx={100} cy={102} rx={46} ry={7} fill="#3e2818" opacity={0.85} />
        <path d="M76 116h48l4 8H72z" fill="#c9a227" opacity={0.8} />
        <circle cx={70} cy={110} r={3} fill="#c9a227" />
        <circle cx={130} cy={110} r={3} fill="#c9a227" />
        {/* 香柱与炭火 */}
        {lit && (
          <>
            <line x1={86} y1={102} x2={86} y2={52} stroke="#8c2f39" strokeWidth={3.5} strokeLinecap="round" />
            <line x1={100} y1={102} x2={100} y2={40} stroke="#8c2f39" strokeWidth={3.5} strokeLinecap="round" />
            <line x1={114} y1={102} x2={114} y2={58} stroke="#8c2f39" strokeWidth={3.5} strokeLinecap="round" />
            {[86, 100, 114].map((cx, i) => (
              <g key={cx}>
                <circle cx={cx} cy={34} r={4} fill="#c9a227" className="animate-glow" style={{ animationDelay: `${i * 0.4}s` }} />
                <circle cx={cx} cy={34} r={2} fill="#f0e3c8" className="animate-candle" style={{ animationDelay: `${i * 0.5}s` }} />
              </g>
            ))}
            {[86, 100, 114].map((cx, i) =>
              [0, 1, 2].map((j) => (
                <circle
                  key={`${cx}-${j}`}
                  cx={cx + j * 6}
                  cy={28 - j * 16}
                  r={5 + j * 3.5}
                  fill="#4a443c"
                  opacity={0.14}
                  className={i === 1 ? 'animate-smoke-rise' : 'animate-smoke-rise-slow'}
                  style={{ animationDelay: `${j * 1.4 + i * 0.5}s` }}
                />
              )),
            )}
          </>
        )}
      </svg>
      <div className="mt-1 text-center font-serif text-xs text-sandalwood-500">
        {lit ? (count > 1 ? `今日已供 ${count} 炷心香` : '心香一炷，遍满十方') : '轻触香炉 · 供上一炷心香'}
      </div>
    </>
  )

  if (bare) {
    return (
      <button
        type="button"
        onClick={light}
        aria-label="点燃心香"
        className="block cursor-pointer rounded-2xl p-2 text-left transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:outline-none"
      >
        {inner}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={light}
      aria-label="点击点燃心香"
      className="group relative block cursor-pointer rounded-2xl border border-sandalwood-200/60 bg-rice-100/60 p-4 text-left transition hover:border-gold-400 hover:bg-rice-100 focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:outline-none"
    >
      {inner}
    </button>
  )
}
