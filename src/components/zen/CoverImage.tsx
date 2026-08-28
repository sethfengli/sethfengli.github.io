import { useState } from 'react'
import { ZenIllustration, type IllustrationVariant } from './ZenIllustration'

export interface CoverImageProps {
  src: string
  alt: string
  className?: string
  fallbackVariant: IllustrationVariant
  animated?: boolean
  /** 首屏关键图：eager 加载 + fetchpriority=high */
  priority?: boolean
}

/** 真实照片封面：加载失败/缺失时自动回退到禅意 SVG 插画 */
export function CoverImage({
  src,
  alt,
  className = '',
  fallbackVariant,
  animated = false,
  priority = false,
}: CoverImageProps) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <ZenIllustration variant={fallbackVariant} className={className} animated={animated} />
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      onError={() => setFailed(true)}
      className={`${className} object-cover`}
    />
  )
}
