import type { ReactNode } from 'react'
import { CoverImage } from '../zen/CoverImage'

/**
 * 全站统一页面横幅 —— 新中式极简「图文并置」。
 *
 * 设计意图：
 * 旧版把照片铺满整屏、再压一层雾化遮罩，导致画面发灰、层次尽失，
 * 是「显旧」的最大来源。新版改为杂志式并置：
 *   左：宣纸底上的题头（朱砂小标 + 宋体大标题 + 副题 + 内容插槽）
 *   右：完整清透的照片，独立成框，并以一条错位青线压边
 * 照片不再承担承载文字的任务，因而可以全明显示；文字也无需重投影。
 */
export function PageBanner({
  image,
  kicker,
  title,
  subtitle,
  children,
}: {
  image: string
  kicker?: string
  title: string
  subtitle?: string
  children?: ReactNode
}) {
  return (
    <header className="border-b border-hairline">
      <div className="container-page grid items-center gap-10 pt-10 pb-14 lg:grid-cols-12 lg:gap-14 lg:pt-14 lg:pb-20">
        {/* 题头 */}
        <div className="lg:col-span-7">
          {kicker && <p className="section-kicker">{kicker}</p>}
          <h1 className="mt-5 max-w-4xl font-serif text-4xl leading-[1.15] font-normal tracking-tight text-ink-900 text-balance sm:text-5xl lg:text-[3.6rem]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-5 max-w-2xl font-serif text-base leading-[1.9] text-ink-500">{subtitle}</p>
          )}
          {children}
        </div>

        {/* 照片：全明显示 + 错位压边（压边内收，避免贴到视口边缘） */}
        <div className="relative lg:col-span-5">
          <span
            aria-hidden
            className="absolute -top-2.5 -right-2.5 hidden h-full w-full rounded-xs border border-sandalwood-300 lg:block"
          />
          <div className="relative aspect-4/3 overflow-hidden rounded-xs border border-hairline bg-rice-100 lg:aspect-16/10">
            <CoverImage
              src={image}
              alt=""
              fallbackVariant="clouds"
              priority
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  )
}

/**
 * 区块标题（新中式极简）：朱砂小标 + 宋体主标题 + 副题 + 细线收束。
 * 取消书法体与 ❖ 字符装饰；`align` 支持左对齐以服务非对称版式。
 */
export function SectionHeading({
  kicker,
  title,
  subtitle,
  align = 'center',
  className = '',
}: {
  kicker?: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
  className?: string
}) {
  const centered = align === 'center'
  return (
    <div className={`${centered ? 'text-center' : ''} ${className}`}>
      {kicker && <p className="section-kicker">{kicker}</p>}
      <h2 className={`section-title ${kicker ? 'mt-3' : ''}`}>{title}</h2>
      {subtitle && <p className={`section-sub mt-3 ${centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>{subtitle}</p>}
      <span className={`mt-6 block h-px w-14 bg-hairline ${centered ? 'mx-auto' : ''}`} />
    </div>
  )
}

/** 页面内容头（非照片型：文库等小页头），左对齐题头 + 发丝收束 */
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
    <header className="border-b border-hairline">
      <div className="container-page pt-10 pb-10 lg:pt-14 lg:pb-14">
        <p className="section-kicker">{kicker}</p>
        <h1 className="mt-5 max-w-4xl font-serif text-4xl leading-[1.15] font-normal tracking-tight text-ink-900 text-balance sm:text-5xl">
          {title}
        </h1>
        {subtitle && <p className="mt-5 max-w-3xl font-serif text-base leading-[1.9] text-ink-500">{subtitle}</p>}
      </div>
    </header>
  )
}

/**
 * 统一区块外壳：把「容器宽度 + 纵向节奏 + 分隔线 + 底色」收敛到一处，
 * 避免各页面各自写 py-12/16/20/24 造成纵向节奏不齐。
 * 全站只有三种节奏：normal（默认）/ tight（列表页）/ loose（首页大区）。
 */
export function Section({
  children,
  width = 'default',
  rhythm = 'normal',
  tone = 'plain',
  className = '',
}: {
  children: ReactNode
  width?: 'default' | 'wide' | 'narrow' | 'tight'
  rhythm?: 'normal' | 'tight' | 'loose'
  tone?: 'plain' | 'muted'
  className?: string
}) {
  const w = {
    default: '',
    wide: 'max-w-none',
    narrow: 'max-w-3xl',
    tight: 'max-w-5xl',
  }[width]
  const r = { normal: 'py-16 sm:py-20', tight: 'py-12 sm:py-14', loose: 'py-16 sm:py-24' }[rhythm]
  const t = tone === 'muted' ? 'bg-rice-100/60' : ''
  return (
    <section className={`${t} ${className}`}>
      <div className={width === 'default' || width === 'wide' ? `container-page ${r}` : `container-narrow ${w} ${r}`}>
        {children}
      </div>
    </section>
  )
}

/** 极简分隔：细线 + 单点（取代 ❖/✦ 字符装饰） */
export function Ornament({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden className={`ornament ${className}`}>
      <span className="h-1 w-1 rounded-full bg-tibetan-600" />
    </span>
  )
}
