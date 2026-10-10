import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n'
import { BELL_TRACK } from '../../data/chants'

/**
 * 撞钟组件（重制版）
 * - 造型：木架 + 青铜大钟 + 撞木（横置木槌），点击撞木荡起击钟；
 * - 音色：默认播放真实梵钟实录（長命寺梵鐘，CC BY 2.1 JP，本地托管）；
 *   录音未就绪时回退 Web Audio 多泛音合成（基频 + 2.0/2.42/3.19/4.17 倍泛音 + 击槌噪声瞬态）；
 * - 声场：声波涟漪 + “嗡”字余韵浮现。
 */

export function TempleBell() {
  const { t } = useI18n()
  const [ringing, setRinging] = useState(false)
  const [count, setCount] = useState(0)
  const [omId, setOmId] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioReadyRef = useRef(false)
  const ctxRef = useRef<AudioContext | null>(null)

  /* 预载真实梵钟录音 */
  useEffect(() => {
    const a = new Audio(BELL_TRACK.file)
    a.preload = 'auto'
    a.addEventListener(
      'canplaythrough',
      () => {
        audioReadyRef.current = true
      },
      { once: true },
    )
    a.addEventListener(
      'error',
      () => {
        audioReadyRef.current = false
      },
      { once: true },
    )
    audioRef.current = a
    return () => {
      a.pause()
      audioRef.current = null
    }
  }, [])

  const synthRing = useCallback(() => {
    try {
      const AC: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!ctxRef.current) ctxRef.current = new AC()
      const ctx = ctxRef.current
      if (ctx.state === 'suspended') void ctx.resume()
      const now = ctx.currentTime
      const master = ctx.createGain()
      master.gain.setValueAtTime(0.0001, now)
      master.gain.exponentialRampToValueAtTime(0.9, now + 0.015)
      master.gain.exponentialRampToValueAtTime(0.0001, now + 6.5)
      master.connect(ctx.destination)

      // 铜钟频谱（近似）：基频 130.8Hz + 非谐泛音
      const partials = [
        { f: 130.8, g: 1 },
        { f: 262.9, g: 0.55 },
        { f: 316.5, g: 0.4 },
        { f: 417.3, g: 0.28 },
        { f: 545.5, g: 0.18 },
        { f: 700, g: 0.1 },
      ]
      for (const { f, g } of partials) {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(f, now)
        osc.frequency.exponentialRampToValueAtTime(f * 0.996, now + 6)
        const gNode = ctx.createGain()
        gNode.gain.setValueAtTime(0.0001, now)
        gNode.gain.exponentialRampToValueAtTime(g * 0.32, now + 0.02)
        gNode.gain.exponentialRampToValueAtTime(0.0001, now + 6.2)
        osc.connect(gNode).connect(master)
        osc.start(now)
        osc.stop(now + 6.4)
      }
      // 击槌噪声瞬态
      const len = Math.floor(ctx.sampleRate * 0.12)
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2)
      const noise = ctx.createBufferSource()
      noise.buffer = buf
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 900
      const ng = ctx.createGain()
      ng.gain.value = 0.35
      noise.connect(lp).connect(ng).connect(master)
      noise.start(now)
    } catch {
      /* 无音频环境时静默 */
    }
  }, [])

  const ring = useCallback(() => {
    if (ringing) return
    setRinging(true)
    setCount((c) => c + 1)
    setOmId((v) => v + 1)

    const finish = (ms: number) => {
      window.setTimeout(() => setRinging(false), ms)
    }

    const a = audioRef.current
    if (a && audioReadyRef.current && !a.error) {
      try {
        a.currentTime = 0
        const onEnded = () => {
          a.removeEventListener('ended', onEnded)
          setRinging(false)
        }
        a.addEventListener('ended', onEnded)
        void a.play().catch(() => {
          synthRing()
          finish(7000)
        })
        // 兜底：录音异常长/事件缺失时最迟 30s 解锁
        finish(30000)
      } catch {
        synthRing()
        finish(7000)
      }
    } else {
      synthRing()
      finish(7000)
    }
  }, [ringing, synthRing])

  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => undefined)
    }
  }, [])

  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* “嗡”余韵 */}
      {ringing && (
        <span
          key={omId}
          className="om-float pointer-events-none absolute top-10 left-1/2 z-10 -translate-x-1/2 font-song text-4xl font-bold text-brass-400"
          aria-hidden
        >
          嗡
        </span>
      )}

      <button
        type="button"
        onClick={ring}
        disabled={ringing}
        aria-label={t('dharma.ringBell')}
        title={t('dharma.ringBell')}
        className={`group relative block cursor-pointer ${
          ringing ? 'cursor-wait opacity-90' : ''
        }`}
      >
        <svg aria-hidden="true" viewBox="0 0 420 340" className="h-72 w-[420px] max-w-full sm:h-80">
          {/* 木架 */}
          <path d="M120 60v190M300 60v190" stroke="#5a3d22" strokeWidth="14" strokeLinecap="round" />
          <path d="M96 60h228" stroke="#5a3d22" strokeWidth="18" strokeLinecap="round" />
          <path d="M96 60v10M324 60v10" stroke="#3e2818" strokeWidth="18" strokeLinecap="round" />
          <path d="M120 130h180" stroke="#5a3d22" strokeWidth="10" strokeLinecap="round" opacity="0.9" />
          <circle cx={96} cy={60} r={10} fill="#d4a92c" />
          <circle cx={324} cy={60} r={10} fill="#d4a92c" />

          {/* 铜钟 */}
          <g className={ringing ? 'origin-top animate-swing' : ''} style={{ transformOrigin: '210px 70px' }}>
            <path d="M150 84h120l-10 168a38 38 0 0 1-76 0z" fill="#a5713f" />
            <path d="M150 84h120l-4 52H154z" fill="#d4a92c" opacity="0.35" />
            <path d="M146 84h128l6 34H140z" fill="#8a5c3a" />
            <ellipse cx={210} cy={256} rx={34} ry={8} fill="#3e2818" opacity="0.6" />
            {/* 撞座 */}
            <circle cx={210} cy={168} r={17} fill="none" stroke="#d4a92c" strokeWidth={3} opacity="0.8" />
            <circle cx={210} cy={168} r={7} fill="#d4a92c" opacity="0.7" />
            {/* 钟面纹饰 */}
            <path d="M168 100c6 10 10 22 12 36M252 100c-6 10-10 22-12 36" stroke="#d4a92c" strokeWidth={2.5} fill="none" opacity="0.55" />
            <path d="M162 232h96" stroke="#d4a92c" strokeWidth={2.5} opacity="0.4" />
          </g>

          {/* 声波 */}
          {ringing &&
            [0, 1, 2].map((i) => (
              <path
                key={i}
                d={`M${300 + i * 26} 120a${40 + i * 18} 44 0 0 1 0 88`}
                fill="none"
                stroke="#d4a92c"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="animate-ripple"
                style={{ animationDelay: `${i * 0.55}s`, transformOrigin: `${300 + i * 26}px 164px` }}
              />
            ))}

          {/* 撞木（横置木槌，自右荡起击钟） */}
          <g className={ringing ? 'bell-striker' : ''}>
            <line x1={330} y1={60} x2={304} y2={120} stroke="#4a3b26" strokeWidth={3} opacity="0.7" />
            <line x1={330} y1={60} x2={356} y2={120} stroke="#4a3b26" strokeWidth={3} opacity="0.7" />
            <rect x={300} y={108} width={92} height={26} rx={13} fill="#6b4a2f" />
            <rect x={300} y={112} width={92} height={6} rx={3} fill="#a5713f" opacity="0.8" />
            <rect x={368} y={100} width={26} height={42} rx={13} fill="#543620" />
            <circle cx={381} cy={121} r={6} fill="#d4a92c" opacity="0.9" />
          </g>
        </svg>
      </button>

      <div className="text-center font-song text-sm text-celadon-500">
        {ringing ? t('dharma.ringing') : count > 0 ? t('dharma.bellCount', { n: count }) : '\u00a0'}
        <p className="mt-1 text-[11px] text-celadon-400">
          {BELL_TRACK.author} · {BELL_TRACK.license} · Wikimedia Commons
        </p>
      </div>
    </div>
  )
}
