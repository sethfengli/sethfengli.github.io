import { useI18n } from '../../i18n'
import { PHOTO_NAMES } from '../../lib/content'

/**
 * 站标：中国佛教图版（徽记意象），细微圆角方裁 + 发丝描边。
 * 新中式极简：取消圆形金环与投影，改为「印面」式方裁。
 * 图源见 public/photos/cn/CREDITS.md（中国传统佛教题材）。
 *
 * ⚠ 不要在这里硬编码文件名。原先写死的是 `/photos/cn/lotus-03.jpg`，
 *   2026 第 7 轮图版整体转 WebP（`.jpg` → `.webp`）后该路径 404，
 *   站标就变成了空白方框（`naturalWidth === 0`），而 tsc/build 全绿、只有截图能发现。
 *   改为从清单推导，并保留后缀归一，这样再换格式也不会断。
 */
const LOGO_SRC = (() => {
  const pick =
    PHOTO_NAMES.find((f) => f.startsWith('lotus-')) ??
    PHOTO_NAMES.find((f) => f.startsWith('paintings-')) ??
    PHOTO_NAMES[0]
  return pick ? `/photos/cn/${pick.replace(/\.jpe?g$/i, '.webp')}` : ''
})()

export function PhotoLogo({ className = 'h-9 w-9' }: { className?: string }) {
  const { t } = useI18n()
  return (
    <span className={`inline-block shrink-0 overflow-hidden rounded-xs border border-hairline bg-surface ${className}`}>
      {LOGO_SRC ? (
        <img src={LOGO_SRC} alt={t('common.logoAlt')} className="h-full w-full object-cover" loading="eager" />
      ) : null}
    </span>
  )
}
