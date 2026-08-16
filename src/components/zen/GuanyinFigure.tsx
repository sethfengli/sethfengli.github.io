/**
 * 观音菩萨像（原创线描，水墨笔意）
 * 净瓶 · 杨柳 · 圆光 · 莲台 —— 以 currentColor 绘制，随主题着色
 */
export function GuanyinFigure({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 260" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* 圆光 */}
      <circle cx={100} cy={62} r={44} strokeWidth={1.6} opacity={0.85} />
      <circle cx={100} cy={62} r={50} strokeWidth={0.9} opacity={0.45} strokeDasharray="2 6" />
      {/* 天冠 */}
      <path d="M88 34c4-5 20-5 24 0" strokeWidth={1.8} />
      <circle cx={100} cy={31} r={2.6} fill="currentColor" stroke="none" />
      {/* 头部与发髻 */}
      <circle cx={100} cy={52} r={12} strokeWidth={1.8} />
      <path d="M100 40v6" strokeWidth={1.4} opacity={0.7} />
      <path d="M96 46c-1.5-3 1-6 4-6.5M104 46c1.5-3-1-6-4-6.5" strokeWidth={1.2} opacity={0.6} />
      {/* 肩与衣领 */}
      <path d="M84 70c6 8 26 8 32 0" strokeWidth={1.8} />
      {/* 身袍 */}
      <path
        d="M76 76c-14 34-22 74-22 118 0 8 4 12 10 12h72c6 0 10-4 10-12 0-44-8-84-22-118-8 10-18 14-24 14s-16-4-24-14z"
        strokeWidth={2}
        opacity={0.95}
      />
      {/* 衣纹 */}
      <path d="M80 110c14 12 26 12 40 0M78 148c16 14 28 14 44 0" strokeWidth={1.2} opacity={0.55} />
      <path d="M88 84c8 6 16 6 24 0" strokeWidth={1.2} opacity={0.55} />
      {/* 右臂持杨柳 */}
      <path d="M118 78c10 6 18 14 22 24" strokeWidth={2.4} />
      <path d="M140 102c0-8 6-12 12-10 6 2 8 8 6 14-3 8-11 11-18 8" strokeWidth={1.4} opacity={0.8} />
      <path d="M146 98c4-2 8-2 10 0M142 106c4-1 7 0 9 2" strokeWidth={1} opacity={0.6} />
      {/* 左臂持净瓶 */}
      <path d="M82 78c-10 6-17 13-22 22" strokeWidth={2.4} />
      <path d="M58 104h14l-2 14h-10z" strokeWidth={1.6} opacity={0.9} />
      <path d="M60 100c0-4 3-7 7-7h6" strokeWidth={1.2} opacity={0.7} />
      {/* 披帛 */}
      <path d="M84 76c-10 2-14 10-12 18 6-2 10-8 12-18z" strokeWidth={1.2} opacity={0.6} />
      <path d="M116 76c10 2 14 10 12 18-6-2-10-8-12-18z" strokeWidth={1.2} opacity={0.6} />
      {/* 莲台 */}
      <path d="M56 210c8-10 24-14 44-14s36 4 44 14" strokeWidth={1.8} />
      <path d="M50 214c12-8 30-11 50-11s38 3 50 11" strokeWidth={1.5} opacity={0.8} />
      <path d="M58 208c2-6 8-9 14-9M142 208c-2-6-8-9-14-9" strokeWidth={1.4} opacity={0.7} />
      <path d="M66 216c6-3 14-4 20-4M134 216c-6-3-14-4-20-4" strokeWidth={1.2} opacity={0.6} />
      {/* 水波 */}
      <path d="M40 236c12-4 24-4 36 0s24 4 36 0 24-4 36 0" strokeWidth={1.4} opacity={0.6} />
      <path d="M50 246c10-3 20-3 30 0s20 3 30 0 20-3 30 0" strokeWidth={1.1} opacity={0.45} />
    </svg>
  )
}
