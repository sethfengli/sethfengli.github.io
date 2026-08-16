import { useEffect, useRef, useState, type ReactNode } from 'react'
import type * as THREE from 'three'
import { useI18n } from '../../i18n'
import { useBellSound } from '../../lib/bellSound'
import { createStage, makeTextCanvas, type Stage } from './stage'

/**
 * 3D 铜钟：木架悬钟 + 撞木，鼠标拖拽旋转 / 滚轮缩放；
 * 点击铜钟或撞木（或下方按钮）击钟——撞木荡起、铜钟摇摆、声波金环扩散、“嗡”字浮现。
 * WebGL 不可用时回退到 2D SVG 铜钟（fallback）。
 */

interface BellRig {
  bell: THREE.Group
  striker: THREE.Group
  strikeRequested: boolean
  strikeT: number
  rings: Array<{ mesh: THREE.Mesh; born: number }>
  oms: Array<{ sprite: THREE.Sprite; born: number }>
  flash: THREE.PointLight
}

export function Bell3D({ fallback }: { fallback?: ReactNode }) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<Stage | null>(null)
  const rigRef = useRef<BellRig | null>(null)
  const { ring, onEnded } = useBellSound()
  const [failed, setFailed] = useState(false)
  const [ringing, setRinging] = useState(false)
  const [count, setCount] = useState(0)
  const unlockRef = useRef(0)
  const strikeRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false
    let stage: Stage | null = null

    void import('three').then((THREE) => {
      if (disposed || !canvas.isConnected) return
      try {
        stage = createStage(THREE, canvas, { distance: 17, autoRotate: 0.1 })
        stageRef.current = stage
      } catch {
        setFailed(true)
        return
      }
      const S = stage.scene

      /* ---------- 木架 ---------- */
      const wood = new THREE.MeshStandardMaterial({ color: 0x6a5947, roughness: 0.75, metalness: 0.05 })
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9.4, 0.6), wood)
      postL.position.set(-4.4, 0, 0)
      const postR = postL.clone()
      postR.position.x = 4.4
      const beam = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.7, 0.7), wood)
      beam.position.set(0, 4.7, 0)
      const cross = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.5, 0.5), wood)
      cross.position.set(0, 3.9, 0)
      const gold = new THREE.MeshStandardMaterial({ color: 0xd4a92c, roughness: 0.3, metalness: 0.7 })
      S.add(postL, postR, beam, cross)
      for (const x of [-5, 5]) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 20), gold)
        cap.position.set(x, 4.7, 0)
        S.add(cap)
      }

      /* ---------- 铜钟 ---------- */
      const bellPts: Array<[number, number]> = [
        [0, 0.1],
        [0.9, 0],
        [1.9, -0.5],
        [2.5, -1.6],
        [2.9, -3.0],
        [3.05, -4.4],
        [2.95, -5.6],
        [2.45, -6.35],
        [1.35, -6.6],
        [0, -6.6],
      ]
      const bellGeo = new THREE.LatheGeometry(
        bellPts.map(([x, y]) => new THREE.Vector2(x, y)),
        56,
      )
      const bronze = new THREE.MeshStandardMaterial({ color: 0xa5713f, roughness: 0.32, metalness: 0.85 })
      const bellMesh = new THREE.Mesh(bellGeo, bronze)
      const bell = new THREE.Group()
      bell.position.set(0, 3.6, 0)
      bell.add(bellMesh)
      const band = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.14, 16, 64), gold)
      band.position.y = -1.1
      band.rotation.x = Math.PI / 2
      bell.add(band)
      const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.18, 24), gold)
      boss.position.set(0, -3.1, 2.86)
      boss.rotation.x = Math.PI / 2
      bell.add(boss)
      S.add(bell)

      /* ---------- 撞木 ---------- */
      const striker = new THREE.Group()
      striker.position.set(6.6, 4.4, 0)
      const ropeMat = new THREE.MeshStandardMaterial({ color: 0x3b3329, roughness: 0.9 })
      for (const z of [-1.9, 1.9]) {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 7.6, 8), ropeMat)
        rope.position.set(0, -3.4, z)
        striker.add(rope)
      }
      const strikerBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 4.6, 20), wood)
      strikerBeam.rotation.z = Math.PI / 2
      strikerBeam.position.set(0, -3.6, 0)
      striker.add(strikerBeam)
      const strikerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.7, 20), wood)
      strikerHead.rotation.z = Math.PI / 2
      strikerHead.position.set(2.7, -3.6, 0)
      striker.add(strikerHead)
      const strikerKnob = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), gold)
      strikerKnob.position.set(3.2, -3.6, 0)
      striker.add(strikerKnob)
      S.add(striker)

      /* ---------- 声波金环 / 嗡字 / 光闪 ---------- */
      const ringGeo = new THREE.TorusGeometry(3.0, 0.06, 12, 72)
      const flash = new THREE.PointLight(0xffd9a0, 0, 30, 2)
      flash.position.set(0, 0.5, 4)
      S.add(flash)

      const rig: BellRig = { bell, striker, strikeRequested: false, strikeT: -1, rings: [], oms: [], flash }
      rigRef.current = rig

      const spawnFx = (t0: number) => {
        rig.strikeT = t0
        rig.flash.intensity = 30
        for (let i = 0; i < 3; i++) {
          const mat = new THREE.MeshBasicMaterial({ color: 0xf1d25f, transparent: true, opacity: 0.9, depthWrite: false })
          const ringMesh = new THREE.Mesh(ringGeo, mat)
          ringMesh.rotation.x = Math.PI / 2
          ringMesh.position.set(0, -3.2, 0)
          S.add(ringMesh)
          rig.rings.push({ mesh: ringMesh, born: t0 + i * 0.28 })
        }
        const tex = new THREE.CanvasTexture(makeTextCanvas('嗡', { w: 256, h: 256, fontSize: 150, color: '#f6e69b' }))
        tex.colorSpace = THREE.SRGBColorSpace
        const omMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
        const sprite = new THREE.Sprite(omMat)
        sprite.scale.set(2.2, 2.2, 1)
        sprite.position.set(0, 1.6, 0)
        S.add(sprite)
        rig.oms.push({ sprite, born: t0 })
      }

      /* ---------- 拾取：点钟即撞 ---------- */
      stage.setPick(
        () => [bell, striker],
        () => strikeRef.current(),
      )

      /* ---------- 帧动画 ---------- */
      stage.onFrame((dt, t) => {
        if (rig.strikeRequested) {
          rig.strikeRequested = false
          spawnFx(t)
        }
        // 空闲微摆
        bell.rotation.x = Math.sin(t * 0.8) * 0.01
        // 击钟动画
        if (rig.strikeT >= 0) {
          const k = t - rig.strikeT
          striker.rotation.z = -0.34 * Math.sin(9.4 * k) * Math.exp(-1.7 * k)
          if (k > 0.08) bell.rotation.x = 0.11 * Math.sin(6.4 * (k - 0.08)) * Math.exp(-1.3 * (k - 0.08))
          if (k > 2.6) rig.strikeT = -1
        }
        // 金环扩散
        for (let i = rig.rings.length - 1; i >= 0; i--) {
          const r = rig.rings[i]
          const k = (t - r.born) / 1.7
          if (k >= 1) {
            S.remove(r.mesh)
            ;(r.mesh.material as THREE.MeshBasicMaterial).dispose()
            rig.rings.splice(i, 1)
            continue
          }
          const s = 1 + k * 1.6
          r.mesh.scale.set(s, s, 1)
          ;(r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k)
        }
        // “嗡”字上浮
        for (let i = rig.oms.length - 1; i >= 0; i--) {
          const o = rig.oms[i]
          const k = (t - o.born) / 2.3
          if (k >= 1) {
            S.remove(o.sprite)
            ;(o.sprite.material as THREE.SpriteMaterial).dispose()
            rig.oms.splice(i, 1)
            continue
          }
          o.sprite.position.y = 1.6 + k * 3.4
          const sc = 2.2 * (1 + k * 0.5)
          o.sprite.scale.set(sc, sc, 1)
          ;(o.sprite.material as THREE.SpriteMaterial).opacity = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85
        }
        // 光闪衰减
        rig.flash.intensity *= Math.pow(0.002, dt)
        if (rig.flash.intensity < 0.05) rig.flash.intensity = 0
      })
    })

    return () => {
      disposed = true
      stageRef.current = null
      rigRef.current = null
      stage?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- 击钟 ---------- */
  const strike = () => {
    if (ringing) return
    setRinging(true)
    setCount((c) => c + 1)
    const rig = rigRef.current
    if (rig) rig.strikeRequested = true
    const unlockMs = ring()
    const un = onEnded(() => {
      window.clearTimeout(unlockRef.current)
      setRinging(false)
    })
    window.clearTimeout(unlockRef.current)
    unlockRef.current = window.setTimeout(() => {
      un()
      setRinging(false)
    }, unlockMs)
  }
  strikeRef.current = strike

  if (failed) return <>{fallback}</>

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-[380px] w-full max-w-[560px] sm:h-[430px]">
        <canvas ref={canvasRef} className="h-full w-full" aria-label="3D 铜钟" />
        {ringing && (
          <span className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 font-brush text-2xl text-gold-600">
            {t('dharma.ringing')}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={strike}
        disabled={ringing}
        className={`btn-primary ${ringing ? 'cursor-wait opacity-70' : ''}`}
      >
        🔔 {ringing ? t('dharma.ringing') : count > 0 ? t('dharma.ringAgain') : t('dharma.ringBell')}
      </button>
      <div className="text-center font-serif text-sm text-sandalwood-500">
        {count > 0 ? `第 ${count} 声` : '\u00a0'}
        <p className="mt-1 text-[11px] text-sandalwood-400">拖拽旋转 · 滚轮缩放 · 点击铜钟撞钟</p>
      </div>
    </div>
  )
}
