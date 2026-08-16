import { useState } from 'react'
import { ZenIllustration, type IllustrationVariant } from './ZenIllustration'

interface Props {
  src: string
  alt: string
  className?: string
  fallbackVariant: IllustrationVariant
  animated?: boolean
}

/** 真实照片封面：加载失败/缺失时自动回退到禅意 SVG 插画 */
export function CoverImage({ src, alt, className = '', fallbackVariant, animated = false }: Props) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <ZenIllustration variant={fallbackVariant} className={className} animated={animated} />
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`${className} object-cover`}
    />
  )
}
