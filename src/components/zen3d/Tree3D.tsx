import { useEffect, useRef, useState, type ReactNode } from 'react'
import type * as THREE from 'three'
import type { Wish } from '../../lib/wishes'
import { createStage, makeRibbonTexture, type Stage } from './stage'

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
  incense: THREE.Group
  embers: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }>
  smoke: THREE.Points | null
  smokeParts: Array<{ x: number; y: number; z: number; vx: number; vy: number; life: number }>
  lit: boolean
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
function makePineTuft(THREE: typeof import('three'), shade: 0 | 1): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 256
  cv.height = 256
  const ctx = cv.getContext('2d')!
  const c = shade === 0 ? '46,121,92' : '37,94,74'
  ctx.strokeStyle = `rgba(${c},0.9)`
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (let i = 0; i < 150; i++) {
    const a = Math.random() * Math.PI * 2
    const r0 = 18 + Math.random() * 30
    const r1 = 90 + Math.random() * 40
    ctx.beginPath()
    ctx.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0)
    ctx.lineTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1)
    ctx.stroke()
  }
  // 深色簇心
  ctx.fillStyle = `rgba(${c},0.85)`
  ctx.beginPath()
  ctx.arc(128, 128, 26, 0, Math.PI * 2)
  ctx.fill()
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function Tree3D({ wishes, onRibbonClick, fallback }: Props) {
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
          distance: 14,
          autoRotate: 0,
          phi: 1.02,
          minPhi: 0.4,
          maxPhi: 1.5,
          minDistance: 4.5,
          maxDistance: 46,
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
      S.add(ground)
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(3.6, 3.8, 72),
        new THREE.MeshBasicMaterial({ color: 0x8fcdb2, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.y = -4.34
      S.add(ring)
      // 草地小花
      const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf6c6be, roughness: 0.8 })
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2
        const r = 4.5 + Math.random() * 9
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), flowerMat)
        f.position.set(Math.cos(a) * r, -4.28, Math.sin(a) * r)
        S.add(f)
      }

      /* ---------- 虬曲老干 ---------- */
      const bark = new THREE.MeshStandardMaterial({ color: 0x5d4d38, roughness: 0.92 })
      const bark2 = new THREE.MeshStandardMaterial({ color: 0x6a5947, roughness: 0.9 })
      const trunkPts = [
        [0, -4.4, 0],
        [0.4, -3.1, 0.5],
        [0.9, -1.9, -0.4],
        [1.3, -0.5, 0.9],
        [0.8, 0.9, -0.5],
        [0.2, 2.2, 0.4],
        [-0.6, 3.4, -0.3],
        [-0.2, 4.6, 0.3],
        [0.2, 5.8, 0],
      ].map(([x, y, z]) => new THREE.Vector3(x, y, z))
      const radii = [1.7, 1.5, 1.3, 1.1, 0.95, 0.8, 0.66, 0.55, 0.45]
      for (let i = 0; i < trunkPts.length - 1; i++) {
        const a = trunkPts[i]
        const b = trunkPts[i + 1]
        const mid = a.clone().add(b).multiplyScalar(0.5)
        const len = a.distanceTo(b)
        const rTop = radii[i + 1]
        const rBot = radii[i]
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, 16), i % 2 ? bark : bark2)
        seg.position.copy(mid)
        seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
        S.add(seg)
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
      ]
      for (const [cx, cy, cz, cr] of clusters) {
        const n = 20
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2
          const r = Math.sqrt(Math.random()) * cr
          const spr = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: Math.random() > 0.4 ? tuft0 : tuft1, transparent: true, depthWrite: false }),
          )
          const s = 1.1 + Math.random() * 1.3
          spr.scale.set(s, s * (0.85 + Math.random() * 0.25), 1)
          spr.position.set(cx + Math.cos(a) * r, cy + (Math.random() - 0.5) * 0.7, cz + Math.sin(a) * r)
          spr.userData.baseScale = s
          canopy.add(spr)
        }
      }
      S.add(canopy)

      /* ---------- 香炉（树下） ---------- */
      const incense = new THREE.Group()
      incense.position.set(5.4, -4.4, 3.8)
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 0.4, 24), new THREE.MeshStandardMaterial({ color: 0x8a5c3a, roughness: 0.7 }))
      base.position.y = 0.2
      incense.add(base)
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.55, 0.45, 24), new THREE.MeshStandardMaterial({ color: 0xa5713f, roughness: 0.55, metalness: 0.4 }))
      bowl.position.y = 0.58
      incense.add(bowl)
      const sticks = new THREE.Group()
      const stickMat = new THREE.MeshStandardMaterial({ color: 0x8c2f39, roughness: 0.9 })
      const embers: TreeRig['embers'] = []
      ;([[-0.16, 0.08, 0.1], [0.04, -0.14, -0.06], [0.18, 0.09, 0.12]] as Array<[number, number, number]>).forEach(
        ([dx, dz, tilt]) => {
          const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8), stickMat)
          st.position.set(dx, 1.4, dz)
          st.rotation.x = tilt
          st.rotation.z = -tilt
          sticks.add(st)
          const emberMat = new THREE.MeshBasicMaterial({ color: 0xf1d25f })
          const ember = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), emberMat)
          ember.position.set(dx, 2.05, dz)
          sticks.add(ember)
          embers.push({ mesh: ember, mat: emberMat })
        },
      )
      incense.add(sticks)
      S.add(incense)

      const rig: TreeRig = {
        ribbons: [],
        canopy,
        incense,
        embers,
        smoke: null,
        smokeParts: [],
        lit: false,
      }
      rigRef.current = rig

      /* ---------- 烟粒子 ---------- */
      const smokeGeo = new THREE.BufferGeometry()
      const N = 120
      const pos = new Float32Array(N * 3)
      smokeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      const smokeMat = new THREE.PointsMaterial({ color: 0xb9c6c2, size: 0.2, transparent: true, opacity: 0, depthWrite: false })
      const smoke = new THREE.Points(smokeGeo, smokeMat)
      smoke.position.copy(incense.position)
      S.add(smoke)
      rig.smoke = smoke
      for (let i = 0; i < N; i++) {
        rig.smokeParts.push({
          x: (Math.random() - 0.5) * 0.3,
          y: 0.9 + Math.random() * 0.3,
          z: (Math.random() - 0.5) * 0.3,
          vx: (Math.random() - 0.5) * 0.12,
          vy: 0.4 + Math.random() * 0.6,
          life: Math.random() * 3,
        })
      }

      /* ---------- 拾取 ---------- */
      stage.setPick(
        () => [
          ...rig.ribbons.flatMap((r) => [r.group]),
          incense,
          ...rig.embers.map((e) => e.mesh),
        ],
        (obj) => {
          if (!obj) return
          const w = obj.userData?.wish as Wish | undefined
          if (w) {
            onRibbonClick(w)
            return
          }
          rig.lit = true
        },
      )

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
        // 炭火 + 烟
        for (const e of rig.embers) {
          const glow = rig.lit ? 0.85 + Math.sin(t * 6 + e.mesh.position.x * 10) * 0.15 : 0
          e.mat.color.setScalar(glow)
        }
        const sm = rig.smoke
        if (sm) {
          const attr = sm.geometry.getAttribute('position') as THREE.BufferAttribute
          ;(sm.material as THREE.PointsMaterial).opacity = rig.lit ? 0.5 : 0
          for (let i = 0; i < rig.smokeParts.length; i++) {
            const p = rig.smokeParts[i]
            if (!rig.lit) {
              attr.setXYZ(i, p.x, p.y, p.z)
              continue
            }
            p.life -= dt
            if (p.life <= 0) {
              p.x = (Math.random() - 0.5) * 0.3
              p.y = 0.9
              p.z = (Math.random() - 0.5) * 0.3
              p.vx = (Math.random() - 0.5) * 0.12
              p.vy = 0.4 + Math.random() * 0.6
              p.life = 3
            }
            p.y += p.vy * dt
            p.x += p.vx * dt + Math.sin(t * 2 + i) * 0.002
            attr.setXYZ(i, p.x, p.y, p.z)
          }
          attr.needsUpdate = true
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
    <div className="relative h-[440px] w-full sm:h-[540px]">
      <canvas ref={canvasRef} className="h-full w-full" aria-label="3D 千年松柏许愿树" />
      <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-sandalwood-950/60 px-3 py-1 text-[11px] text-paper/80 backdrop-blur-sm">
        拖拽旋转 · 滚轮缩放看细节 · 点击飘带查看心愿 · 点击香炉供香
      </p>
    </div>
  )
}
