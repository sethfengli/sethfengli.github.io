import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 撞钟组件：铜钟 SVG + Web Audio 实时合成钟声。
 * 无音频文件依赖，完全离线可用；多段泛音 + 指数衰减模拟铜钟余韵。
 */

interface Props {
  onRingStart?: () => void
}

export function TempleBell({ onRingStart }: Props) {
  const [ringing, setRinging] = useState(false)
  const [count, setCount] = useState(0)
  const audioRef = useRef<AudioContext | null>(null)
  const swingRef = useRef<HTMLDivElement>(null)

  const ring = useCallback(() => {
    setRinging(true)
    setCount((c) => c + 1)
    onRingStart?.()
    window.setTimeout(() => setRinging(false), 3200)

    try {
      const AC: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!audioRef.current) audioRef.current = new AC()
      const ctx = audioRef.current
      if (ctx.state === 'suspended') void ctx.resume()

      const now = ctx.currentTime
      const master = ctx.createGain()
      master.gain.setValueAtTime(0.0001, now)
      master.gain.exponentialRampToValueAtTime(0.5, now + 0.02)
      master.gain.exponentialRampToValueAtTime(0.0001, now + 3.0)
      master.connect(ctx.destination)

      // 铜钟频谱：基频 + 近似泛音（2.0 / 2.42 / 3.18 倍）
      const partials = [
        { f: 220, g: 1 },
        { f: 440, g: 0.5 },
        { f: 532, g: 0.35 },
        { f: 700, g: 0.22 },
        { f: 1100, g: 0.1 },
      ]
      for (const { f, g } of partials) {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(f, now)
        osc.frequency.exponentialRampToValueAtTime(f * 0.998, now + 3)
        const gNode = ctx.createGain()
        gNode.gain.setValueAtTime(0.0001, now)
        gNode.gain.exponentialRampToValueAtTime(g * 0.3, now + 0.015)
        gNode.gain.exponentialRampToValueAtTime(0.0001, now + 2.8)
        osc.connect(gNode).connect(master)
        osc.start(now)
        osc.stop(now + 3.1)
      }
    } catch {
      /* 无音频环境时静默 */
    }
  }, [onRingStart])

  useEffect(() => {
    return () => {
      audioRef.current?.close().catch(() => undefined)
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={swingRef}
        className={ringing ? 'origin-top animate-swing' : 'origin-top transition-transform'}
        role="button"
        tabIndex={0}
        aria-label="撞钟"
        onClick={ring}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            ring()
          }
        }}
      >
        <svg viewBox="0 0 220 240" className="h-56 w-56 cursor-pointer drop-shadow-lg sm:h-64 sm:w-64">
          {/* 钟架 */}
          <path d="M70 40v130M150 40v130" stroke="#543620" strokeWidth="8" strokeLinecap="round" opacity="0.85" />
          <path d="M44 40h132" stroke="#543620" strokeWidth="11" strokeLinecap="round" opacity="0.85" />
          <circle cx={44} cy={40} r={7} fill="#c9a227" />
          <circle cx={176} cy={40} r={7} fill="#c9a227" />
          {/* 铜钟 */}
          <g>
            <path d="M88 44h44l-6 128a26 26 0 0 1-52 0z" fill={ringing ? '#a8871f' : '#8a5a31'} />
            <path d="M88 44h44l-3 34H91z" fill="#e8d9b8" opacity="0.5" />
            <path d="M95 78h30" stroke="#c9a227" strokeWidth="2.5" opacity="0.8" />
            <path d="M99 96h22" stroke="#c9a227" strokeWidth="2.5" opacity="0.7" />
            <path d="M103 114h14" stroke="#c9a227" strokeWidth="2.5" opacity="0.6" />
            <ellipse cx={110} cy={176} rx={24} ry={5} fill="#2b1a10" opacity="0.55" />
            <line x1={110} y1={180} x2={110} y2={196} stroke="#543620" strokeWidth="4" />
            <circle cx={110} cy={201} r={5.5} fill="#8c2f39" />
          </g>
          {/* 声波 */}
          {ringing &&
            [0, 1, 2].map((i) => (
              <path
                key={i}
                d={`M${140 + i * 20} 84a${30 + i * 14} 34 0 0 1 0 68`}
                fill="none"
                stroke="#c9a227"
                strokeWidth="3"
                strokeLinecap="round"
                className="animate-ripple"
                style={{ animationDelay: `${i * 0.5}s` }}
              />
            ))}
        </svg>
      </div>
      <div className="text-center font-serif text-sm text-sandalwood-500">
        {count > 0 ? `第 ${count} 声` : '\u00a0'}
      </div>
    </div>
  )
}
