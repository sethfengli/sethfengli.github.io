/**
 * 取景自检（**不需要浏览器**）：先算，再决定要不要截图。
 *
 * 由来（第 14 轮）：首页「一炷心香」的 3D 香炉把距离写死成 10，香头在画面外，
 * 而 `tsc` / `vite build` / 所有既有 audit 全绿 —— 只有截图能发现。但截图要完整权限
 * （无头 Chrome 在受限沙箱里 crashpad 起不来），一个「画面对不对」的问题不该每次
 * 都升级权限。取景是纯几何：包围盒 + 视场角 + 画布比例 → NDC 坐标，Node 里就能算。
 *
 * 判据（任一失败 → 退出码 1）：
 *   1. 页面里显式写的 `distance={N}` 不得小于自动取景距离（square canvas 口径）；
 *   2. 每种实际版面里，主体（上下沿 + 最大半径）投影后完整落在画面内（|ndc| ≤ 0.97）；
 *   3. 香头（炭火，`CENSER_TIP`）在画面内且上下各有 ≥5% 余量 —— 这一条就是
 *      「看不到燃烧的香」的最小回归判据；
 *   4. 包围盒上沿比香头再高 ≥0.6 单位（给青烟留白，否则烟被裁成一条硬边）。
 *
 * 局限：算不出「炭火被香灰盖住」这类**几何内部**的遮挡（那需要真的渲染）。所以这个
 * 脚本是「先筛一遍」，肉眼截图仍然留给造型改动；但它能挡住构图回退。
 *
 * 用法：`node scripts/check-framing.mjs`（别名 `npm run audit:framing`）
 */
import fs from 'node:fs'
import path from 'node:path'
import { STAGE_FOV, fitDistance } from '../src/components/zen3d/stage.ts'
import { CENSER_BOUNDS, CENSER_TIP } from '../src/components/zen3d/censer.ts'

/** Incense3D 的极角（见 Incense3D.tsx 的 createStage 调用） */
const PHI = 1.0
const TAN_HALF_FOV = Math.tan((STAGE_FOV * Math.PI) / 360)
const RADIAL_LIMIT = 0.97
const TIP_LIMIT = 0.9
/** 包围盒上沿要比香头再高多少（模型单位）：青烟留白 */
const SMOKE_ROOM = 0.6

const root = process.cwd()
let failed = 0
const ok = (msg) => console.log(`  ✓ ${msg}`)
const bad = (msg) => {
  failed++
  console.log(`  ✗ ${msg}`)
}

const scaled = (b, s) => ({ top: b.top * s, bottom: b.bottom * s, halfWidth: b.halfWidth * s })

/** 把一个竖直点投影成 NDC（y 向）；x 向只取最大半径 */
function projectY(y, targetY, distance) {
  const h = y - targetY
  const depth = distance - h * Math.cos(PHI)
  return { depth, ndc: (h * Math.sin(PHI)) / (depth * TAN_HALF_FOV) }
}

/* ---------- 1. 页面里写死的 distance 不能比自动取景更近 ---------- */
console.log('1) 页面显式 distance vs 自动取景')
const pageDir = path.join(root, 'src/pages')
const declared = []
for (const file of fs.readdirSync(pageDir).filter((f) => f.endsWith('.tsx'))) {
  const src = fs.readFileSync(path.join(pageDir, file), 'utf8')
  for (const m of src.matchAll(/<Incense3D\b([\s\S]*?)\/>/g)) {
    const attrs = m[1]
    const variant = /variant="(\w+)"/.exec(attrs)?.[1] ?? 'sticks'
    const scale = Number(/scale=\{([\d.]+)\}/.exec(attrs)?.[1] ?? 1)
    const dist = /distance=\{([\d.]+)\}/.exec(attrs)
    declared.push({ file, variant, scale, distance: dist ? Number(dist[1]) : null })
    const fitSquare = fitDistance(scaled(CENSER_BOUNDS[variant], scale), { aspect: 1, phi: PHI })
    if (dist) {
      const d = Number(dist[1])
      const label = `${file} · ${variant} · distance=${d}（自动取景 ${fitSquare.toFixed(2)}）`
      if (d + 1e-6 < fitSquare) bad(`${label} —— 比自动取景更近，主体会出画`)
      else ok(label)
    } else {
      ok(`${file} · ${variant} · 未写 distance → 自动取景 ${fitSquare.toFixed(2)}`)
    }
  }
}

/* ---------- 1b. 相机必须对准主体中心 ---------- */
// 历史 bug 的另一半：相机盯 y=0，而主体中心在 y≈2 → 越往上越出画。这里守一下调用形状。
console.log('\n1b) 相机对准主体中心（targetY）')
const incenseSrc = fs.readFileSync(path.join(root, 'src/components/zen3d/Incense3D.tsx'), 'utf8')
if (/targetY/.test(incenseSrc) && /box\.top \+ box\.bottom/.test(incenseSrc)) {
  ok('Incense3D 用 bounds 中心作为 targetY')
} else {
  bad('Incense3D 没把相机对准主体中心（targetY 应来自 rig.bounds）—— 香头会出画')
}

/* ---------- 2. 具体版面：主体是否完整入画 ---------- */
// 画布尺寸来自实测（scripts/shot-gated.mjs 的输出）
const USAGES = [
  { name: '首页 / 桌面 420×420', file: 'Home.tsx', variant: 'sticks', w: 420, h: 420 },
  { name: '首页 / 手机 350×420', file: 'Home.tsx', variant: 'sticks', w: 350, h: 420 },
  { name: '灵签 / 塔香 384×260', file: 'Lots.tsx', variant: 'cone', w: 384, h: 260 },
]

console.log('\n2) 版面取景（NDC，|y| ≤ ' + RADIAL_LIMIT + '）')
for (const u of USAGES) {
  const decl = declared.find((d) => d.file === u.file && d.variant === u.variant)
  const scale = decl?.scale ?? 1
  const bounds = scaled(CENSER_BOUNDS[u.variant], scale)
  const aspect = u.w / u.h
  const fit = fitDistance(bounds, { aspect, phi: PHI })
  const distance = decl?.distance ?? fit
  const targetY = (bounds.top + bounds.bottom) / 2

  const top = projectY(bounds.top, targetY, distance)
  const bottom = projectY(bounds.bottom, targetY, distance)
  const tip = projectY(CENSER_TIP[u.variant] * scale, targetY, distance)
  const sideAt = (depth) => (bounds.halfWidth / (depth * TAN_HALF_FOV * aspect))

  const rim = Math.max(Math.abs(top.ndc), Math.abs(bottom.ndc), sideAt(top.depth), sideAt(bottom.depth))
  const head = `   ${u.name} · r=${distance.toFixed(2)} · 主体边缘 ndc=${rim.toFixed(3)} · 香头 ndc=${tip.ndc.toFixed(3)}`
  if (rim > RADIAL_LIMIT) bad(`${head}\n     主体被裁（限 ${RADIAL_LIMIT}）`)
  else ok(head)

  if (Math.abs(tip.ndc) > TIP_LIMIT) bad(`   ${u.name} · 香头贴边/出画（ndc=${tip.ndc.toFixed(3)}，限 ±${TIP_LIMIT}）`)
  else ok(`   ${u.name} · 香头在画面内且有余量`)

  if (builtinSmokeRoom(u.variant, scale)) ok(`   ${u.name} · 上沿留白 ≥ ${SMOKE_ROOM}`)
  else bad(`   ${u.name} · 包围盒上沿离香头不足 ${SMOKE_ROOM}，青烟会被裁`)
}

function builtinSmokeRoom(variant, scale) {
  return CENSER_BOUNDS[variant].top * scale - CENSER_TIP[variant] * scale >= SMOKE_ROOM
}

console.log(failed ? `\n失败 ${failed} 项` : '\n全部通过')
process.exit(failed ? 1 : 0)
