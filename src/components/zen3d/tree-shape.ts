/**
 * 祈愿树造型（纯数据 / 纯计算：不 import three，也不碰 DOM）
 * ==================================================================
 * 为什么单列一个文件：`scripts/check-tree.mjs` 要用**真实造型**去算取景、
 * 裸干比例、松针簇是否长在枝端。造型只写在组件里，这些判据就只能靠截图。
 *
 * 参照照片（真实的松树街道树）——可量化的四条特征：
 *   ① 裸干只占全高约 1/4，之后才分叉，不是「旗杆插着几根横枝」；
 *   ② 树冠**宽大于高**（宽高比 ≈ 1.3），没有明显的正圆轮廓；
 *   ③ 针叶是**瓶刷状簇**：长针从一个芽点四散，不是水平的绿圆盘；
 *   ④ 树冠里夹着枯黄的旧针，枝间能看见空隙。
 *
 * 相机常用极角 phi ≈ 1.29（仰角只有 16°）。水平的圆盘在这个仰角下投影
 * 面积只剩 sin(16°) ≈ 0.28，越宽的盘越像一条线——这就是旧版「层叠松云」
 * 一进画面就散架的原因。所以簇改成 `TUFT_PLANES` 张**竖立面片交叉**：
 * 任意方位必有一张面片的 |cos| ≥ 0.866，投影面积几乎不打折。
 */

import { STAGE_FOV } from './stage.ts'

export type Vec3 = [number, number, number]

/** 地面高度（淡墨地台的 y） */
export const TREE_GROUND_Y = -4.5

/** 松针簇的面片数：6 张每隔 60° 交叉 */
export const TUFT_PLANES = 6

/** 面片交叉后，最坏方位上仍正对相机的那张面片 |cos| ≥ cos(30°) */
export const TUFT_MIN_FACING = Math.cos(Math.PI / TUFT_PLANES)

/* ---------------------------------------------------------------- 向量小工具 */

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const mul = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k]
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

/** 确定性伪随机（mulberry32）：刷新页面不会换一棵树，判据也能复现 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------------------------ 树干 */

/** 树干：微弯的单主干，梢部收细；根部埋到坡面以下 */
export const TREE_TRUNK: Vec3[] = [
  [-0.04, -4.8, 0.0],
  [-0.02, -4.2, 0.02],
  [0.04, -3.5, 0.05],
  [0.12, -2.9, 0.09],
  [0.14, -2.2, 0.06],
  [0.24, -1.5, 0.1],
  [0.32, -0.8, 0.14],
  [0.34, -0.1, 0.12],
  [0.44, 0.6, 0.16],
  [0.5, 1.3, 0.12],
  [0.6, 2.0, 0.18],
  [0.66, 2.7, 0.14],
  [0.72, 3.4, 0.18],
  [0.78, 4.1, 0.14],
  [0.8, 4.8, 0.16],
  [0.78, 5.2, 0.12],
  [0.74, 5.6, 0.13],
  [0.7, 5.9, 0.12],
]

/**
 * 树干半径随高度的变化（根部外扩写进函数，避免另做锥筒留一圈接缝）。
 * 照片里的干是「粗、直、往上慢慢收」，所以不做过大的胸径鼓包；
 * 上一版 t≈0.16 处 0.12 的鼓包在低角度下成了一个「葫芦腰」。
 */
export function trunkRadiusAt(t: number): number {
  const base = 0.62 * Math.pow(1 - t, 1.12) + 0.05
  const swell = Math.exp(-Math.pow((t - 0.22) / 0.18, 2)) * 0.05
  const flare = t < 0.16 ? 0.26 * Math.pow(1 - t / 0.16, 1.1) : 0
  return base + swell + flare
}

/** 树干轴线在给定高度上的位置（线性取样足够：控制点间距 0.6–0.7） */
export function trunkPointAt(y: number): Vec3 {
  const p = TREE_TRUNK
  if (y <= p[0][1]) return p[0]
  for (let i = 1; i < p.length; i++) {
    if (y <= p[i][1]) {
      const k = (y - p[i - 1][1]) / (p[i][1] - p[i - 1][1])
      return [
        p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k,
        y,
        p[i - 1][2] + (p[i][2] - p[i - 1][2]) * k,
      ]
    }
  }
  return p[p.length - 1]
}

/* ------------------------------------------------------------------ 主枝 */

export interface Bough {
  /** 5 个控制点：起点埋在干内，第二点才出干（看不到平口） */
  pts: Vec3[]
  /** 枝基半径 */
  r: number
  /** 枝领：t≈0 处外扩，遮住出干的接缝 */
  collar: number
  /** 0 最低最粗，2 最高最细 */
  tier: 0 | 1 | 2
}

/**
 * 10 根主枝：自下而上、左右前后错开，最低一根在 y≈-1.5（离地 2.9，
 * 占全高约 1/4 —— 照片里就是这样一段干净的裸干）。
 * 主枝比上一版细一半（0.1–0.2，上一版 0.11–0.3）：照片里粗的只有树干，
 * 一级枝已经相当细，针叶几乎全长在它上面的细枝梢头。
 */
export const TREE_BOUGHS: Bough[] = [
  // 左低（分叉的那一根，最粗）
  {
    pts: [
      [0.16, -1.5, 0.02],
      [0.02, -1.5, 0.22],
      [-0.62, -1.36, 0.5],
      [-1.46, -1.12, 0.6],
      [-2.3, -0.86, 0.5],
    ],
    r: 0.2,
    collar: 0.09,
    tier: 0,
  },
  // 右低
  {
    pts: [
      [0.26, -1.1, -0.03],
      [0.42, -1.05, -0.24],
      [1.16, -0.86, -0.5],
      [1.95, -0.62, -0.6],
      [2.66, -0.38, -0.45],
    ],
    r: 0.19,
    collar: 0.09,
    tier: 0,
  },
  // 前左
  {
    pts: [
      [0.26, -0.5, 0.12],
      [0.06, -0.34, 0.45],
      [-0.58, -0.04, 0.95],
      [-1.36, 0.3, 1.3],
      [-1.98, 0.56, 1.5],
    ],
    r: 0.17,
    collar: 0.08,
    tier: 1,
  },
  // 前右
  {
    pts: [
      [0.4, -0.1, 0.1],
      [0.6, 0.1, 0.42],
      [1.28, 0.5, 0.95],
      [2.0, 0.9, 1.2],
      [2.5, 1.16, 1.26],
    ],
    r: 0.16,
    collar: 0.07,
    tier: 1,
  },
  // 左中
  {
    pts: [
      [0.32, 0.2, 0.03],
      [0.2, 0.42, 0.15],
      [-0.54, 0.8, 0.42],
      [-1.34, 1.2, 0.5],
      [-2.02, 1.48, 0.36],
    ],
    r: 0.17,
    collar: 0.08,
    tier: 1,
  },
  // 右中
  {
    pts: [
      [0.42, 0.8, -0.04],
      [0.66, 1.05, -0.2],
      [1.34, 1.45, -0.45],
      [2.02, 1.84, -0.45],
      [2.58, 2.08, -0.2],
    ],
    r: 0.16,
    collar: 0.07,
    tier: 1,
  },
  // 左高
  {
    pts: [
      [0.42, 1.7, 0.02],
      [0.3, 2.0, 0.1],
      [-0.34, 2.4, 0.28],
      [-1.08, 2.84, 0.4],
      [-1.72, 3.12, 0.3],
    ],
    r: 0.14,
    collar: 0.06,
    tier: 2,
  },
  // 右高
  {
    pts: [
      [0.61, 2.2, 0.11],
      [0.72, 2.5, -0.12],
      [1.34, 2.9, -0.4],
      [1.94, 3.28, -0.42],
      [2.44, 3.52, -0.2],
    ],
    r: 0.14,
    collar: 0.06,
    tier: 2,
  },
  // 左梢
  {
    pts: [
      [0.67, 2.9, 0.15],
      [0.4, 3.2, 0.1],
      [-0.14, 3.6, 0.2],
      [-0.74, 3.98, 0.25],
      [-1.28, 4.26, 0.15],
    ],
    r: 0.11,
    collar: 0.05,
    tier: 2,
  },
  // 右梢
  {
    pts: [
      [0.71, 3.4, 0.15],
      [0.76, 3.68, -0.12],
      [1.28, 4.04, -0.28],
      [1.82, 4.32, -0.28],
      [2.26, 4.56, -0.1],
    ],
    r: 0.1,
    collar: 0.05,
    tier: 2,
  },
]

/* ------------------------------------------------------------------ 侧枝 */

export interface Twig {
  pts: Vec3[]
  r: number
  /** 0 = 主枝上分出的侧枝，1 = 侧枝上再分出的小枝 */
  depth: 0 | 1
}

/**
 * 从一条枝的某个位置分出一条子枝。起点就在母枝上（由折线取样得到），
 * 所以子枝永远不会悬空。
 */
function branchOff(
  p: Vec3,
  prev: Vec3,
  next: Vec3,
  sideSign: number,
  len: number,
  r: number,
  lift: number,
  rnd: () => number,
): Twig {
  const tan = norm(sub(next, prev))
  // 水平外向：让子枝往外岔，而不是顺着母枝继续爬
  const outward = norm([p[0], 0, p[2]])
  const side: Vec3 = [-outward[2] * sideSign, 0, outward[0] * sideSign]
  const dir = norm(
    add(add(mul(tan, 0.4), mul(outward, 0.68)), add(mul(side, 0.3), [0, lift, 0])),
  )
  return {
    r,
    depth: 0,
    pts: [
      p,
      add(p, mul(dir, len * 0.34)),
      add(add(p, mul(dir, len * 0.7)), [0, -0.06 - rnd() * 0.05, 0]),
      add(p, mul(dir, len)),
    ],
  }
}

/**
 * 沿**整根主枝**抽枝（k=0.35/0.5/0.65/0.8 四处），每条侧枝再分 2 条小枝。
 * 一共 10 主枝 + 40 侧枝 + 80 小枝：照片里主枝本身就是细的、密布短枝，
 * 上一版只在两个点上长枝，中段整根光着，远看就成了「旗杆插着几根大胳膊」。
 */
function buildTwigs(): Twig[] {
  const rnd = makeRng(20261114)
  const out: Twig[] = []
  const at = (pts: Vec3[], k: number) => samplePolyline(pts, Math.min(0.97, Math.max(0.03, k)))
  for (const bough of TREE_BOUGHS) {
    for (const [i, k] of ([0.35, 0.5, 0.65, 0.8] as const).entries()) {
      out.push(
        branchOff(
          at(bough.pts, k),
          at(bough.pts, k - 0.07),
          at(bough.pts, k + 0.07),
          i % 2 === 0 ? 1 : -1,
          1.9 + rnd() * 0.7,
          // 越靠枝梢越细
          0.05 - i * 0.004 + rnd() * 0.012,
          0.3 + rnd() * 0.3,
          rnd,
        ),
      )
    }
  }
  for (const tw of [...out]) {
    for (const [j, k] of ([0.32, 0.62] as const).entries()) {
      const sub = branchOff(
        at(tw.pts, k),
        at(tw.pts, k - 0.1),
        at(tw.pts, k + 0.1),
        j === 0 ? -1 : 1,
        0.75 + rnd() * 0.4,
        0.026 + rnd() * 0.008,
        0.26 + rnd() * 0.3,
        rnd,
      )
      sub.depth = 1
      out.push(sub)
    }
  }
  return out
}

export const TREE_TWIGS: Twig[] = buildTwigs()

/* -------------------------------------------------------------- 松针簇 */

export interface Tuft {
  p: Vec3
  /** 面片边长（世界单位） */
  s: number
  /** 0 深绿(背光/低位) · 1 中绿 · 2 亮绿(受光/高位) · 3 枯针 */
  tone: 0 | 1 | 2 | 3
  /** 枯针簇：不挂在枝梢，是夹在枝杈里的旧针 */
  dry?: true
}

/**
 * 松针簇的世界半径：面片边长 s 的一半，再留 16% 给实例的非等比拉伸
 * （贴图里针尖只到半边的 0.86，所以 0.58s 是上界而不是实测值——判据宁可保守）。
 */
export const tuftRadius = (t: Tuft): number => t.s * 0.58

/** 枯针夹点：全在冠内，不上轮廓（照片里的枯针也是这样藏在枝杈里） */const DRY_SPOTS: Vec3[] = [
  [1.05, 0.5, 0.3],
  [-1.5, 2.3, 0.5],
  [0.5, 3.4, -0.35],
]

function buildTufts(): Tuft[] {
  const rnd = makeRng(77113)
  const out: Tuft[] = []
  // 主枝端：定出冠形轮廓
  for (const b of TREE_BOUGHS) {
    out.push({ p: b.pts[b.pts.length - 1], s: 1.3 + rnd() * 0.18, tone: b.tier })
  }
  // 侧枝：梢头一簇 + 中段一簇（中段那簇把针叶连成片）；
  // 小枝只留梢头一小簇，负责把轮廓打毛
  let i = 0
  for (const tw of TREE_TWIGS) {
    const tone = (i++ % 3) as 0 | 1 | 2
    if (tw.depth === 0) {
      out.push({ p: tw.pts[3], s: 1.06 + rnd() * 0.2, tone })
      // 中段两簇：把内圈的空枝也接上针叶，针叶才不会只在树冠外圈「一圈云」
      out.push({ p: tw.pts[2], s: 0.82 + rnd() * 0.14, tone })
      out.push({ p: samplePolyline(tw.pts, 0.45), s: 0.7 + rnd() * 0.12, tone })
    } else {
      out.push({ p: tw.pts[3], s: 0.74 + rnd() * 0.16, tone })
    }
  }
  // 冠顶
  out.push({ p: [0.7, 5.88, 0.13], s: 1.16, tone: 2 })
  for (const p of DRY_SPOTS) out.push({ p, s: 0.72, tone: 3, dry: true })
  return out
}

export const TREE_TUFTS: Tuft[] = buildTufts()

/* ---------------------------------------------------------------- 红绸挂点 */

export interface RibbonSpot3D {
  p: Vec3
  /**
   * 挂点自带的微小偏转（-0.22..0.22 rad）。
   * 绸面本身在渲染时逐帧朝着相机（否则转到侧面就成一条线、背面文字还会镜像），
   * 这里只留一点差，让每条绸子的角度不完全一样。
   */
  yaw: number
}

/** 绸子从挂点垂下的长度（与 Tree3D 的三段绸身总长一致） */
export const RIBBON_DROP = 1.68

/** 折线参数 k（0..1）处的点：挂点要落在真实的枝上，就得沿线取 */
function samplePolyline(pts: Vec3[], k: number): Vec3 {
  const segs = pts.length - 1
  const f = Math.min(0.999, Math.max(0, k)) * segs
  const i = Math.floor(f)
  const t = f - i
  const a = pts[i]
  const b = pts[i + 1]
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

/** 绸身全程离树干的最小净距：挂点再空，绸子也不能长在木头里 */
function ribbonTrunkGap(p: Vec3): number {
  let gap = Infinity
  for (let k = 0; k <= 8; k++) {
    const y = p[1] - (RIBBON_DROP * k) / 8
    const axis = trunkPointAt(y)
    const t = (y - TREE_TRUNK[0][1]) / (TREE_TRUNK[TREE_TRUNK.length - 1][1] - TREE_TRUNK[0][1])
    gap = Math.min(gap, Math.hypot(p[0] - axis[0], p[2] - axis[2]) - trunkRadiusAt(t))
  }
  return gap
}

/** 挂点离最近松针簇包围球的净距 */
function tuftGap(p: Vec3): number {
  return Math.min(
    ...TREE_TUFTS.map(
      (t) => Math.hypot(t.p[0] - p[0], t.p[1] - p[1], t.p[2] - p[2]) - tuftRadius(t),
    ),
  )
}

/**
 * 绸身**下摆**离最近松针簇的净距（挂点往下 0.8–2.0 这一段）。
 * 绸子本来就系在枝上、上半截夹在针叶里，所以不要求整条都露出来；
 * 判的是「垂下来的那一段有没有空气」——这才是看得见看不见的关键。
 */
function ribbonBodyGap(p: Vec3): number {
  let gap = Infinity
  for (let k = 4; k <= 8; k++) {
    const y = p[1] - (RIBBON_DROP * k) / 8
    gap = Math.min(gap, tuftGap([p[0], y, p[2]]))
  }
  return gap
}

/**
 * 20 个挂点：沿主枝（k=0.30/0.44/0.58/0.70）与一级侧枝（k=0.34）取样，
 * 只保留「离针叶 ≥ 0.34、绸身离树干 ≥ 0.18」的点，再按空隙从大到小挑，
 * 并让方位角铺开（先要求间隔 34°，挑不满才放宽）——20 条绸子才不会全挤在两侧。
 * 挑而不是钉死：针叶位置一改，挂点会自动让开。
 */
function buildRibbonSpots(): RibbonSpot3D[] {
  const rnd = makeRng(5591)
  const cands: Array<{ p: Vec3; az: number; clear: number }> = []
  const push = (node: Vec3, out: number) => {
    const n = norm([node[0], 0, node[2]])
    // 挂点略低于枝、略偏枝外：绸子从枝下缘垂下来，这是它该在的位置
    const p: Vec3 = [node[0] + n[0] * out, node[1] - 0.3, node[2] + n[2] * out]
    if (ribbonTrunkGap(p) < 0.18) return
    // 绸结不能被针叶球心整个包住；下摆得在空气里（判据见 check-tree.mjs 第 7 组）
    if (tuftGap(p) < -0.2) return
    const clear = ribbonBodyGap(p)
    if (clear < 0.06) return
    cands.push({ p, az: Math.atan2(p[0], p[2]), clear })
  }
  // 采样密一点：94 簇松针把枝身盖得很满，稀疏采样会挑不出足够多的空位
  for (const b of TREE_BOUGHS) {
    for (let k = 0.2; k <= 0.86; k += 0.05) push(samplePolyline(b.pts, k), 0.26)
  }
  for (const tw of TREE_TWIGS) {
    if (tw.depth !== 0) continue
    for (const k of [0.18, 0.34, 0.5, 0.68]) push(samplePolyline(tw.pts, k), 0.1)
  }
  // 先按空隙筛一遍（不能挂在针叶里），再按「彼此越远越好」挑 20 个。
  // 最远点采样比单纯按空隙排序更能把绸子摊开——第 17 轮 20 条全挤在下层中央，
  // 在画面上读成一排红牌子。
  cands.sort((a, z) => z.clear - a.clear)
  const pool = cands.filter((c) => c.clear >= 0.16)
  const chosen: Vec3[] = []
  const taken = new Set<number>()
  if (pool.length) {
    chosen.push(pool[0].p)
    taken.add(0)
  }
  while (chosen.length < 20 && taken.size < pool.length) {
    let bestI = -1
    let bestScore = -Infinity
    for (let i = 0; i < pool.length; i++) {
      if (taken.has(i)) continue
      const c = pool[i]
      // 与已选点最近的距离 + 0.5×自身的空隙：既要散开，也别钻进针叶里
      const d = Math.min(
        ...chosen.map((s) => Math.hypot(s[0] - c.p[0], s[1] - c.p[1], s[2] - c.p[2])),
      )
      const score = d + 0.5 * c.clear
      if (score > bestScore) {
        bestScore = score
        bestI = i
      }
    }
    if (bestI < 0) break
    taken.add(bestI)
    chosen.push(pool[bestI].p)
  }
  return chosen.map((p) => ({ p, yaw: (rnd() - 0.5) * 0.44 }))
}

export const TREE_RIBBON_SPOTS: RibbonSpot3D[] = buildRibbonSpots()

/* ---------------------------------------------------------------- 包围盒 */

function buildBounds(): { top: number; bottom: number; halfWidth: number } {
  let top = TREE_GROUND_Y
  let bottom = TREE_GROUND_Y
  let halfWidth = 0
  for (const t of TREE_TUFTS) {
    top = Math.max(top, t.p[1] + tuftRadius(t))
    bottom = Math.min(bottom, t.p[1] - tuftRadius(t))
    halfWidth = Math.max(halfWidth, Math.hypot(t.p[0], t.p[2]) + tuftRadius(t))
  }
  for (const b of TREE_BOUGHS) {
    for (const p of b.pts) halfWidth = Math.max(halfWidth, Math.hypot(p[0], p[2]) + b.r)
  }
  return { top, bottom: Math.min(bottom, TREE_GROUND_Y), halfWidth }
}

export const TREE_BOUNDS = buildBounds()

/* ------------------------------------------------------------------ 取景 */

/**
 * 相机对准的高度：主体中心（不是 y=0——树的中心在 y≈1.3）
 */
export const TREE_CENTER_Y = (TREE_BOUNDS.top + TREE_BOUNDS.bottom) / 2

/**
 * 把整棵树包进去的球半径（以 TREE_CENTER_Y 为球心，各簇再各自加自己的半径）。
 * 用球而不是包围盒：球的正投影与方位角无关，绕一整圈都不会切边。
 */
export const TREE_SPHERE_R = Math.max(
  ...TREE_TUFTS.map((t) =>
    Math.hypot(t.p[0], t.p[1] - TREE_CENTER_Y, t.p[2]) + tuftRadius(t),
  ),
)

/**
 * 起始相机距离：让半径 TREE_SPHERE_R 的球完整落进画框。
 *
 * 为什么不用 `fitDistance(bounds)`：`fitDistance` 的模型是「竖直圆柱」，
 * 而树最宽的一层在冠的下半部、**离相机更近**；俯视时（phi 小）那几簇会
 * 先出画——实测按圆柱算的距离在 phi=0.62 时 ndc 到 1.26。
 * 球模型与 phi 无关，一圈拖过去都稳。
 *
 *   球心到相机 = R / sin(半视角)，半视角取水平/竖直里较小的那个。
 */
export function fitTreeDistance(aspect: number): number {
  const vHalf = (STAGE_FOV * Math.PI) / 360
  const hHalf = Math.atan(Math.tan(vHalf) * Math.max(0.2, aspect))
  const half = Math.min(vHalf, hHalf)
  return (TREE_SPHERE_R / Math.sin(half)) * 1.02
}
