import type { ReactNode } from 'react'
import { CoverImage } from '../zen/CoverImage'

/**
 * 全站统一页面横幅。
 * - tone="light"（默认）：明亮照片 + 白色暖雾遮罩 + 深墨文字 —— 明快、积极、不压抑；
 * - tone="dark"：深色调（适用本身暗沉的素材图）。Banner 图 eager + fetchpriority=high。
 */
export function PageBanner({
  image,
  kicker,
  title,
  subtitle,
  tone = 'light',
  compact = false,
  children,
  decor,
}: {
  image: string
  kicker?: string
  title: string
  subtitle?: string
  tone?: 'light' | 'dark'
  compact?: boolean
  children?: ReactNode
  /** 全幅定位的装饰元素（莲花、浮光等，作为 banner 直接子元素） */
  decor?: ReactNode
}) {
  const dark = tone === 'dark'
  return (
    <header className={`relative overflow-hidden text-center ${dark ? 'bg-sandalwood-950 text-paper' : 'bg-rice-50 text-ink-900'}`}>
      <div className="absolute inset-0">
        <CoverImage
          src={image}
          alt=""
          fallbackVariant="clouds"
          priority
          className="h-full w-full object-cover"
        />
      </div>
      {dark ? (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sandalwood-950/45 via-sandalwood-950/15 to-sandalwood-950/80" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
        </>
      ) : (
        <>
          {/* 明亮模式：白色暖雾 + 顶部柔光，保留照片的明快感 */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-rice-50/85 via-rice-50/55 to-rice-50/90" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,251,235,0.55),transparent_60%)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/45 to-transparent" />
        </>
      )}
      {decor}
      <div className={`relative mx-auto max-w-4xl px-4 sm:px-6 ${compact ? 'py-10 sm:py-12' : 'py-14 sm:py-20'}`}>
        {kicker && (
          <p
            className={`font-serif text-xs tracking-[0.5em] uppercase sm:text-sm ${
              dark ? 'banner-text text-gold-300' : 'text-tibetan-600'
            }`}
          >
            {kicker}
          </p>
        )}
        <h1
          className={`mt-3 font-brush text-4xl tracking-[0.04em] sm:text-5xl ${
            dark ? 'banner-text' : 'text-ink-900 [filter:drop-shadow(0_1px_0_rgba(255,255,255,0.6))]'
          }`}
        >
          {title}
        </h1>
        {subtitle && (
          <p className={`mt-3 font-serif text-sm sm:text-base ${dark ? 'banner-text text-paper/95' : 'text-ink-700'}`}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </header>
  )
}

/** 区块标题（书法标题 + 可选副标 + 禅意分隔符） */
export function SectionHeading({
  title,
  subtitle,
  className = '',
}: {
  title: string
  subtitle?: string
  className?: string
}) {
  return (
    <div className={`text-center ${className}`}>
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="section-sub mt-2">{subtitle}</p>}
      <div className="zen-divider mt-4">
        <span className="text-gold-500">❖</span>
      </div>
    </div>
  )
}

/** 页面内容头（非照片型：法藏 / 观音法门等小页头） */
export function PageIntro({
  kicker,
  title,
  subtitle,
}: {
  kicker: string
  title: string
  subtitle?: string
}) {
  return (
    <header className="text-center">
      <p className="font-serif text-sm tracking-[0.4em] text-gold-600">{kicker}</p>
      <h1 className="mt-2 font-brush text-4xl text-sandalwood-800 sm:text-5xl">{title}</h1>
      {subtitle && <p className="mt-3 font-serif text-sm text-sandalwood-500">{subtitle}</p>}
      <div className="zen-divider mt-5">
        <span className="text-gold-500">❖</span>
      </div>
    </header>
  )
}
