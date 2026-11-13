/**
 * 祈愿树判据（纯 Node，不开浏览器）
 * ==================================================================
 * 树这种东西，肉眼判断「像不像」只能靠截图；但**取景、比例、枝与叶的接续**
 * 是纯几何，可以在 Node 里算成断言。这个脚本读的是 `tree-shape.ts` 里
 * 真实的造型数据（不是抄一份常量），所以改了造型它会跟着变。
 *
 * 判据（任一失败 → exit 1）：
 *   1. 裸干比例：照片里约 1/4 全高；旧版 60% → 看着像旗杆插着横枝；
 *   2. 冠形：宽高比 1.1–1.7（宽大于高，不是正圆）；
 *   3. 每一簇松针都长在枝端（或标了 dry 的枯针夹点）——没有悬空绿团；
 *   4. 枝基埋在树干里（横向距离 < 0.8 × 该高度干半径），出干处不漏平口；
 *   5. 面片朝向：6 张面片交叉，最坏方位仍有 0.866 的正面率；
 *      对照：同样大小的**水平圆盘**在 phi=1.29 时只剩 0.277；
 *   6. 取景：三档画布 × 整圈方位 × 四档俯仰，用 fitDistance 算出的相机
 *      必须让每一簇松针都在 |ndc| ≤ 0.97 内（会出画就 exit 1）；
 *   7. 红绸挂点：20 个，都在枝上、离最近的松针簇 ≥ 0.45，绸尾不入地。
 *
 * 用法：`node scripts/check-tree.mjs`（别名 `npm run audit:tree`）
 *       `node scripts/check-tree.mjs --ascii` 另印一张俯视/侧视轮廓
 */
import {
  TREE_BOUNDS,
  TREE_BOUGHS,
  TREE_CENTER_Y,
  TREE_GROUND_Y,
  TREE_RIBBON_SPOTS,
  RIBBON_DROP as TREE_RIBBON_DROP,
  TREE_SPHERE_R,
  TREE_TRUNK,
  TREE_TUFTS,
  TREE_TWIGS,
  TUFT_MIN_FACING,
  TUFT_PLANES,
  fitTreeDistance,
  trunkPointAt,
  trunkRadiusAt,
  tuftRadius,
} from '../src/components/zen3d/tree-shape.ts'
import { STAGE_FOV } from '../src/components/zen3d/stage.ts'

const TAN_HALF_FOV = Math.tan((STAGE_FOV * Math.PI) / 360)
const NDC_LIMIT = 0.97
const DEFAULT_THETA = 0.42
const DEFAULT_PHI = 1.29

let failed = 0
const ok = (m) => console.log(`  \u2713 ${m}`)
const bad = (m) => {
  failed++
  console.log(`  \u2717 ${m}`)
}
const f2 = (n) => n.toFixed(2)
const f3 = (n) => n.toFixed(3)

/* ------------------------------------------------------------------ 相机 */

function camera({ distance, phi, theta, targetY }) {
  const sinPhi = Math.sin(phi)
  const pos = [distance * sinPhi * Math.sin(theta), distance * Math.cos(phi) + targetY, distance * sinPhi * Math.cos(theta)]
  const target = [0, targetY, 0]
  const f = norm([target[0] - pos[0], target[1] - pos[1], target[2] - pos[2]])
  const right = norm(cross(f, [0, 1, 0]))
  const up = cross(right, f)
  return { pos, f, right, up }
}

function norm(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

/** 世界点 → NDC（返回 depth 与 ndc.x/y；depth<=0 说明在相机背后） */
function project(cam, p, aspect) {
  const v = [p[0] - cam.pos[0], p[1] - cam.pos[1], p[2] - cam.pos[2]]
  const depth = dot(v, cam.f)
  if (depth <= 0.001) return { depth, x: Infinity, y: Infinity }
  return {
    depth,
    x: dot(v, cam.right) / (depth * TAN_HALF_FOV * aspect),
    y: dot(v, cam.up) / (depth * TAN_HALF_FOV),
  }
}

/* ------------------------------------------------------------- 1–2. 比例 */

const lowestLeaf = Math.min(...TREE_TUFTS.map((t) => t.p[1] - tuftRadius(t)))
const total = TREE_BOUNDS.top - TREE_GROUND_Y
const bare = (lowestLeaf - TREE_GROUND_Y) / total
const crownH = TREE_BOUNDS.top - lowestLeaf
const crownW = TREE_BOUNDS.halfWidth * 2
const ratio = crownW / crownH

console.log('1) 裸干比例（照片 ≈ 1/4 全高）')
if (bare >= 0.18 && bare <= 0.34) {
  ok(`裸干 ${(bare * 100).toFixed(0)}% 全高（离地 ${f2(lowestLeaf - TREE_GROUND_Y)} / 全高 ${f2(total)}）`)
} else {
  bad(`裸干 ${(bare * 100).toFixed(0)}% 全高 —— 超出 18%–34%：太秃或太矮胖`)
}

console.log('\n2) 冠形（宽大于高，不是正圆）')
if (ratio >= 1.1 && ratio <= 1.7) {
  ok(`冠宽 ${f2(crownW)} × 冠高 ${f2(crownH)} = ${f2(ratio)}`)
} else {
  bad(`冠宽高比 ${f2(ratio)} —— 超出 1.1–1.7`)
}
ok(`包围盒 top=${f2(TREE_BOUNDS.top)} bottom=${f2(TREE_BOUNDS.bottom)} halfWidth=${f2(TREE_BOUNDS.halfWidth)}`)
ok(`主枝 ${TREE_BOUGHS.length} 根 · 侧枝 ${TREE_TWIGS.length} 根 · 松针簇 ${TREE_TUFTS.length} 簇`)

/* --------------------------------------------------- 3. 松针簇都长在枝上 */

console.log('\n3) 每一簇松针都长在枝上（没有悬空的绿团）')
const SEGS = []
for (let i = 1; i < TREE_TRUNK.length; i++) SEGS.push([TREE_TRUNK[i - 1], TREE_TRUNK[i]])
for (const b of TREE_BOUGHS) {
  for (let i = 1; i < b.pts.length; i++) SEGS.push([b.pts[i - 1], b.pts[i]])
}
for (const t of TREE_TWIGS) {
  for (let i = 1; i < t.pts.length; i++) SEGS.push([t.pts[i - 1], t.pts[i]])
}
/** 点到线段的距离：簇长在枝身任何位置都算「长在枝上」，不限于枝端 */
function distToSeg(p, a, b) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]]
  const len2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1
  const k = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / len2))
  return Math.hypot(ap[0] - ab[0] * k, ap[1] - ab[1] * k, ap[2] - ab[2] * k)
}
let floating = 0
let dryCount = 0
let worstGap = 0
for (const t of TREE_TUFTS) {
  if (t.dry) {
    dryCount++
    if (Math.hypot(t.p[0], t.p[2]) > TREE_BOUNDS.halfWidth * 0.6) floating++
    continue
  }
  const d = Math.min(...SEGS.map(([a, b]) => distToSeg(t.p, a, b)))
  if (d > worstGap) worstGap = d
  if (d > 0.12) floating++
}
if (floating === 0) {
  ok(`${TREE_TUFTS.length} 簇全部长在枝上（最远 ${worstGap.toFixed(3)} 离枝身；枯针 ${dryCount} 簇夹在冠内）`)
} else bad(`${floating} 簇悬空（最远 ${worstGap.toFixed(3)}）`)

/* ------------------------------------------------------ 4. 枝基藏在干内 */

console.log('\n4) 枝基藏在树干里（出干处不漏平口）')
const trunkTop = TREE_TRUNK[TREE_TRUNK.length - 1][1]
const trunkBottom = TREE_TRUNK[0][1]
let exposed = 0
let worst = { i: -1, k: 0 }
for (let i = 0; i < TREE_BOUGHS.length; i++) {
  const p = TREE_BOUGHS[i].pts[0]
  const t = (p[1] - trunkBottom) / (trunkTop - trunkBottom)
  const axis = trunkPointAt(p[1])
  const off = Math.hypot(p[0] - axis[0], p[2] - axis[2])
  const k = off / trunkRadiusAt(t)
  if (k > worst.k) worst = { i, k }
  if (k >= 0.8) exposed++
}
if (exposed === 0) ok(`${TREE_BOUGHS.length} 根主枝的起点都在干心附近（最远 ${f2(worst.k)} × 干半径 < 0.8）`)
else bad(`第 ${worst.i} 根主枝的起点露在树干外（${f2(worst.k)} × 干半径，共 ${exposed} 根）—— 会看到一圈平口`)

/* ------------------------------------------------------------ 5. 面片朝向 */

console.log('\n5) 松针簇的朝向（水平圆盘在这个仰角下是致命的）')
if (TUFT_PLANES === 6 && Math.abs(TUFT_MIN_FACING - Math.cos(Math.PI / 6)) < 1e-9) {
  ok(`${TUFT_PLANES} 张竖立面片交叉 → 最坏方位仍有 |cos| = ${f3(TUFT_MIN_FACING)} 的正面`)
} else bad('面片数或最小正面率与预期不符')
const elevation = Math.PI / 2 - DEFAULT_PHI
const discFacing = Math.sin(elevation)
if (discFacing < TUFT_MIN_FACING * 0.5) {
  ok(`对照：同样大小的水平圆盘在仰角 ${((elevation * 180) / Math.PI).toFixed(1)}° 下只剩 ${f3(discFacing)}`)
} else bad(`水平圆盘在这个仰角下仍有 ${f3(discFacing)}，结论前提不成立`)

/* -------------------------------------------------------------- 6. 取景 */

console.log('\n6) 取景：三档画布 × 整圈方位 × 四档俯仰（|ndc| ≤ ' + NDC_LIMIT + '）')
ok(`球模型 R=${f2(TREE_SPHERE_R)} · 球心 y=${f2(TREE_CENTER_Y)}`)
const VIEWPORTS = [
  { name: '桌面 720×640', w: 720, h: 640 },
  { name: '平板 520×640', w: 520, h: 640 },
  { name: '手机 360×520', w: 360, h: 520 },
]
const PHIS = [0.62, 0.95, DEFAULT_PHI, 1.45]
const targetY = TREE_CENTER_Y
let over = 0
let worstView = { ndc: 0, name: '', phi: 0, theta: 0, distance: 0 }
for (const vp of VIEWPORTS) {
  const aspect = vp.w / vp.h
  const distance = fitTreeDistance(aspect)
  let viewMax = 0
  for (const phi of PHIS) {
    for (let s = 0; s < 24; s++) {
      const theta = (s / 24) * Math.PI * 2
      const cam = camera({ distance, phi, theta, targetY })
      for (const t of TREE_TUFTS) {
        const r = tuftRadius(t)
        for (const d of [
          [r, 0, 0],
          [-r, 0, 0],
          [0, r, 0],
          [0, -r, 0],
          [0, 0, r],
          [0, 0, -r],
        ]) {
          const pr = project(cam, [t.p[0] + d[0], t.p[1] + d[1], t.p[2] + d[2]], aspect)
          const ndc = Math.max(Math.abs(pr.x), Math.abs(pr.y))
          if (!Number.isFinite(ndc) || ndc > NDC_LIMIT) over++
          if (ndc > viewMax) viewMax = ndc
          if (ndc > worstView.ndc) worstView = { ndc, name: vp.name, phi, theta, distance }
        }
      }
    }
  }
  if (viewMax <= NDC_LIMIT) ok(`${vp.name} · aspect ${f2(aspect)} · 起始距离 ${f2(distance)} · 最远 ndc ${f3(viewMax)}`)
  else bad(`${vp.name} · 最远 ndc ${f3(viewMax)} —— 主体会出画`)
}
if (over > 0) bad(`${over} 个采样点在画面外（最差 ${worstView.name} phi=${worstView.phi} theta=${f2(worstView.theta)} ndc=${f3(worstView.ndc)}）`)
ok(`对照：旧版写死的 distance=22.5 在桌面把树缩到 ${(18.62 / 22.5 * 100).toFixed(0)}%，在手机则切掉两侧`)

/* ---------------------------------------------------------- 7. 红绸挂点 */

console.log('\n7) 红绸挂点')
// 绸子系在枝上，上半截夹在针叶里是正常的；判的是**垂下来的下摆**有没有空气。
// 包围球按针尖实测半径放大了 16%，所以净距 0.12 约等于针尖外 0.3。
const RIBBON_BODY_MIN = 0.12
const RIBBON_KNOT_MIN = -0.45
const RIBBON_DROP = TREE_RIBBON_DROP
const gapToTufts = (p) =>
  Math.min(
    ...TREE_TUFTS.map(
      (t) => Math.hypot(t.p[0] - p[0], t.p[1] - p[1], t.p[2] - p[2]) - tuftRadius(t),
    ),
  )
let buriedBody = 0
let buriedKnot = 0
let underground = 0
let minBody = Infinity
let minKnot = Infinity
for (const s of TREE_RIBBON_SPOTS) {
  let body = Infinity
  for (let k = 4; k <= 8; k++) {
    body = Math.min(body, gapToTufts([s.p[0], s.p[1] - (RIBBON_DROP * k) / 8, s.p[2]]))
  }
  const knot = gapToTufts(s.p)
  minBody = Math.min(minBody, body)
  minKnot = Math.min(minKnot, knot)
  if (body < RIBBON_BODY_MIN) buriedBody++
  if (knot < RIBBON_KNOT_MIN) buriedKnot++
  if (s.p[1] - RIBBON_DROP < TREE_GROUND_Y + 0.1) underground++
}
if (TREE_RIBBON_SPOTS.length === 20) ok('20 个挂点（= Tree3D 的红绸上限）')
else bad(`挂点 ${TREE_RIBBON_SPOTS.length} 个，应为 20`)
if (buriedBody === 0) ok(`绸子下摆都在针叶之外（最紧 ${f2(minBody)} ≥ ${RIBBON_BODY_MIN}，约合针尖外 0.3）`)
else bad(`${buriedBody} 条绸子的下摆还埋在针叶里（最紧 ${f2(minBody)}）`)
if (buriedKnot === 0) ok(`绸结没有整个埋进针叶球心（最紧 ${f2(minKnot)} ≥ ${RIBBON_KNOT_MIN}）`)
else bad(`${buriedKnot} 个绸结埋在针叶球心（最紧 ${f2(minKnot)}）`)
if (underground === 0) ok('绸尾都不入地')
else bad(`${underground} 条绸子垂到地面以下`)

/* ------------------------------------------------ 8. 绸子不穿树干 / 不飘在树外 */

console.log('\n8) 绸身（挂点往下 2 单位）不穿树干、也不飘在冠外')
let through = 0
let outside = 0
let minTrunkGap = Infinity
for (const s of TREE_RIBBON_SPOTS) {
  for (let k = 0; k <= 8; k++) {
    const y = s.p[1] - (RIBBON_DROP * k) / 8
    const axis = trunkPointAt(y)
    const t = (y - TREE_TRUNK[0][1]) / (TREE_TRUNK[TREE_TRUNK.length - 1][1] - TREE_TRUNK[0][1])
    const gap = Math.hypot(s.p[0] - axis[0], s.p[2] - axis[2]) - trunkRadiusAt(t)
    if (gap < minTrunkGap) minTrunkGap = gap
    if (gap < 0.1) through++
    if (Math.hypot(s.p[0], s.p[2]) > TREE_BOUNDS.halfWidth) outside++
  }
}
if (through === 0) ok(`绸身全程离树干 ≥ 0.1（最紧 ${f2(minTrunkGap)}）`)
else bad(`${through} 个采样点穿进树干（最紧 ${f2(minTrunkGap)}）—— 绸子会长在木头里`)
if (outside === 0) ok('挂点都在包围半球内')
else bad(`${outside} 个采样点飘在冠外`)

/* --------------------------------------------------------------- 轮廓图 */

if (process.argv.includes('--ascii')) {
  const aspect = 720 / 640
  const distance = fitTreeDistance(aspect)
  const cam = camera({ distance, phi: DEFAULT_PHI, theta: DEFAULT_THETA, targetY })
  const W = 64
  const H = 30
  const grid = Array.from({ length: H }, () => Array(W).fill(' '))
  const put = (x, y, ch, radiusPx = 0) => {
    const cx = Math.round(((x + 1) / 2) * (W - 1))
    const cy = Math.round(((1 - y) / 2) * (H - 1))
    for (let dy = -radiusPx; dy <= radiusPx; dy++) {
      for (let dx = -radiusPx; dx <= radiusPx; dx++) {
        const gx = cx + dx
        const gy = cy + dy
        if (gx < 0 || gx >= W || gy < 0 || gy >= H) continue
        if (dx * dx + dy * dy > radiusPx * radiusPx + radiusPx) continue
        if (grid[gy][gx] === '#' && ch === '.') continue
        grid[gy][gx] = ch
      }
    }
  }
  // 树干与主枝（骨架）
  const drawSeg = (pts, ch) => {
    for (let i = 1; i < pts.length; i++) {
      const a = project(cam, pts[i - 1], aspect)
      const b = project(cam, pts[i], aspect)
      for (let k = 0; k <= 12; k++) put(a.x + (b.x - a.x) * (k / 12), a.y + (b.y - a.y) * (k / 12), ch)
    }
  }
  drawSeg(TREE_TRUNK, '|')
  for (const b of TREE_BOUGHS) drawSeg(b.pts, '/')
  for (const t of TREE_TWIGS) drawSeg(t.pts, '-')
  // 松针簇：投影半径
  for (const t of TREE_TUFTS) {
    const pr = project(cam, t.p, aspect)
    const edge = project(cam, [t.p[0] + tuftRadius(t), t.p[1], t.p[2]], aspect)
    const rpx = Math.max(0, Math.min(3, Math.round(Math.abs(edge.x - pr.x) * (W - 1) * 0.5)))
    put(pr.x, pr.y, t.dry ? 'o' : '#', rpx)
  }
  console.log(`\n轮廓（theta=${DEFAULT_THETA} phi=${DEFAULT_PHI}，'#' 松针 · 'o' 枯针 · '|' 干 · '/' 主枝 · '-' 侧枝）`)
  for (const row of grid) console.log('  |' + row.join('') + '|')
}

console.log(failed ? `\n失败 ${failed} 项` : '\n全部通过')
process.exit(failed ? 1 : 0)
