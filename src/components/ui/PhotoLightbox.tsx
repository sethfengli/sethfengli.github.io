import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n'

/**
 * 图片查看器（灯箱）
 * ---------------------------------------------------------------
 * 用户反馈「图片点了没反应，太呆板」。这里做全站复用的半屏/近全屏查看：
 *   - 深墨底 + 宣纸白描边，图片按原比例 object-contain，不裁切；
 *   - 支持 Esc 关闭、←/→ 切换、点背景关闭、按钮关闭；
 *   - 打开时锁 body 滚动、把焦点移到关闭键，关闭后恢复；
 *   - 通过 createPortal 挂到 body，避免被 Reveal 的 transform 困住
 *     （`position: fixed` 在有 transform 的祖先里会变成相对该祖先定位）。
 *
 * 只负责「看」：图片来源、裁切焦点与图注由调用方给出。
 */
export interface PhotoItem {
  src: string
  alt: string
  caption?: string
  /** 额外署名（默认给站内 CREDITS.md 链接） */
  credit?: string
}

export function PhotoLightbox({
  items,
  index,
  onClose,
}: {
  items: PhotoItem[]
  /** null = 关闭；数字 = 当前查看的下标 */
  index: number | null
  onClose: () => void
}) {
  const { t } = useI18n()
  const [cur, setCur] = useState(index ?? 0)
  const closeRef = useRef<HTMLButtonElement>(null)
  const open = index !== null && items.length > 0

  useEffect(() => {
    if (index === null) return
    setCur(Math.max(0, Math.min(index, items.length - 1)))
  }, [index, items.length])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => closeRef.current?.focus(), 20)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowLeft' && items.length > 1) {
        setCur((i) => (i - 1 + items.length) % items.length)
      } else if (e.key === 'ArrowRight' && items.length > 1) {
        setCur((i) => (i + 1) % items.length)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, items.length, onClose])

  if (!open) return null

  const item = items[cur] ?? items[0]
  const many = items.length > 1
  const closeLabel = t('common.photoClose')

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-celadon-950/95 p-4 text-paper sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t('common.photoView')}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-sans text-[11px] tracking-[0.24em] text-paper/55 tabular-nums">
          {t('common.photoCounter', {
            n: String(cur + 1).padStart(2, '0'),
            total: String(items.length).padStart(2, '0'),
          })}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xs border border-paper/20 text-paper/75 transition-colors duration-200 hover:border-paper/45 hover:text-paper focus-visible:ring-2 focus-visible:ring-cinnabar-400 focus-visible:outline-none"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center py-4">
        {/* 背景点击区：不抢焦点，键盘关闭交给 Esc / 关闭键 */}
        <div className="absolute inset-0 cursor-zoom-out" onClick={onClose} aria-hidden />

        <img
          key={item.src}
          src={item.src}
          alt={item.alt}
          className="animate-fade-up relative max-h-full max-w-full object-contain shadow-lift"
          draggable={false}
        />

        {many && (
          <>
            <button
              type="button"
              onClick={() => setCur((i) => (i - 1 + items.length) % items.length)}
              aria-label={t('common.photoPrev')}
              className="absolute top-1/2 left-1 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xs border border-paper/20 bg-celadon-950/60 text-paper/80 transition-colors duration-200 hover:border-paper/45 hover:text-paper focus-visible:ring-2 focus-visible:ring-cinnabar-400 focus-visible:outline-none sm:left-3"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              onClick={() => setCur((i) => (i + 1) % items.length)}
              aria-label={t('common.photoNext')}
              className="absolute top-1/2 right-1 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xs border border-paper/20 bg-celadon-950/60 text-paper/80 transition-colors duration-200 hover:border-paper/45 hover:text-paper focus-visible:ring-2 focus-visible:ring-cinnabar-400 focus-visible:outline-none sm:right-3"
            >
              <Chevron dir="right" />
            </button>
          </>
        )}
      </div>

      <div className="mx-auto max-w-3xl pb-1 text-center">
        {item.caption && <p className="font-song text-sm leading-relaxed text-paper/85">{item.caption}</p>}
        <a
          href="/photos/cn/CREDITS.md"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block font-sans text-[11px] text-paper/45 underline underline-offset-4 transition-colors duration-200 hover:text-paper/75"
        >
          {item.credit ?? t('common.photoCredit')}
        </a>
      </div>
    </div>,
    document.body,
  )
}

function CloseIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function Chevron({ dir, className = 'h-5 w-5' }: { dir: 'left' | 'right'; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  )
}
