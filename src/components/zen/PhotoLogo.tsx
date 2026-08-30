import { useI18n } from '../../i18n'

/**
 * 站标：真实莲花照片（圆形裁切 + 金色描边）。
 * 照片取自 Wikimedia Commons（见 public/photos/CREDITS.md）。
 */
export function PhotoLogo({ className = 'h-9 w-9' }: { className?: string }) {
  const { t } = useI18n()
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-full ring-2 ring-gold-400/80 shadow-md ${className}`}
    >
      <img src="/photos/lotus.jpg" alt={t('common.logoAlt')} className="h-full w-full object-cover" loading="eager" />
    </span>
  )
}
