/**
 * 全站共用的小图标（细线内联 SVG）。
 * ---------------------------------------------------------------
 * 为什么单独立一个文件：
 * 上一版这几个位置是「用字符当图标」—— `＋`（全角, U+FF0B）、`A＋ / A−`、
 * `☰/⚙/✕`。字符当图标有三个毛病：
 *   ① 字形随字体走，换字体就变形、位置也飘（全角 ＋ 尤其明显）；
 *   ② 全角半角混用（`A−` 用 U+2212 减号、`A＋` 用 U+FF0B 全角加号）视觉不一致；
 *   ③ 屏幕阅读器会把它当正文字符念出来。
 * 统一改为同色系 currentColor 的细线 SVG：随文字色、随尺寸、可控线宽，
 * 且一律 aria-hidden（语义由外层按钮的 aria-label 承担）。
 */

interface IconProps {
  className?: string
}

/** 展开 / 收起用的加号（展开时外层旋转 45° 即为叉） */
export function PlusIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5.5v13M5.5 12h13" />
    </svg>
  )
}

/** 「A+ / A−」字号调节：一个 A 加一条水平短划，比用文字字符更稳 */
export function FontSizeIcon({ plus = false, className = 'h-4 w-4' }: IconProps & { plus?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* A 字：左撇、右捺、横杠 */}
      <path d="M3.2 17.5 7.6 6.8l4.4 10.7M4.9 13.6h5.4" />
      {/* 加号或减号 */}
      <path d="M15.4 12.2h5.2" />
      {plus && <path d="M18 9.6v5.2" />}
    </svg>
  )
}
