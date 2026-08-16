/**
 * 禅意 SVG 插画系统 —— 全部为本地矢量绘制，无外部图库依赖。
 * 12 种场景供文章封面 / 段落配图 / 首页氛围使用。
 * 配色取自设计系统（檀木棕、藏红、金、米白、月光蓝）。
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

const PALETTES: Record<IllustrationVariant, { bg: string; ink: string; accent: string; soft: string }> = {
  lotus: { bg: '#f6f0e2', ink: '#543620', accent: '#8c2f39', soft: '#e8d9b8' },
  incense: { bg: '#efe6d0', ink: '#4a443c', accent: '#c9a227', soft: '#f0e0a8' },
  bell: { bg: '#e4ecf5', ink: '#3a5a82', accent: '#a8871f', soft: '#c9d9ea' },
  bamboo: { bg: '#eef2e4', ink: '#3e2818', accent: '#6b4425', soft: '#dfe8cf' },
  mountains: { bg: '#e9f0f8', ink: '#4a443c', accent: '#5f87b5', soft: '#dde8f3' },
  moon: { bg: '#1c2836', ink: '#d6d1c7', accent: '#e0c76c', soft: '#2c3a4e' },
  enso: { bg: '#fbf8f0', ink: '#2b2620', accent: '#8c2f39', soft: '#f0e4d2' },
  bodhi: { bg: '#f3f6ee', ink: '#3e4a2e', accent: '#8a5a31', soft: '#e3ead4' },
  sutra: { bg: '#f6f0e2', ink: '#543620', accent: '#a33f3b', soft: '#efe6d0' },
  koi: { bg: '#e4ecf5', ink: '#2b3a4e', accent: '#8c2f39', soft: '#c9d9ea' },
  meditation: { bg: '#f2f6fb', ink: '#3a5a82', accent: '#c9a227', soft: '#e4ecf5' },
  clouds: { bg: '#e9f0f8', ink: '#4a443c', accent: '#a3bfdc', soft: '#f2f6fb' },
}

export function ZenIllustration({ variant, className, animated = true }: Props) {
  const p = PALETTES[variant]
  return (
    <div
      className={`overflow-hidden ${className ?? ''}`}
      style={{ background: `linear-gradient(160deg, ${p.bg}, ${p.soft})` }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 400 240"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <Scenes variant={variant} p={p} animated={animated} />
      </svg>
    </div>
  )
}

function Scenes({
  variant,
  p,
  animated,
}: {
  variant: IllustrationVariant
  p: { bg: string; ink: string; accent: string; soft: string }
  animated: boolean
}) {
  switch (variant) {
    case 'lotus':
      return <Lotus p={p} animated={animated} />
    case 'incense':
      return <Incense p={p} animated={animated} />
    case 'bell':
      return <Bell p={p} animated={animated} />
    case 'bamboo':
      return <Bamboo p={p} animated={animated} />
    case 'mountains':
      return <Mountains p={p} animated={animated} />
    case 'moon':
      return <Moon p={p} animated={animated} />
    case 'enso':
      return <Enso p={p} animated={animated} />
    case 'bodhi':
      return <Bodhi p={p} animated={animated} />
    case 'sutra':
      return <Sutra p={p} animated={animated} />
    case 'koi':
      return <Koi p={p} animated={animated} />
    case 'meditation':
      return <Meditation p={p} animated={animated} />
    case 'clouds':
      return <Clouds p={p} animated={animated} />
  }
}

/* ---------------- 场景绘制 ---------------- */

function Lotus({ p, animated }: { p: Pal; animated: boolean }) {
  return (
    <g>
      {/* 水纹 */}
      {[0, 1, 2].map((i) => (
        <ellipse
          key={i}
          cx={200}
          cy={210}
          rx={120 + i * 30}
          ry={8 + i * 2}
          fill="none"
          stroke={p.accent}
          strokeWidth={1.4}
          opacity={0.35}
          className={animated ? 'animate-ripple' : ''}
          style={{ animationDelay: `${i * 0.9}s`, transformOrigin: '200px 210px' }}
        />
      ))}
      {/* 莲叶 */}
      <path d="M120 208c-34-12-46-42-30-64 14-20 44-24 62-6 16 16 10 46-8 60-8 6-16 10-24 10z" fill={p.ink} opacity={0.16} />
      <path d="M288 202c30-16 38-46 20-64-16-16-44-14-60 6-14 18-6 44 16 58 8 6 16 6 24 0z" fill={p.ink} opacity={0.14} />
      {/* 花瓣 */}
      <g className={animated ? 'animate-bloom' : ''} style={{ transformOrigin: '200px 120px' }}>
        <path d="M200 150c-6 18-22 30-34 32 0-20 8-40 24-48 4 4 8 10 10 16z" fill={p.accent} opacity={0.9} />
        <path d="M200 150c6 18 22 30 34 32 0-20-8-40-24-48-4 4-8 10-10 16z" fill={p.accent} opacity={0.85} />
        <path d="M200 150c-16 12-40 16-52 12 2-20 14-38 32-46 8 8 14 20 20 34z" fill={p.ink} opacity={0.22} />
        <path d="M200 150c16 12 40 16 52 12-2-20-14-38-32-46-8 8-14 20-20 34z" fill={p.ink} opacity={0.18} />
        <path d="M200 134c-10-10-22-12-32-8 0-18 10-34 28-40 2 16 2 32 4 48z" fill={p.accent} opacity={0.75} />
        <path d="M200 134c10-10 22-12 32-8 0-18-10-34-28-40-2 16-2 32-4 48z" fill={p.accent} opacity={0.7} />
        <ellipse cx={200} cy={120} rx={10} ry={8} fill={p.soft} />
      </g>
      <path d="M200 182v26" stroke={p.ink} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
    </g>
  )
}

function Incense({ p, animated }: { p: Pal; animated: boolean }) {
  return (
    <g>
      {/* 香炉 */}
      <path d="M150 190h100l-8 22H158z" fill={p.ink} opacity={0.85} />
      <ellipse cx={200} cy={190} rx={50} ry={8} fill={p.ink} />
      <ellipse cx={200} cy={188} rx={44} ry={6} fill={p.accent} opacity={0.7} />
      <path d="M176 212h48l6 10h-60z" fill={p.ink} opacity={0.6} />
      <path d="M166 222h68v6h-68z" fill={p.ink} opacity={0.5} />
      {/* 三炷香 */}
      <line x1={186} y1={188} x2={186} y2={120} stroke={p.accent} strokeWidth={3} strokeLinecap="round" />
      <line x1={200} y1={188} x2={200} y2={108} stroke={p.accent} strokeWidth={3} strokeLinecap="round" />
      <line x1={214} y1={188} x2={214} y2={126} stroke={p.accent} strokeWidth={3} strokeLinecap="round" />
      {[186, 200, 214].map((cx) => (
        <circle key={cx} cx={cx} cy={100} r={4} fill={p.accent} className={animated ? 'animate-glow' : ''} />
      ))}
      {/* 烟 */}
      {[186, 200, 214].map((cx, i) =>
        [0, 1, 2].map((j) => (
          <circle
            key={`${cx}-${j}`}
            cx={cx + j * 8}
            cy={92 - j * 26}
            r={7 + j * 5}
            fill={p.ink}
            opacity={0.12}
            className={animated ? (i === 1 ? 'animate-smoke-rise' : 'animate-smoke-rise-slow') : ''}
            style={{ animationDelay: `${j * 1.6 + i * 0.4}s` }}
          />
        )),
      )}
    </g>
  )
}

function Bell({ p, animated }: { p: Pal; animated: boolean }) {
  return (
    <g>
      {/* 钟架 */}
      <path d="M140 60v120M260 60v120" stroke={p.ink} strokeWidth={6} strokeLinecap="round" opacity={0.7} />
      <path d="M120 60h160" stroke={p.ink} strokeWidth={8} strokeLinecap="round" opacity={0.7} />
      {/* 铜钟 */}
      <g className={animated ? 'animate-swing' : ''} style={{ transformOrigin: '200px 60px' }}>
        <path d="M158 62h84l-10 120a32 32 0 0 1-64 0z" fill={p.accent} opacity={0.9} />
        <path d="M158 62h84l-6 40H164z" fill={p.soft} opacity={0.6} />
        <ellipse cx={200} cy={186} rx={30} ry={6} fill={p.ink} opacity={0.5} />
        <line x1={200} y1={192} x2={200} y2={210} stroke={p.ink} strokeWidth={4} />
        <circle cx={200} cy={214} r={6} fill={p.ink} />
      </g>
      {/* 声波 */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${250 + i * 16} 110a${34 + i * 14} 34 0 0 1 0 68`}
          fill="none"
          stroke={p.accent}
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.5 - i * 0.12}
          className={animated ? 'animate-ripple' : ''}
          style={{ animationDelay: `${i * 0.8}s`, transformOrigin: `${250 + i * 16}px 144px` }}
        />
      ))}
    </g>
  )
}

function Bamboo({ p, animated }: { p: Pal; animated: boolean }) {
  const stalks = [
    { x: 90, h: 190, w: 9 },
    { x: 150, h: 220, w: 11 },
    { x: 210, h: 200, w: 9 },
    { x: 270, h: 215, w: 10 },
    { x: 320, h: 185, w: 8 },
  ]
  return (
    <g>
      {stalks.map((s, i) => (
        <g key={i}>
          <line x1={s.x} y1={240} x2={s.x} y2={240 - s.h} stroke={p.ink} strokeWidth={s.w} strokeLinecap="round" opacity={0.55} />
          {[40, 100, 160].map((y) => (
            <line key={y} x1={s.x - s.w * 0.9} y1={240 - y} x2={s.x + s.w * 0.9} y2={240 - y} stroke={p.ink} strokeWidth={1.6} opacity={0.45} />
          ))}
          {/* 竹叶 */}
          <path d={`M${s.x} ${240 - s.h}c-4-12 6-26 22-30 2 12-6 22-22 30z`} fill={p.accent} opacity={0.75} />
          <path d={`M${s.x} ${240 - s.h - 18}c4-10 18-14 26-10-4 8-14 12-26 10z`} fill={p.accent} opacity={0.6} />
        </g>
      ))}
      {animated && (
        <circle cx={180} cy={70} r={3} fill={p.accent} opacity={0.5} className="animate-float" />
      )}
    </g>
  )
}

function Mountains({ p, animated }: { p: Pal; animated: boolean }) {
  return (
    <g>
      {/* 日轮 */}
      <circle cx={290} cy={64} r={26} fill={p.accent} opacity={0.8} className={animated ? 'animate-glow' : ''} />
      {/* 远山 */}
      <path d="M0 190L80 90l60 60 50-80 70 90 140-70v120H0z" fill={p.ink} opacity={0.28} />
      <path d="M0 210l90-100 70 70 60-60 80 90h100v40H0z" fill={p.ink} opacity={0.5} />
      {/* 云雾 */}
      {[0, 1, 2].map((i) => (
        <ellipse
          key={i}
          cx={80 + i * 120}
          cy={150 + i * 18}
          rx={70}
          ry={9}
          fill={p.soft}
          opacity={0.7}
          className={animated ? 'animate-float-slow' : ''}
          style={{ animationDelay: `${i * 1.4}s` }}
        />
      ))}
      {/* 飞鸟 */}
      <path d="M120 60l8 6-8 6M138 60l8 6-8 6" stroke={p.ink} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.7} />
    </g>
  )
}

function Moon({ p, animated }: { p: Pal; animated: boolean }) {
  return (
    <g>
      <circle cx={280} cy={70} r={34} fill={p.accent} opacity={0.9} className={animated ? 'animate-glow' : ''} />
      <circle cx={268} cy={62} r={8} fill={p.bg} opacity={0.25} />
      <circle cx={290} cy={82} r={5} fill={p.bg} opacity={0.2} />
      {/* 水面 */}
      <path d="M0 180h400v60H0z" fill={p.soft} opacity={0.35} />
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={60 + i * 100} cy={200} rx={38} ry={3.5} fill={p.accent} opacity={0.4 - i * 0.07} className={animated ? 'animate-glow' : ''} style={{ animationDelay: `${i * 0.7}s` }} />
      ))}
      {/* 岸上枯枝 */}
      <path d="M0 180c40-30 70-8 100-44" stroke={p.ink} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.7} />
      <path d="M100 136l-14-6M100 136l8-14" stroke={p.ink} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.55} />
    </g>
  )
}

function Enso({ p, animated }: { p: Pal; animated: boolean }) {
  return (
    <g>
      <circle cx={200} cy={120} r={78} fill="none" stroke={p.ink} strokeWidth={13} opacity={0.85} strokeLinecap="round" />
      <circle cx={200} cy={120} r={78} fill="none" stroke={p.soft} strokeWidth={2} opacity={0.9} strokeDasharray="4 14" strokeLinecap="round" className={animated ? 'animate-spin-slow' : ''} style={{ transformOrigin: '200px 120px' }} />
      <path d="M200 196v14M200 196c-16 8-30 20-36 38" stroke={p.ink} strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.7} />
      <circle cx={200} cy={120} r={5} fill={p.accent} />
    </g>
  )
}

function Bodhi({ p, animated }: { p: Pal; animated: boolean }) {
  return (
    <g>
      <path d="M60 120C60 40 120 10 200 24c80-14 140 16 140 96 0 66-60 106-140 106S60 186 60 120z" fill={p.ink} opacity={0.8} />
      {/* 叶脉 */}
      <path d="M200 32v188" stroke={p.soft} strokeWidth={2.5} opacity={0.7} />
      {[70, 110, 150].map((y) => (
        <g key={y}>
          <path d={`M200 ${y}l-46-22M200 ${y}l46-22M200 ${y}l-40 26M200 ${y}l40 26`} stroke={p.soft} strokeWidth={1.8} opacity={0.55} fill="none" strokeLinecap="round" />
        </g>
      ))}
      {/* 露珠 */}
      {animated && (
        <circle cx={150} cy={90} r={4} fill={p.accent} opacity={0.8} className="animate-float-slow" />
      )}
    </g>
  )
}

function Sutra({ p, animated }: { p: Pal; animated: boolean }) {
  return (
    <g>
      {/* 经卷 */}
      <rect x={80} y={70} width={240} height={110} rx={8} fill={p.soft} stroke={p.ink} strokeWidth={3} opacity={0.95} />
      <rect x={80} y={70} width={240} height={26} rx={8} fill={p.accent} opacity={0.85} />
      <circle cx={106} cy={83} r={4} fill={p.soft} />
      {[104, 130, 156, 182, 208].map((x) => (
        <line key={x} x1={x} y1={104} x2={x + 70} y2={104} stroke={p.ink} strokeWidth={3} opacity={0.3} strokeLinecap="round" />
      ))}
      {[104, 130, 156, 182, 208].map((x, i) => (
        <line key={x + 1} x1={x} y1={126} x2={x + (i % 2 ? 60 : 80)} y2={126} stroke={p.ink} strokeWidth={3} opacity={0.25} strokeLinecap="round" />
      ))}
      {[104, 130, 156, 182].map((x) => (
        <line key={x + 2} x1={x} y1={148} x2={x + 74} y2={148} stroke={p.ink} strokeWidth={3} opacity={0.22} strokeLinecap="round" />
      ))}
      {/* 木鱼 */}
      <g transform="translate(292 200)">
        <path d="M-28 0c0-18 12-28 28-28 16 0 28 10 28 28z" fill={p.ink} opacity={0.75} />
        <ellipse cx={0} cy={-14} rx={22} ry={7} fill={p.soft} opacity={0.5} />
        <circle cx={24} cy={-20} r={5} fill={p.accent} />
      </g>
      {/* 小槌 */}
      <g className={animated ? 'animate-swing' : ''} style={{ transformOrigin: '316px 120px' }}>
        <line x1={316} y1={120} x2={330} y2={180} stroke={p.ink} strokeWidth={4} strokeLinecap="round" />
        <circle cx={331} cy={184} r={7} fill={p.accent} />
      </g>
      {animated && (
        <circle cx={240} cy={60} r={3} fill={p.accent} opacity={0.6} className="animate-float" />
      )}
    </g>
  )
}

function Koi({ p, animated }: { p: Pal; animated: boolean }) {
  return (
    <g>
      {/* 水波 */}
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M${20 + i * 100} 150q14-10 28 0t28 0t28 0`}
          fill="none"
          stroke={p.ink}
          strokeWidth={2.5}
          opacity={0.3}
          strokeLinecap="round"
        />
      ))}
      {/* 大鱼 */}
      <g className={animated ? 'animate-float-slow' : ''}>
        <path d="M120 100c46-14 88-8 116 16-40 16-84 20-118 6-18-7-16-16 2-22z" fill={p.accent} opacity={0.9} />
        <path d="M246 110l26-12-10 16 18 8-24 8z" fill={p.accent} opacity={0.9} />
        <circle cx={140} cy={108} r={3.5} fill={p.soft} />
        <path d="M170 96c10 6 18 14 22 24" stroke={p.soft} strokeWidth={2} fill="none" opacity={0.7} strokeLinecap="round" />
      </g>
      {/* 小鱼 */}
      <g className={animated ? 'animate-float' : ''}>
        <path d="M240 170c30-8 54-4 70 10-24 10-52 12-72 4-11-5-10-10 2-14z" fill={p.ink} opacity={0.55} />
        <path d="M316 176l14-7-6 9 10 5-14 4z" fill={p.ink} opacity={0.55} />
      </g>
      {/* 莲苞 */}
      <path d="M60 190c-6-14 2-24 12-22 4 10-2 18-12 22z" fill={p.accent} opacity={0.8} />
      <path d="M60 168v24" stroke={p.ink} strokeWidth={2.5} opacity={0.6} />
    </g>
  )
}

function Meditation({ p, animated }: { p: Pal; animated: boolean }) {
  return (
    <g>
      {/* 光晕 */}
      <circle cx={200} cy={110} r={64} fill={p.accent} opacity={0.18} className={animated ? 'animate-ray' : ''} style={{ transformOrigin: '200px 110px' }} />
      <circle cx={200} cy={110} r={42} fill="none" stroke={p.accent} strokeWidth={2} opacity={0.5} />
      {/* 禅坐人影 */}
      <path d="M200 58c-12 0-20 8-20 18 0 6 4 10 8 12l-14 30c-4 8-2 14 4 16l6 2v38h32v-38l6-2c6-2 8-8 4-16l-14-30c4-2 8-6 8-12 0-10-8-18-20-18z" fill={p.ink} opacity={0.85} />
      <ellipse cx={200} cy={176} rx={34} ry={7} fill={p.ink} opacity={0.25} />
      {/* 香火两点 */}
      {animated &&
        [0, 1].map((i) => (
          <circle key={i} cx={156 + i * 88} cy={150} r={2.5} fill={p.accent} className="animate-glow" style={{ animationDelay: `${i}s` }} />
        ))}
    </g>
  )
}

function Clouds({ p, animated }: { p: Pal; animated: boolean }) {
  return (
    <g>
      {[0, 1, 2, 3].map((i) => (
        <g key={i} className={animated ? 'animate-float-slow' : ''} style={{ animationDelay: `${i * 1.2}s` }}>
          <ellipse cx={70 + i * 95} cy={70 + (i % 2) * 90} rx={52} ry={18} fill={p.soft} opacity={0.9} />
          <ellipse cx={90 + i * 95} cy={58 + (i % 2) * 90} rx={34} ry={14} fill={p.soft} opacity={0.85} />
          <ellipse cx={48 + i * 95} cy={62 + (i % 2) * 90} rx={26} ry={11} fill={p.soft} opacity={0.8} />
        </g>
      ))}
      {/* 远塔 */}
      <path d="M312 240v-58l10-10v-16h16v16l10 10v58z" fill={p.ink} opacity={0.4} />
      <line x1={330} y1={156} x2={330} y2={140} stroke={p.ink} strokeWidth={2} opacity={0.4} />
      {/* 日照云海 */}
      <circle cx={60} cy={60} r={16} fill={p.accent} opacity={0.7} className={animated ? 'animate-glow' : ''} />
    </g>
  )
}

type Pal = { bg: string; ink: string; accent: string; soft: string }

/** 依 slug 稳定映射插画变体（关键词优先，其次哈希） */
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
