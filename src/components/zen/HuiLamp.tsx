import { useI18n } from '../../i18n'

/**
 * 慧灯（水墨 SVG 回退 / 3D 加载前的占位）
 * ---------------------------------------------------------------
 * 为什么要有它：3D `Lamp3D` 依赖 three.js（707 KB），首次滚到「灯传」一段
 * 才开始下载；在此之前若留空白，用户看到的正是「3D 灯不见了」。
 * 这盏线描灯与 3D 场景同构图、同比例，既不跳版，也本身就是一幅完整的画。
 */
export function HuiLamp({ className = '' }: { className?: string }) {
  const { t } = useI18n()

  // 莲座外圈花瓣：11 枚绕中心排开，尖端朝外
  const outerPetals = Array.from({ length: 11 }, (_, i) => {
    const a = (i / 11) * Math.PI * 2 - Math.PI / 2
    return {
      cx: 120 + Math.cos(a) * 45,
      cy: 258 + Math.sin(a) * 11,
      rot: (a * 180) / Math.PI + 90,
    }
  })
  // 内圈花瓣：略小、略高，与 3D 莲座的双层结构对应
  const innerPetals = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 - Math.PI / 2
    return {
      cx: 120 + Math.cos(a) * 27,
      cy: 250 + Math.sin(a) * 7,
      rot: (a * 180) / Math.PI + 90,
    }
  })

  return (
    <svg
      viewBox="0 0 240 320"
      className={className}
      role="img"
      aria-label={t('common.lampAlt')}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="hui-lamp-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f6ca78" stopOpacity="0.6" />
          <stop offset="52%" stopColor="#e09a4a" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#e09a4a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hui-lamp-bronze" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7d654c" />
          <stop offset="52%" stopColor="#5a4632" />
          <stop offset="100%" stopColor="#3a2b1d" />
        </linearGradient>
        <linearGradient id="hui-lamp-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#bf4a27" />
          <stop offset="52%" stopColor="#e28a35" />
          <stop offset="100%" stopColor="#f8dd92" />
        </linearGradient>
      </defs>

      {/* 灯焰光晕：中国画里「灯」的分量主要来自这一团暖光 */}
      <ellipse cx="120" cy="140" rx="78" ry="92" fill="url(#hui-lamp-glow)" />
      <circle cx="120" cy="142" r="55" stroke="#c9b79a" strokeOpacity="0.35" strokeWidth="1" />

      {/* 火焰：外焰朱、内焰金，CSS 里做极轻的明灭 */}
      <g className="hui-lamp-flame">
        <path
          d="M120 92 C134 118 141 137 132 152 C127 162 113 162 108 152 C99 137 106 118 120 92Z"
          fill="url(#hui-lamp-flame)"
        />
        <path
          d="M120 118 C127 132 129 143 123 150 C119 155 114 153 112 148 C108 140 113 130 120 118Z"
          fill="#fff3c4"
          opacity="0.92"
        />
      </g>

      {/* 灯芯 */}
      <path d="M120 158v8" stroke="#2b2118" strokeWidth="3" strokeLinecap="round" />

      {/* 灯盏 */}
      <ellipse cx="120" cy="166" rx="50" ry="9" fill="#2f2418" opacity="0.7" />
      <ellipse cx="120" cy="166" rx="43" ry="6" fill="#8a5a2a" opacity="0.55" />
      <path
        d="M70 166 C78 188 96 198 120 198 C144 198 162 188 170 166 C150 174 90 174 70 166Z"
        fill="url(#hui-lamp-bronze)"
        stroke="#2f2418"
        strokeWidth="1.2"
      />
      <path d="M68 165 C90 174 150 174 172 165" stroke="#b09064" strokeWidth="2" opacity="0.6" strokeLinecap="round" />

      {/* 灯柱与束腰 */}
      <path d="M114 198 C112 216 108 232 106 248 M126 198 C128 216 132 232 134 248" stroke="url(#hui-lamp-bronze)" strokeWidth="9" strokeLinecap="round" />
      <circle cx="120" cy="224" r="9" fill="url(#hui-lamp-bronze)" stroke="#2f2418" strokeWidth="1" />

      {/* 莲座：外圈 / 内圈两层，取自 3D 场景同一结构 */}
      <g fill="#b98a80" stroke="#8f675f" strokeWidth="0.7" opacity="0.9">
        {outerPetals.map((p, i) => (
          <ellipse key={`o${i}`} cx={p.cx} cy={p.cy} rx="23" ry="8" transform={`rotate(${p.rot} ${p.cx} ${p.cy})`} />
        ))}
      </g>
      <g fill="#cba39a" stroke="#8f675f" strokeWidth="0.5" opacity="0.85">
        {innerPetals.map((p, i) => (
          <ellipse key={`i${i}`} cx={p.cx} cy={p.cy} rx="16" ry="6" transform={`rotate(${p.rot} ${p.cx} ${p.cy})`} />
        ))}
      </g>
      <ellipse cx="120" cy="255" rx="52" ry="12" fill="url(#hui-lamp-bronze)" stroke="#2f2418" strokeWidth="1" />
      <ellipse cx="120" cy="286" rx="66" ry="12" fill="#3a2c1e" opacity="0.12" />

      {/* 灯座上的朱砂小印，点明「慧灯」 */}
      <rect x="146" y="238" width="14" height="14" rx="1" fill="#a83a2c" opacity="0.9" />
      <text x="153" y="248.5" fill="#fbf7ee" fontSize="9" textAnchor="middle" fontFamily='"Noto Serif SC", serif'>
        灯
      </text>
    </svg>
  )
}
