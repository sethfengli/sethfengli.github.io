import { useEffect, useRef, useState, type ReactNode } from 'react'
import type * as THREE from 'three'
import type { Wish } from '../../lib/wishes'
import { createStage, makeRibbonTexture, type Stage } from './stage'
import { createCenser } from './censer'
import { useI18n } from '../../i18n'

/**
 * 3D 千年松柏许愿树
 * - 造型：虬曲老干（多段弯曲锥柱）+ 平展枝干 + 松针簇贴图构成的云片冠层（松柏云冠）；
 * - 红绸飘带：三段拆分的绸面逐段摆动（下段幅度更大），长短/色阶/相位随机，风起时整体飘逸；
 * - 交互：仅鼠标拖拽旋转 + 滚轮/捏合缩放（无自动旋转），点击飘带查看心愿、点击香炉供香。
 * WebGL 不可用时回退 2D 许愿树。
 */

interface RibbonRig {
  group: THREE.Group
  segs: THREE.Mesh[]
  wish: Wish
  phase: number
  speed: number
  scale: number
}

interface TreeRig {
  ribbons: RibbonRig[]
  canopy: THREE.Group
  censer: import('./censer').CenserRig
}

interface Props {
  wishes: Wish[]
  onRibbonClick: (w: Wish) => void
  fallback?: ReactNode
}

const RIBBON_SPOTS: Array<{ x: number; y: number; z: number; rot: number }> = [
  { x: -3.6, y: 6.0, z: 1.5, rot: 0.2 },
  { x: -2.5, y: 7.0, z: -2.0, rot: -0.15 },
  { x: 3.4, y: 6.2, z: -1.8, rot: 0.1 },
  { x: 2.2, y: 7.3, z: 2.3, rot: -0.22 },
  { x: 0.5, y: 8.6, z: 0.4, rot: 0.05 },
  { x: -4.4, y: 5.1, z: -0.8, rot: 0.26 },
  { x: 4.3, y: 5.2, z: 0.9, rot: -0.18 },
  { x: -1.2, y: 5.6, z: 3.1, rot: 0.3 },
  { x: 1.4, y: 5.5, z: -3.2, rot: -0.28 },
  { x: -2.9, y: 6.5, z: 2.8, rot: 0.12 },
  { x: 2.8, y: 6.7, z: 2.6, rot: -0.08 },
  { x: -0.5, y: 7.5, z: -2.3, rot: 0.16 },
  { x: 4.9, y: 6.0, z: -0.5, rot: -0.24 },
  { x: -5.0, y: 5.7, z: 0.6, rot: 0.2 },
  { x: 1.2, y: 4.9, z: 3.7, rot: -0.14 },
  { x: -1.0, y: 4.9, z: -3.9, rot: 0.22 },
  { x: 3.7, y: 7.0, z: 1.2, rot: -0.1 },
  { x: -3.9, y: 6.8, z: -1.5, rot: 0.14 },
  { x: 0.3, y: 9.1, z: -1.1, rot: -0.06 },
  { x: -0.3, y: 9.0, z: 1.7, rot: 0.1 },
  { x: 2.5, y: 7.8, z: -1.3, rot: -0.2 },
  { x: -2.6, y: 7.8, z: 1.3, rot: 0.18 },
  { x: 5.4, y: 6.4, z: 0.3, rot: -0.26 },
  { x: -5.5, y: 6.2, z: -0.3, rot: 0.24 },
]

/** 松针簇贴图（径向针叶） */
function makePineTuft(THREE: typeof import('three'), shade: 0 | 1 | 2): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 256
  cv.height = 256
  const ctx = cv.getContext('2d')!
  const colors = ['46,121,92', '37,94,74', '58,135,104']
  const c = colors[shade]
  ctx.strokeStyle = `rgba(${c},0.9)`
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (let i = 0; i < 160; i++) {
    const a = Math.random() * Math.PI * 2
    const r0 = 18 + Math.random() * 30
    const r1 = 90 + Math.random() * 40
    ctx.beginPath()
    ctx.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0)
    ctx.lineTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1)
    ctx.stroke()
  }
  ctx.fillStyle = `rgba(${c},0.85)`
  ctx.beginPath()
  ctx.arc(128, 128, 26, 0, Math.PI * 2)
  ctx.fill()
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** 树皮纹理（纵向皴纹 + 节疤 + 深裂纹） */
function makeBarkTexture(THREE: typeof import('three')): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 512
  cv.height = 512
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#6a5947'
  ctx.fillRect(0, 0, 512, 512)
  // 纵向深裂纹（先画暗槽）
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 512
    ctx.strokeStyle = `rgba(30,22,14,${0.2 + Math.random() * 0.4})`
    ctx.lineWidth = 2 + Math.random() * 4
    ctx.beginPath()
    ctx.moveTo(x, 0)
    for (let y = 0; y <= 512; y += 24) {
      ctx.lineTo(x + Math.sin(y * 0.02 + i) * 7, y)
    }
    ctx.stroke()
  }
  // 中间基调纹
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * 512
    ctx.strokeStyle = `rgba(96,76,52,${0.2 + Math.random() * 0.3})`
    ctx.lineWidth = 1 + Math.random() * 3
    ctx.beginPath()
    ctx.moveTo(x, 0)
    for (let y = 0; y <= 512; y += 32) {
      ctx.lineTo(x + Math.sin(y * 0.02 + i) * 6, y)
    }
    ctx.stroke()
  }
  // 亮面棱线
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 512
    ctx.strokeStyle = `rgba(180,150,110,${0.08 + Math.random() * 0.12})`
    ctx.lineWidth = 1 + Math.random() * 2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    for (let y = 0; y <= 512; y += 32) {
      ctx.lineTo(x + Math.sin(y * 0.02 + i * 2) * 5, y)
    }
    ctx.stroke()
  }
  // 节疤/树瘤
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    ctx.strokeStyle = '#3b2f20'
    ctx.lineWidth = 3 + Math.random() * 2
    ctx.beginPath()
    ctx.ellipse(x, y, 10 + Math.random() * 20, 6 + Math.random() * 11, Math.random() * 3, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(80,60,38,0.5)'
    ctx.beginPath()
    ctx.ellipse(x, y, 6 + Math.random() * 10, 4 + Math.random() * 6, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  return tex
}

/** 树皮凹凸贴图（只画裂纹明暗，供 bumpMap） */
function makeBarkBump(THREE: typeof import('three')): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 512
  cv.height = 512
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 512
    ctx.strokeStyle = `rgba(60,60,60,${0.35 + Math.random() * 0.3})`
    ctx.lineWidth = 2 + Math.random() * 5
    ctx.beginPath()
    ctx.moveTo(x, 0)
    for (let y = 0; y <= 512; y += 24) {
      ctx.lineTo(x + Math.sin(y * 0.02 + i) * 7, y)
    }
    ctx.stroke()
  }
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 512
    ctx.strokeStyle = `rgba(160,160,160,${0.2 + Math.random() * 0.25})`
    ctx.lineWidth = 1 + Math.random() * 2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    for (let y = 0; y <= 512; y += 32) {
      ctx.lineTo(x + Math.sin(y * 0.02 + i * 2) * 5, y)
    }
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
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
          distance: 30,
          autoRotate: 0,
          phi: 1.02,
          minPhi: 0.4,
          maxPhi: 1.5,
          minDistance: 4.5,
          maxDistance: 30,
        })
        stageRef.current = stage
      } catch {
        setFailed(true)
        return
      }
      const S = stage.scene

      /* ---------- 地面 ---------- */
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(16, 56),
        new THREE.MeshStandardMaterial({ color: 0xddeedf, roughness: 1 }),
      )
      ground.rotation.x = -Math.PI / 2
      ground.position.y = -4.4
      ground.receiveShadow = true
      S.add(ground)
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(3.6, 3.8, 72),
        new THREE.MeshBasicMaterial({ color: 0x8fcdb2, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.y = -4.34
      S.add(ring)
      // 树底接地软阴影（树冠遮挡形成的暗区）
      stage.addCatchShadow({ radius: 4.6, y: -4.32, opacity: 0.42 })
      // 草地小花
      const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf6c6be, roughness: 0.8 })
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2
        const r = 4.5 + Math.random() * 9
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), flowerMat)
        f.position.set(Math.cos(a) * r, -4.28, Math.sin(a) * r)
        S.add(f)
      }

      /* ---------- 虬曲老干（千年古柏：深皴树皮 + 根部板根 + 树瘤） ---------- */
      const barkTex = makeBarkTexture(THREE)
      const barkBump = makeBarkBump(THREE)
      const bark = new THREE.MeshStandardMaterial({
        map: barkTex,
        bumpMap: barkBump,
        bumpScale: 0.6,
        roughness: 0.94,
      })
      const bark2 = new THREE.MeshStandardMaterial({
        map: barkTex,
        bumpMap: barkBump,
        bumpScale: 0.55,
        color: 0xb08d63,
        roughness: 0.9,
      })
      const trunkPts = [
        [0, -4.4, 0],
        [0.35, -3.3, 0.4],
        [0.75, -2.3, -0.35],
        [1.05, -1.4, 0.6],
        [1.25, -0.4, -0.5],
        [1.05, 0.7, 0.3],
        [0.55, 1.8, -0.35],
        [0.05, 2.9, 0.3],
        [-0.35, 3.9, -0.25],
        [-0.15, 4.9, 0.25],
        [0.1, 5.8, -0.05],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z))
      const radii = [1.85, 1.65, 1.48, 1.3, 1.16, 1.02, 0.9, 0.78, 0.66, 0.54, 0.44]
      for (let i = 0; i < trunkPts.length - 1; i++) {
        const a = trunkPts[i]
        const b = trunkPts[i + 1]
        const mid = a.clone().add(b).multiplyScalar(0.5)
        // 加长 1.22 倍 → 相邻段相互嵌入，消除“被砍断”的接缝
        const len = a.distanceTo(b) * 1.22
        const rTop = radii[i + 1]
        const rBot = radii[i]
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, 26), i % 2 ? bark : bark2)
        seg.castShadow = true
        seg.position.copy(mid)
        seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
        S.add(seg)
      }
      // 板根/露根（千年古柏的标志）：根部八向鼓包
      const rootMat = new THREE.MeshStandardMaterial({ map: barkTex, bumpMap: barkBump, bumpScale: 0.6, roughness: 0.95 })
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.25
        const root = new THREE.Mesh(new THREE.ConeGeometry(0.55 + Math.random() * 0.3, 1.5 + Math.random() * 0.5, 8), rootMat)
        root.position.set(Math.cos(a) * 1.55, -4.05, Math.sin(a) * 1.55)
        root.rotation.x = Math.PI - Math.sin(a) * 0.35
        root.rotation.z = Math.cos(a) * 0.35
        S.add(root)
      }
      // 树瘤（树干上凸起的结节）
      const burlMat = new THREE.MeshStandardMaterial({ map: barkTex, bumpMap: barkBump, bumpScale: 0.5, roughness: 0.95 })
      for (let i = 0; i < 9; i++) {
        const t = 0.12 + Math.random() * 0.75
        const idx = Math.min(trunkPts.length - 2, Math.floor(t * (trunkPts.length - 1)))
        const p = trunkPts[idx].clone().lerp(trunkPts[idx + 1], t * (trunkPts.length - 1) - idx)
        const a = Math.random() * Math.PI * 2
        const r = radii[idx] * 0.9
        const burl = new THREE.Mesh(new THREE.SphereGeometry(0.16 + Math.random() * 0.22, 10, 8), burlMat)
        burl.scale.set(1, 0.7 + Math.random() * 0.5, 1)
        burl.position.set(p.x + Math.cos(a) * r, p.y, p.z + Math.sin(a) * r)
        S.add(burl)
      }

      /* ---------- 平展枝干 ---------- */
      const branchCurves: Array<Array<[number, number, number]>> = [
        [[0.1, 4.9, 0.3], [-1.6, 5.4, 1.1], [-3.0, 5.9, 1.8], [-4.6, 6.3, 1.2]],
        [[0.2, 4.6, -0.2], [1.4, 5.2, -1.0], [2.8, 5.8, -1.7], [4.4, 6.2, -1.0]],
        [[-0.4, 3.6, -0.2], [-2.0, 4.1, -0.9], [-3.6, 4.6, -1.6], [-5.2, 5.0, -0.9]],
        [[0.5, 3.4, 0.3], [2.1, 3.9, 1.0], [3.7, 4.4, 1.7], [5.3, 4.8, 1.0]],
        [[0.2, 5.8, 0.1], [-0.8, 6.4, -0.6], [-1.6, 7.1, -1.4], [-2.6, 7.8, -1.2]],
        [[-0.1, 5.6, 0.2], [0.7, 6.2, 0.9], [1.5, 6.9, 1.6], [2.5, 7.6, 1.3]],
        [[0.0, 2.4, 0.2], [-1.2, 2.9, 1.4], [-2.5, 3.4, 2.4], [-3.9, 3.9, 2.7]],
        [[-0.2, 2.2, -0.2], [1.1, 2.7, -1.3], [2.4, 3.2, -2.3], [3.8, 3.7, -2.6]],
      ]
      for (const pts of branchCurves) {
        const vecs = pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))
        for (let i = 0; i < vecs.length - 1; i++) {
          const a = vecs[i]
          const b = vecs[i + 1]
          const mid = a.clone().add(b).multiplyScalar(0.5)
          const len = a.distanceTo(b)
          const r = 0.26 * (1 - i / vecs.length) + 0.05
          const seg = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.25, len, 10), bark)
          seg.position.copy(mid)
          seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
          S.add(seg)
        }
      }

      /* ---------- 松针云片冠层 ---------- */
      const tuft0 = makePineTuft(THREE, 0)
      const tuft1 = makePineTuft(THREE, 1)
      const tuft2 = makePineTuft(THREE, 2)
      const canopy = new THREE.Group()
      const clusters: Array<[number, number, number, number]> = [
        [-3.6, 6.6, 1.4, 2.4],
        [3.4, 6.5, -1.3, 2.4],
        [-1.8, 7.6, -1.9, 2.2],
        [1.7, 7.8, 1.8, 2.2],
        [0.3, 9.2, 0.4, 2.6],
        [-4.6, 5.9, -0.9, 2.0],
        [4.5, 6.0, 0.8, 2.0],
        [-2.6, 8.2, 0.9, 1.7],
        [2.6, 8.3, -0.7, 1.7],
        [-3.2, 4.8, -2.4, 1.5],
        [3.3, 4.9, 2.2, 1.5],
        [-0.4, 5.4, 3.4, 1.4],
        [-0.6, 8.9, 1.9, 1.3],
        [1.9, 8.7, -2.0, 1.3],
      ]
      for (const [cx, cy, cz, cr] of clusters) {
        const n = 26
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2
          const r = Math.sqrt(Math.random()) * cr
          const rnd = Math.random()
          const spr = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: rnd > 0.55 ? tuft0 : rnd > 0.25 ? tuft1 : tuft2,
              transparent: true,
              depthWrite: false,
            }),
          )
          const s = 1.5 + Math.random() * 1.6
          spr.scale.set(s, s * (0.85 + Math.random() * 0.25), 1)
          spr.position.set(cx + Math.cos(a) * r, cy + (Math.random() - 0.5) * 0.65, cz + Math.sin(a) * r)
          spr.userData.baseScale = s
          canopy.add(spr)
        }
        // 垂枝（松柏下垂小枝 + 末端针簇）
        const strandMat = new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.9 })
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2
          const r = cr * (0.5 + Math.random() * 0.5)
          const len = 1.0 + Math.random() * 1.2
          const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, len, 6), strandMat)
          strand.position.set(cx + Math.cos(a) * r, cy - 0.55 - len / 2, cz + Math.sin(a) * r)
          canopy.add(strand)
          const tip = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: Math.random() > 0.5 ? tuft1 : tuft2, transparent: true, depthWrite: false }),
          )
          tip.scale.set(0.8, 0.8, 1)
          tip.position.set(cx + Math.cos(a) * r, cy - 0.55 - len, cz + Math.sin(a) * r)
          canopy.add(tip)
        }
      }
      // 树冠放大（约三倍视觉体积）
      canopy.scale.setScalar(2.1)
      S.add(canopy)

      /* ---------- 香炉（树下，盘香禅修） ---------- */
      const { group: censerGroup, rig: censerRig } = createCenser(THREE, 'coil', 0.72)
      censerGroup.position.set(5.6, -4.4, 3.9)
      S.add(censerGroup)

      const rig: TreeRig = {
        ribbons: [],
        canopy,
        censer: censerRig,
      }
      rigRef.current = rig

      /* ---------- 飘落松针/花瓣（气氛粒子） ---------- */
      const petalTex = makePineTuft(THREE, 2)
      const petals: Array<{ s: THREE.Sprite; speed: number; phase: number; sway: number }> = []
      for (let i = 0; i < 22; i++) {
        const mat = new THREE.SpriteMaterial({ map: petalTex, transparent: true, depthWrite: false, opacity: 0.5 })
        const s = new THREE.Sprite(mat)
        s.scale.setScalar(0.5 + Math.random() * 0.5)
        S.add(s)
        petals.push({
          s,
          speed: 0.35 + Math.random() * 0.45,
          phase: Math.random() * Math.PI * 2,
          sway: 4 + Math.random() * 4,
        })
      }

      /* ---------- 拾取 ---------- */
      const pickObjects = (): THREE.Object3D[] => [
        ...rig.ribbons.flatMap((r) => [r.group]),
        censerGroup,
        ...rig.censer.embers.map((e) => e.mesh),
      ]
      stage.setPick(pickObjects, (obj) => {
        if (!obj) return
        // 飘带可点：从命中对象沿父链上溯找带 wish 的组
        let cur: THREE.Object3D | null = obj
        while (cur) {
          const w = cur.userData?.wish as Wish | undefined
          if (w) {
            onRibbonClick(w)
            return
          }
          cur = cur.parent
        }
        // 其下仍视为点香炉：供香
        if (obj === censerGroup || obj.parent === censerGroup || rig.censer.embers.some((e) => e.mesh === obj)) {
          rig.censer.lit = true
        }
      })

      /* ---------- 帧动画 ---------- */
      const wind = () => Math.sin(performance.now() * 0.0005) * 0.5 + Math.sin(performance.now() * 0.00013) * 0.5
      stage.onFrame((dt, t) => {
        const gust = 1 + wind() * 0.8
        // 飘带分段摆动（下段幅度更大 → 飘逸）
        for (const r of rig.ribbons) {
          for (let i = 0; i < r.segs.length; i++) {
            const amp = (0.05 + i * 0.085) * gust * r.scale
            r.segs[i].rotation.x = Math.sin(t * r.speed + r.phase + i * 0.7) * amp
            r.segs[i].rotation.z = Math.cos(t * r.speed * 0.8 + r.phase * 1.3 + i * 0.5) * amp * 0.5
          }
          r.group.rotation.y = Math.sin(t * 0.6 + r.phase) * 0.1 + r.group.userData.baseRot
        }
        // 冠层微摆
        canopy.rotation.y = Math.sin(t * 0.25) * 0.015
        canopy.rotation.x = Math.sin(t * 0.2) * 0.008
        // 香炉（盘香 + 青烟）
        rig.censer.update(dt, t)
        // 飘落针叶：从树冠高度盘旋落下，落在地面后重生
        for (const p of petals) {
          p.s.position.y -= p.speed * dt
          p.s.position.x += Math.sin(t * 1.3 + p.phase + p.s.position.y * 0.8) * dt * p.sway * 0.12
          p.s.position.z += Math.cos(t * 1.1 + p.phase * 1.4 + p.s.position.y * 0.7) * dt * p.sway * 0.1
          ;(p.s.material as THREE.SpriteMaterial).opacity = 0.45 * Math.min(1, (p.s.position.y + 6) / 3)
          if (p.s.position.y < -4.3) {
            const a = Math.random() * Math.PI * 2
            const r = 1.5 + Math.random() * 4.5
            p.s.position.set(Math.cos(a) * r, 8 + Math.random() * 2, Math.sin(a) * r)
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
      const list = wishes.slice(0, RIBBON_SPOTS.length)
      list.forEach((w, i) => {
        const spot = RIBBON_SPOTS[i]
        const shade = i % 3
        const scale = 0.85 + ((i * 37) % 10) / 24 // 0.85~1.22 随机长短
        const group = new THREE.Group()
        group.position.set(spot.x, spot.y, spot.z)
        group.rotation.y = spot.rot
        group.userData.wish = w
        group.userData.baseRot = spot.rot
        const texBase = makeRibbonTexture(THREE, w.text, shade)
        const segs: THREE.Mesh[] = []
        const segDefs = [
          { off: 0.0, rep: 0.4, h: 0.62 },
          { off: 0.4, rep: 0.34, h: 0.56 },
          { off: 0.74, rep: 0.26, h: 0.5 },
        ]
        let yTop = -1.15
        for (const d of segDefs) {
          const tex = texBase.clone()
          tex.wrapS = THREE.RepeatWrapping
          tex.wrapT = THREE.RepeatWrapping
          tex.offset.set(0, d.off)
          tex.repeat.set(1, d.rep)
          tex.needsUpdate = true
          const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide })
          const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62 * scale, d.h * scale), mat)
          // 旋转轴在其上缘
          mesh.geometry.translate(0, -d.h * scale * 0.5, 0)
          mesh.position.y = yTop
          mesh.rotation.y = 0
          group.add(mesh)
          segs.push(mesh)
          yTop -= d.h * scale * 0.98
        }
        S.add(group)
        rig.ribbons.push({
          group,
          segs,
          wish: w,
          phase: Math.random() * Math.PI * 2,
          speed: 1.1 + Math.random() * 0.7,
          scale,
        })
      })
    })
  }, [wishes, ready])

  if (failed) return <>{fallback}</>

  return (
    <div className="relative h-[520px] w-full sm:h-[640px]">
      <canvas ref={canvasRef} className="h-full w-full" aria-label={t('common.treeAlt')} />
      <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-sandalwood-950/60 px-3 py-1 text-[11px] text-paper/80 backdrop-blur-sm">
        {t('common.treeHint')}
      </p>
    </div>
  )
}
