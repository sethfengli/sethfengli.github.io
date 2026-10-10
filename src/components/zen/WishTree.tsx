import { useI18n } from '../../i18n'
import type { Wish } from '../../lib/wishes'
import { IncenseBurner } from './IncenseBurner'

/**
 * 许愿树（SVG 回退版）· 中国水墨松柏
 * ---------------------------------------------------------------
 * 上一版的毛病：树冠是几十个半透明绿圆 + 粉色「樱花」斑点，
 * 又用 DOM 绝对定位把红绸「贴」在图上——既卡通风，又对不准枝头，
 * 且樱花属日本意象，与本院的汉传气质不符。
 *
 * 本版改为「一笔水墨」的画法，全部在同一个 viewBox 内完成：
 *   1. 树干以焦墨侧锋写成，外轮廓一次性画完，上加斧劈皴与苔点；
 *   2. 枝干分「主枝 → 侧枝 → 细枝」三级递减，收笔略提以见笔意；
 *   3. 树冠是团块（松针簇）而非圆球：每簇由放射状针叶密描而成，
 *      分三色阶拉开前后层次，并各自以极慢的速度微晃（不同相位）；
 *   4. 飘带画在两个真实枝桠位上，用 path 自身摆动，
 *      不再依赖百分比定位，因此永远系在枝头；
 *   5. 落叶改为飘落的松针，雪点改为苔点/松果。
 *
 * 动效全部走 CSS（见 index.css 的 .pine-* / .ribbon-* 规则），
 * 由 prefers-reduced-motion 统一降级。
 */

/** 飘带系结点（viewBox 坐标，落在真实枝干上） */
interface RibbonSpot {
  x: number
  y: number
  rot: number
  /** 绸面长度（px，viewBox 单位） */
  len: number
  tone: 0 | 1 | 2
}

const RIBBON_SPOTS: RibbonSpot[] = [
  { x: 300, y: 306, rot: -7, len: 78, tone: 0 },
  { x: 452, y: 268, rot: 4, len: 86, tone: 1 },
  { x: 598, y: 300, rot: 8, len: 74, tone: 2 },
  { x: 250, y: 344, rot: -11, len: 70, tone: 1 },
  { x: 664, y: 352, rot: 10, len: 66, tone: 0 },
  { x: 382, y: 228, rot: -5, len: 72, tone: 2 },
  { x: 528, y: 214, rot: 6, len: 78, tone: 0 },
  { x: 176, y: 336, rot: -13, len: 62, tone: 2 },
  { x: 736, y: 330, rot: 12, len: 64, tone: 1 },
  { x: 444, y: 176, rot: -2, len: 68, tone: 1 },
  { x: 328, y: 372, rot: -9, len: 60, tone: 0 },
  { x: 580, y: 380, rot: 7, len: 62, tone: 2 },
  { x: 210, y: 296, rot: -10, len: 58, tone: 2 },
  { x: 706, y: 288, rot: 9, len: 62, tone: 0 },
  { x: 396, y: 316, rot: -6, len: 72, tone: 1 },
  { x: 508, y: 322, rot: 5, len: 70, tone: 2 },
  { x: 268, y: 248, rot: -8, len: 54, tone: 0 },
  { x: 632, y: 246, rot: 7, len: 56, tone: 1 },
]

/**
 * 松针簇：cx/cy 中心、r 半径、tone 层次（0 最远最淡，2 最近最重）。
 * 刻意让相邻簇互相咬合（不只是并排），近景簇压在远景簇之上，
 * 避免上一版「十几个绿球等距排开」的图案感。
 */
const CLUSTERS: Array<{ cx: number; cy: number; r: number; tone: 0 | 1 | 2 }> = [
  // 最远层：只有轮廓重量
  { cx: 152, cy: 344, r: 66, tone: 0 },
  { cx: 264, cy: 246, r: 62, tone: 0 },
  { cx: 452, cy: 150, r: 64, tone: 0 },
  { cx: 646, cy: 250, r: 62, tone: 0 },
  { cx: 756, cy: 340, r: 64, tone: 0 },
  { cx: 206, cy: 392, r: 52, tone: 0 },
  { cx: 700, cy: 386, r: 50, tone: 0 },
  // 中层：把远近两层连成一片
  { cx: 318, cy: 292, r: 58, tone: 1 },
  { cx: 388, cy: 224, r: 54, tone: 1 },
  { cx: 520, cy: 228, r: 56, tone: 1 },
  { cx: 594, cy: 296, r: 56, tone: 1 },
  { cx: 356, cy: 158, r: 46, tone: 1 },
  { cx: 548, cy: 152, r: 48, tone: 1 },
  { cx: 244, cy: 336, r: 44, tone: 1 },
  { cx: 668, cy: 330, r: 44, tone: 1 },
  // 近景层：最重，压在最上
  { cx: 440, cy: 252, r: 50, tone: 2 },
  { cx: 470, cy: 196, r: 44, tone: 2 },
  { cx: 300, cy: 356, r: 42, tone: 2 },
  { cx: 618, cy: 358, r: 40, tone: 2 },
  { cx: 452, cy: 108, r: 42, tone: 2 },
]

/** 松针色阶：远→近，由淡墨青到浓墨绿（整体偏灰，不用荧光绿） */
const NEEDLE_TONES = [
  { dark: '#6f8b7e', light: '#8ba79a' },
  { dark: '#4e6f62', light: '#6a8b7d' },
  { dark: '#33544a', light: '#4a6b5c' },
]

/** 生成一簇松针的针叶路径（确定性伪随机，避免每次渲染抖动） */
function needlePaths(cx: number, cy: number, r: number, seed: number): string {
  const parts: string[] = []
  // 30 根针叶，角度按黄金角散开；长度带确定性抖动
  for (let i = 0; i < 30; i++) {
    const a = (i * 137.508 * Math.PI) / 180 + seed * 0.7
    const jitter = 0.6 + (((i * 37 + seed * 17) % 23) / 23) * 0.55
    const r0 = r * 0.15
    const r1 = r * jitter
    const x0 = cx + Math.cos(a) * r0
    const y0 = cy + Math.sin(a) * r0
    const x1 = cx + Math.cos(a) * r1
    const y1 = cy + Math.sin(a) * r1
    // 针叶略带弧度（二次贝塞尔），比直线更近毛笔
    const mx = cx + Math.cos(a + 0.16) * r1 * 0.55
    const my = cy + Math.sin(a + 0.16) * r1 * 0.55
    parts.push(`M${x0.toFixed(1)} ${y0.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`)
  }
  return parts.join('')
}

/**
 * 树干：中段带极轻的鼓凸（老松特征），但绝不内收——
 * 上一版左右两条 path 在中段各自内凹，合起来成了「沙漏」形。
 * 左右两缘对称（关于 x=450 镜像），因此宽度处处单调递减。
 */
const TRUNK_LEFT =
  'M432 706 C424 640 420 584 420 528 C420 466 425 412 433 362 C438 329 444 300 452 282 ' +
  'C446 306 442 338 440 384 C436 444 434 508 436 560 C437 600 440 652 446 706 Z'

/** 树干右缘：与左缘镜像，人工写出（不用 JS 变换，便于读与改） */
const TRUNK_RIGHT =
  'M468 706 C476 640 480 584 480 528 C480 466 475 412 467 362 C462 329 456 300 448 282 ' +
  'C454 306 458 338 460 384 C464 444 466 508 464 560 C463 600 460 652 454 706 Z'

/** 板根与主枝（stroke 用，起收笔呈锥形靠 strokeWidth 递减 + linecap round） */
const LIMBS: Array<{ d: string; w: number; o: number }> = [
  // 主枝：中偏左、中偏右
  { d: 'M444 372 C398 352 340 330 268 306', w: 17, o: 0.95 },
  { d: 'M456 368 C508 346 566 324 640 302', w: 17, o: 0.95 },
  // 主枝向上
  { d: 'M450 318 C444 278 446 242 454 204', w: 13, o: 0.9 },
  { d: 'M446 288 C428 262 402 242 366 224', w: 11, o: 0.85 },
  { d: 'M454 284 C478 258 506 240 544 222', w: 11, o: 0.85 },
  // 侧枝
  { d: 'M268 306 C242 292 212 284 176 280', w: 10, o: 0.85 },
  { d: 'M268 306 C252 328 232 346 206 360', w: 9, o: 0.8 },
  { d: 'M300 316 C288 346 278 376 272 408', w: 8, o: 0.75 },
  { d: 'M640 302 C668 290 700 284 738 282', w: 10, o: 0.85 },
  { d: 'M640 302 C656 326 676 344 704 358', w: 9, o: 0.8 },
  { d: 'M600 314 C612 344 622 374 628 406', w: 8, o: 0.75 },
  { d: 'M366 224 C344 206 318 192 288 182', w: 7.5, o: 0.75 },
  { d: 'M544 222 C568 206 594 192 624 184', w: 7.5, o: 0.75 },
  { d: 'M454 204 C450 176 450 150 454 122', w: 7.5, o: 0.75 },
  { d: 'M454 166 C440 146 420 130 396 118', w: 5.5, o: 0.7 },
  { d: 'M454 166 C468 146 488 130 512 120', w: 5.5, o: 0.7 },
  // 细枝（笔意收梢）
  { d: 'M176 280 C160 274 146 270 130 268', w: 4.5, o: 0.65 },
  { d: 'M738 282 C754 278 768 276 784 276', w: 4.5, o: 0.65 },
  { d: 'M272 408 C268 428 266 444 266 460', w: 4, o: 0.6 },
  { d: 'M628 406 C632 426 634 442 634 458', w: 4, o: 0.6 },
  { d: 'M288 182 C274 172 260 164 244 158', w: 4, o: 0.6 },
  { d: 'M624 184 C638 174 652 166 668 160', w: 4, o: 0.6 },
]

/** 板根：自根部向两侧写出的粗壮露根 */
const ROOTS: Array<{ d: string; w: number }> = [
  { d: 'M440 696 C400 682 352 674 296 672', w: 16 },
  { d: 'M466 696 C504 680 554 672 610 670', w: 16 },
  { d: 'M446 696 C424 670 396 652 360 642', w: 10 },
  { d: 'M462 696 C484 668 512 650 548 640', w: 10 },
]

/** 斧劈皴：树皮上的横向皴笔 */
const CUN = [
  'M424 636 C432 632 442 632 450 634',
  'M424 578 C434 573 446 573 456 575',
  'M422 522 C430 517 442 517 452 519',
  'M424 470 C434 465 446 465 456 467',
  'M428 424 C438 419 448 419 456 421',
  'M432 384 C440 380 448 380 454 382',
  'M436 350 C444 346 452 346 458 348',
  'M440 318 C446 315 452 315 458 317',
  'M430 600 C438 596 448 596 456 598',
  'M426 546 C436 541 448 541 456 543',
  'M428 448 C438 443 448 443 456 445',
]

/** 苔点：树干与枝根的墨点（中国画「点苔」） */
const MOSS: Array<[number, number, number]> = [
  [420, 664, 3.4], [434, 650, 2.6], [452, 640, 3.0], [470, 654, 2.8],
  [416, 604, 2.4], [432, 592, 3.2], [458, 586, 2.6], [474, 598, 2.2],
  [418, 550, 2.8], [436, 540, 2.4], [462, 534, 3.0], [478, 546, 2.2],
  [422, 498, 2.2], [440, 488, 2.8], [464, 484, 2.4], [478, 496, 2.0],
  [430, 444, 2.6], [448, 436, 2.2], [466, 438, 2.4],
  [436, 396, 2.2], [452, 390, 2.6], [466, 396, 2.0],
  [442, 356, 2.4], [458, 352, 2.2],
  [446, 324, 2.0], [458, 322, 2.2],
  [286, 322, 2.6], [272, 330, 2.2], [624, 322, 2.6], [638, 330, 2.2],
  [196, 300, 2.2], [712, 306, 2.2],
]

/** 松果（中国画中松柏常见点景，取代旧版樱花） */
const CONES: Array<[number, number, number]> = [
  [292, 352, 1], [338, 268, 1], [508, 244, 1], [612, 276, 1],
  [236, 330, 1], [668, 338, 1], [452, 106, 1], [402, 288, 1],
]

/** 红绸色阶：正面朱、暗面绛、亮面绯（取自设计系统 cinnabar-* 令牌） */
const RIBBON_TONES = [
  { a: '#c1362b', b: '#9b3028', edge: 'rgba(64,15,12,0.35)' },
  { a: '#b8382e', b: '#7c2822', edge: 'rgba(64,15,12,0.4)' },
  { a: '#d4776a', b: '#b8382e', edge: 'rgba(64,15,12,0.3)' },
]

/** 单条飘带：结 + 绸身 + 燕尾，整体绕系结点摆动 */
function Ribbon({ spot, text, onClick }: { spot: RibbonSpot; text: string; onClick: () => void }) {
  const t = RIBBON_TONES[spot.tone]
  const label = text.length > 14 ? `${text.slice(0, 14)}…` : text
  // 绸身宽度与长度都随文字量变化，保证竖排文字排得下（不再截断）
  const chars = label.length
  const w = chars > 13 ? 20 : chars > 10 ? 18 : chars > 7 ? 16 : 14
  // 竖排每字约占 1.06em（fontSize 11.5 → 约 12.2px），上下各留 12px
  const len = Math.max(spot.len, 12 + chars * 12.4)
  return (
    <g
      className="pine-ribbon"
      style={{ '--rot': `${spot.rot}deg`, '--delay': `${(spot.x % 7) * 0.42}s` } as React.CSSProperties}
      transform={`translate(${spot.x} ${spot.y})`}
      role="button"
      tabIndex={0}
      aria-label={text}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* 系结 */}
      <circle r={3.2} fill={t.b} />
      <rect x={-4.4} y={1.6} width={8.8} height={4.4} rx={1.4} fill={t.a} />
      {/* 绸身：微弧的竖直绸面 */}
      <path
        d={`M${-w / 2} 5 C${-w / 2 - 1.6} ${len * 0.45} ${-w / 2 + 1.4} ${len * 0.72} ${-w / 2 + 0.6} ${len} L${w / 2 - 0.6} ${len} C${w / 2 - 1.4} ${len * 0.72} ${w / 2 + 1.6} ${len * 0.45} ${w / 2} 5 Z`}
        fill={t.a}
        stroke={t.edge}
        strokeWidth={0.7}
      />
      {/* 暗面：右侧一条窄暗带，做出绸子的转折 */}
      <path
        d={`M${w / 2 - 6} 5 C${w / 2 - 7} ${len * 0.45} ${w / 2 - 5} ${len * 0.72} ${w / 2 - 5.4} ${len} L${w / 2 - 0.6} ${len} C${w / 2 - 1.4} ${len * 0.72} ${w / 2 + 1.6} ${len * 0.45} ${w / 2} 5 Z`}
        fill={t.b}
        opacity={0.55}
      />
      {/* 燕尾：剪成两瓣 */}
      <path
        d={`M${-w / 2 + 0.6} ${len} L${w / 2 - 0.6} ${len} L${w / 2 - 0.6} ${len + 9} L0 ${len + 4} L${-w / 2 + 0.6} ${len + 9} Z`}
        fill={t.b}
      />
      {/* 竖排心愿文字 */}
      <text
        className="pine-ribbon-text"
        x={0}
        y={11}
        fill="#fbfaf7"
        fontSize={11.5}
        textAnchor="start"
        style={{ writingMode: 'vertical-rl' }}
      >
        {label}
      </text>
    </g>
  )
}

interface Props {
  wishes: Wish[]
  onRibbonClick: (w: Wish) => void
}

export function WishTree({ wishes, onRibbonClick }: Props) {
  const { t } = useI18n()
  const shown = wishes.slice(0, RIBBON_SPOTS.length)

  return (
    <div className="relative">
      <svg viewBox="0 0 900 760" className="w-full" role="img" aria-label={t('common.treeAlt')}>
        {/* ---------- 背景：远山淡墨 + 云气 ---------- */}
        <g>
          <path
            d="M0 566 C96 512 156 484 226 468 C286 454 336 468 398 486 C458 503 518 502 586 478 C656 454 726 440 796 450 C846 457 880 470 900 484 L900 706 L0 706 Z"
            fill="#7d968a"
            opacity={0.14}
          />
          <path
            d="M0 628 C124 590 226 570 336 566 C446 562 546 580 646 592 C746 604 834 602 900 590 L900 706 L0 706 Z"
            fill="#5f7a6f"
            opacity={0.13}
          />
          {/* 云气：横向留白条（中国画的云是留白，不是雾团） */}
          <ellipse cx={190} cy={480} rx={210} ry={13} fill="#fbfaf7" opacity={0.72} />
          <ellipse cx={672} cy={510} rx={224} ry={11} fill="#fbfaf7" opacity={0.62} />
          <ellipse cx={430} cy={442} rx={250} ry={10} fill="#fbfaf7" opacity={0.5} />
        </g>

        {/* ---------- 地面：一笔坡岸 + 苔点 ---------- */}
        <path
          d="M40 706 C180 686 320 680 452 684 C584 688 720 682 866 700"
          fill="none"
          stroke="#4a443c"
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.5}
        />
        <path
          d="M90 716 C230 700 360 696 470 698 C580 700 700 696 820 710"
          fill="none"
          stroke="#4a443c"
          strokeWidth={2.4}
          strokeLinecap="round"
          opacity={0.28}
        />

        {/* ---------- 板根 ---------- */}
        <g stroke="#3c2818" fill="none" strokeLinecap="round">
          {ROOTS.map((r, i) => (
            <path key={i} d={r.d} strokeWidth={r.w} opacity={0.9 - i * 0.06} />
          ))}
        </g>

        {/* ---------- 松针簇（先画远、再画近，形成层次） ---------- */}
        <g>
          {[0, 1, 2].map((tone) => (
            <g key={tone}>
              {CLUSTERS.filter((c) => c.tone === tone).map((c, i) => (
                <g
                  key={`${c.cx}-${c.cy}`}
                  className="pine-cluster"
                  style={
                    {
                      '--sway': `${1.1 + tone * 0.25}deg`,
                      '--delay': `${((c.cx + c.cy) % 11) * 0.6}s`,
                    } as React.CSSProperties
                  }
                >
                  {/* 团块的墨底：以柔和的深色垫出体积 */}
                  <ellipse cx={c.cx} cy={c.cy} rx={c.r * 0.82} ry={c.r * 0.66} fill={NEEDLE_TONES[tone].dark} opacity={0.16} />
                  {/* 针叶 */}
                  <path
                    d={needlePaths(c.cx, c.cy, c.r, i + tone * 5)}
                    stroke={NEEDLE_TONES[tone].dark}
                    strokeWidth={1.5}
                    fill="none"
                    strokeLinecap="round"
                    opacity={0.72}
                  />
                  <path
                    d={needlePaths(c.cx, c.cy, c.r * 0.78, i + tone * 5 + 3)}
                    stroke={NEEDLE_TONES[tone].light}
                    strokeWidth={1.1}
                    fill="none"
                    strokeLinecap="round"
                    opacity={0.6}
                  />
                </g>
              ))}
            </g>
          ))}
        </g>

        {/* ---------- 松果 ---------- */}
        <g fill="#5a4a34" opacity={0.75}>
          {CONES.map(([x, y], i) => (
            <g key={i}>
              <ellipse cx={x} cy={y} rx={4.6} ry={6.4} />
              <path d={`M${x - 3} ${y - 2} h6 M${x - 3.6} ${y + 2} h7.2`} stroke="#3c2818" strokeWidth={0.9} opacity={0.6} />
            </g>
          ))}
        </g>

        {/* ---------- 枝干（压在树冠上，形成「枝在叶前」的笔序） ---------- */}
        <g stroke="#3c2818" fill="none" strokeLinecap="round">
          {LIMBS.map((l, i) => (
            <path key={i} d={l.d} strokeWidth={l.w} opacity={l.o} />
          ))}
        </g>

        {/* ---------- 树干 ---------- */}
        <path d={TRUNK_LEFT} fill="#4a3a28" />
        <path d={TRUNK_RIGHT} fill="#3a2c1e" />
        {/* 受光面：树干左侧一线淡墨 */}
        <path
          d="M428 690 C424 620 422 556 424 500 C426 452 430 410 438 376"
          fill="none"
          stroke="#6a5947"
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* 斧劈皴 */}
        <g stroke="#241a10" strokeWidth={2.1} fill="none" strokeLinecap="round" opacity={0.5}>
          {CUN.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        {/* 点苔 */}
        <g fill="#241a10" opacity={0.42}>
          {MOSS.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>

        {/* ---------- 飘落松针（极缓，避免抢戏） ---------- */}
        <g className="pine-fall" stroke="#4a6b5c" strokeWidth={1.3} strokeLinecap="round" fill="none">
          <path d="M300 200 q6 10 2 22" />
          <path d="M540 236 q6 10 2 22" />
          <path d="M660 300 q6 10 2 22" />
        </g>

        {/* ---------- 红绸心愿（最后画，永远在最上层） ---------- */}
        <g>
          {shown.map((w, i) => {
            const spot = RIBBON_SPOTS[i % RIBBON_SPOTS.length]
            return <Ribbon key={w.id} spot={spot} text={w.text} onClick={() => onRibbonClick(w)} />
          })}
        </g>
      </svg>

      {/* 香炉：悬于树侧坡岸，带半透明纸底托，避免与树根糊在一起 */}
      <div className="absolute right-1 bottom-4 hidden rounded-xs bg-rice-50/70 px-1 pt-1 sm:right-4 sm:block">
        <IncenseBurner bare />
      </div>
    </div>
  )
}
