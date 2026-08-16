/**
 * 观音灵签 · 签筒（重制版）
 * 朱漆描金签筒：卍字纹、莲徽、云纹、回纹金带，内置廿四签支。
 * shaking：签筒摇动、签支跳动；revealed：一签飞升出筒。
 */

const STICKS = [
  { x: 0, h: 58, r: -8 },
  { x: 6, h: 66, r: 5 },
  { x: -4, h: 62, r: 12 },
  { x: 10, h: 70, r: -4 },
  { x: 2, h: 64, r: -14 },
  { x: 14, h: 60, r: 9 },
  { x: -8, h: 68, r: 2 },
  { x: 8, h: 72, r: -6 },
  { x: -2, h: 56, r: 15 },
  { x: 12, h: 66, r: -10 },
  { x: 4, h: 74, r: 7 },
  { x: -6, h: 62, r: -3 },
  { x: 16, h: 58, r: 11 },
  { x: 0, h: 70, r: -12 },
  { x: -10, h: 64, r: 4 },
  { x: 6, h: 68, r: -8 },
  { x: -4, h: 60, r: 13 },
  { x: 10, h: 72, r: -2 },
  { x: 2, h: 66, r: -16 },
  { x: -8, h: 58, r: 8 },
  { x: 14, h: 64, r: -7 },
  { x: 4, h: 62, r: 3 },
  { x: -12, h: 70, r: -5 },
  { x: 8, h: 60, r: 10 },
]

interface Props {
  shaking: boolean
  revealed: boolean
}

export function LotCylinder({ shaking, revealed }: Props) {
  return (
    <div className={shaking ? 'lot-shaking' : ''}>
      <svg viewBox="0 0 220 300" className="h-64 w-48 drop-shadow-xl sm:h-72">
        {/* 签支（出筒部分） */}
        {STICKS.map((s, i) => (
          <g
            key={i}
            className={shaking ? 'animate-float' : ''}
            style={{ animationDelay: `${(i % 8) * 0.13}s`, animationDuration: '0.9s' }}
          >
            <rect
              x={110 + s.x - 2.5}
              y={40 - s.h / 2 + (s.h % 12)}
              width={5}
              height={s.h / 2 + 26}
              rx={2.5}
              fill="#f0e3c8"
              stroke="#c9a227"
              strokeWidth={0.7}
              transform={`rotate(${s.r} ${110 + s.x} 80)`}
            />
            <circle cx={110 + s.x} cy={52 + (s.h % 10)} r={2} fill="#8c2f39" />
          </g>
        ))}

        {/* 签筒口 */}
        <ellipse cx={110} cy={80} rx={58} ry={14} fill="#5b1c26" />
        <ellipse cx={110} cy={77} rx={50} ry={11} fill="#2e0c12" />
        <ellipse cx={110} cy={80} rx={58} ry={14} fill="none" stroke="#c9a227" strokeWidth={2.5} />

        {/* 筒身：朱漆 */}
        <path d="M52 84c0 18 26 30 58 30s58-12 58-30V240c0 16-24 28-58 28s-58-12-58-28z" fill="#8c2f39" />
        <path d="M52 84c0 18 26 30 58 30s58-12 58-30" fill="none" stroke="#a33f3b" strokeWidth={2} />
        {/* 高光 */}
        <path d="M70 100v150" stroke="#c0564f" strokeWidth={7} strokeLinecap="round" opacity={0.45} />

        {/* 上金带 · 回纹 */}
        <rect x={52} y={112} width={116} height={16} fill="#c9a227" />
        <g stroke="#866a17" strokeWidth={1.4} fill="none" opacity={0.85}>
          {[64, 84, 104, 124, 144].map((x) => (
            <path key={x} d={`M${x} 115h6l-6 5h6l-6 5h6`} />
          ))}
        </g>

        {/* 中段 · 卍字与莲徽 */}
        <g fill="none" stroke="#c9a227" strokeWidth={2} opacity={0.9}>
          {/* 卍 */}
          <g transform="translate(74 158) scale(0.8)">
            <path d="M0 0v18M0 0l9 3M0 0L-3 9M0 9l9 6M0 9l-9 6M0 18l9-3" strokeLinecap="round" />
          </g>
          <g transform="translate(150 148) scale(0.8)">
            <path d="M0 0v18M0 0l9 3M0 0L-3 9M0 9l9 6M0 9l-9 6M0 18l9-3" strokeLinecap="round" />
          </g>
          {/* 莲徽 */}
          <g transform="translate(110 166)">
            <path d="M0-14c-1.5 5-6.5 8-6.5 8s-.5-3.5 1.5-6.5c3-2.5 4.4-2.7 5-1.5z" strokeWidth={1.2} />
            <path d="M0-14c1.5 5 6.5 8 6.5 8s.5-3.5-1.5-6.5c-3-2.5-4.4-2.7-5-1.5z" strokeWidth={1.2} />
            <path d="M-9-6c2 2 4.5 3.5 9 3.5s7-1.5 9-3.5" strokeWidth={1.2} />
            <path d="M0 2v4" strokeWidth={1.2} />
          </g>
        </g>

        {/* 云纹 */}
        <g stroke="#e0c76c" strokeWidth={1.6} fill="none" opacity={0.75}>
          <path d="M62 200c8-6 18-6 24 0s16 6 24 0 18-6 26 0" />
          <path d="M66 212c7-5 15-5 21 0s14 5 21 0 16-5 24 0" />
        </g>

        {/* 下金带 */}
        <rect x={52} y={226} width={116} height={12} fill="#c9a227" />
        {/* 底座 */}
        <path d="M48 240h124l-8 14H56z" fill="#a8871f" />
        <path d="M40 254h140v8H40z" fill="#866a17" />

        {/* 出签动画：一签飞升 */}
        {revealed && (
          <g className="stick-fly">
            <rect x={106} y={30} width={6} height={66} rx={3} fill="#f0e3c8" stroke="#c9a227" strokeWidth={0.8} />
            <circle cx={109} cy={38} r={2.5} fill="#8c2f39" />
          </g>
        )}
      </svg>
    </div>
  )
}
