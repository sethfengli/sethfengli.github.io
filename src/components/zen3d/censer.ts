import type * as THREE from 'three'
import type { FitBox } from './stage'

/**
 * 共享 3D 香炉构建器（鼎式铜炉 + 三种香型）
 * - sticks：三炷线香（礼佛供奉，香头灰白香灰 + 暗红炭火）
 * - coil  ：盘香（禅修静坐慢燃，螺旋盘香 + 燃点）
 * - cone  ：塔香（祈愿，塔形香 + 底座香灰环）
 * 炉身铭文随机轮换（戒定真香 / 心香一炷 / 智慧香 / 清净香 / 般若香）。
 */

export type CenserVariant = 'sticks' | 'coil' | 'cone'

export interface CenserRig {
  group: THREE.Group
  embers: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }>
  /** 香头光晕（加色 sprite），随炭火一起明灭 */
  halos: Array<{ s: THREE.Sprite; mat: THREE.SpriteMaterial; base: number }>
  ashCaps: THREE.Mesh[]
  smoke: THREE.Points | null
  smokeSprites: Array<{ s: THREE.Sprite; mat: THREE.SpriteMaterial; life: number; phase: number; tip: number }>
  tips: Array<{ x: number; y: number; z: number }>
  /** 主体范围（局部坐标，未乘 scale）：相机取景用，见 stage.ts 的 fitDistance */
  bounds: FitBox
  lit: boolean
  update: (dt: number, t: number) => void
}

/**
 * 各香型的主体范围。`top` 不只到香头（线香 5.23 / 塔香 3.98 / 盘香 2.44），
 * 还要含一段青烟——烟是「在燃烧」的视觉证据，裁掉它香头就只剩一根红棍子。
 * 炉足最低点在 y≈−2.22（三足的球脚），炉耳外沿到 x≈±1.95。
 */
export const CENSER_BOUNDS: Record<CenserVariant, FitBox> = {
  sticks: { top: 6.4, bottom: -2.25, halfWidth: 1.95 },
  coil: { top: 3.7, bottom: -2.25, halfWidth: 1.95 },
  cone: { top: 5.15, bottom: -2.25, halfWidth: 1.95 },
}

/**
 * 香头（炭火球）在模型坐标里的高度。`scripts/check-framing.mjs` 拿它验两件事：
 * ① 燃烧点在画面内还有余量；② 它必须高于香灰顶盖（原来炭火埋在香灰筒里，看不见在烧）。
 */
export const CENSER_TIP: Record<CenserVariant, number> = {
  sticks: 2.3 + 2.93,
  coil: 2.44,
  cone: 3.98,
}

const INSCRIPTIONS = ['戒定真香', '心香一炷', '智慧香', '清净香', '般若香']

function drawBellyTexture(inscription: string): HTMLCanvasElement {
  const w = 1024
  const h = 512
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, w, 0)
  g.addColorStop(0, '#6b4a2f')
  g.addColorStop(0.18, '#a5713f')
  g.addColorStop(0.5, '#c08a54')
  g.addColorStop(0.82, '#a5713f')
  g.addColorStop(1, '#6b4a2f')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // 回纹带
  ctx.strokeStyle = '#d4a92c'
  ctx.lineWidth = 7
  ctx.strokeRect(0, 56, w, 64)
  for (let x = 24; x < w; x += 56) {
    ctx.beginPath()
    ctx.moveTo(x, 68)
    ctx.lineTo(x + 26, 68)
    ctx.lineTo(x + 26, 84)
    ctx.lineTo(x, 84)
    ctx.closePath()
    ctx.moveTo(x + 14, 94)
    ctx.lineTo(x + 40, 94)
    ctx.lineTo(x + 40, 108)
    ctx.lineTo(x + 14, 108)
    ctx.closePath()
    ctx.stroke()
  }
  // 莲花纹
  ctx.strokeStyle = '#f1d25f'
  ctx.lineWidth = 9
  ctx.lineCap = 'round'
  const lotus = (cx: number, cy: number) => {
    ctx.beginPath()
    ctx.moveTo(cx, cy - 46)
    ctx.quadraticCurveTo(cx - 32, cy - 34, cx - 32, cy - 6)
    ctx.moveTo(cx, cy - 46)
    ctx.quadraticCurveTo(cx + 32, cy - 34, cx + 32, cy - 6)
    ctx.moveTo(cx - 46, cy - 4)
    ctx.quadraticCurveTo(cx, cy + 22, cx + 46, cy - 4)
    ctx.stroke()
  }
  lotus(256, 260)
  lotus(768, 260)
  // 竖排铭文
  ctx.fillStyle = '#f6e69b'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 52px "MaShanZhengSubset","KaiTi","KaiTi","SimSun",serif'
  for (let i = 0; i < inscription.length; i++) {
    ctx.fillText(inscription[i], 512, 180 + i * 64)
  }
  // 云纹
  ctx.strokeStyle = '#d4a92c'
  ctx.lineWidth = 6
  ctx.beginPath()
  for (let x = 40; x < w - 30; x += 130) {
    ctx.moveTo(x, 400)
    ctx.quadraticCurveTo(x + 32, 382, x + 65, 400)
    ctx.quadraticCurveTo(x + 98, 418, x + 130, 400)
  }
  ctx.stroke()
  return cv
}

function makeSmokeTexture(THREE: typeof import('three')): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 128
  cv.height = 128
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62)
  g.addColorStop(0, 'rgba(235,240,242,0.9)')
  g.addColorStop(0.5, 'rgba(220,228,232,0.45)')
  g.addColorStop(1, 'rgba(210,220,225,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * 香头炭火的光晕贴图。
 * 只有一个 0.15 单位的球体时，420px 的画布上香头不到 7px，再加上它原来被香灰筒
 * 罩住，「在燃烧」这件事完全看不出来；一层加色光晕才能让香头亮起来。
 */
function makeEmberTexture(THREE: typeof import('three')): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 64
  cv.height = 64
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,232,186,0.95)')
  g.addColorStop(0.25, 'rgba(255,158,72,0.7)')
  g.addColorStop(0.6, 'rgba(240,104,44,0.18)')
  g.addColorStop(1, 'rgba(230,90,36,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function createCenser(
  THREE: typeof import('three'),
  variant: CenserVariant,
  scale = 1,
): { group: THREE.Group; rig: CenserRig } {
  const group = new THREE.Group()
  const inscription = INSCRIPTIONS[Math.floor(Math.random() * INSCRIPTIONS.length)]

  /* ---------- 鼎身 ---------- */
  const tex = new THREE.CanvasTexture(drawBellyTexture(inscription))
  tex.colorSpace = THREE.SRGBColorSpace
  tex.flipY = false
  tex.anisotropy = 8
  const belly = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0, 0.05],
        [1.0, 0],
        [1.32, -0.5],
        [1.5, -1.3],
        [1.42, -2.1],
        [1.05, -2.6],
        [0, -2.6],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      64,
    ),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: 0.65 }),
  )
  belly.position.y = 2.15
  group.add(belly)
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.42, 0.12, 16, 64),
    new THREE.MeshStandardMaterial({ color: 0xd4a92c, roughness: 0.3, metalness: 0.7 }),
  )
  rim.rotation.x = Math.PI / 2
  rim.position.y = 2.2
  group.add(rim)
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.09, 12, 32, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x8a5c3a, roughness: 0.4, metalness: 0.6 }),
    )
    ear.position.set(side * 1.55, 1.55, 0)
    ear.rotation.z = -side * Math.PI / 2
    group.add(ear)
  }
  const legMat = new THREE.MeshStandardMaterial({ color: 0x8a5c3a, roughness: 0.4, metalness: 0.6 })
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.26, 1.5, 12), legMat)
    leg.position.set(Math.cos(a) * 1.0, -1.35, Math.sin(a) * 1.0)
    leg.rotation.z = Math.cos(a) * 0.45
    leg.rotation.x = -Math.sin(a) * 0.45
    group.add(leg)
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), legMat)
    foot.scale.y = 0.7
    foot.position.set(Math.cos(a) * 1.3, -2.05, Math.sin(a) * 1.3)
    group.add(foot)
  }
  // 炉内香灰（自然起伏：灰床 + 多堆不规则的灰丘）
  const ashBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.22, 1.3, 0.3, 48),
    new THREE.MeshStandardMaterial({ color: 0x9aa3a3, roughness: 1 }),
  )
  ashBase.position.y = 2.0
  group.add(ashBase)
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * 0.95
    const hgt = 0.12 + Math.random() * 0.3
    const rdx = 0.2 + Math.random() * 0.5
    const tone = [0x9aa3a3, 0xaeb6b6, 0xc3c8c8, 0x8f9999][i % 4]
    const bump = new THREE.Mesh(
      new THREE.ConeGeometry(rdx, hgt, 10),
      new THREE.MeshStandardMaterial({ color: tone, roughness: 1 }),
    )
    bump.position.set(Math.cos(a) * r, 2.2 + hgt / 2, Math.sin(a) * r)
    bump.rotation.z = Math.random() * Math.PI
    bump.scale.x = 0.7 + Math.random() * 0.6
    group.add(bump)
  }

  const embers: CenserRig['embers'] = []
  const halos: CenserRig['halos'] = []
  const ashCaps: THREE.Mesh[] = []
  const tips: Array<{ x: number; y: number; z: number }> = []
  const heatTex = makeEmberTexture(THREE)

  /** 香头：炭火球 + 加色光晕。光晕是给浅色纸底准备的——只有球体时香头只是几个像素的暗点 */
  const addEmber = (parent: THREE.Object3D, x: number, y: number, z: number, size = 0.075) => {
    const mat = new THREE.MeshBasicMaterial({ color: 0xe0733a })
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 10), mat)
    mesh.position.set(x, y, z)
    parent.add(mesh)
    embers.push({ mesh, mat })
    const haloMat = new THREE.SpriteMaterial({
      map: heatTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xffb070,
      opacity: 0.5,
    })
    const halo = new THREE.Sprite(haloMat)
    halo.position.set(x, y + size * 0.25, z)
    const base = size * 5
    halo.scale.setScalar(base)
    parent.add(halo)
    halos.push({ s: halo, mat: haloMat, base })
  }

  /* ---------- 香型 ---------- */
  if (variant === 'sticks') {
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x8c2f39, roughness: 0.9 })
    const ashMat = new THREE.MeshStandardMaterial({ color: 0xd9dcd6, roughness: 1 })
    // 三炷香要**排开**：原来三根挤在半径 0.3 的圆圈里，默认机位下后两根在屏幕上几乎重叠，
    // 看上去只有两炷（礼佛的三炷香，少一根是明显的错）。拉开到半径 0.5，并让中间那炷偏后。
    ;([[-0.5, 0.14, 0.1], [0.02, -0.52, -0.05], [0.5, 0.12, -0.12]] as Array<[number, number, number]>).forEach(
      ([dx, dz, tilt]) => {
        const st = new THREE.Group()
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.6, 10), stickMat)
        stick.position.y = 1.3
        st.add(stick)
        // 燃过的一段香灰：从香身顶端到 2.89，炭火露在香灰**之上**
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.34, 10), ashMat)
        cap.position.y = 2.72
        st.add(cap)
        ashCaps.push(cap)
        addEmber(st, 0, 2.93, 0, 0.07)
        st.position.set(dx, 2.3, dz)
        st.rotation.x = tilt * 0.6
        st.rotation.z = -tilt * 0.6
        group.add(st)
        tips.push({ x: dx, y: 2.3 + 2.96, z: dz })
      },
    )
  } else if (variant === 'coil') {
    // 盘香：螺旋线香，平放于香插盘上，外端燃点
    const coilPts: THREE.Vector3[] = []
    for (let i = 0; i <= 240; i++) {
      const t = i / 240
      const a = t * Math.PI * 8
      const r = 0.22 + t * 0.95
      coilPts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r))
    }
    const curve = new THREE.CatmullRomCurve3(coilPts)
    const coil = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 160, 0.05, 8, false),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 }),
    )
    coil.position.y = 2.35
    group.add(coil)
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.34, 0.12, 48),
      new THREE.MeshStandardMaterial({ color: 0x8a5c3a, roughness: 0.5, metalness: 0.5 }),
    )
    plate.position.y = 2.28
    group.add(plate)
    const end = coilPts[coilPts.length - 1]
    addEmber(group, end.x, 2.44, end.z, 0.07)
    tips.push({ x: end.x, y: 2.5, z: end.z })
  } else {
    // 塔香：塔形香立在香插上
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.6, 12),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 }),
    )
    cone.position.y = 3.15
    group.add(cone)
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.8, 0.1, 32),
      new THREE.MeshStandardMaterial({ color: 0xd4a92c, roughness: 0.3, metalness: 0.6 }),
    )
    plate.position.y = 2.34
    group.add(plate)
    // 底座香灰环
    const ashRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.07, 10, 32),
      new THREE.MeshStandardMaterial({ color: 0xc3c8c8, roughness: 1 }),
    )
    ashRing.rotation.x = Math.PI / 2
    ashRing.position.y = 2.4
    group.add(ashRing)
    addEmber(group, 0, 3.98, 0, 0.08)
    tips.push({ x: 0, y: 4.05, z: 0 })
  }

  /* ---------- 青烟粒子（加色混合，逆光更明亮） ---------- */
  /* ---------- 青烟粒子 ---------- */
  // 纸底上不能用加色混合：白色叠加只会把烟烧成一颗颗白点（实测截图里像浮着的小球）。
  // 烟在浅色纸上看的是「吃掉一点底色」，所以用普通混合、冷灰绿、低不透明度堆出层次。
  const smokeTex = makeSmokeTexture(THREE)
  const N = 84
  const sprites: CenserRig['smokeSprites'] = []
  for (let i = 0; i < N; i++) {
    const mat = new THREE.SpriteMaterial({
      map: smokeTex,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      color: 0x74827d,
    })
    const s = new THREE.Sprite(mat)
    group.add(s)
    // 初始即置于香头上方、处于烟程中段 → 一打开就能看到青烟
    const tip = tips[Math.floor(Math.random() * tips.length)]
    s.position.set(tip.x + (Math.random() - 0.5) * 0.06, tip.y + Math.random() * 2.2, tip.z + (Math.random() - 0.5) * 0.06)
    s.scale.setScalar(0.3 + Math.random() * 0.5)
    sprites.push({ s, mat, life: 1 + Math.random() * 6, phase: Math.random() * Math.PI * 2, tip: Math.floor(Math.random() * tips.length) })
  }

  // 香头炭火点光源（微闪，随 lit 状态开启）
  const emberLight = new THREE.PointLight(0xff8844, 0.6, 3.2, 2)
  const firstTip = tips[0] ?? { x: 0, y: 3, z: 0 }
  emberLight.position.set(firstTip.x, firstTip.y, firstTip.z)
  group.add(emberLight)

  const rig: CenserRig = { group, embers, halos, ashCaps, smoke: null, smokeSprites: sprites, tips, bounds: CENSER_BOUNDS[variant], lit: true, update: () => undefined }

  const update = (dt: number, t: number) => {
    for (const e of rig.embers) {
      // 炭火脉动：相位随机 + 呼吸闪烁
      const flick = Math.sin(t * 7 + e.mesh.position.x * 12) * 0.5 + Math.sin(t * 13 + e.mesh.position.z * 9) * 0.5
      const glow = rig.lit ? 0.72 + flick * 0.22 : 0
      e.mat.color.setRGB(glow, glow * 0.38, glow * 0.12)
    }
    for (let i = 0; i < rig.halos.length; i++) {
      const h = rig.halos[i]
      const flick = Math.sin(t * 6.7 + i * 2.3) * 0.5 + Math.sin(t * 12.9 + i * 1.1) * 0.5
      h.mat.opacity = rig.lit ? 0.4 + flick * 0.14 : 0
      h.s.scale.setScalar(h.base * (1 + flick * 0.06))
    }
    emberLight.intensity = rig.lit ? 0.35 + Math.sin(t * 9.5) * 0.14 + Math.sin(t * 17.3) * 0.08 : 0
    if (variant === 'sticks') {
      const ashLen = (0.34 + Math.sin(t * 0.4) * 0.03) * (rig.lit ? 1 : 0.6)
      for (const c of rig.ashCaps) c.scale.y = ashLen / 0.34
    }
    for (let i = 0; i < sprites.length; i++) {
      const p = sprites[i]
      p.life -= dt
      if (p.life <= 0) {
        const tip = rig.tips[p.tip] ?? rig.tips[0]
        p.life = 5.5 + Math.random() * 3
        p.mat.opacity = 0
        p.s.position.set(tip.x + (Math.random() - 0.5) * 0.04, tip.y, tip.z + (Math.random() - 0.5) * 0.04)
        p.s.scale.setScalar(0.12)
      } else {
        const k = 1 - p.life / 8.5
        const y = p.s.position.y + dt * (0.45 + k * 0.35)
        p.s.position.y = y
        p.s.position.x = p.s.position.x + Math.sin(t * 1.6 + p.phase + y * 1.2) * dt * 0.22
        p.s.position.z = p.s.position.z + Math.cos(t * 1.3 + p.phase * 1.3 + y * 1.1) * dt * 0.18
        const sc = 0.12 + k * 0.85
        p.s.scale.setScalar(sc)
        // 刚离香头的烟最细，中段最浓，飘高后散尽
        p.mat.opacity = rig.lit ? 0.24 * Math.sin(Math.PI * Math.min(1, Math.max(0, k))) : 0
      }
    }
  }

  rig.update = update

  group.scale.setScalar(scale)
  return { group, rig }
}
