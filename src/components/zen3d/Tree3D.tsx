import { useEffect, useRef, useState, type ReactNode } from 'react'
import type * as THREE from 'three'
import type { Wish } from '../../lib/wishes'
import { createStage, makeRibbonTexture, type Stage } from './stage'
import { createCenser } from './censer'
import {
  TREE_BOUGHS,
  TREE_CENTER_Y,
  TREE_GROUND_Y,
  TREE_RIBBON_SPOTS,
  TREE_TRUNK,
  TREE_TUFTS,
  TREE_TWIGS,
  TUFT_PLANES,
  fitTreeDistance,
  makeRng,
  trunkRadiusAt,
  type Vec3,
} from './tree-shape'
import { useI18n } from '../../i18n'

/**
 * 3D 祈愿树（v5 · 照着一张真实的松树照片改的）
 *
 * 前几版的症结，逐条对照片改：
 *   ① 树冠是 16 片「水平松云圆盘」——相机常用极角 1.29（仰角 16°），
 *      水平圆盘的投影面积只剩 sin16° ≈ 0.28，越宽的盘越像一条线，
 *      整棵树读成「几片叠起来的绿盘子」。现在改成**松针簇**：每簇
 *      `TUFT_PLANES`=6 张竖立面片交叉，任意方位必有一张正对相机；
 *      贴图是瓶刷状针叶（两份不同的图，避免 200 多簇读成同一个球）。
 *   ② 裸干占全高 60%：照片里只有约 1/4，之后才分叉。现在最低一层枝叶
 *      落在离地 2.8 处（26%），冠高 8.1、冠宽 10.4（宽高比 1.28）。
 *   ③ 树干是亮的暖棕色，而照片是**近黑的深纵裂树皮**（阴面几乎纯黑）。
 *      树皮贴图重画：暗底 + 深裂 + 横向鳞板 + 少量灰褐受光棱。
 *   ④ 粗枝太多、只有一级，针叶只挂在枝头。现在主枝 10 根（上一版 14 根，
 *      半径 0.3 → 0.2 以下），沿**整根**主枝再抽 40 条侧枝、每条侧枝分
 *      2 条小枝，再加 3 条补顶短梢（共 123 条细枝），216 簇松针长在枝上
 *      任意位置而不是只在梢头；另有 3 簇枯针夹在枝杈里（照片里的旧针）。
 *      冠顶三条短梢把主梢收口处的缺口接上，顶心才是圆的，不是一根天线。
 *   ⑤ 相机距离写死 22.5：桌面把树缩到 83%，手机上树冠两侧被切掉。
 *      现在 `fitTreeDistance(aspect)` 按包围球算，整圈拖过去都不出画。
 *
 * 判据（`npm run audit:tree`，纯 Node）：裸干比例、冠宽高比、簇是否长在枝上、
 * 枝基是否埋进干里、面片朝向、三档画布的取景 NDC、红绸挂点与地台。
 * 交互不变：拖拽旋转 / 滚轮缩放，点红绸看心愿、点香炉供香。
 */

interface RibbonRig {
  group: THREE.Group
  segs: THREE.Mesh[]
  /** 空 = 寺院常挂的祈福绸（装饰，不可点） */
  wish?: Wish
  phase: number
  speed: number
  scale: number
}

interface TreeRig {
  ribbons: RibbonRig[]
  canopy: THREE.Group
  censer: import('./censer').CenserRig
}

export interface Props {
  wishes: Wish[]
  onRibbonClick: (w: Wish) => void
  fallback?: ReactNode
}

/**
 * 沿曲线生成变径管：逐环取 Frenet 法向/副法向，半径随参数平滑变化，
 * 并叠加轻微径向凹凸（树皮起伏）。这是替代「圆柱堆叠」的关键。
 */
function taperedTube(
  THREE: typeof import('three'),
  curve: THREE.CatmullRomCurve3,
  radiusAt: (t: number) => number,
  tubular = 36,
  radial = 12,
  ridge = 0.05,
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(tubular, false)
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular
    const p = curve.getPointAt(t)
    const N = frames.normals[i]
    const B = frames.binormals[i]
    const r = Math.max(0.02, radiusAt(t))
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2
      const sn = Math.sin(v)
      const cs = Math.cos(v)
      const nx = cs * N.x + sn * B.x
      const ny = cs * N.y + sn * B.y
      const nz = cs * N.z + sn * B.z
      const k = 1 + Math.sin(v * 3 + t * 17) * ridge + Math.sin(v * 5 - t * 9) * ridge * 0.6
      pos.push(p.x + nx * r * k, p.y + ny * r * k, p.z + nz * r * k)
      uv.push((j / radial) * 2, t * 7)
    }
  }
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j
      const b = a + radial + 1
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/**
 * 树根几何：保持圆管截面，只横向加宽 5%。
 * 不压扁 y —— 压扁会把陡峭的根颈压成「刀刃」，反而更像木板。
 */
function rootGeometry(
  THREE: typeof import('three'),
  curve: THREE.CatmullRomCurve3,
  radiusAt: (t: number) => number,
  tubular = 32,
  radial = 10,
  ridge = 0.09,
): THREE.BufferGeometry {
  const g = taperedTube(THREE, curve, radiusAt, tubular, radial, ridge)
  g.scale(1.05, 1, 1.05)
  g.computeVertexNormals()
  return g
}

/** 路径上的点（用于把树皮纹理沿干长排布，而不是按贴图平铺） */
const toCurve = (THREE: typeof import('three'), pts: number[][]): THREE.CatmullRomCurve3 =>
  new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)))

/**
 * 树皮：照片里的树皮是**近黑的深纵裂 + 横向鳞板**，只在受光的棱上泛灰褐。
 * 上一版是中等暖棕 + 细竖纹，读起来像「木纹塑料管」。
 */
function makeBarkTexture(THREE: typeof import('three')): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 512
  cv.height = 512
  const ctx = cv.getContext('2d')!
  const rnd = makeRng(0x8a17)
  ctx.fillStyle = '#3e352c'
  ctx.fillRect(0, 0, 512, 512)
  // 大块明暗（老树皮的深浅斑）
  for (let i = 0; i < 46; i++) {
    const x = rnd() * 512
    const y = rnd() * 512
    const r = 34 + rnd() * 96
    const g = ctx.createRadialGradient(x, y, 2, x, y, r)
    g.addColorStop(0, rnd() > 0.45 ? 'rgba(18,14,10,0.5)' : 'rgba(122,102,78,0.24)')
    g.addColorStop(1, 'rgba(74,63,52,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // 纵向深裂：宽度不等，走向微弯，阴面几乎纯黑
  for (let i = 0; i < 54; i++) {
    const x = rnd() * 512
    const wide = 2 + rnd() * 7
    ctx.strokeStyle = `rgba(10,8,6,${0.4 + rnd() * 0.45})`
    ctx.lineWidth = wide
    ctx.beginPath()
    ctx.moveTo(x, -10)
    for (let y = 0; y <= 522; y += 18) {
      ctx.lineTo(x + Math.sin(y * 0.014 + i) * 12 + Math.sin(y * 0.05 + i * 3) * 3, y)
    }
    ctx.stroke()
  }
  // 横向鳞板：把长裂切成一块块板，这是松皮和「竖纹木管」的分界
  for (let i = 0; i < 16; i++) {
    const y = rnd() * 512
    const w = 90 + rnd() * 210
    const x = rnd() * 512
    ctx.strokeStyle = `rgba(12,9,7,${0.3 + rnd() * 0.4})`
    ctx.lineWidth = 2 + rnd() * 3
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + w, y + (rnd() - 0.5) * 6)
    ctx.stroke()
  }
  // 受光棱：灰褐、很窄、很淡
  for (let i = 0; i < 44; i++) {
    const x = rnd() * 512
    ctx.strokeStyle = `rgba(150,132,108,${0.06 + rnd() * 0.1})`
    ctx.lineWidth = 1 + rnd() * 2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    for (let y = 0; y <= 512; y += 22) ctx.lineTo(x + Math.sin(y * 0.017 + i * 2) * 8, y)
    ctx.stroke()
  }
  // 节疤
  for (let i = 0; i < 12; i++) {
    const x = rnd() * 512
    const y = rnd() * 512
    ctx.strokeStyle = 'rgba(8,6,4,0.85)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(x, y, 12 + rnd() * 24, 6 + rnd() * 12, rnd() * 3, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(46,34,22,0.6)'
    ctx.beginPath()
    ctx.ellipse(x, y, 7 + rnd() * 12, 3 + rnd() * 6, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  return tex
}

/** 树皮凹凸（只画裂纹明暗） */
function makeBarkBump(THREE: typeof import('three')): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 256
  cv.height = 256
  const ctx = cv.getContext('2d')!
  const rnd = makeRng(0x51fe)
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 90; i++) {
    const x = rnd() * 256
    ctx.strokeStyle = `rgba(36,36,36,${0.45 + rnd() * 0.35})`
    ctx.lineWidth = 1.5 + rnd() * 5
    ctx.beginPath()
    ctx.moveTo(x, -6)
    for (let y = 0; y <= 262; y += 16) ctx.lineTo(x + Math.sin(y * 0.02 + i) * 7, y)
    ctx.stroke()
  }
  for (let i = 0; i < 40; i++) {
    const y = rnd() * 256
    ctx.strokeStyle = `rgba(30,30,30,${0.3 + rnd() * 0.3})`
    ctx.lineWidth = 1.5 + rnd() * 2.5
    ctx.beginPath()
    ctx.moveTo(rnd() * 256, y)
    ctx.lineTo(rnd() * 256, y + (rnd() - 0.5) * 5)
    ctx.stroke()
  }
  for (let i = 0; i < 40; i++) {
    const x = rnd() * 256
    ctx.strokeStyle = `rgba(184,184,184,${0.2 + rnd() * 0.25})`
    ctx.lineWidth = 1 + rnd() * 2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    for (let y = 0; y <= 256; y += 22) ctx.lineTo(x + Math.sin(y * 0.025 + i * 2) * 5, y)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

/**
 * 松针簇贴图：从一个芽点甩出九束**针叶小枝**（瓶刷状），不是一张圆盘织纹。
 *
 * 四条硬约束（都是算出来的，不是猜的）：
 *   ① 轮廓不能是圆的：径向等长的星形，6 张面片交叉后就是一个绿球，
 *      正是一开始被用户否掉的「绿色风车/刺球」。所以每束的长短差 3 倍，
 *      外缘参差；再叠加实例的非等比缩放，同一个贴图也不会重复成球。
 *   ② 远看不能消失：屏幕上 1.5 单位的簇约 70px，512² 贴图被压到 mip≈2.9
 *      （16×16 平均）。alphaTest 是**二值**的，平均 alpha 低于阈值就整片没了。
 *      中段（r≈150px）覆盖率约 36%，平均 alpha ≈ 0.7 → 0.25 > 0.18 的阈值，
 *      远看留下毛边的团块；外缘覆盖 ≈ 15% → 0.10 被裁掉，正好收成不规则轮廓。
 *   ③ 近看要有针：每束 30 根、针宽 2.2–4.4px，缩到贴图边缘仍有 1px 以上。
 *   ④ 中段要**透**：整簇画满就是一朵绿云（第 18 轮截图里的「扇贝/西兰花」）。
 *      画完用 destination-out 在 r≈40–190 处啃掉十几个软洞，针叶之间才露得出
 *      背景——远看是蓬松的长针，不是一块实心色。
 */
function makeTuftTexture(THREE: typeof import('three'), seed: number): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 512
  cv.height = 512
  const ctx = cv.getContext('2d')!
  const rnd = makeRng(seed)
  const cx = 256
  const cy = 256
  ctx.clearRect(0, 0, 512, 512)
  ctx.lineCap = 'round'
  // 芽点：一点密核，给簇体积，避免「空心光盘」
  const core = ctx.createRadialGradient(cx, cy, 2, cx, cy, 96)
  core.addColorStop(0, 'rgba(255,255,255,0.7)')
  core.addColorStop(0.5, 'rgba(255,255,255,0.34)')
  core.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(cx, cy, 88, 0, Math.PI * 2)
  ctx.fill()

  // 9 束针叶小枝：每束一条短枝 + 30 根从枝上斜出的针。
  // 试过「每根针自己挑方向」的均匀分布，结果每簇变成一个刺球
  // （正是第 11 轮被否掉的「绿色风车」）；成束画才有松针的方向感，
  // 束与束之间留 ±0.3 rad 的空隙，远看才不会糊成一块绿。
  for (let s = 0; s < 9; s++) {
    const a = (s / 9) * Math.PI * 2 + (rnd() - 0.5) * 0.34
    const reach = 92 + rnd() * 156
    const shoot = 6 + rnd() * 24
    const arc = reach * 0.44
    // 短枝（深一号的枝影）
    ctx.strokeStyle = 'rgba(150,162,150,0.55)'
    ctx.lineWidth = 3.2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(a) * arc, cy + Math.sin(a) * arc)
    ctx.stroke()
    for (let k = 0; k < 30; k++) {
      const along = 0.1 + Math.pow(k / 29, 0.7) * 0.88
      const px = cx + Math.cos(a) * arc * along
      const py = cy + Math.sin(a) * arc * along
      const side = k % 2 === 0 ? 1 : -1
      const spread = side * (0.1 + rnd() * 0.3)
      const len = reach * (0.36 + (1 - along) * 0.64) * (0.7 + rnd() * 0.55)
      const na = a + spread
      const ex = px + Math.cos(na) * len
      const ey = py + Math.sin(na) * len
      const mx = px + Math.cos(na - 0.09 * side) * len * 0.55
      const my = py + Math.sin(na - 0.09 * side) * len * 0.55
      const dark = rnd() > 0.66
      ctx.strokeStyle = dark
        ? `rgba(176,188,176,${0.26 + rnd() * 0.26})`
        : `rgba(255,255,255,${0.55 + rnd() * 0.42})`
      ctx.lineWidth = (dark ? 2.6 : 2.8) + rnd() * 2.2
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.quadraticCurveTo(mx, my, ex, ey)
      ctx.stroke()
    }
    for (let k = 0; k < 3; k++) {
      const na = a + (rnd() - 0.5) * 0.42
      const len = reach * (0.92 + rnd() * 0.38)
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + rnd() * 0.3})`
      ctx.lineWidth = 1.6 + rnd() * 1.2
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * shoot, cy + Math.sin(a) * shoot)
      ctx.quadraticCurveTo(
        cx + Math.cos(na) * len * 0.6,
        cy + Math.sin(na) * len * 0.6,
        cx + Math.cos(na) * len,
        cy + Math.sin(na) * len,
      )
      ctx.stroke()
    }
  }
  // 透光洞：软边 destination-out，把实心处啃出空隙（针叶之间露出背景）
  ctx.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 7; i++) {
    const a = rnd() * Math.PI * 2
    const r = 60 + Math.pow(rnd(), 0.7) * 100
    const px = cx + Math.cos(a) * r
    const py = cy + Math.sin(a) * r
    const rad = 10 + rnd() * 16
    const g = ctx.createRadialGradient(px, py, 0, px, py, rad)
    g.addColorStop(0, 'rgba(0,0,0,0.9)')
    g.addColorStop(0.6, 'rgba(0,0,0,0.5)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(px, py, rad, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** 飘落的松针（三针一簇，小片透明贴图） */
function makeFallingNeedles(THREE: typeof import('three')): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 64
  cv.height = 64
  const ctx = cv.getContext('2d')!
  ctx.clearRect(0, 0, 64, 64)
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 1.4
  ctx.lineCap = 'round'
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.42
    ctx.beginPath()
    ctx.moveTo(32, 54)
    ctx.quadraticCurveTo(32 + Math.cos(a) * 12, 40, 32 + Math.cos(a) * 26, 52 - i * 5)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* ------------------------------------------------------------------
   树脚 · 坡脚 / 根盘
   ------------------------------------------------------------------
   树干从一圈有起伏的低矮土坡里长出来，而不是从一个水平切面上「插」着：

   - 高度场 moundHeightAt()：中心隆起、向外 1.65 次方衰减，外缘精确回到
     地台 y；再叠加一圈很轻的角向起伏，使坡脚不对称、不机械。
   - 树心处压出一个浅盆（basin），树干从盆里长出，不会浮在坡面上。
   - 坡面用 alphaMap 径向淡出，边缘融进淡墨地台，任何主题下都不出现
     「一块绿圆盘」的硬边。
   - 根盘 = 4 条从树干高处斜下、贴着坡面走的**粗板根** + 1 条越过坡沿的**长根**，
     全部用 taperedTube 生成，根部粗、末端细，末端钻进土里。
   ------------------------------------------------------------------ */
const GROUND_Y = TREE_GROUND_Y
const MOUND_R = 2.2
const MOUND_H = 0.34

/** 坡面高度：中心高、外缘回到地台；树心处再压出一个浅盆 */
function moundHeightAt(x: number, z: number): number {
  const r = Math.hypot(x, z)
  if (r >= MOUND_R) return GROUND_Y
  const t = Math.atan2(z, x)
  const k = 1 - r / MOUND_R
  // 相机在右前方（theta≈0.42）：把坡面向相机一侧放低，坡背抬高。
  // 这样从默认视角看过去，根盘是「露在坡上」的，而不是被土包埋住。
  const front = Math.max(0, Math.cos(t - 0.42))
  const swell = 1 - 0.55 * front * (1 - k)
  const ripple = 1 + 0.05 * Math.sin(t * 5 + 1.2) * k
  const basin = -0.04 * Math.exp(-Math.pow(r / 0.75, 2))
  // 坡背再鼓一小片，让等高线不是同心圆
  const lobe = 0.16 * Math.exp(-Math.pow((x + 1.4) / 1.1, 2) - Math.pow((z + 0.8) / 1.2, 2))
  return GROUND_Y + MOUND_H * Math.pow(k, 1.55) * swell * ripple + basin + lobe
}

/** 坡面网格：中心 + 20 圈 × 112 段；外圈高度精确落回地台，避免接缝 */
function makeMoundGeometry(THREE: typeof import('three')): THREE.BufferGeometry {
  const RINGS = 20
  const SEGS = 112
  const pos: number[] = [0, moundHeightAt(0, 0), 0]
  const uv: number[] = [0.5, 0.5]
  const col: number[] = []
  const c = new THREE.Color()

  const pushColor = (x: number, z: number) => {
    const y = moundHeightAt(x, z)
    const r = Math.hypot(x, z)
    const top = Math.min(1, Math.max(0, (y - GROUND_Y) / MOUND_H))
    // 坡顶亮、坡脚暗；树心再压一道接触阴影，树干才「坐」得实
    let shade = 0.86 + 0.14 * Math.pow(top, 0.5)
    shade *= 0.7 + 0.3 * Math.min(1, r / 1.1)
    const warm = 1 + 0.04 * Math.sin(x * 1.7 + z * 2.3)
    c.setRGB(Math.min(1, shade * warm), shade, shade * 0.96)
    col.push(c.r, c.g, c.b)
  }
  pushColor(0, 0)

  for (let ring = 1; ring <= RINGS; ring++) {
    const edge = ring / RINGS
    const radius = MOUND_R * edge
    for (let j = 0; j < SEGS; j++) {
      const t = (j / SEGS) * Math.PI * 2
      // 角向轻微不圆：外圈衰减到 0，边缘仍是干净的地台
      const wob = 1 + (0.035 * Math.sin(t * 5 + 0.7) + 0.018 * Math.sin(t * 9 - 0.4)) * (1 - edge)
      const x = Math.cos(t) * radius * wob
      const z = Math.sin(t) * radius * wob
      const y = edge === 1 ? GROUND_Y - 0.004 : moundHeightAt(x, z)
      pos.push(x, y, z)
      uv.push(x / (2 * MOUND_R) + 0.5, z / (2 * MOUND_R) + 0.5)
      pushColor(x, z)
    }
  }

  const idx: number[] = []
  // 中心扇面（朝上）
  for (let j = 0; j < SEGS; j++) {
    const a = 1 + j
    const b = 1 + ((j + 1) % SEGS)
    idx.push(0, b, a)
  }
  // 环与环之间
  for (let ring = 1; ring < RINGS; ring++) {
    const start = 1 + (ring - 1) * SEGS
    const next = start + SEGS
    for (let j = 0; j < SEGS; j++) {
      const a = start + j
      const b = start + ((j + 1) % SEGS)
      const cc = next + j
      const d = next + ((j + 1) % SEGS)
      idx.push(a, b, cc, b, d, cc)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** 坡面颜色：树心是裸土，往外转苔绿，坡沿再淡下去；一张径向贴图解决「一堆土」 */
function makeMoundTexture(THREE: typeof import('three')): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 512
  cv.height = 512
  const ctx = cv.getContext('2d')!
  const rnd = makeRng(0x7b21)
  const g = ctx.createRadialGradient(256, 256, 10, 256, 256, 256)
  g.addColorStop(0, '#5c4f3d')
  g.addColorStop(0.3, '#657450')
  g.addColorStop(0.56, '#76855f')
  g.addColorStop(0.82, '#87967a')
  g.addColorStop(0.9, '#93a184')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 512)

  // 苔痕 / 土斑：越靠外越偏绿，越靠内越偏褐
  const tones = ['#5a4a35', '#84926f', '#63785a', '#98a58a', '#6b5a45']
  for (let i = 0; i < 110; i++) {
    const a = rnd() * Math.PI * 2
    const rr = Math.pow(rnd(), 0.6) * 240
    const x = 256 + Math.cos(a) * rr
    const y = 256 + Math.sin(a) * rr
    const rad = 12 + rnd() * 58
    const tone = tones[Math.floor(rnd() * tones.length)]
    const tg = ctx.createRadialGradient(x, y, 1, x, y, rad)
    tg.addColorStop(0, `${tone}aa`)
    tg.addColorStop(1, `${tone}00`)
    ctx.fillStyle = tg
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
  for (let i = 0; i < 900; i++) {
    const x = 12 + rnd() * 488
    const y = 12 + rnd() * 488
    const s = 0.7 + rnd() * 1.8
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(38,52,38,0.3)' : 'rgba(120,134,108,0.28)'
    ctx.beginPath()
    ctx.arc(x, y, s, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.anisotropy = 4
  return tex
}

/** 坡面 alpha：中心不透明，外缘慢慢淡出；再用几十个黑斑咬出不规则边 */
function makeMoundAlpha(THREE: typeof import('three')): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 256
  cv.height = 256
  const ctx = cv.getContext('2d')!
  const rnd = makeRng(0x2d43)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, 256, 256)
  const g = ctx.createRadialGradient(128, 128, 32, 128, 128, 128)
  g.addColorStop(0, '#fff')
  g.addColorStop(0.46, '#fff')
  g.addColorStop(0.74, '#c8c8c8')
  g.addColorStop(0.92, '#4a4a4a')
  g.addColorStop(1, '#000')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(128, 128, 128, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2
    const r = 92 + rnd() * 44
    const x = 128 + Math.cos(a) * r
    const y = 128 + Math.sin(a) * r
    const rr = 6 + rnd() * 20
    const bg = ctx.createRadialGradient(x, y, 0, x, y, rr)
    bg.addColorStop(0, 'rgba(0,0,0,0.8)')
    bg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.arc(x, y, rr, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

export function Tree3D({ wishes, onRibbonClick, fallback }: Props) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<Stage | null>(null)
  const rigRef = useRef<TreeRig | null>(null)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false
    let stage: Stage | null = null

    void import('three').then((THREE) => {
      if (disposed || !canvas.isConnected) return
      // 取景按画布比例算（桌面 18.6 / 手机 26.0）：写死 22.5 时桌面偏小、手机切边。
      const parent = canvas.parentElement
      const aspect = parent && parent.clientHeight ? parent.clientWidth / parent.clientHeight : 1
      const fit = fitTreeDistance(aspect)
      try {
        stage = createStage(THREE, canvas, {
          distance: fit,
          autoRotate: 0,
          theta: 0.42,
          phi: 1.29,
          targetY: TREE_CENTER_Y,
          minPhi: 0.62,
          maxPhi: 1.5,
          minDistance: Math.max(5, fit * 0.45),
          maxDistance: fit,
          lightPosition: [7, 11, 6],
          hemiIntensity: 0.95,
        })
        stageRef.current = stage
      } catch {
        setFailed(true)
        return
      }
      const S = stage.scene
      const rnd = makeRng(0x9f31)

      // 树脚补一盏低处暖光：不让根盘永远陷在树冠与树干的影子里
      const baseFill = new THREE.PointLight(0xffd9a8, 7, 10, 2)
      baseFill.position.set(2.4, -2.9, 3.6)
      S.add(baseFill)

      /* ---------- 地面：淡墨地台 + 坡脚（土坡与地台同高收边） ---------- */
      stage.addInkGround({ radius: 9, y: GROUND_Y, opacity: 1 })

      const mound = new THREE.Mesh(makeMoundGeometry(THREE), new THREE.MeshStandardMaterial({
        map: makeMoundTexture(THREE),
        alphaMap: makeMoundAlpha(THREE),
        transparent: true,
        depthWrite: true,
        roughness: 1,
        metalness: 0,
        vertexColors: true,
      }))
      mound.receiveShadow = true
      S.add(mound)

      // 坡面苔点：按坡面高度落位，不再平铺在 y=-4.47 的平面上
      const mossMats = [0x5a7a5e, 0x6b8a6a, 0x4c6a50].map(
        (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.98 }),
      )
      for (let i = 0; i < 16; i++) {
        const a = rnd() * Math.PI * 2
        const r = 0.5 + rnd() * 1.8
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        const s = 0.03 + rnd() * 0.05
        const moss = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), mossMats[i % mossMats.length])
        moss.position.set(x, moundHeightAt(x, z) + s * 0.2, z)
        moss.scale.set(1, 0.38, 1)
        S.add(moss)
      }

      // 半埋的坡脚石：只留三块，颜色压暗，主要用来「咬住」坡脚
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7d8776, roughness: 1 })
      const stones: Array<[number, number, number, number]> = [
        [1.6, 0.6, 0.4, 0.3],
        [-1.55, -0.7, 0.34, 0.22],
        [0.7, -1.5, 0.28, 0.4],
      ]
      for (const [x, z, s, expose] of stones) {
        const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), stoneMat)
        rock.position.set(x, moundHeightAt(x, z) + s * (0.02 + 0.28 * expose), z)
        rock.scale.set(1.15, 0.58, 0.95)
        rock.rotation.set(rnd(), rnd(), rnd())
        rock.castShadow = true
        rock.receiveShadow = true
        S.add(rock)
      }

      // 坡脚草：几撮细叶，柔化土坡与地台的交界
      const grassMat = new THREE.MeshStandardMaterial({ color: 0x8fa47c, roughness: 0.95 })
      for (let i = 0; i < 70; i++) {
        const a = rnd() * Math.PI * 2
        const r = 1.1 + rnd() * 1.85
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        const h = 0.2 + rnd() * 0.32
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.035, h, 4), grassMat)
        blade.position.set(x, moundHeightAt(x, z) + h / 2 - 0.01, z)
        blade.rotation.z = (rnd() - 0.5) * 0.5
        blade.rotation.x = (rnd() - 0.5) * 0.4
        S.add(blade)
      }

      /* ---------- 材质 ---------- */
      const barkTex = makeBarkTexture(THREE)
      const barkBump = makeBarkBump(THREE)
      const bark = new THREE.MeshStandardMaterial({
        map: barkTex,
        bumpMap: barkBump,
        bumpScale: 0.85,
        roughness: 0.94,
        color: 0xffffff,
      })
      // 露出的板根比主干浅一度：既从阴影里「剥」得出来，也像被风雨洗白的木质
      const rootBark = bark.clone()
      // 树皮贴图本身很暗，根的材料色要调亮，否则在阴影里糊成一根黑管
      rootBark.color.setHex(0xd9c6a8)
      rootBark.roughness = 0.92
      // 4 个色阶：深绿（冠内/低位）→ 中绿 → 受光亮绿 → 枯针（照片里的旧针）
      const TUFT_TONES = [0x244034, 0x3a5f4e, 0x527663, 0x7a6242]
      // 两份针叶贴图：同一张放在 174 个簇上会看出「同一个球」的重复感
      const tuftTexA = makeTuftTexture(THREE, 0x3c9d)
      const tuftTexB = makeTuftTexture(THREE, 0x51b7)
      const tuftMats = TUFT_TONES.map(
        (color, i) =>
          new THREE.MeshStandardMaterial({
            map: i < 2 ? tuftTexA : tuftTexB,
            color,
            // 0.18 是把贴图的 mip 覆盖率算进去之后定的：再高，远看的簇会被整片裁掉
            alphaTest: 0.18,
            side: THREE.DoubleSide,
            roughness: 0.92,
            metalness: 0,
          }),
      )

      /* ---------- 树干：一条微弯的曲线 + 变径管（起点埋在坡面以下） ---------- */
      const trunkCurve = toCurve(THREE, TREE_TRUNK)
      const trunk = new THREE.Mesh(
        taperedTube(THREE, trunkCurve, trunkRadiusAt, 44, 16, 0.05),
        bark,
      )
      trunk.castShadow = true
      trunk.receiveShadow = true
      S.add(trunk)

      // 板根在树干上的「脊」：从胸径以下纵向鼓出，再没入坡面，
      // 根盘才像从树干长出来的，而不是在树脚插了一圈木棍。
      for (const a of [0.55, 2.4, 4.35]) {
        const finPts = [
          new THREE.Vector3(Math.cos(a) * 0.95, -2.35, Math.sin(a) * 0.95),
          new THREE.Vector3(Math.cos(a + 0.04) * 1.1, -2.95, Math.sin(a + 0.04) * 1.1),
          new THREE.Vector3(Math.cos(a + 0.08) * 1.26, -3.5, Math.sin(a + 0.08) * 1.26),
          new THREE.Vector3(Math.cos(a + 0.1) * 1.55, -3.88, Math.sin(a + 0.1) * 1.55),
        ]
        const fin = new THREE.Mesh(
          taperedTube(THREE, new THREE.CatmullRomCurve3(finPts), (t) => 0.08 + 0.14 * t, 24, 8, 0.07),
          bark,
        )
        fin.castShadow = false
        S.add(fin)
      }

      /* ---------- 根盘：4 条粗板根 + 1 条长根，沿坡面铺开 ---------- */
      // 根不投影：低角度下根的投影会变成一片片「叶状黑影」，
      // 反而看不出圆根；接地感交给坡面自身的受影与苔石。
      const rootPoint = (a: number, r: number, lift: number) => {
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        return new THREE.Vector3(x, moundHeightAt(x, z) + lift, z)
      }
      const buttress = [
        { a: 0.2, len: 1.35, thick: 0.3, sway: 0.14, startY: -3.62 },
        { a: 2.7, len: 1.2, thick: 0.26, sway: -0.18, startY: -3.66 },
      ]
      for (const spec of buttress) {
        const { a, len, thick, sway, startY } = spec
        const p0 = new THREE.Vector3(Math.cos(a) * 0.95, startY, Math.sin(a) * 0.95)
        const p1 = rootPoint(a, 1.5, 0.3)
        const p2 = rootPoint(a + sway * 0.5, 2.0, 0.2)
        const p3 = rootPoint(a + sway, 2.45, 0.05)
        const p4 = rootPoint(a + sway * 1.2, len, -0.4)
        const root = new THREE.Mesh(
          rootGeometry(
            THREE,
            new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4]),
            (t) => thick * Math.pow(1 - t, 0.7) + 0.035,
            32,
            10,
            0.11,
          ),
          rootBark,
        )
        root.castShadow = false
        root.receiveShadow = true
        S.add(root)
      }

      // 树瘤：只留两颗小的，压在胸径以下。
      // 上一版 7 颗、最大 0.34 —— 在低角度下成了两个黑圆斑，像虫眼。
      for (let i = 0; i < 2; i++) {
        const t = 0.1 + i * 0.06
        const p = trunkCurve.getPointAt(t)
        const a = 2.1 + i * 2.4
        const rr = trunkRadiusAt(t) * 0.9
        const burl = new THREE.Mesh(new THREE.SphereGeometry(0.1 + i * 0.03, 10, 8), bark)
        burl.scale.set(1, 0.6, 1)
        burl.position.set(p.x + Math.cos(a) * rr, p.y, p.z + Math.sin(a) * rr)
        S.add(burl)
      }

      /* ---------- 主枝 / 侧枝：枝基退进干内、出干处一道「枝领」 ----------
       * 每根主枝（TREE_BOUGHS）的前两个控制点都落在树干轴线附近：t=0 的截面
       * 埋在树干内部，第三点才从树皮里拱出来，所以看不到平口；
       * `collar` 让枝基略鼓，出干处是一道自然的鼓包。
       */
      const addCurve = (
        pts: Vec3[],
        radiusAt: (t: number) => number,
        tubular: number,
        radial: number,
      ) => {
        const mesh = new THREE.Mesh(
          taperedTube(THREE, toCurve(THREE, pts), radiusAt, tubular, radial, 0.07),
          bark,
        )
        mesh.castShadow = true
        mesh.receiveShadow = true
        S.add(mesh)
      }
      for (const bough of TREE_BOUGHS) {
        const collar = (t: number) => bough.collar * Math.pow(Math.max(0, 1 - t / 0.4), 2)
        addCurve(bough.pts, (t) => bough.r * (1 - t * 0.82) + 0.03 + collar(t), 30, 9)
      }
      for (const twig of TREE_TWIGS) {
        addCurve(twig.pts, (t) => twig.r * (1 - t * 0.85) + 0.012, 12, 6)
      }

      /* ---------- 松针簇：6 张竖立面片交叉（InstancedMesh，4 个 draw call） ----------
       * 旧的「水平圆盘云片」在 phi≈1.29（仰角 16°）下投影只剩 0.28，
       * 宽盘会缩成一条线；竖立面片交叉后任意方位都有 0.866 以上的正面。
       */
      const canopy = new THREE.Group()
      const buckets: THREE.Matrix4[][] = [[], [], [], []]
      const dummy = new THREE.Object3D()
      for (const tuft of TREE_TUFTS) {
        const seed = Math.abs(Math.round(tuft.p[0] * 977 + tuft.p[1] * 613 + tuft.p[2] * 331))
        const r = makeRng(seed)
        // 朝向随位置旋转：相邻簇的面片不共面，看过去才不是「一叠卡片」
        const baseYaw = tuft.p[0] * 0.7 + tuft.p[2] * 0.35
        for (let k = 0; k < TUFT_PLANES; k++) {
          const yaw = baseYaw + (k / TUFT_PLANES) * Math.PI * 2 + (r() - 0.5) * 0.16
          const tilt = (r() - 0.5) * 0.5
          const roll = (r() - 0.5) * 0.6
          const sc = tuft.s * (0.88 + r() * 0.24)
          dummy.position.set(
            tuft.p[0] + (r() - 0.5) * tuft.s * 0.16,
            tuft.p[1] + (r() - 0.5) * tuft.s * 0.16,
            tuft.p[2] + (r() - 0.5) * tuft.s * 0.16,
          )
          dummy.rotation.set(tilt, yaw, roll, 'YXZ')
          // 非等比：同一张贴图换个长宽比，簇就不会重复成「同一个绿球」
          dummy.scale.set(sc * (0.86 + r() * 0.28), sc * (0.86 + r() * 0.28), sc)
          dummy.updateMatrix()
          buckets[tuft.tone].push(dummy.matrix.clone())
        }
      }
      const plane = new THREE.PlaneGeometry(1, 1)
      buckets.forEach((mats, tone) => {
        if (mats.length === 0) return
        const inst = new THREE.InstancedMesh(plane, tuftMats[tone], mats.length)
        mats.forEach((m, i) => inst.setMatrixAt(i, m))
        inst.instanceMatrix.needsUpdate = true
        inst.receiveShadow = true
        inst.frustumCulled = false
        inst.computeBoundingSphere()
        canopy.add(inst)
      })
      S.add(canopy)

      /* ---------- 香炉（树下） ---------- */
      const { group: censerGroup, rig: censerRig } = createCenser(THREE, 'coil', 0.34)
      censerGroup.position.set(4.4, -4.5, 1.5)
      S.add(censerGroup)

      const rig: TreeRig = {
        ribbons: [],
        canopy,
        censer: censerRig,
      }
      rigRef.current = rig

      /* ---------- 飘落松针 ---------- */
      const needleSprite = makeFallingNeedles(THREE)
      const petals: Array<{ s: THREE.Sprite; speed: number; phase: number; sway: number }> = []
      for (let i = 0; i < 18; i++) {
        const mat = new THREE.SpriteMaterial({
          map: needleSprite,
          color: 0x8fae9d,
          transparent: true,
          depthWrite: false,
          opacity: 0.55,
        })
        const s = new THREE.Sprite(mat)
        s.scale.setScalar(0.32 + rnd() * 0.22)
        S.add(s)
        petals.push({
          s,
          speed: 0.32 + rnd() * 0.4,
          phase: rnd() * Math.PI * 2,
          sway: 3 + rnd() * 4,
        })
      }

      /* ---------- 拾取 ---------- */
      stage.setPick(
        () => [...rig.ribbons.filter((r) => r.wish).map((r) => r.group), censerGroup],
        (obj) => {
          if (!obj) return
          let cur: THREE.Object3D | null = obj
          while (cur) {
            const w = cur.userData?.wish as Wish | undefined
            if (w) {
              onRibbonClick(w)
              return
            }
            cur = cur.parent
          }
          if (obj === censerGroup || obj.parent === censerGroup) rig.censer.lit = true
        },
      )

      /* ---------- 帧动画 ---------- */
      const wind = () => Math.sin(performance.now() * 0.0005) * 0.5 + Math.sin(performance.now() * 0.00013) * 0.5
      const cam = stage.camera
      stage.onFrame((dt, t) => {
        const gust = 1 + wind() * 0.7
        // 绸子是薄片：转到侧面就成一条线，绕到背面文字还会镜像。
        // 所以整条绸子逐帧绕 y 朝向相机（只转 y，仍垂在枝下），再叠一点摆动。
        const camAz = Math.atan2(cam.position.x, cam.position.z)
        for (const r of rig.ribbons) {
          for (let i = 0; i < r.segs.length; i++) {
            const amp = (0.045 + i * 0.075) * gust * r.scale
            // 静止时也给一点「折」，绸面才不是三块直板
            const bend = [0.07, -0.05, 0.09][i] * r.scale
            r.segs[i].rotation.x = bend + Math.sin(t * r.speed + r.phase + i * 0.7) * amp
            r.segs[i].rotation.z = Math.cos(t * r.speed * 0.8 + r.phase * 1.3 + i * 0.5) * amp * 0.45
          }
          r.group.rotation.y = camAz + r.group.userData.baseRot + Math.sin(t * 0.55 + r.phase) * 0.06
        }
        canopy.rotation.y = Math.sin(t * 0.22) * 0.012
        canopy.rotation.x = Math.sin(t * 0.18) * 0.006
        rig.censer.update(dt, t)
        for (const p of petals) {
          p.s.position.y -= p.speed * dt
          p.s.position.x += Math.sin(t * 1.2 + p.phase + p.s.position.y * 0.8) * dt * p.sway * 0.1
          p.s.position.z += Math.cos(t * 1.0 + p.phase * 1.4 + p.s.position.y * 0.7) * dt * p.sway * 0.09
          ;(p.s.material as THREE.SpriteMaterial).opacity = 0.5 * Math.min(1, (p.s.position.y + 6) / 3)
          if (p.s.position.y < -4.3) {
            const a = rnd() * Math.PI * 2
            const rr = 1.4 + rnd() * 4.2
            p.s.position.set(Math.cos(a) * rr, 7.4 + rnd() * 1.4, Math.sin(a) * rr)
          }
        }
      })

      setReady(true)
    })

    return () => {
      disposed = true
      stage?.dispose()
      rigRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- 飘带重建（心愿变化 / 场景就绪） ---------- */
  useEffect(() => {
    const stage = stageRef.current
    const rig = rigRef.current
    if (!ready || !stage || !rig) return
    void import('three').then((THREE) => {
      const S = stage.scene
      for (const r of rig.ribbons) {
        S.remove(r.group)
        for (const seg of r.segs) (seg.material as THREE.Material).dispose()
      }
      rig.ribbons = []
      const knotMat = new THREE.MeshStandardMaterial({ color: 0xc9a75e, metalness: 0.6, roughness: 0.4 })

      /** 生成一条飘带；wish 为空表示「寺院常挂的祈福绸」，不可点 */
      const spawn = (text: string, spot: (typeof TREE_RIBBON_SPOTS)[number], i: number, wish?: Wish) => {
        const shade = i % 3
        const scale = 0.86 + ((i * 37) % 10) / 26
        const group = new THREE.Group()
        group.position.set(spot.p[0], spot.p[1], spot.p[2])
        group.rotation.y = spot.yaw
        group.userData.baseRot = spot.yaw
        if (wish) group.userData.wish = wish
        const knot = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 8, 16), knotMat)
        knot.rotation.x = Math.PI / 2
        knot.position.y = -0.17
        group.add(knot)
        const texBase = makeRibbonTexture(THREE, text, shade)
        const segs: THREE.Mesh[] = []
        const segDefs = [
          { off: 0.0, rep: 0.42, h: 0.72 },
          { off: 0.4, rep: 0.34, h: 0.66 },
          { off: 0.74, rep: 0.26, h: 0.6 },
        ]
        let yTop = -0.2
        for (const d of segDefs) {
          const tex = texBase.clone()
          tex.wrapS = THREE.RepeatWrapping
          tex.wrapT = THREE.RepeatWrapping
          tex.offset.set(0, d.off)
          tex.repeat.set(1, d.rep)
          tex.needsUpdate = true
          const mat = new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.62,
            side: THREE.DoubleSide,
          })
          const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * scale, d.h * scale), mat)
          mesh.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.1
          mesh.geometry.translate(0, -d.h * scale * 0.5, 0)
          mesh.position.y = yTop
          group.add(mesh)
          segs.push(mesh)
          yTop -= d.h * scale * 0.96
        }
        S.add(group)
        rig.ribbons.push({
          group,
          segs,
          wish,
          phase: Math.random() * Math.PI * 2,
          speed: 1.0 + Math.random() * 0.6,
          scale,
        })
      }

      const list = wishes.slice(0, TREE_RIBBON_SPOTS.length)
      list.forEach((w, i) => spawn(w.text, TREE_RIBBON_SPOTS[i], i, w))

      // 一条心愿都没有时，挂八条寺院常备的祈福绸：
      // 空树对第一次来的人太冷清，但也不伪造「心愿」（不可点、不计数）。
      if (list.length === 0) {
        const DECOR = ['平安', '吉祥', '如愿', '欢喜', '随喜', '自在', '清净', '福慧']
        const spots = [0, 3, 5, 8, 10, 13, 16, 19]
        DECOR.forEach((text, i) => spawn(text, TREE_RIBBON_SPOTS[spots[i]], i))
      }
    })
  }, [wishes, ready])

  if (failed) return <>{fallback}</>

  return (
    <div className="relative h-[520px] w-full sm:h-[640px]">
      <canvas ref={canvasRef} className="h-full w-full" aria-label={t('common.treeAlt')} />
      <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-xs border border-paper/15 bg-celadon-950/85 px-3 py-1 font-sans text-[11px] tracking-wider text-paper/75">
        {t('common.treeHint')}
      </p>
    </div>
  )
}
