import type { ReactNode } from 'react'
import { CoverImage } from '../zen/CoverImage'

/**
 * 全站统一页面横幅（照片底 + 渐变遮罩 + 居中标语）。
 * Banner 图 eager + fetchpriority=high（首屏关键图）。
 */
export function PageBanner({
  image,
  kicker,
  title,
  subtitle,
  gradient = 'from-sandalwood-950/45 via-sandalwood-950/5 to-sandalwood-950/80',
  compact = false,
  children,
  decor,
}: {
  image: string
  kicker?: string
  title: string
  subtitle?: string
  gradient?: string
  compact?: boolean
  children?: ReactNode
  /** 全幅定位的装饰元素（莲花、浮光等，作为 banner 直接子元素） */
  decor?: ReactNode
}) {
  return (
    <header className="relative overflow-hidden bg-sandalwood-950 text-paper">
      <div className="absolute inset-0">
        <CoverImage
          src={image}
          alt=""
          fallbackVariant="clouds"
          priority
          className={`h-full w-full ${compact ? '' : 'scale-105'}`}
        />
      </div>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${gradient}`} />
      {decor}
      {/* 底部金色细线 */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
      <div className={`relative mx-auto max-w-4xl px-4 text-center sm:px-6 ${compact ? 'py-12' : 'py-16 sm:py-20'}`}>
        {kicker && (
          <p className="banner-text font-serif text-xs tracking-[0.5em] text-gold-300 uppercase sm:text-sm">
            {kicker}
          </p>
        )}
        <h1 className="mt-3 banner-text font-brush text-4xl tracking-[0.04em] sm:text-5xl">{title}</h1>
        {subtitle && (
          <p className="mt-3 banner-text font-serif text-sm text-paper/95 sm:text-base">{subtitle}</p>
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
