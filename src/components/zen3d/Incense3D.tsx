import { useEffect, useRef, useState, type ReactNode } from 'react'
import type * as THREE from 'three'
import { createStage, type Stage } from './stage'

/**
 * 3D 鼎式香炉（佛寺铜鼎）：三足双耳鼓腹、回纹莲纹贴图、炉内香灰、
 * 三炷香（暗红香柱 + 香头灰白香灰 + 暗红炭火），青烟成缕袅袅上升。
 * 鼠标拖拽旋转 / 滚轮缩放；无自动旋转。WebGL 不可用时回退 2D 香炉。
 */

interface CenserRig {
  group: THREE.Group
  embers: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }>
  ashCaps: THREE.Mesh[]
  smoke: THREE.Points | null
  parts: Array<{ x: number; y: number; z: number; life: number; phase: number }>
  lit: boolean
}

function drawCenserTexture(): HTMLCanvasElement {
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
  ctx.strokeRect(0, 60, w, 70)
  for (let x = 24; x < w; x += 56) {
    ctx.beginPath()
    ctx.moveTo(x, 74)
    ctx.lineTo(x + 26, 74)
    ctx.lineTo(x + 26, 92)
    ctx.lineTo(x, 92)
    ctx.closePath()
    ctx.moveTo(x + 14, 102)
    ctx.lineTo(x + 40, 102)
    ctx.lineTo(x + 40, 116)
    ctx.lineTo(x + 14, 116)
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
  lotus(256, 240)
  lotus(512, 240)
  lotus(768, 240)
  // 云纹
  ctx.strokeStyle = '#d4a92c'
  ctx.lineWidth = 6
  ctx.beginPath()
  for (let x = 40; x < w - 30; x += 130) {
    ctx.moveTo(x, 340)
    ctx.quadraticCurveTo(x + 32, 322, x + 65, 340)
    ctx.quadraticCurveTo(x + 98, 358, x + 130, 340)
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

export function Incense3D({ fallback }: { fallback?: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rigRef = useRef<CenserRig | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false
    let stage: Stage | null = null

    void import('three').then((THREE) => {
      if (disposed || !canvas.isConnected) return
      try {
        stage = createStage(THREE, canvas, { distance: 10, autoRotate: 0, phi: 1.05, minDistance: 5, maxDistance: 22 })
      } catch {
        setFailed(true)
        return
      }
      const S = stage.scene
      const group = new THREE.Group()

      /* ---------- 鼎腹 ---------- */
      const tex = new THREE.CanvasTexture(drawCenserTexture())
      tex.colorSpace = THREE.SRGBColorSpace
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
      // 炉口
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(1.42, 0.12, 16, 64),
        new THREE.MeshStandardMaterial({ color: 0xd4a92c, roughness: 0.3, metalness: 0.7 }),
      )
      rim.rotation.x = Math.PI / 2
      rim.position.y = 2.2
      group.add(rim)
      // 双耳
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(
          new THREE.TorusGeometry(0.4, 0.09, 12, 32, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0x8a5c3a, roughness: 0.4, metalness: 0.6 }),
        )
        ear.position.set(side * 1.55, 1.55, 0)
        ear.rotation.z = -side * Math.PI / 2
        group.add(ear)
      }
      // 三足（外撇兽足）
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
      // 炉内香灰（灰白，微丘）
      const ash = new THREE.Mesh(
        new THREE.CylinderGeometry(1.28, 1.34, 0.35, 48),
        new THREE.MeshStandardMaterial({ color: 0x9aa3a3, roughness: 1 }),
      )
      ash.position.y = 1.95
      group.add(ash)
      const mound = new THREE.Mesh(
        new THREE.ConeGeometry(1.1, 0.22, 48),
        new THREE.MeshStandardMaterial({ color: 0xaeb6b6, roughness: 1 }),
      )
      mound.position.y = 2.22
      group.add(mound)
      S.add(group)

      /* ---------- 三炷香 ---------- */
      const sticks = new THREE.Group()
      const stickMat = new THREE.MeshStandardMaterial({ color: 0x8c2f39, roughness: 0.9 })
      const ashMat = new THREE.MeshStandardMaterial({ color: 0xd9dcd6, roughness: 1 })
      const embers: CenserRig['embers'] = []
      const ashCaps: THREE.Mesh[] = []
      const tips: Array<{ x: number; y: number; z: number }> = []
      ;([[-0.3, 0.22, 0.1], [0.05, -0.28, -0.05], [0.32, 0.18, -0.12]] as Array<[number, number, number]>).forEach(
        ([dx, dz, tilt]) => {
          const st = new THREE.Group()
          const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.6, 10), stickMat)
          stick.position.y = 1.3
          st.add(stick)
          // 香灰柱（香头灰白）
          const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.34, 10), ashMat)
          cap.position.y = 2.75
          st.add(cap)
          ashCaps.push(cap)
          // 暗红炭火点
          const emberMat = new THREE.MeshBasicMaterial({ color: 0xe0733a })
          const ember = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), emberMat)
          ember.position.y = 2.58
          st.add(ember)
          embers.push({ mesh: ember, mat: emberMat })
          st.position.set(dx, 2.3, dz)
          st.rotation.x = tilt * 0.6
          st.rotation.z = -tilt * 0.6
          sticks.add(st)
          tips.push({ x: dx, y: 2.3 + 2.9, z: dz })
        },
      )
      group.add(sticks)

      const rig: CenserRig = { group, embers, ashCaps, smoke: null, parts: [], lit: true }
      rigRef.current = rig

      /* ---------- 青烟袅袅（软粒子） ---------- */
      const smokeTex = makeSmokeTexture(THREE)
      const N = 70
      const sprites: Array<{ s: THREE.Sprite; mat: THREE.SpriteMaterial; life: number; phase: number; tip: number }> = []
      for (let i = 0; i < N; i++) {
        const mat = new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 })
        const s = new THREE.Sprite(mat)
        S.add(s)
        sprites.push({ s, mat, life: Math.random() * 6, phase: Math.random() * Math.PI * 2, tip: Math.floor(Math.random() * 3) })
        rig.parts.push({ x: 0, y: 0, z: 0, life: 0, phase: Math.random() * Math.PI * 2 })
      }

      stage.onFrame((dt, t) => {
        // 炭火明灭
        for (const e of rig.embers) {
          const glow = 0.75 + Math.sin(t * 7 + e.mesh.position.x * 12) * 0.25
          e.mat.color.setRGB(glow, glow * 0.38, glow * 0.12)
        }
        // 香灰微长（随时间缓慢）
        const ashLen = 0.34 + Math.sin(t * 0.4) * 0.03
        for (const c of rig.ashCaps) c.scale.y = ashLen / 0.34
        // 烟雾
        for (let i = 0; i < sprites.length; i++) {
          const p = sprites[i]
          p.life -= dt
          if (p.life <= 0) {
            const tip = tips[p.tip]
            p.life = 5.5 + Math.random() * 3
            p.mat.opacity = 0
            p.s.position.set(tip.x + (Math.random() - 0.5) * 0.04, tip.y, tip.z + (Math.random() - 0.5) * 0.04)
            p.s.scale.setScalar(0.12)
          } else {
            const k = 1 - p.life / 8.5
            const y = p.s.position.y + dt * (0.45 + k * 0.35)
            // 袅袅：蛇形摆动 + 扩散
            p.s.position.y = y
            p.s.position.x = p.s.position.x + Math.sin(t * 1.6 + p.phase + y * 1.2) * dt * 0.22
            p.s.position.z = p.s.position.z + Math.cos(t * 1.3 + p.phase * 1.3 + y * 1.1) * dt * 0.18
            const sc = 0.12 + k * 0.85
            p.s.scale.setScalar(sc)
            p.mat.opacity = k < 0.15 ? (k / 0.15) * 0.5 : 0.5 * (1 - (k - 0.15) / 0.85)
          }
        }
      })
    })

    return () => {
      disposed = true
      stage?.dispose()
      rigRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (failed) return <>{fallback}</>

  return (
    <div className="relative h-[300px] w-full max-w-[360px] sm:h-[340px]">
      <canvas ref={canvasRef} className="h-full w-full" aria-label="3D 鼎式香炉" />
      <p className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-sandalwood-950/60 px-3 py-1 text-[11px] text-paper/80 backdrop-blur-sm">
        拖拽旋转 · 滚轮缩放 · 心香常燃
      </p>
    </div>
  )
}
