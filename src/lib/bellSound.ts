import { useCallback, useEffect, useRef } from 'react'
import { BELL_TRACK } from '../data/chants'

/**
 * 撞钟音效 hook：真实梵钟录音（本地托管）优先，未就绪时回退 Web Audio 合成。
 * 2D 铜钟与 3D 铜钟共用。
 */
export function useBellSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioReadyRef = useRef(false)
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const a = new Audio(BELL_TRACK.file)
    a.preload = 'auto'
    a.addEventListener('canplaythrough', () => (audioReadyRef.current = true), { once: true })
    a.addEventListener('error', () => (audioReadyRef.current = false), { once: true })
    audioRef.current = a
    return () => {
      a.pause()
      audioRef.current = null
      ctxRef.current?.close().catch(() => undefined)
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

  /** 撞一下钟；返回解锁时长（ms，供调用方做“播完前禁止再撞”） */
  const ring = useCallback((): number => {
    const a = audioRef.current
    if (a && audioReadyRef.current && !a.error) {
      try {
        a.currentTime = 0
        void a.play().catch(() => {
          synthRing()
          return 7000
        })
        return 30000
      } catch {
        synthRing()
        return 7000
      }
    }
    synthRing()
    return 7000
  }, [synthRing])

  /** 当前录音是否仍在播放（用于 ended 解锁） */
  const onEnded = useCallback((cb: () => void) => {
    const a = audioRef.current
    if (!a) return () => undefined
    const handler = () => cb()
    a.addEventListener('ended', handler)
    return () => a.removeEventListener('ended', handler)
  }, [])

  return { ring, onEnded }
}
