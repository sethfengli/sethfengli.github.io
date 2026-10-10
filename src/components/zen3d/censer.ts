import type * as THREE from 'three'

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
  ashCaps: THREE.Mesh[]
  smoke: THREE.Points | null
  smokeSprites: Array<{ s: THREE.Sprite; mat: THREE.SpriteMaterial; life: number; phase: number; tip: number }>
  tips: Array<{ x: number; y: number; z: number }>
  lit: boolean
  update: (dt: number, t: number) => void
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
  const ashCaps: THREE.Mesh[] = []
  const tips: Array<{ x: number; y: number; z: number }> = []

  /* ---------- 香型 ---------- */
  if (variant === 'sticks') {
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x8c2f39, roughness: 0.9 })
    const ashMat = new THREE.MeshStandardMaterial({ color: 0xd9dcd6, roughness: 1 })
    ;([[-0.3, 0.22, 0.1], [0.05, -0.28, -0.05], [0.32, 0.18, -0.12]] as Array<[number, number, number]>).forEach(
      ([dx, dz, tilt]) => {
        const st = new THREE.Group()
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.6, 10), stickMat)
        stick.position.y = 1.3
        st.add(stick)
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.34, 10), ashMat)
        cap.position.y = 2.75
        st.add(cap)
        ashCaps.push(cap)
        const emberMat = new THREE.MeshBasicMaterial({ color: 0xe0733a })
        const ember = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), emberMat)
        ember.position.y = 2.58
        st.add(ember)
        embers.push({ mesh: ember, mat: emberMat })
        st.position.set(dx, 2.3, dz)
        st.rotation.x = tilt * 0.6
        st.rotation.z = -tilt * 0.6
        group.add(st)
        tips.push({ x: dx, y: 2.3 + 2.9, z: dz })
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
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xe0733a })
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), emberMat)
    ember.position.set(end.x, 2.42, end.z)
    group.add(ember)
    embers.push({ mesh: ember, mat: emberMat })
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
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xe0733a })
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), emberMat)
    ember.position.y = 3.95
    group.add(ember)
    embers.push({ mesh: ember, mat: emberMat })
    tips.push({ x: 0, y: 4.05, z: 0 })
  }

  /* ---------- 青烟粒子（加色混合，逆光更明亮） ---------- */
  const smokeTex = makeSmokeTexture(THREE)
  const N = 70
  const sprites: CenserRig['smokeSprites'] = []
  for (let i = 0; i < N; i++) {
    const mat = new THREE.SpriteMaterial({
      map: smokeTex,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      color: 0xf2f5f6,
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

  const rig: CenserRig = { group, embers, ashCaps, smoke: null, smokeSprites: sprites, tips, lit: true, update: () => undefined }

  const update = (dt: number, t: number) => {
    for (const e of rig.embers) {
      // 炭火脉动：相位随机 + 呼吸闪烁
      const flick = Math.sin(t * 7 + e.mesh.position.x * 12) * 0.5 + Math.sin(t * 13 + e.mesh.position.z * 9) * 0.5
      const glow = rig.lit ? 0.72 + flick * 0.22 : 0
      e.mat.color.setRGB(glow, glow * 0.38, glow * 0.12)
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
        p.mat.opacity = rig.lit ? (k < 0.15 ? (k / 0.15) * 0.42 : 0.42 * (1 - (k - 0.15) / 0.85)) : 0
      }
    }
  }

  rig.update = update

  group.scale.setScalar(scale)
  return { group, rig }
}
