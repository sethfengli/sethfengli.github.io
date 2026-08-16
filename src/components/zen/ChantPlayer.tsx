import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n'
import { storageGet, storageSet } from '../../lib/storage'
import type { ChantTrack } from '../../data/chants'

const CHANT_KEY = 'hdc.chantCount'

interface Props {
  track: ChantTrack
  index: number
}

/** 圣号梵音播放卡：自定义播放器 + 持诵计数 + 素材署名 */
export function ChantPlayer({ track, index }: Props) {
  const { t, lang } = useI18n()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(false)
  const [count, setCount] = useState(() => storageGet<Record<number, number>>(CHANT_KEY, {})[index] ?? 0)

  useEffect(() => {
    const a = new Audio(track.file)
    a.preload = 'none'
    audioRef.current = a
    const onTime = () => {
      setProgress(a.currentTime)
      setDuration(a.duration || 0)
    }
    const onEnd = () => setPlaying(false)
    const onErr = () => setError(true)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onTime)
    a.addEventListener('ended', onEnd)
    a.addEventListener('error', onErr)
    return () => {
      a.pause()
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onTime)
      a.removeEventListener('ended', onEnd)
      a.removeEventListener('error', onErr)
    }
  }, [track.file])

  const toggle = () => {
    const a = audioRef.current
    if (!a || error) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      void a
        .play()
        .then(() => setPlaying(true))
        .catch(() => setError(true))
    }
  }

  const addCount = () => {
    setCount((c) => {
      const next = c + 1
      const all = storageGet<Record<number, number>>(CHANT_KEY, {})
      all[index] = next
      storageSet(CHANT_KEY, all)
      return next
    })
  }

  const fmt = (s: number) => {
    if (!Number.isFinite(s) || s <= 0) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div className="card flex h-full flex-col p-5">
      <p className="font-serif text-lg font-bold text-sandalwood-800">{lang === 'zh' ? track.labelZh : track.labelEn}</p>

      {/* 播放器 */}
      {error ? (
        <p className="mt-4 rounded-xl bg-rice-100 p-3 text-xs text-sandalwood-500">{t('common.offlineNotice')}</p>
      ) : (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? t('dharma.pause') : t('dharma.play')}
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-tibetan-600 text-paper shadow-md transition hover:bg-tibetan-700 active:scale-95"
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <rect x={6} y={5} width={4.5} height={14} rx={1} />
                <rect x={13.5} y={5} width={4.5} height={14} rx={1} />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-0.5" fill="currentColor">
                <path d="M7 4.8v14.4c0 .8.9 1.3 1.6.9l11-7.2c.6-.4.6-1.4 0-1.8l-11-7.2c-.7-.4-1.6.1-1.6.9z" />
              </svg>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-sandalwood-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-400 to-tibetan-500 transition-[width] duration-300"
                style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
              />
            </div>
            <p className="mt-1.5 font-mono text-[11px] text-sandalwood-400">
              {fmt(progress)} / {fmt(duration)}
            </p>
          </div>
        </div>
      )}

      {/* 持诵计数 */}
      <div className="mt-4 flex items-center justify-between border-t border-sandalwood-200/60 pt-3">
        <button
          type="button"
          onClick={addCount}
          title={t('dharma.chantHint')}
          className="btn-secondary !px-3.5 !py-1.5 text-xs"
        >
          📿 {t('dharma.count', { n: count })}
        </button>
      </div>

      {/* 署名 */}
      <p className="mt-3 text-[11px] leading-relaxed text-sandalwood-400">
        {t('dharma.audioCredit')}：{track.author} · {track.license} ·{' '}
        <a href={track.page} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-tibetan-600">
          Wikimedia Commons
        </a>
      </p>
    </div>
  )
}
