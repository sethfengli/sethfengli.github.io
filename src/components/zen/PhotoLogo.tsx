import { useI18n } from '../../i18n'

/**
 * 站标：真实莲花照片（细微圆角方裁 + 发丝描边）。
 * 新中式极简：取消圆形金环与投影，改为「印面」式方裁。
 * 照片取自 Wikimedia Commons（见 public/photos/CREDITS.md）。
 */
export function PhotoLogo({ className = 'h-9 w-9' }: { className?: string }) {
  const { t } = useI18n()
  return (
    <span className={`inline-block shrink-0 overflow-hidden rounded-xs border border-hairline bg-surface ${className}`}>
      <img src="/photos/lotus.jpg" alt={t('common.logoAlt')} className="h-full w-full object-cover" loading="eager" />
    </span>
  )
}
