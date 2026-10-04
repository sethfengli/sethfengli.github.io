/**
 * 禅意 SVG 插画系统 · 水墨卷（v2，2026）
 * ---------------------------------------------------------------
 * 全部为本地矢量绘制，无外部图库依赖。12 种场景用于文章封面回退、
 * 段落配图与首页氛围。
 *
 * v1 的问题：亮蓝天空 + 荧光绿草 + 高饱和橘金，是「卡通」而非「水墨」，
 * 与站点「宣纸底 + 焦墨 + 青瓷 + 朱砂」的设计骨架冲突；
 * 动效也偏「UI 动画」（弹跳、缩放），不像自然物。
 *
 * v2 改为中国画语汇：
 *   1. 底色一律宣纸（rice-50 + 极轻颗粒），不再用彩色渐变当天空；
 *   2. 山、石、叶、器用「墨分五色」——同一焦墨在不同不透明度上做远近；
 *   3. 唯一的彩色是青瓷绿（远树）与朱砂（印章、灯焰），各不超过一处；
 *   4. 每幅右下或左下留白处钤一枚朱砂小印（.ink-seal），是中式画面的收束；
 *   5. 留白占画面一半以上——「计白当黑」；
 *   6. 动效改为自然物的缓动作（烟升、水纹外扩、钟摆、云移），
 *      取消弹跳与整体缩放。
 */

export type IllustrationVariant =
  | 'lotus'
  | 'incense'
  | 'bell'
  | 'bamboo'
  | 'mountains'
  | 'moon'
  | 'enso'
  | 'bodhi'
  | 'sutra'
  | 'koi'
  | 'meditation'
  | 'clouds'

interface Props {
  variant: IllustrationVariant
  className?: string
  /** 是否开启动画（封面默认开，段落配图可关） */
  animated?: boolean
}

/** 水墨调色板：以焦墨的不同浓淡构成立体，不用彩色渐变 */
const INK = {
  /** 宣纸 */
  paper: '#f7f4ec',
  paper2: '#f1ece1',
  /** 墨的五个层次：焦、浓、重、淡、清 */
  jiao: '#1c1a17',
  nong: '#2f2c27',
  zhong: '#4a463f',
  dan: '#736d63',
  qing: '#a49c91',
  /** 青瓷绿（远树、水色） */
  celadon: '#5f7a6f',
  celadonLight: '#93a89e',
  /** 朱砂（印、灯焰）——全画唯一高饱和色 */
  cinnabar: '#b8382e',
  cinnabarLight: '#d4776a',
}

/**
 * 宣纸底：一层平色 + 一层极轻的斜向纤维纹（用 pattern 而非渐变，
 * 避免「塑料感」的线性渐变）。
 */
function PaperDefs({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={`${id}-paper`} width="26" height="26" patternUnits="userSpaceOnUse">
        <rect width="26" height="26" fill={INK.paper} />
        <circle cx="4" cy="6" r="0.6" fill={INK.qing} opacity="0.22" />
        <circle cx="15" cy="14" r="0.5" fill={INK.qing} opacity="0.18" />
        <circle cx="22" cy="3" r="0.5" fill={INK.qing} opacity="0.16" />
        <circle cx="9" cy="21" r="0.6" fill={INK.qing} opacity="0.2" />
      </pattern>
    </defs>
  )
}

/** 朱砂小印：中式画面的收束（右下留白处） */
function Seal({ x = 356, y = 208, size = 13 }: { x?: number; y?: number; size?: number }) {
  const s = size / 13
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={0.9}>
      <rect width={13} height={13} rx={1.2} fill={INK.cinnabar} />
      <path
        d="M3 4.6h7M4.6 4.6v4.2M8.4 4.6v4.2M3 9.6h7M6.5 4.6v5"
        stroke={INK.paper}
        strokeWidth={0.9}
        opacity={0.85}
      />
    </g>
  )
}

export function ZenIllustration({ variant, className, animated = true }: Props) {
  const id = `zi-${variant}`
  return (
    <div className={`overflow-hidden ${className ?? ''}`} style={{ background: INK.paper }} aria-hidden="true">
      <svg aria-hidden="true" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <PaperDefs id={id} />
        <rect width="400" height="240" fill={`url(#${id}-paper)`} />
        <Scenes variant={variant} animated={animated} />
      </svg>
    </div>
  )
}

function Scenes({ variant, animated }: { variant: IllustrationVariant; animated: boolean }) {
  switch (variant) {
    case 'lotus':
      return <Lotus a={animated} />
    case 'incense':
      return <Incense a={animated} />
    case 'bell':
      return <Bell a={animated} />
    case 'bamboo':
      return <Bamboo a={animated} />
    case 'mountains':
      return <Mountains a={animated} />
    case 'moon':
      return <Moon a={animated} />
    case 'enso':
      return <Enso a={animated} />
    case 'bodhi':
      return <Bodhi a={animated} />
    case 'sutra':
      return <Sutra a={animated} />
    case 'koi':
      return <Koi a={animated} />
    case 'meditation':
      return <Meditation a={animated} />
    case 'clouds':
      return <Clouds a={animated} />
  }
}

/* ============================================================
   场景：一律「墨线 + 淡墨渲染 + 大量留白」
   ============================================================ */

/** 莲：一支出水芙蓉 + 两片荷叶（带缺口与叶脉）+ 三圈水纹 */
function Lotus({ a }: { a: boolean }) {
  return (
    <g>
      {/* 水纹：三圈细墨线，由内向外淡去 */}
      {[0, 1, 2].map((i) => (
        <ellipse
          key={i}
          cx={196}
          cy={198}
          rx={78 + i * 26}
          ry={5 + i * 1.6}
          fill="none"
          stroke={INK.dan}
          strokeWidth={1}
          opacity={0.32 - i * 0.08}
          className={a ? 'ink-ripple' : ''}
          style={{ animationDelay: `${i * 1.1}s`, transformOrigin: '196px 198px' }}
        />
      ))}

      {/* 荷叶（左，浓）：圆盾形带 V 形缺口 + 放射叶脉，中国画的荷叶一定有缺口 */}
      <g>
        <path
          d="M116 196 C86 196 62 176 62 150 C62 124 86 104 116 104 C140 104 160 116 168 134 L134 152 L168 170 C160 188 140 196 116 196 Z"
          fill={INK.zhong}
          opacity={0.5}
        />
        {/* 叶脉：自叶心放射 */}
        <g stroke={INK.paper} strokeWidth={1.1} fill="none" opacity={0.5} strokeLinecap="round">
          <path d="M116 150 L74 132M116 150 L78 156M116 150 L96 178M116 150 L142 176M116 150 L150 122M116 150 L134 110" />
        </g>
        {/* 叶柄 */}
        <path d="M116 196v14" stroke={INK.nong} strokeWidth={2.2} strokeLinecap="round" opacity={0.6} />
      </g>

      {/* 荷叶（右，淡）：更小、更远 */}
      <g>
        <path
          d="M286 190 C264 190 246 175 246 155 C246 135 264 120 286 120 C304 120 318 129 324 142 L298 155 L324 169 C318 182 304 190 286 190 Z"
          fill={INK.zhong}
          opacity={0.3}
        />
        <g stroke={INK.paper} strokeWidth={1} fill="none" opacity={0.42} strokeLinecap="round">
          <path d="M286 155 L256 142M286 155 L258 162M286 155 L272 180M286 155 L306 178M286 155 L314 138" />
        </g>
      </g>

      {/* 花：五瓣，用中锋写出，瓣尖留白 */}
      <g className={a ? 'ink-bloom' : ''} style={{ transformOrigin: '196px 118px' }}>
        <path d="M196 150c-7 14-19 24-30 26 0-17 7-33 20-41 4 4 8 9 10 15z" fill={INK.nong} opacity={0.72} />
        <path d="M196 150c7 14 19 24 30 26 0-17-7-33-20-41-4 4-8 9-10 15z" fill={INK.nong} opacity={0.6} />
        <path d="M196 150c-14 9-33 12-44 9 2-16 12-30 27-37 7 7 13 17 17 28z" fill={INK.nong} opacity={0.5} />
        <path d="M196 150c14 9 33 12 44 9-2-16-12-30-27-37-7 7-13 17-17 28z" fill={INK.nong} opacity={0.42} />
        <path d="M196 136c-8-8-18-10-26-7 0-15 8-28 24-33 2 13 2 27 2 40z" fill={INK.nong} opacity={0.36} />
        <path d="M196 136c8-8 18-10 26-7 0-15-8-28-24-33-2 13-2 27-2 40z" fill={INK.nong} opacity={0.3} />
        {/* 莲蓬：一点朱砂，是画面唯一的亮色 */}
        <ellipse cx={196} cy={122} rx={7} ry={5.5} fill={INK.cinnabar} opacity={0.82} />
      </g>
      {/* 花梗：一笔直下 */}
      <path d="M196 156v40" stroke={INK.nong} strokeWidth={2.6} strokeLinecap="round" opacity={0.72} />
      <Seal />
    </g>
  )
}

/** 香：一炉三炷，青烟袅袅成线 */
function Incense({ a }: { a: boolean }) {
  return (
    <g>
      {/* 桌案一笔 */}
      <path d="M74 206h252" stroke={INK.zhong} strokeWidth={2} opacity={0.42} strokeLinecap="round" />
      {/* 炉：鼎式（鼓腹、双耳、三足），以墨线勾出，内部淡墨 */}
      <path d="M148 184c0-14 20-22 48-22s48 8 48 22c0 10-16 17-48 17s-48-7-48-17z" fill={INK.zhong} opacity={0.5} />
      <path d="M148 184c0-14 20-22 48-22s48 8 48 22" fill="none" stroke={INK.jiao} strokeWidth={2.4} opacity={0.8} />
      <path d="M152 200 l-5 12M244 200 l5 12M196 201 v13" stroke={INK.jiao} strokeWidth={2.8} strokeLinecap="round" opacity={0.75} />
      <path d="M140 184c-6-4-8-10-4-14M252 184c6-4 8-10 4-14" stroke={INK.jiao} strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.7} />
      {/* 炉口一线朱砂(香灰) */}
      <ellipse cx={196} cy={172} rx={40} ry={5} fill={INK.cinnabar} opacity={0.22} />
      {/* 三炷香 */}
      {[
        [176, 78],
        [196, 66],
        [216, 84],
      ].map(([x, top], i) => (
        <g key={i}>
          <line x1={x} y1={170} x2={x} y2={top} stroke={INK.nong} strokeWidth={2.2} strokeLinecap="round" opacity={0.8} />
          {/* 香头：一点朱砂，明灭 */}
          <circle cx={x} cy={top - 3} r={2.6} fill={INK.cinnabar} className={a ? 'ink-glow' : ''} style={{ animationDelay: `${i * 0.5}s` }} />
        </g>
      ))}
      {/* 烟：细长曲线，不是一堆圆 */}
      <g fill="none" stroke={INK.dan} strokeLinecap="round" className={a ? 'ink-smoke' : ''}>
        <path d="M176 72c-10-14 10-22 0-36s8-20 2-30" strokeWidth={1.6} opacity={0.4} />
        <path d="M196 60c-11-16 11-25 0-40s9-22 3-32" strokeWidth={1.9} opacity={0.5} />
        <path d="M216 78c-10-13 10-21 0-34s8-19 2-28" strokeWidth={1.5} opacity={0.36} />
      </g>
      <Seal />
    </g>
  )
}

/** 钟：一架中国梵钟——扁圆钟身 + 蒲牢钮 + 上下两圈乳钉 + 钟裙外撇 */
function Bell({ a }: { a: boolean }) {
  // 钟身轮廓：肩窄、腰圆、口外撇（中国钟的「桶形」，不是日本钟的长筒形）
  const body =
    'M178 76 C172 94 164 112 158 132 C152 152 150 166 154 178 C158 190 172 196 200 196 ' +
    'C228 196 242 190 246 178 C250 166 248 152 242 132 C236 112 228 94 222 76 Z'
  return (
    <g>
      {/* 钟架：两柱一梁 */}
      <path d="M136 48c-2 46-2 92 0 130M264 48c2 46 2 92 0 130" stroke={INK.nong} strokeWidth={4.5} strokeLinecap="round" fill="none" opacity={0.68} />
      <path d="M116 48h168" stroke={INK.nong} strokeWidth={6} strokeLinecap="round" opacity={0.72} />
      <g className={a ? 'ink-swing' : ''} style={{ transformOrigin: '200px 56px' }}>
        {/* 蒲牢钮：中国钟顶是一对龙形挂钮，这里简化为双耳环钮 */}
        <path d="M186 56 C184 44 192 38 200 38 C208 38 216 44 214 56" fill="none" stroke={INK.jiao} strokeWidth={2.8} opacity={0.85} />
        <path d="M193 56 v8M207 56 v8" stroke={INK.jiao} strokeWidth={2.2} opacity={0.7} strokeLinecap="round" />
        {/* 钟身 */}
        <path d={body} fill={INK.nong} opacity={0.6} />
        <path d={body} fill="none" stroke={INK.jiao} strokeWidth={2.2} opacity={0.85} />
        {/* 钟肩与钟腰两道横箍（中国钟的分段） */}
        <path d="M164 104 C176 110 224 110 236 104M158 150 C176 158 224 158 242 150" fill="none" stroke={INK.jiao} strokeWidth={1.4} opacity={0.45} />
        {/* 上下两圈乳钉：沿钟身轮廓排布 */}
        {[
          { y: 124, n: 7, r: 26, op: 0.5 },
          { y: 164, n: 9, r: 33, op: 0.46 },
        ].map((row) =>
          Array.from({ length: row.n }).map((_, k) => {
            const ang = (-56 + (112 / (row.n - 1)) * k) * (Math.PI / 180)
            const cx = 200 + Math.sin(ang) * row.r
            const cy = row.y + (1 - Math.cos(ang)) * 5
            return <circle key={`${row.y}-${k}`} cx={cx} cy={cy} r={2.3} fill={INK.paper} opacity={row.op} />
          }),
        )}
        {/* 撞座：钟腰偏右的圆形凸起 */}
        <circle cx={224} cy={148} r={7} fill="none" stroke={INK.paper} strokeWidth={1.5} opacity={0.42} />
        {/* 钟裙口沿：外撇的一笔厚线 */}
        <path d="M154 172 C160 190 178 198 200 198 C222 198 240 190 246 172" fill={INK.jiao} opacity={0.5} />
        <path d="M154 172 C160 190 178 198 200 198 C222 198 240 190 246 172" fill="none" stroke={INK.jiao} strokeWidth={2.4} opacity={0.8} />
      </g>
      {/* 声纹：三道弧，向外淡出 */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${286 + i * 15} 104a${30 + i * 13} 30 0 0 1 0 62`}
          fill="none"
          stroke={INK.dan}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.36 - i * 0.1}
          className={a ? 'ink-ripple' : ''}
          style={{ animationDelay: `${i * 0.9}s`, transformOrigin: `${286 + i * 15}px 135px` }}
        />
      ))}
      <Seal />
    </g>
  )
}

/** 竹：五竿，节节分明，竹叶以「个」字法撇出 */
function Bamboo({ a }: { a: boolean }) {
  const stalks = [
    { x: 96, h: 178, w: 7 },
    { x: 152, h: 208, w: 8 },
    { x: 208, h: 190, w: 7 },
    { x: 262, h: 202, w: 7.5 },
    { x: 312, h: 172, w: 6 },
  ]
  return (
    <g>
      {stalks.map((s, i) => (
        <g key={i} opacity={0.62 - i * 0.06}>
          <line x1={s.x} y1={236} x2={s.x} y2={236 - s.h} stroke={INK.nong} strokeWidth={s.w} strokeLinecap="round" />
          {/* 竹节 */}
          {[46, 104, 158].map((y) => (
            <line key={y} x1={s.x - s.w * 0.85} y1={236 - y} x2={s.x + s.w * 0.85} y2={236 - y} stroke={INK.zhong} strokeWidth={1.4} opacity={0.55} />
          ))}
          {/* 竹叶：两笔「个」字，斜出 */}
          <path
            d={`M${s.x} ${236 - s.h}c-5-11 4-24 19-27 2 11-6 20-19 27z`}
            fill={INK.celadon}
            opacity={0.55}
          />
          <path
            d={`M${s.x} ${236 - s.h - 16}c4-9 16-13 23-9-4 7-13 11-23 9z`}
            fill={INK.celadon}
            opacity={0.4}
          />
        </g>
      ))}
      {/* 一叶飘下 */}
      {a && <path d="M330 120c6 6 6 14 0 20" stroke={INK.celadon} strokeWidth={1.4} fill="none" className="ink-drift" opacity={0.45} />}
      <Seal />
    </g>
  )
}

/** 山：三层远山，最远最淡；一轮淡日 */
function Mountains({ a }: { a: boolean }) {
  return (
    <g>
      {/* 淡日：不填实心圆，用一圈墨线 */}
      <circle cx={296} cy={62} r={24} fill="none" stroke={INK.dan} strokeWidth={1.4} opacity={0.5} className={a ? 'ink-glow' : ''} />
      {/* 远山：只剩轮廓的淡墨 */}
      <path d="M0 176C48 128 92 96 132 100c30 3 52 30 78 34 30 5 58-24 96-40 34-14 68-6 94 24v122H0z" fill={INK.dan} opacity={0.2} />
      {/* 中山 */}
      <path d="M0 200c40-52 78-78 112-74 26 3 44 28 66 34 26 7 52-16 84-28 30-11 56 2 78 26v82H0z" fill={INK.zhong} opacity={0.32} />
      {/* 近山：实地，压住画面下缘 */}
      <path d="M0 226c34-40 66-56 96-50 22 4 38 22 58 26 24 5 46-12 72-22 28-10 50 0 70 20v40H0z" fill={INK.nong} opacity={0.55} />
      {/* 山间云气：两条横向留白，是「云」不是「雾团」 */}
      <path d="M28 186h118M244 166h130" stroke={INK.paper} strokeWidth={7} strokeLinecap="round" opacity={0.7} className={a ? 'ink-drift-slow' : ''} />
      <path d="M70 206h96M262 196h100" stroke={INK.paper} strokeWidth={4.5} strokeLinecap="round" opacity={0.55} className={a ? 'ink-drift' : ''} />
      {/* 飞鸟两点 */}
      <path d="M116 74l7 5-7 5M134 70l7 5-7 5" stroke={INK.nong} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.6} />
      <Seal />
    </g>
  )
}

/** 月：一轮淡月映水，岸边枯枝 */
function Moon({ a }: { a: boolean }) {
  return (
    <g>
      {/* 月：只一圈细线，内部完全留白（中国画的月不填色） */}
      <circle cx={286} cy={68} r={30} fill="none" stroke={INK.zhong} strokeWidth={1.5} opacity={0.6} className={a ? 'ink-glow' : ''} />
      <circle cx={286} cy={68} r={30} fill={INK.paper} opacity={0.5} />
      {/* 水：横向细线数道，越远越疏 */}
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M${20 + i * 34} ${196 + i * 7}h${70 - i * 6}`}
          stroke={INK.dan}
          strokeWidth={1.1}
          opacity={0.34 - i * 0.05}
          strokeLinecap="round"
          className={a ? 'ink-glow' : ''}
          style={{ animationDelay: `${i * 0.6}s` }}
        />
      ))}
      {/* 岸边枯枝：一笔斜出，两处分叉 */}
      <path d="M0 176c38-26 64-6 96-40" stroke={INK.nong} strokeWidth={3.4} fill="none" strokeLinecap="round" opacity={0.7} />
      <path d="M96 136l-13-5M96 136l7-13M46 168l-10-4" stroke={INK.nong} strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.55} />
      <Seal />
    </g>
  )
}

/** 圆相：中国禅门作「一相」——一笔未闭合的圆，笔意断处即是留白 */
function Enso({ a }: { a: boolean }) {
  return (
    <g>
      {/* 一笔圆：用带粗细变化的弧线，收笔处细，起笔处重 */}
      <path
        d="M262 92c14 20 8 48-14 62-24 15-58 12-78-8-20-20-18-52 4-70 22-18 56-16 76 6"
        fill="none"
        stroke={INK.jiao}
        strokeWidth={11}
        strokeLinecap="round"
        opacity={0.86}
      />
      {/* 笔痕：顺着弧线两三笔飞白 */}
      <path
        d="M218 176c-10 2-20 0-28-5"
        fill="none"
        stroke={INK.paper}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.55}
        className={a ? 'ink-glow' : ''}
      />
      {/* 圆心一点朱砂 */}
      <circle cx={200} cy={118} r={3.6} fill={INK.cinnabar} opacity={0.85} />
      <Seal />
    </g>
  )
}

/** 菩提叶：一片叶，叶脉工整，露珠一点 */
function Bodhi({ a }: { a: boolean }) {
  return (
    <g>
      {/* 叶：心形，尖端拖长 */}
      <path
        d="M200 26c46-6 86 22 92 62 5 34-20 70-58 86-16 7-26 10-34 12-8-2-18-5-34-12-38-16-63-52-58-86 6-40 46-68 92-62z"
        fill={INK.zhong}
        opacity={0.55}
      />
      <path
        d="M200 26c46-6 86 22 92 62 5 34-20 70-58 86-16 7-26 10-34 12-8-2-18-5-34-12-38-16-63-52-58-86 6-40 46-68 92-62z"
        fill="none"
        stroke={INK.jiao}
        strokeWidth={1.8}
        opacity={0.7}
      />
      {/* 主脉 */}
      <path d="M200 30v152" stroke={INK.paper} strokeWidth={2} opacity={0.55} />
      {/* 侧脉：左右各四，斜向叶缘 */}
      {[62, 92, 122, 150].map((y, i) => (
        <g key={y}>
          <path d={`M200 ${y}c-16-6-30-16-40-28`} stroke={INK.paper} strokeWidth={1.3} fill="none" opacity={0.42 - i * 0.04} strokeLinecap="round" />
          <path d={`M200 ${y}c16-6 30-16 40-28`} stroke={INK.paper} strokeWidth={1.3} fill="none" opacity={0.42 - i * 0.04} strokeLinecap="round" />
        </g>
      ))}
      {/* 露珠：一点朱砂 */}
      <circle cx={152} cy={96} r={3.2} fill={INK.cinnabar} opacity={0.7} className={a ? 'ink-glow' : ''} />
      <Seal />
    </g>
  )
}

/** 经卷：一卷摊开的经 + 木鱼 */
function Sutra({ a }: { a: boolean }) {
  return (
    <g>
      {/* 案面 */}
      <path d="M46 208h308" stroke={INK.zhong} strokeWidth={2} opacity={0.4} strokeLinecap="round" />
      {/* 经卷：摊开的册页，中缝一线 */}
      <path d="M72 84h112c8 0 12 4 12 10v92c0 6-4 10-12 10H72c-6 0-10-4-10-10V94c0-6 4-10 10-10z" fill={INK.paper2} stroke={INK.nong} strokeWidth={1.6} opacity={0.95} />
      <path d="M216 84h112c6 0 10 4 10 10v92c0 6-4 10-10 10H216c-8 0-12-4-12-10V94c0-6 4-10 12-10z" fill={INK.paper2} stroke={INK.nong} strokeWidth={1.6} opacity={0.95} />
      <path d="M204 84v102" stroke={INK.dan} strokeWidth={1.4} opacity={0.6} />
      {/* 经文：竖行短线（写经是竖排，用竖线才像经卷） */}
      <g stroke={INK.dan} strokeWidth={1.5} opacity={0.42} strokeLinecap="round">
        {[86, 104, 122, 140, 158, 176].map((x) => (
          <line key={`l${x}`} x1={x} y1={98} x2={x} y2={176} />
        ))}
        {[226, 244, 262, 280, 298, 316].map((x) => (
          <line key={`r${x}`} x1={x} y1={98} x2={x} y2={176} />
        ))}
      </g>
      {/* 木鱼：一小团墨，右侧 */}
      <g transform="translate(348 178)">
        <path d="M-20 8c0-14 9-22 20-22s20 8 20 22z" fill={INK.nong} opacity={0.7} />
        <path d="M-14 8c0-8 5-13 14-13s14 5 14 13" fill="none" stroke={INK.paper} strokeWidth={1.2} opacity={0.4} />
      </g>
      {/* 磬槌：一笔斜下，轻晃 */}
      <g className={a ? 'ink-swing' : ''} style={{ transformOrigin: '352px 120px' }}>
        <line x1={352} y1={120} x2={362} y2={162} stroke={INK.nong} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
        <circle cx={363} cy={166} r={5} fill={INK.nong} opacity={0.65} />
      </g>
      <Seal />
    </g>
  )
}

/** 鱼：一笔游鱼 + 水纹（「鱼跃」取自在之趣） */
function Koi({ a }: { a: boolean }) {
  return (
    <g>
      {/* 水纹：三道波纹线 */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${18 + i * 118} ${158 + i * 16}q16-9 32 0t32 0t32 0`}
          fill="none"
          stroke={INK.dan}
          strokeWidth={1.3}
          opacity={0.3 - i * 0.06}
          strokeLinecap="round"
        />
      ))}
      {/* 大鱼：一笔写出，尾鳍分叉 */}
      <g className={a ? 'ink-drift-slow' : ''}>
        <path d="M112 104c48-15 92-9 122 17-42 17-88 21-124 6-19-8-17-17 2-23z" fill={INK.nong} opacity={0.68} />
        <path d="M234 121l30-14-11 18 20 9-27 9z" fill={INK.nong} opacity={0.6} />
        {/* 眼：留白点 */}
        <circle cx={132} cy={112} r={2.8} fill={INK.paper} opacity={0.85} />
        {/* 鳍：两笔 */}
        <path d="M168 100c8 6 14 14 17 24M190 150c6 5 10 12 12 20" stroke={INK.nong} strokeWidth={1.6} fill="none" opacity={0.45} strokeLinecap="round" />
      </g>
      {/* 小鱼 */}
      <g className={a ? 'ink-drift' : ''}>
        <path d="M248 176c26-7 48-3 62 9-22 9-46 10-64 3-10-4-9-9 2-12z" fill={INK.dan} opacity={0.5} />
        <path d="M310 185l13-7-5 9 9 4-13 4z" fill={INK.dan} opacity={0.5} />
      </g>
      {/* 莲苞：一竖一尖 */}
      <path d="M62 188c-5-12 2-21 11-19 3 9-2 16-11 19z" fill={INK.celadon} opacity={0.5} />
      <path d="M62 168v22" stroke={INK.nong} strokeWidth={1.8} opacity={0.5} strokeLinecap="round" />
      <Seal />
    </g>
  )
}

/** 禅坐：一个背影、一圈淡光、两点香火 */
function Meditation({ a }: { a: boolean }) {
  return (
    <g>
      {/* 淡光：同心墨圈而非实心光晕 */}
      <circle cx={200} cy={116} r={66} fill="none" stroke={INK.dan} strokeWidth={1.2} opacity={0.3} className={a ? 'ink-glow' : ''} />
      <circle cx={200} cy={116} r={44} fill="none" stroke={INK.dan} strokeWidth={1} opacity={0.22} />
      {/* 背影：肩、头、盘坐的轮廓，一笔到底 */}
      <path
        d="M200 62c-11 0-19 8-19 17 0 5 3 10 7 12-6 6-13 16-16 28-3 13 0 23 8 28 6 4 14 5 20 5s14-1 20-5c8-5 11-15 8-28-3-12-10-22-16-28 4-2 7-7 7-12 0-9-8-17-19-17z"
        fill={INK.nong}
        opacity={0.72}
      />
      {/* 坐处一笔 */}
      <path d="M164 172c12 6 24 9 36 9s24-3 36-9" fill="none" stroke={INK.jiao} strokeWidth={2.4} opacity={0.6} strokeLinecap="round" />
      {/* 两点香火：朱砂，明灭 */}
      {a &&
        [0, 1].map((i) => (
          <circle key={i} cx={162 + i * 76} cy={152} r={2.4} fill={INK.cinnabar} className="ink-glow" style={{ animationDelay: `${i}s` }} />
        ))}
      <Seal />
    </g>
  )
}

/** 云：留白为主，只以墨线勾两道云头，远处一塔 */
function Clouds({ a }: { a: boolean }) {
  return (
    <g>
      {/* 云头：中国画的云是「勾云」，用回旋的墨线，不填色 */}
      {[
        { x: 44, y: 78, s: 1, o: 0.42 },
        { x: 168, y: 60, s: 0.8, o: 0.32 },
        { x: 250, y: 96, s: 0.9, o: 0.36 },
        { x: 96, y: 132, s: 0.7, o: 0.26 },
      ].map((c, i) => (
        <g
          key={i}
          transform={`translate(${c.x} ${c.y}) scale(${c.s})`}
          className={a ? 'ink-drift-slow' : ''}
          style={{ animationDelay: `${i * 1.3}s` }}
        >
          <path
            d="M0 22c-8-7-8-18 2-22 4-12 22-14 28-4 12-8 28-2 28 10 8 3 9 15 0 20-4 5-12 6-18 4-8 6-24 6-30-2-5 2-8 0-10-6z"
            fill="none"
            stroke={INK.zhong}
            strokeWidth={1.6}
            opacity={c.o}
          />
          <path d="M8 18c6-6 16-8 24-4" fill="none" stroke={INK.dan} strokeWidth={1.1} opacity={c.o * 0.7} strokeLinecap="round" />
        </g>
      ))}
      {/* 远塔：七层楼阁式，最淡的一层墨 */}
      <g opacity={0.34}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const w = 30 - i * 1.6
          const y = 196 - i * 15
          return (
            <g key={i}>
              <rect x={330 - w / 2} y={y} width={w} height={9} fill="none" stroke={INK.zhong} strokeWidth={1.2} />
              <path d={`M${330 - w / 2 - 4} ${y}h${w + 8}`} stroke={INK.zhong} strokeWidth={1.4} />
            </g>
          )
        })}
        <path d="M330 92v12" stroke={INK.nong} strokeWidth={1.4} />
        <circle cx={330} cy={88} r={2.6} fill="none" stroke={INK.nong} strokeWidth={1.2} />
      </g>
      {/* 地平一笔 */}
      <path d="M20 210h180M240 206h140" stroke={INK.dan} strokeWidth={1.2} opacity={0.3} strokeLinecap="round" />
      <Seal />
    </g>
  )
}

/* ============================================================
   slug → 变体映射（关键词优先，其次哈希）
   ============================================================ */
const KEYWORD_MAP: Array<[RegExp, IllustrationVariant]> = [
  [/chan|禅/, 'enso'],
  [/jingtu|净土|amt|无量寿|nianfo|念佛/, 'lotus'],
  [/jie|戒|dishan|地藏/, 'incense'],
  [/zhong|钟/, 'bell'],
  [/xin|心/, 'meditation'],
  [/jing|经/, 'sutra'],
  [/yue|月/, 'moon'],
]

export function variantForSlug(slug: string): IllustrationVariant {
  for (const [re, v] of KEYWORD_MAP) {
    if (re.test(slug)) return v
  }
  const all: IllustrationVariant[] = [
    'lotus',
    'incense',
    'bell',
    'bamboo',
    'mountains',
    'moon',
    'enso',
    'bodhi',
    'sutra',
    'koi',
    'meditation',
    'clouds',
  ]
  let h = 0
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return all[h % all.length]
}
