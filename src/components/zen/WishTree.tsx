import type { Wish } from '../../lib/wishes'
import { IncenseBurner } from './IncenseBurner'

/**
 * 许愿树：古树 SVG + 红绸飘带心愿 + 燃香香炉。
 * 心愿化作飘带系于枝头（最近 24 条），点击飘带回调查看/管理。
 */

interface RibbonAnchor {
  x: number // 容器百分比
  y: number
  rot: number
  shade: 0 | 1 | 2 // 红绸色阶
}

const ANCHORS: RibbonAnchor[] = [
  { x: 34, y: 52, rot: -6, shade: 0 },
  { x: 66, y: 48, rot: 5, shade: 1 },
  { x: 41, y: 40, rot: -8, shade: 2 },
  { x: 57, y: 38, rot: 7, shade: 0 },
  { x: 50, y: 27, rot: -3, shade: 1 },
  { x: 30, y: 60, rot: -10, shade: 1 },
  { x: 70, y: 58, rot: 9, shade: 2 },
  { x: 44, y: 60, rot: -4, shade: 0 },
  { x: 56, y: 59, rot: 3, shade: 1 },
  { x: 38, y: 50, rot: -12, shade: 2 },
  { x: 62, y: 49, rot: 11, shade: 0 },
  { x: 48, y: 46, rot: -5, shade: 1 },
  { x: 53, y: 45, rot: 6, shade: 2 },
  { x: 33, y: 54, rot: -14, shade: 0 },
  { x: 68, y: 54, rot: 12, shade: 1 },
  { x: 36, y: 44, rot: -9, shade: 2 },
  { x: 64, y: 42, rot: 10, shade: 0 },
  { x: 46, y: 34, rot: -6, shade: 1 },
  { x: 58, y: 32, rot: 8, shade: 2 },
  { x: 50, y: 23, rot: -2, shade: 0 },
  { x: 42, y: 54, rot: -7, shade: 1 },
  { x: 60, y: 52, rot: 4, shade: 2 },
  { x: 28, y: 64, rot: -11, shade: 0 },
  { x: 73, y: 62, rot: 10, shade: 1 },
]

const RIBBON_BG = [
  'linear-gradient(180deg,#b03e45,#8c2f39)',
  'linear-gradient(180deg,#c0564f,#963238)',
  'linear-gradient(180deg,#a33f3b,#7d272c)',
]

interface Props {
  wishes: Wish[]
  onRibbonClick: (w: Wish) => void
}

export function WishTree({ wishes, onRibbonClick }: Props) {
  const shown = wishes.slice(0, ANCHORS.length)

  return (
    <div className="relative">
      {/* 古树 */}
      <svg viewBox="0 0 900 640" className="w-full drop-shadow-sm" aria-hidden="true">
        {/* 地面 */}
        <path d="M40 600c140-18 280-18 420-6s280 12 400 4" fill="none" stroke="#8a6a4a" strokeWidth={4} opacity={0.5} strokeLinecap="round" />
        {/* 树冠细枝 */}
        <g stroke="#4a3524" strokeLinecap="round" fill="none">
          <path d="M450 300c-40-52-96-84-160-96" strokeWidth={8} opacity={0.9} />
          <path d="M290 204c-34-22-70-30-104-26" strokeWidth={5} opacity={0.8} />
          <path d="M186 178c-24-6-44-4-60 2" strokeWidth={3.5} opacity={0.7} />
          <path d="M290 204c-12-34-10-66 2-96" strokeWidth={4} opacity={0.75} />
          <path d="M450 300c44-50 104-80 172-90" strokeWidth={8} opacity={0.9} />
          <path d="M622 210c36-18 72-24 104-18" strokeWidth={5} opacity={0.8} />
          <path d="M726 192c22-2 40 2 54 10" strokeWidth={3.5} opacity={0.7} />
          <path d="M622 210c14-32 18-64 10-94" strokeWidth={4} opacity={0.75} />
          <path d="M450 300c-10-56-14-112-6-168" strokeWidth={7} opacity={0.85} />
          <path d="M444 132c-28-26-54-44-78-54" strokeWidth={4} opacity={0.7} />
          <path d="M444 132c30-26 58-42 84-50" strokeWidth={4} opacity={0.7} />
          <path d="M450 300c8-56 14-110 8-164" strokeWidth={6} opacity={0.8} />
          {/* 二级枝 */}
          <path d="M360 240c-30-30-64-50-100-58" strokeWidth={4} opacity={0.7} />
          <path d="M540 240c32-28 66-46 102-54" strokeWidth={4} opacity={0.7} />
        </g>
        {/* 树干 */}
        <path
          d="M450 640c-6-70-8-150-4-226 2-40 8-72 16-100 4-14 8-24 12-32-2 10-4 22-4 34-2 96 2 198 10 324z"
          fill="#543620"
        />
        <path
          d="M450 640c6-70 8-150 4-226-2-40-8-72-16-100-4-14-8-24-12-32 2 10 4 22 4 34 2 96-2 198-10 324z"
          fill="#4a3524"
        />
        <path d="M430 640c-20-110-40-220-72-330-12-42-28-76-48-102" stroke="#543620" strokeWidth={26} fill="none" strokeLinecap="round" />
        <path d="M470 640c20-110 40-220 72-330 12-42 28-76 48-102" stroke="#4a3524" strokeWidth={26} fill="none" strokeLinecap="round" />
        {/* 树皮纹理 */}
        <g stroke="#3e2818" strokeWidth={2} opacity={0.45} fill="none" strokeLinecap="round">
          <path d="M436 560c-8-16 6-22 14-10" />
          <path d="M458 520c-10-14 4-24 14-12" />
          <path d="M424 470c-14-20 4-34 20-18" />
          <path d="M468 440c-10-18 6-30 18-14" />
          <path d="M420 380c-12-22 8-36 22-16" />
          <path d="M476 350c-8-18 8-30 18-12" />
          <path d="M396 300c-10-20 10-34 24-14" />
          <path d="M496 260c-6-16 10-26 18-10" />
        </g>
      </svg>

      {/* 红绸飘带 */}
      <div className="pointer-events-none absolute inset-0">
        {shown.map((w, i) => {
          const a = ANCHORS[i % ANCHORS.length]
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onRibbonClick(w)}
              title={w.text}
              className="wish-ribbon pointer-events-auto absolute cursor-pointer focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:outline-none"
              style={
                {
                  left: `${a.x}%`,
                  top: `${a.y}%`,
                  '--rot': `${a.rot}deg`,
                } as React.CSSProperties
              }
            >
              {/* 结 */}
              <span className="block h-2.5 w-2.5 rounded-full bg-gold-400 shadow-sm" />
              {/* 绸身 */}
              <span
                className="ribbon-strip mt-0.5 block rounded-b-md rounded-t-sm px-1 pt-2 pb-1 font-serif text-[13px] leading-snug text-amber-50 shadow-md"
                style={{ background: RIBBON_BG[a.shade] }}
              >
                {w.text.slice(0, 12)}
                {w.text.length > 12 ? '…' : ''}
              </span>
              {/* 燕尾 */}
              <span
                className="ribbon-tail block"
                style={{ background: RIBBON_BG[a.shade] }}
              />
            </button>
          )
        })}
      </div>

      {/* 香炉（树旁） */}
      <div className="absolute right-1 bottom-2 sm:right-3 sm:bottom-3">
        <IncenseBurner bare />
      </div>
    </div>
  )
}
