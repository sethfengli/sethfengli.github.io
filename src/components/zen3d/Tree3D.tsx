import { useEffect, useRef, useState, type ReactNode } from 'react'
import type * as THREE from 'three'
import type { Wish } from '../../lib/wishes'
import { createStage, makeRibbonTexture, type Stage } from './stage'

/**
 * 3D 许愿树：古树（绿冠樱花）+ 红绸飘带心愿 + 燃香香炉（烟雾粒子）。
 * 拖拽旋转 / 滚轮缩放；点击飘带查看心愿，点击香炉供香。
 * WebGL 不可用时回退到 2D 许愿树（fallback）。
 */

interface TreeRig {
  ribbons: Array<{ mesh: THREE.Mesh; wish: Wish; phase: number }>
  sticks: THREE.Group
  embers: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }>
  smoke: THREE.Points | null
  smokeParts: Array<{ x: number; y: number; z: number; vx: number; vy: number; life: number }>
  lit: boolean
  smokeT: number
}

interface Props {
  wishes: Wish[]
  onRibbonClick: (w: Wish) => void
  fallback?: ReactNode
}

const RIBBON_SPOTS: Array<{ x: number; y: number; z: number; rot: number }> = [
  { x: -2.8, y: 4.6, z: 1.2, rot: 0.2 },
  { x: -1.9, y: 5.4, z: -1.6, rot: -0.15 },
  { x: 2.6, y: 4.8, z: -1.4, rot: 0.1 },
  { x: 1.7, y: 5.6, z: 1.8, rot: -0.22 },
  { x: 0.4, y: 6.6, z: 0.3, rot: 0.05 },
  { x: -3.4, y: 3.9, z: -0.6, rot: 0.26 },
  { x: 3.3, y: 4.0, z: 0.7, rot: -0.18 },
  { x: -0.9, y: 4.3, z: 2.4, rot: 0.3 },
  { x: 1.1, y: 4.2, z: -2.5, rot: -0.28 },
  { x: -2.2, y: 5.0, z: 2.2, rot: 0.12 },
  { x: 2.2, y: 5.2, z: 2.0, rot: -0.08 },
  { x: -0.4, y: 5.8, z: -1.8, rot: 0.16 },
  { x: 3.8, y: 4.6, z: -0.4, rot: -0.24 },
  { x: -3.9, y: 4.4, z: 0.5, rot: 0.2 },
  { x: 0.9, y: 3.8, z: 2.9, rot: -0.14 },
  { x: -0.8, y: 3.8, z: -3.0, rot: 0.22 },
  { x: 2.9, y: 5.4, z: 0.9, rot: -0.1 },
  { x: -3.0, y: 5.2, z: -1.2, rot: 0.14 },
  { x: 0.2, y: 7.0, z: -0.9, rot: -0.06 },
  { x: -0.2, y: 6.9, z: 1.3, rot: 0.1 },
  { x: 1.9, y: 6.0, z: -1.0, rot: -0.2 },
  { x: -2.0, y: 6.0, z: 1.0, rot: 0.18 },
  { x: 4.2, y: 4.9, z: 0.2, rot: -0.26 },
  { x: -4.3, y: 4.8, z: -0.2, rot: 0.24 },
]

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
        stage = createStage(THREE, canvas, { distance: 15, autoRotate: 0.08, phi: 1.0, minPhi: 0.4, maxPhi: 1.45 })
        stageRef.current = stage
      } catch {
        setFailed(true)
        return
      }
      const S = stage.scene

      /* ---------- 地面 ---------- */
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(14, 48),
        new THREE.MeshStandardMaterial({ color: 0xddeedf, roughness: 1 }),
      )
      ground.rotation.x = -Math.PI / 2
      ground.position.y = -3.4
      S.add(ground)
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(3.1, 3.28, 64),
        new THREE.MeshBasicMaterial({ color: 0x8fcdb2, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.y = -3.35
      S.add(ring)

      /* ---------- 树干与枝 ---------- */
      const bark = new THREE.MeshStandardMaterial({ color: 0x6a5947, roughness: 0.9 })
      const trunk = new THREE.Group()
      const segs: Array<[number, number, number, number]> = [
        [1.15, 1.15, -1.2, 2.6],
        [0.95, 1.05, -0.4, 2.4],
        [0.7, 0.85, 0.6, 2.2],
        [0.45, 0.6, 1.6, 2.0],
      ]
      let y0 = -3.4
      for (const [rb, rt, dy, h] of segs) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 14), bark)
        c.position.y = y0 + dy + h / 2
        trunk.add(c)
        y0 = c.position.y + h / 2
      }
      S.add(trunk)

      // 主枝（指向冠部）
      const branchTargets: Array<[number, number, number]> = [
        [-3.6, 4.2, 1.4],
        [3.5, 4.3, -1.2],
        [-1.9, 5.6, -1.8],
        [1.8, 5.7, 1.6],
        [0.3, 7.0, 0.4],
        [-4.2, 4.7, -0.4],
        [4.0, 4.9, 0.5],
        [-0.5, 6.3, -2.0],
        [0.6, 6.4, 2.0],
      ]
      for (const [tx, ty, tz] of branchTargets) {
        const len = Math.hypot(tx, ty - 3.6, tz)
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.26, len, 10), bark)
        const mid = new THREE.Vector3(tx / 2, 3.6 + (ty - 3.6) / 2, tz / 2)
        c.position.copy(mid)
        c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(tx, ty - 3.6, tz).normalize())
        S.add(c)
      }

      /* ---------- 树冠与樱花 ---------- */
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x64b393, roughness: 0.8, flatShading: true })
      const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x479a7c, roughness: 0.8, flatShading: true })
      const blossomMat = new THREE.MeshStandardMaterial({ color: 0xf6c6be, roughness: 0.7 })
      const canopy = new THREE.Group()
      const blobs: Array<[number, number, number, number]> = [
        [-3.6, 4.4, 1.4, 1.5],
        [3.5, 4.5, -1.2, 1.5],
        [-1.9, 5.8, -1.8, 1.4],
        [1.8, 5.9, 1.6, 1.4],
        [0.3, 7.2, 0.4, 1.6],
        [-4.2, 4.9, -0.4, 1.2],
        [4.0, 5.1, 0.5, 1.2],
        [-0.5, 6.5, -2.0, 1.2],
        [0.6, 6.6, 2.0, 1.2],
        [-2.9, 5.2, 2.2, 0.9],
        [2.7, 5.4, 2.1, 0.9],
        [-2.6, 6.0, 0.6, 0.8],
        [2.8, 6.0, -0.4, 0.8],
      ]
      blobs.forEach(([x, y, z, s], i) => {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), i % 2 ? leafMat : leafMat2)
        m.position.set(x, y, z)
        m.scale.y = 0.85
        canopy.add(m)
      })
      for (let i = 0; i < 60; i++) {
        const a = Math.random() * Math.PI * 2
        const r = 0.8 + Math.random() * 4
        const y = 3.8 + Math.random() * 3.6
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.09 + Math.random() * 0.06, 8, 8), blossomMat)
        b.position.set(Math.cos(a) * r, y, Math.sin(a) * r)
        canopy.add(b)
      }
      S.add(canopy)

      /* ---------- 香炉（树旁） ---------- */
      const incense = new THREE.Group()
      incense.position.set(5.2, -3.4, 3.6)
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 0.5, 24), new THREE.MeshStandardMaterial({ color: 0x8a5c3a, roughness: 0.7 }))
      base.position.y = 0.25
      incense.add(base)
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.7, 0.55, 24), new THREE.MeshStandardMaterial({ color: 0xa5713f, roughness: 0.55, metalness: 0.4 }))
      bowl.position.y = 0.72
      incense.add(bowl)
      const brim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.09, 12, 32), new THREE.MeshStandardMaterial({ color: 0xd4a92c, roughness: 0.3, metalness: 0.7 }))
      brim.rotation.x = Math.PI / 2
      brim.position.y = 1.0
      incense.add(brim)
      const sticks = new THREE.Group()
      const stickMat = new THREE.MeshStandardMaterial({ color: 0x8c2f39, roughness: 0.9 })
      const embers: TreeRig['embers'] = []
      for (const [dx, dz, tilt] of [
        [-0.22, 0.1, 0.12],
        [0.05, -0.18, -0.08],
        [0.24, 0.12, 0.16],
      ] as Array<[number, number, number]>) {
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 8), stickMat)
        st.position.set(dx, 1.75, dz)
        st.rotation.x = tilt
        st.rotation.z = -tilt
        sticks.add(st)
        const emberMat = new THREE.MeshBasicMaterial({ color: 0xf1d25f })
        const ember = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), emberMat)
        ember.position.set(dx, 2.52, dz)
        sticks.add(ember)
        embers.push({ mesh: ember, mat: emberMat })
      }
      incense.add(sticks)
      S.add(incense)

      const rig: TreeRig = {
        ribbons: [],
        sticks,
        embers,
        smoke: null,
        smokeParts: [],
        lit: false,
        smokeT: 0,
      }
      rigRef.current = rig

      /* ---------- 飘带（由 ready 后的 effect 统一构建） ---------- */
      stage.setPick(
        () => [
          ...rig.ribbons.map((r) => r.mesh),
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
          // 香炉 → 供香
          rig.lit = true
          rig.smokeT = 0
        },
      )

      /* ---------- 烟粒子 ---------- */
      const smokeGeo = new THREE.BufferGeometry()
      const N = 160
      const pos = new Float32Array(N * 3)
      smokeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      const smokeMat = new THREE.PointsMaterial({ color: 0xb9c6c2, size: 0.22, transparent: true, opacity: 0, depthWrite: false })
      const smoke = new THREE.Points(smokeGeo, smokeMat)
      smoke.position.copy(incense.position)
      S.add(smoke)
      rig.smoke = smoke
      for (let i = 0; i < N; i++) {
        rig.smokeParts.push({ x: (Math.random() - 0.5) * 0.4, y: 1.1 + Math.random() * 0.4, z: (Math.random() - 0.5) * 0.4, vx: (Math.random() - 0.5) * 0.15, vy: 0.5 + Math.random() * 0.7, life: Math.random() * 3 })
      }

      /* ---------- 帧动画 ---------- */
      stage.onFrame((dt, t) => {
        // 飘带摇曳
        for (const r of rig.ribbons) {
          r.mesh.rotation.x = Math.sin(t * 1.4 + r.phase) * 0.07
          r.mesh.rotation.z = Math.cos(t * 1.1 + r.phase) * 0.05
        }
        // 燃香：炭火明灭 + 烟雾
        for (const e of rig.embers) {
          const glow = rig.lit ? 0.85 + Math.sin(t * 6 + e.mesh.position.x * 10) * 0.15 : 0
          e.mat.color.setScalar(glow)
        }
        const sm = rig.smoke
        if (sm) {
          const attr = sm.geometry.getAttribute('position') as THREE.BufferAttribute
          ;(sm.material as THREE.PointsMaterial).opacity = rig.lit ? 0.55 : 0
          for (let i = 0; i < rig.smokeParts.length; i++) {
            const p = rig.smokeParts[i]
            if (!rig.lit) {
              attr.setXYZ(i, p.x, p.y, p.z)
              continue
            }
            p.life -= dt
            if (p.life <= 0) {
              p.x = (Math.random() - 0.5) * 0.4
              p.y = 1.1
              p.z = (Math.random() - 0.5) * 0.4
              p.vx = (Math.random() - 0.5) * 0.15
              p.vy = 0.5 + Math.random() * 0.7
              p.life = 3
            }
            p.y += p.vy * dt
            p.x += p.vx * dt + Math.sin(t * 2 + i) * 0.002
            attr.setXYZ(i, p.x, p.y, p.z)
          }
          attr.needsUpdate = true
        }
        // 树冠微摆
        canopy.rotation.y = Math.sin(t * 0.3) * 0.02
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

  // 飘带随心愿变化重建
  useEffect(() => {
    const stage = stageRef.current
    const rig = rigRef.current
    if (!ready || !stage || !rig) return
    void import('three').then((THREE) => {
      const S = stage.scene
      for (const r of rig.ribbons) {
        S.remove(r.mesh)
        ;(r.mesh.material as THREE.Material).dispose()
      }
      rig.ribbons = []
      const list = wishes.slice(0, RIBBON_SPOTS.length)
      list.forEach((w, i) => {
        const spot = RIBBON_SPOTS[i]
        const tex = makeRibbonTexture(THREE, w.text, i % 3)
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide })
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 2.1), mat)
        mesh.position.set(spot.x, spot.y - 1.35, spot.z)
        mesh.rotation.y = spot.rot
        mesh.userData.wish = w
        S.add(mesh)
        rig.ribbons.push({ mesh, wish: w, phase: Math.random() * Math.PI * 2 })
      })
    })
  }, [wishes, ready])

  if (failed) return <>{fallback}</>

  return (
    <div className="relative h-[420px] w-full sm:h-[500px]">
      <canvas ref={canvasRef} className="h-full w-full" aria-label="3D 许愿树" />
      <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-sandalwood-950/60 px-3 py-1 text-[11px] text-paper/80 backdrop-blur-sm">
        拖拽旋转 · 滚轮缩放 · 点击飘带查看心愿 · 点击香炉供香
      </p>
    </div>
  )
}
