import { useEffect, useRef, useState, type ReactNode } from 'react'
import type * as THREE from 'three'
import type { Wish } from '../../lib/wishes'
import { createStage, makeRibbonTexture, type Stage } from './stage'
import { createCenser } from './censer'
import { useI18n } from '../../i18n'

/**
 * 3D 千年松柏许愿树（v3 · 第 11 轮重制）
 *
 * 上一版被用户判为「无法直视」，实测截图的症结是：
 *   ① 树冠用 360 多枚「放射状松针」Sprite —— 每枚都是一根根 3px 粗线，
 *      在屏幕上成了几十个绿色风车/刺球；
 *   ② 树干是 10 段圆柱首尾相接，接缝、粗细突变都在明面上；
 *   ③ 树冠 scale 2.1 后超出画面，顶部被裁掉；
 *   ④ 没有红绸时整棵树空荡荡，看不出「许愿树」。
 *
 * 本版重做：
 *   - 树干 / 枝 / 根全部改为**沿曲线的变径管**（自定义 BufferGeometry，
 *     按 Frenet 帧逐环生成，半径随参数平滑变化 + 轻微凹凸），不再是圆柱堆叠；
 *   - 树冠改为**层叠松云**：每片云由 4–6 张横向针叶圆盘错落叠成，
 *     贴图是 900 根细针叶（1px 级）不是粗线；用 alphaTest 裁边，
 *     远看是「墨绿云片」，近看有针叶；
 *   - 红绸挂点重新落在新枝头，绸面加宽加长；无心愿时也保留树形本身；
 *   - 树脚由「水平切面 + 围一圈碎石」改为**坡脚 + 根盘**：高度场土坡
 *     （向相机一侧压低、坡背抬高）、4 条粗板根 + 1 条越过坡沿的长根、
 *     苔点 / 草叶 / 半埋石；树干起点埋到坡面以下，不再出现平切圆面。
 *
 * 交互不变：拖拽旋转 / 滚轮缩放，点红绸看心愿、点香炉供香。
 * WebGL 不可用时回退 2D 水墨松柏。
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

/** 红绸挂点（落在新枝头附近，避开树干中轴） */
const RIBBON_SPOTS: Array<{ x: number; y: number; z: number; rot: number }> = [
  { x: -3.8, y: 2.55, z: 0.8, rot: 0.2 },
  { x: -2.8, y: 3.35, z: -1.4, rot: -0.15 },
  { x: 3.6, y: 2.85, z: -1.0, rot: 0.1 },
  { x: 2.6, y: 3.75, z: 1.6, rot: -0.22 },
  { x: 0.4, y: 4.55, z: 0.6, rot: 0.05 },
  { x: -4.6, y: 2.3, z: -0.4, rot: 0.26 },
  { x: 4.4, y: 2.5, z: 0.5, rot: -0.18 },
  { x: -1.4, y: 3.0, z: 2.6, rot: 0.3 },
  { x: 1.4, y: 2.85, z: -2.8, rot: -0.28 },
  { x: -2.2, y: 4.15, z: 1.8, rot: 0.12 },
  { x: 2.4, y: 4.35, z: 1.9, rot: -0.08 },
  { x: -0.6, y: 3.55, z: -2.2, rot: 0.16 },
  { x: 4.0, y: 3.35, z: -0.4, rot: -0.24 },
  { x: -4.2, y: 3.15, z: 0.4, rot: 0.2 },
  { x: 1.0, y: 2.35, z: 3.0, rot: -0.14 },
  { x: -1.0, y: 2.35, z: -3.4, rot: 0.22 },
  { x: 3.0, y: 4.55, z: 0.8, rot: -0.1 },
  { x: -3.2, y: 4.35, z: -1.0, rot: 0.14 },
  { x: 0.3, y: 5.35, z: -0.6, rot: -0.06 },
  { x: -0.3, y: 5.15, z: 1.2, rot: 0.1 },
]

/**
 * 沿曲线生成变径管：逐环取 Frenet 法向/副法向，半径随 t 平滑变化，
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

/** 树皮：深皴纵纹 + 节疤（比上一版更暗、更密，避免「木纹塑料管」） */
function makeBarkTexture(THREE: typeof import('three')): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 512
  cv.height = 512
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#6b5844'
  ctx.fillRect(0, 0, 512, 512)
  // 大块明暗（老树皮的深浅斑）
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const r = 30 + Math.random() * 80
    const g = ctx.createRadialGradient(x, y, 2, x, y, r)
    g.addColorStop(0, Math.random() > 0.5 ? 'rgba(38,30,22,0.35)' : 'rgba(112,92,68,0.28)')
    g.addColorStop(1, 'rgba(88,74,58,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // 纵向深裂纹
  for (let i = 0; i < 46; i++) {
    const x = Math.random() * 512
    ctx.strokeStyle = `rgba(24,18,13,${0.25 + Math.random() * 0.35})`
    ctx.lineWidth = 2 + Math.random() * 5
    ctx.beginPath()
    ctx.moveTo(x, 0)
    for (let y = 0; y <= 512; y += 20) ctx.lineTo(x + Math.sin(y * 0.017 + i) * 10, y)
    ctx.stroke()
  }
  // 亮棱
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 512
    ctx.strokeStyle = `rgba(158,132,100,${0.09 + Math.random() * 0.12})`
    ctx.lineWidth = 1 + Math.random() * 2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    for (let y = 0; y <= 512; y += 24) ctx.lineTo(x + Math.sin(y * 0.02 + i * 2) * 8, y)
    ctx.stroke()
  }
  // 节疤
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    ctx.strokeStyle = 'rgba(30,22,15,0.8)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(x, y, 12 + Math.random() * 22, 7 + Math.random() * 12, Math.random() * 3, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(70,52,34,0.55)'
    ctx.beginPath()
    ctx.ellipse(x, y, 7 + Math.random() * 12, 4 + Math.random() * 7, 0, 0, Math.PI * 2)
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
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 256
    ctx.strokeStyle = `rgba(50,50,50,${0.4 + Math.random() * 0.3})`
    ctx.lineWidth = 1.5 + Math.random() * 4
    ctx.beginPath()
    ctx.moveTo(x, 0)
    for (let y = 0; y <= 256; y += 20) ctx.lineTo(x + Math.sin(y * 0.02 + i) * 6, y)
    ctx.stroke()
  }
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 256
    ctx.strokeStyle = `rgba(170,170,170,${0.2 + Math.random() * 0.25})`
    ctx.lineWidth = 1 + Math.random() * 2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    for (let y = 0; y <= 256; y += 24) ctx.lineTo(x + Math.sin(y * 0.025 + i * 2) * 5, y)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

/**
 * 松针云片贴图：900 根 1px 级细针，中心密、边缘疏，轮廓不规则。
 * 上一版是 160 根 3px 粗线 → 屏幕上成了刺球；针越细、越密，才像松针。
 */
function makePineNeedles(THREE: typeof import('three')): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 512
  cv.height = 512
  const ctx = cv.getContext('2d')!
  ctx.clearRect(0, 0, 512, 512)
  const cx = 256
  const cy = 256
  ctx.lineCap = 'round'
  // 中心软核：给云片一点体积，避免「空心光盘」
  const core = ctx.createRadialGradient(cx, cy, 4, cx, cy, 150)
  core.addColorStop(0, 'rgba(255,255,255,0.6)')
  core.addColorStop(0.5, 'rgba(255,255,255,0.3)')
  core.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(cx, cy, 150, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 420; i++) {
    const a = Math.random() * Math.PI * 2
    const r0 = 4 + Math.pow(Math.random(), 0.5) * 205
    const len = 16 + Math.random() * 66
    const r1 = r0 + len
    const x0 = cx + Math.cos(a) * r0
    const y0 = cy + Math.sin(a) * r0
    const x1 = cx + Math.cos(a + 0.05) * r1
    const y1 = cy + Math.sin(a + 0.05) * r1
    const mx = cx + Math.cos(a + 0.12) * (r0 + len * 0.55)
    const my = cy + Math.sin(a + 0.12) * (r0 + len * 0.55)
    ctx.strokeStyle = `rgba(255,255,255,${0.45 + Math.random() * 0.5})`
    ctx.lineWidth = 1.4 + Math.random() * 1.8
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.quadraticCurveTo(mx, my, x1, y1)
    ctx.stroke()
  }
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
   上一版树干是从一个水平切面「插」在淡墨地台上的：切面平、树脚围一圈
   碎石，读起来像木盆。这里把「地面」做成一圈真正有起伏的低矮土坡：

   - 高度场 moundHeightAt()：中心隆起、向外 1.65 次幂衰减，外缘精确回到
     地台 y；再叠加一圈很轻的角向起伏，使坡脚不对称、不机械。
   - 树心处压出一个浅盆（basin），树干从盆里长出，不会浮在坡面上。
   - 坡面用 alphaMap 径向淡出，边缘融进淡墨地台，任何主题下都不出现
     「一块绿圆盘」的硬边。
   - 根盘 = 4 条从树干高处斜下、贴着坡面走的**粗板根** + 1 条越过坡沿的**长根**，
     全部用 taperedTube 生成，根部粗、末端细，末端钻进土里（y 低于坡面）。
   ------------------------------------------------------------------ */
const GROUND_Y = -4.5
const MOUND_R = 3.0
const MOUND_H = 0.75

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

/** 坡面颜色：树心是裸土，往外转苔绿，坡沿再淡下去；一张径向贴图解决「一坨土」 */
function makeMoundTexture(THREE: typeof import('three')): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 512
  cv.height = 512
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(256, 256, 10, 256, 256, 256)
  g.addColorStop(0, '#6b5a45')
  g.addColorStop(0.3, '#7a8467')
  g.addColorStop(0.56, '#8a9578')
  g.addColorStop(0.82, '#9aa68a')
  g.addColorStop(1, '#aab59d')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 512)

  // 苔痕 / 土斑：越靠外越偏绿，越靠内越偏褐
  const tones = ['#5a4a35', '#84926f', '#63785a', '#98a58a', '#6b5a45']
  for (let i = 0; i < 110; i++) {
    const a = Math.random() * Math.PI * 2
    const rr = Math.pow(Math.random(), 0.6) * 240
    const x = 256 + Math.cos(a) * rr
    const y = 256 + Math.sin(a) * rr
    const rad = 12 + Math.random() * 58
    const tone = tones[Math.floor(Math.random() * tones.length)]
    const tg = ctx.createRadialGradient(x, y, 1, x, y, rad)
    tg.addColorStop(0, `${tone}aa`)
    tg.addColorStop(1, `${tone}00`)
    ctx.fillStyle = tg
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
  for (let i = 0; i < 900; i++) {
    const x = 12 + Math.random() * 488
    const y = 12 + Math.random() * 488
    const s = 0.7 + Math.random() * 1.8
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(38,52,38,0.3)' : 'rgba(120,134,108,0.28)'
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
    const a = Math.random() * Math.PI * 2
    const r = 92 + Math.random() * 44
    const x = 128 + Math.cos(a) * r
    const y = 128 + Math.sin(a) * r
    const rr = 6 + Math.random() * 20
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
      try {
        stage = createStage(THREE, canvas, {
          distance: 22.5,
          autoRotate: 0,
          theta: 0.42,
          phi: 1.29,
          targetY: 0.25,
          minPhi: 0.62,
          maxPhi: 1.5,
          minDistance: 5,
          maxDistance: 28,
          lightPosition: [7, 11, 6],
          hemiIntensity: 0.95,
        })
        stageRef.current = stage
      } catch {
        setFailed(true)
        return
      }
      const S = stage.scene

      // 树脚补一盏低处暖光：不让根盘永远陷在树冠与树干的影子里
      const baseFill = new THREE.PointLight(0xffd9a8, 7, 10, 2)
      baseFill.position.set(2.4, -2.9, 3.6)
      S.add(baseFill)

      /* ---------- 地面：淡墨地台 + 坡脚（土坡与地台同高收边） ---------- */
      stage.addInkGround({ radius: 14, y: GROUND_Y, opacity: 1 })

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
      for (let i = 0; i < 34; i++) {
        const a = Math.random() * Math.PI * 2
        const r = 0.55 + Math.random() * 2.2
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        const s = 0.04 + Math.random() * 0.075
        const moss = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), mossMats[i % mossMats.length])
        moss.position.set(x, moundHeightAt(x, z) + s * 0.2, z)
        moss.scale.set(1, 0.38, 1)
        S.add(moss)
      }

      // 半埋的坡脚石：只留四五块，颜色压暗，主要用来「咬住」坡脚
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x66705f, roughness: 1 })
      const stones: Array<[number, number, number, number]> = [
        [1.95, 0.75, 0.62, 0.3],
        [-1.9, -0.95, 0.56, 0.22],
        [0.85, -1.95, 0.46, 0.42],
        [-2.25, 1.2, 0.36, 0.5],
        [2.55, -0.55, 0.24, 0.35],
        [-2.55, -0.1, 0.22, 0.3],
      ]
      for (const [x, z, s, expose] of stones) {
        const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), stoneMat)
        rock.position.set(x, moundHeightAt(x, z) + s * (0.02 + 0.28 * expose), z)
        rock.scale.set(1.15, 0.58, 0.95)
        rock.rotation.set(Math.random(), Math.random(), Math.random())
        rock.castShadow = true
        rock.receiveShadow = true
        S.add(rock)
      }

      // 坡脚草：几撮细叶，柔化土坡与地台的交界
      const grassMat = new THREE.MeshStandardMaterial({ color: 0x6f8a61, roughness: 0.95 })
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * Math.PI * 2
        const r = 1.1 + Math.random() * 1.85
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        const h = 0.2 + Math.random() * 0.32
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.035, h, 4), grassMat)
        blade.position.set(x, moundHeightAt(x, z) + h / 2 - 0.01, z)
        blade.rotation.z = (Math.random() - 0.5) * 0.5
        blade.rotation.x = (Math.random() - 0.5) * 0.4
        S.add(blade)
      }

      /* ---------- 材质 ---------- */
      const barkTex = makeBarkTexture(THREE)
      const barkBump = makeBarkBump(THREE)
      const bark = new THREE.MeshStandardMaterial({
        map: barkTex,
        bumpMap: barkBump,
        bumpScale: 0.45,
        roughness: 0.95,
        color: 0xffffff,
      })
      // 露出的板根比主干浅一度：既从阴影里「剥」得出来，也像被风雨洗白的木质
      const rootBark = bark.clone()
      rootBark.color.setHex(0x8f6f4f)
      rootBark.roughness = 0.92
      const needleTex = makePineNeedles(THREE)
      const foliage = [
        new THREE.MeshStandardMaterial({
          map: needleTex,
          color: 0x4f7060,
          alphaTest: 0.18,
          side: THREE.DoubleSide,
          roughness: 0.92,
        }),
        new THREE.MeshStandardMaterial({
          map: needleTex,
          color: 0x365c4e,
          alphaTest: 0.18,
          side: THREE.DoubleSide,
          roughness: 0.92,
        }),
        new THREE.MeshStandardMaterial({
          map: needleTex,
          color: 0x274a3d,
          alphaTest: 0.18,
          side: THREE.DoubleSide,
          roughness: 0.92,
        }),
      ]

      /* ---------- 树干：一条 S 形曲线 + 变径管（起点埋在坡面以下） ---------- */
      const trunkCurve = new THREE.CatmullRomCurve3([
        [0, -4.8, 0],
        [0, -4.3, 0],
        [0.12, -3.5, 0.1],
        [0.18, -2.9, 0.28],
        [-0.15, -2.5, -0.2],
        [0.42, -1.4, 0.35],
        [0.2, -0.3, -0.3],
        [-0.32, 0.8, 0.25],
        [0.05, 2.0, -0.2],
        [0.42, 3.1, 0.28],
        [0.2, 4.0, -0.1],
        [0.35, 4.75, 0.05],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z)))
      // 根基外扩直接写进半径函数：不另做锥筒，
      // 免得与树干之间出现一道「一圈篮沿」的接缝。
      const trunkRadius = (t: number) => {
        // 根部粗、胸径略鼓、梢部急收；板根另做，这里只留一点根部外扩
        const base = 1.08 * Math.pow(1 - t, 1.3) + 0.22
        const swell = Math.exp(-Math.pow((t - 0.18) / 0.14, 2)) * 0.12
        const rootFlare = t < 0.2 ? 0.3 * Math.pow(1 - t / 0.2, 1.2) : 0
        return base + swell + rootFlare
      }
      const trunk = new THREE.Mesh(taperedTube(THREE, trunkCurve, trunkRadius, 40, 16, 0.05), bark)
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
        const finCurve = new THREE.CatmullRomCurve3(finPts)
        const fin = new THREE.Mesh(
          taperedTube(THREE, finCurve, (t) => 0.08 + 0.14 * t, 24, 8, 0.07),
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
        { a: 0.2, len: 2.7, thick: 0.68, sway: 0.2, startY: -3.48 },
        { a: 1.25, len: 2.2, thick: 0.55, sway: -0.26, startY: -3.56 },
        { a: 2.75, len: 2.9, thick: 0.6, sway: 0.3, startY: -3.62 },
        { a: 4.35, len: 1.9, thick: 0.48, sway: -0.18, startY: -3.52 },
      ]
      for (const spec of buttress) {
        const { a, len, thick, sway, startY } = spec
        const p0 = new THREE.Vector3(Math.cos(a) * 0.95, startY, Math.sin(a) * 0.95)
        const p1 = rootPoint(a, 1.5, 0.3)
        const p2 = rootPoint(a + sway * 0.5, 2.0, 0.2)
        const p3 = rootPoint(a + sway, 2.45, 0.05)
        const p4 = rootPoint(a + sway * 1.2, len, -0.4)
        const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4])
        const root = new THREE.Mesh(
          rootGeometry(
            THREE,
            curve,
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

      // 一条长根：越过坡沿，平铺到淡墨地台上。
      // 它们让根盘不再是一个「与坡等大的圆」，而是真正向四外抓地。
      for (const spec of [{ a: 2.55, len: 3.8, thick: 0.34, sway: 0.3 }]) {
        const { a, len, thick, sway } = spec
        const p0 = new THREE.Vector3(Math.cos(a) * 0.8, -3.9, Math.sin(a) * 0.8)
        const p1 = rootPoint(a, 1.5, 0.2)
        const p2 = rootPoint(a + sway * 0.4, 2.4, 0.12)
        const p3p = rootPoint(a + sway * 0.8, 3.35, 0.06)
        const p3 = new THREE.Vector3(p3p.x, Math.max(GROUND_Y + 0.04, p3p.y), p3p.z)
        const p4p = rootPoint(a + sway, len, 0)
        const p4 = new THREE.Vector3(p4p.x, GROUND_Y - 0.16, p4p.z)
        const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4])
        const root = new THREE.Mesh(
          rootGeometry(
            THREE,
            curve,
            (t) => thick * Math.pow(1 - t, 0.8) + 0.025,
            40,
            10,
            0.08,
          ),
          rootBark,
        )
        root.castShadow = false
        root.receiveShadow = true
        S.add(root)
      }

      // 树瘤
      for (let i = 0; i < 7; i++) {
        const t = 0.12 + Math.random() * 0.6
        const p = trunkCurve.getPointAt(t)
        const a = Math.random() * Math.PI * 2
        const rr = trunkRadius(t) * 0.85
        const burl = new THREE.Mesh(new THREE.SphereGeometry(0.16 + Math.random() * 0.18, 10, 8), bark)
        burl.scale.set(1, 0.7 + Math.random() * 0.5, 1)
        burl.position.set(p.x + Math.cos(a) * rr, p.y, p.z + Math.sin(a) * rr)
        S.add(burl)
      }

      /* ---------- 枝：四级递减，枝头即云片位置 ---------- */
      const LIMBS: Array<{ pts: Array<[number, number, number]>; r: number }> = [
        { pts: [[0.3, 1.1, 0], [-1.3, 1.5, 0.7], [-2.7, 1.9, 1.0], [-4.0, 2.2, 0.6]], r: 0.28 },
        { pts: [[0.35, 1.5, 0], [1.5, 2.0, -0.4], [3.0, 2.5, -0.8], [4.4, 2.8, -0.3]], r: 0.28 },
        { pts: [[0.05, 2.4, 0], [-1.1, 3.0, 0.6], [-2.4, 3.6, 0.9], [-3.6, 4.0, 0.4]], r: 0.22 },
        { pts: [[0.2, 2.8, 0], [1.3, 3.4, -0.6], [2.6, 3.9, -0.7], [3.7, 4.3, -0.1]], r: 0.22 },
        { pts: [[0.3, 3.6, 0], [-0.3, 4.3, 0.4], [-0.9, 4.9, 0.2], [-1.5, 5.4, -0.2]], r: 0.16 },
        { pts: [[0.3, 3.9, 0], [0.7, 4.6, -0.4], [1.5, 5.1, -0.3], [2.2, 5.4, 0.2]], r: 0.16 },
        { pts: [[0.35, 4.4, 0], [0.2, 5.0, 0.3], [0.1, 5.6, 0], [0.3, 6.0, -0.1]], r: 0.14 },
      ]
      for (const limb of LIMBS) {
        const curve = new THREE.CatmullRomCurve3(
          limb.pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        )
        const mesh = new THREE.Mesh(
          taperedTube(THREE, curve, (t) => limb.r * (1 - t * 0.85) + 0.04, 24, 8, 0.07),
          bark,
        )
        mesh.castShadow = true
        S.add(mesh)
      }

      /* ---------- 树冠：层叠松云 ---------- */
      const PADS: Array<[number, number, number, number, 0 | 1 | 2]> = [
        [-3.9, 2.5, 0.6, 1.8, 0],
        [4.3, 3.0, -0.2, 1.7, 0],
        [-3.4, 4.0, 0.3, 1.55, 1],
        [3.6, 4.4, 0.1, 1.55, 1],
        [-1.4, 5.5, -0.2, 1.35, 1],
        [2.0, 5.5, 0.2, 1.35, 1],
        [0.3, 6.2, -0.05, 1.7, 2],
        [-2.2, 3.4, 1.1, 1.25, 2],
        [2.3, 3.7, -1.0, 1.25, 2],
        [0.2, 4.7, 0.6, 1.2, 2],
        [-4.8, 2.2, -0.3, 1.15, 1],
        [4.8, 2.5, 0.5, 1.15, 1],
        [-2.6, 4.8, -0.8, 1.0, 2],
        [2.9, 5.0, 0.9, 1.0, 2],
        [-0.8, 6.6, 0.3, 1.0, 2],
        [1.2, 6.5, 0.4, 0.9, 2],
      ]
      const coreMats = [0x6f8b7e, 0x54705f, 0x3d5a4a].map(
        (c) =>
          new THREE.MeshStandardMaterial({
            color: c,
            transparent: true,
            opacity: 0.26,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
      )
      const canopy = new THREE.Group()
      for (const [px, py, pz, pr, tone] of PADS) {
        const pad = new THREE.Group()
        pad.position.set(px, py, pz)
        const mat = foliage[tone]
        // 4 张横向圆盘错落叠成一片「云」，外加 2 张斜置的补体积
        // 由大到小、由低到高叠成「锥形云片」：俯视是层叠松云，侧看有厚度
        const layerDefs = [
          [1.0, 0.0],
          [0.84, 0.2],
          [0.62, 0.38],
          [0.4, 0.54],
        ]
        for (let k = 0; k < layerDefs.length; k++) {
          const [rf, yf] = layerDefs[k]
          const rad = pr * rf * (0.94 + Math.random() * 0.12)
          const disc = new THREE.Mesh(new THREE.CircleGeometry(rad, 40), mat)
          disc.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.14
          disc.rotation.z = Math.random() * Math.PI * 2
          disc.position.set(
            (Math.random() - 0.5) * pr * 0.18,
            yf + Math.random() * 0.05,
            (Math.random() - 0.5) * pr * 0.18,
          )
          disc.scale.set(1.06, 0.86 + Math.random() * 0.16, 1)
          pad.add(disc)
        }
        const core = new THREE.Mesh(new THREE.CircleGeometry(pr * 0.52, 28), coreMats[tone])
        core.rotation.x = -Math.PI / 2
        core.position.y = 0.05
        pad.add(core)
        for (let k = 0; k < 2; k++) {
          const rad = pr * (0.5 + Math.random() * 0.3)
          const disc = new THREE.Mesh(new THREE.CircleGeometry(rad, 32), mat)
          disc.rotation.x = -Math.PI / 2 + 0.5 + Math.random() * 0.4
          disc.rotation.z = Math.random() * Math.PI * 2
          disc.position.set((Math.random() - 0.5) * pr * 0.5, 0.2 + Math.random() * 0.25, 0)
          pad.add(disc)
        }
        canopy.add(pad)
      }
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
        s.scale.setScalar(0.32 + Math.random() * 0.22)
        S.add(s)
        petals.push({
          s,
          speed: 0.32 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          sway: 3 + Math.random() * 4,
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
      stage.onFrame((dt, t) => {
        const gust = 1 + wind() * 0.7
        for (const r of rig.ribbons) {
          for (let i = 0; i < r.segs.length; i++) {
            const amp = (0.045 + i * 0.075) * gust * r.scale
            // 静止时也给一点「折」，绸面才不是三块直板
            const bend = [0.07, -0.05, 0.09][i] * r.scale
            r.segs[i].rotation.x = bend + Math.sin(t * r.speed + r.phase + i * 0.7) * amp
            r.segs[i].rotation.z = Math.cos(t * r.speed * 0.8 + r.phase * 1.3 + i * 0.5) * amp * 0.45
          }
          r.group.rotation.y = Math.sin(t * 0.55 + r.phase) * 0.08 + r.group.userData.baseRot
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
            const a = Math.random() * Math.PI * 2
            const r = 1.4 + Math.random() * 4.2
            p.s.position.set(Math.cos(a) * r, 7.4 + Math.random() * 1.4, Math.sin(a) * r)
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
      const spawn = (text: string, spot: (typeof RIBBON_SPOTS)[number], i: number, wish?: Wish) => {
        const shade = i % 3
        const scale = 0.86 + ((i * 37) % 10) / 26
        const group = new THREE.Group()
        group.position.set(spot.x, spot.y, spot.z)
        group.rotation.y = spot.rot
        group.userData.baseRot = spot.rot
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

      const list = wishes.slice(0, RIBBON_SPOTS.length)
      list.forEach((w, i) => spawn(w.text, RIBBON_SPOTS[i], i, w))

      // 一条心愿都没有时，挂八条寺院常备的祈福绸：
      // 空树对第一次来的人太冷清，但也不伪造「心愿」（不可点、不计数）。
      if (list.length === 0) {
        const DECOR = ['平安', '吉祥', '如愿', '欢喜', '随喜', '自在', '清净', '福慧']
        const spots = [0, 2, 4, 6, 8, 10, 13, 17]
        DECOR.forEach((text, i) => spawn(text, RIBBON_SPOTS[spots[i]], i))
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
