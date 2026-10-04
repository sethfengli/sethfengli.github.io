import { useEffect, useRef, useState, type ReactNode } from 'react'
import type * as THREE from 'three'
import { useI18n } from '../../i18n'
import { useBellSound } from '../../lib/bellSound'
import { createStage, makeTextCanvas, type Stage } from './stage'

/**
 * 3D 梵钟（经典 梵鐘/bonsho 形制）：
 * - 典型轮廓：曲肩、乳の紋两圈乳钉、池の間铭文带、草の間回纹带、外张裙部与厚口縁（钟口敞开）；
 * - 冠钮（竜頭）挂环悬于木架，撞座（strike boss）厚板位于下部摆线；
 * - 铜材质：青铜渐变贴图 + 铜绿包浆 + 凹凸纹理（bumpMap）；
 * - 鼠标拖拽旋转 / 滚轮缩放，点击铜钟或撞木（或下方按钮）击钟；
 * - 起始即全景（最小缩放，distance=55）。
 * WebGL 不可用时回退到 2D SVG 铜钟（fallback）。
 */

interface BellRig {
  bell: THREE.Group
  bellPivot: THREE.Group
  striker: THREE.Group
  strikeRequested: boolean
  strikeT: number
  rings: Array<{ mesh: THREE.Mesh; born: number }>
  oms: Array<{ sprite: THREE.Sprite; born: number }>
  flash: THREE.PointLight
}

/** 梵钟剖面（半径, 高度）：顶部 y=0、口沿 y=-12，钟口敞开（内沿折回） */
const BELL_PROFILE: Array<[number, number]> = [
  [0.0, 0.18],
  [0.9, 0.05],
  [2.0, -0.55],
  [3.2, -1.5],
  [4.05, -2.7],
  [4.4, -4.1],
  [4.35, -5.3],
  [4.1, -6.6],
  [3.9, -7.8],
  [3.95, -9.2],
  [4.25, -10.6],
  [4.5, -11.5],
  [4.55, -12.0],
  [4.15, -12.12],
  [3.95, -11.7],
]

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
        // 起始即全景（最小缩放），用户可自行拉近看铭文细节
        stage = createStage(THREE, canvas, {
          distance: 55,
          autoRotate: 0,
          phi: 1.12,
          minPhi: 0.5,
          maxPhi: 1.5,
          minDistance: 8,
          maxDistance: 55,
        })
        stageRef.current = stage
      } catch {
        setFailed(true)
        return
      }
      const S = stage.scene

      /* ---------- 木架 ---------- */
      const wood = new THREE.MeshStandardMaterial({ color: 0x6a5947, roughness: 0.75, metalness: 0.05 })
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.85, 13.6, 0.85), wood)
      postL.position.set(-6.3, 0, 0)
      const postR = postL.clone()
      postR.position.x = 6.3
      const beam = new THREE.Mesh(new THREE.BoxGeometry(14.6, 1.0, 1.0), wood)
      beam.position.set(0, 6.8, 0)
      const cross = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.7, 0.7), wood)
      cross.position.set(0, 5.6, 0)
      const gold = new THREE.MeshStandardMaterial({ color: 0xd4a92c, roughness: 0.35, metalness: 0.7 })
      S.add(postL, postR, beam, cross)
      for (const x of [-7.2, 7.2]) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 20), gold)
        cap.position.set(x, 6.8, 0)
        S.add(cap)
      }
      // 阴影投射（局部小块即可，代价低）
      const shadowCasters: THREE.Mesh[] = [postL, postR, beam, cross]
      // 接地软阴影：木架脚下
      stage.addCatchShadow({ radius: 8.6, y: -0.42, opacity: 0.5 })
      stage.addCatchShadow({ radius: 2.6, y: -0.36, opacity: 0.32, follow: () => new THREE.Vector3(-6.3, 0, 0) })
      stage.addCatchShadow({ radius: 2.6, y: -0.36, opacity: 0.32, follow: () => new THREE.Vector3(6.3, 0, 0) })

      /* ---------- 匾额（铭文随机轮换） ---------- */
      const INSCS = ['聞鐘聲 煩惱輕', '智慧長 菩提生', '風調雨順 國泰民安', '佛日增輝 法輪常轉']
      const plaqueText = INSCS[Math.floor(Math.random() * INSCS.length)]
      const makePlaque = (text: string, w: number, h: number, fs: number): THREE.Mesh => {
        const cv = document.createElement('canvas')
        cv.width = 1024
        cv.height = 256
        const ctx = cv.getContext('2d')!
        ctx.fillStyle = '#3e2f1f'
        ctx.fillRect(0, 0, 1024, 256)
        ctx.strokeStyle = '#d4a92c'
        ctx.lineWidth = 10
        ctx.strokeRect(12, 12, 1000, 232)
        ctx.fillStyle = '#f6e69b'
        ctx.font = `${fs}px "Ma Shan Zheng","LXGW WenKai","KaiTi",cursive`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, 512, 132)
        const tex = new THREE.CanvasTexture(cv)
        tex.colorSpace = THREE.SRGBColorSpace
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }),
        )
        return mesh
      }
      const plaque = makePlaque('慧燈禪院', 4.6, 1.15, 150)
      plaque.position.set(0, 6.8, 0.52)
      S.add(plaque)
      const plaque2 = makePlaque(plaqueText, 3.2, 0.8, 100)
      plaque2.position.set(0, 5.6, 0.37)
      S.add(plaque2)

      /* ---------- 钟身贴图：青铜渐变 + 铜绿包浆 + 池ノ間铭文带 + 草ノ間回纹 ---------- */
      const INSC_POOL = ['南無阿彌陀佛', '風調雨順', '國泰民安', '佛日增輝', '法輪常轉', '聞鐘聲煩惱輕', '智慧長菩提生', '慧燈常照']
      const picked = [...INSC_POOL].sort(() => Math.random() - 0.5).slice(0, 5)
      const bellTexCv = document.createElement('canvas')
      bellTexCv.width = 2048
      bellTexCv.height = 1024
      const bctx = bellTexCv.getContext('2d')!
      const bg = bctx.createLinearGradient(0, 0, 2048, 0)
      bg.addColorStop(0, '#6e4c2c')
      bg.addColorStop(0.2, '#a97e4d')
      bg.addColorStop(0.5, '#c2915a')
      bg.addColorStop(0.8, '#a97e4d')
      bg.addColorStop(1, '#6e4c2c')
      bctx.fillStyle = bg
      bctx.fillRect(0, 0, 2048, 1024)
      // 铜绿包浆斑（偏青绿，颜色往灰绿走，模拟青铜氧化）
      for (let i = 0; i < 90; i++) {
        bctx.fillStyle = `rgba(84,122,110,${0.03 + Math.random() * 0.08})`
        bctx.beginPath()
        bctx.ellipse(Math.random() * 2048, Math.random() * 1024, 26 + Math.random() * 85, 16 + Math.random() * 55, Math.random() * 3, 0, Math.PI * 2)
        bctx.fill()
      }
      // 池ノ間（上部铭文带）：上弦纹
      bctx.strokeStyle = 'rgba(240,208,110,0.85)'
      bctx.lineWidth = 8
      bctx.beginPath()
      bctx.moveTo(0, 300)
      bctx.lineTo(2048, 300)
      bctx.stroke()
      // 五列竖排铭文（绕钟身一圈）
      bctx.fillStyle = '#f1d25f'
      bctx.textAlign = 'center'
      bctx.textBaseline = 'middle'
      const cols = [205, 614, 1024, 1434, 1843]
      picked.forEach((text, ci) => {
        bctx.font = 'bold 88px "LXGW WenKai","KaiTi","SimSun",serif'
        for (let i = 0; i < text.length; i++) {
          bctx.fillText(text[i], cols[ci], 540 + i * 108)
        }
      })
      // 草ノ間（下部）：雷雲回纹
      bctx.strokeStyle = 'rgba(212,169,44,0.6)'
      bctx.lineWidth = 6
      for (let x = 20; x < 2048; x += 120) {
        bctx.beginPath()
        bctx.moveTo(x, 862)
        bctx.quadraticCurveTo(x + 30, 844, x + 60, 862)
        bctx.quadraticCurveTo(x + 90, 880, x + 120, 862)
        bctx.stroke()
      }
      bctx.strokeStyle = 'rgba(240,208,110,0.85)'
      bctx.lineWidth = 8
      bctx.beginPath()
      bctx.moveTo(0, 930)
      bctx.lineTo(2048, 930)
      bctx.stroke()
      const bellTex = new THREE.CanvasTexture(bellTexCv)
      bellTex.colorSpace = THREE.SRGBColorSpace
      bellTex.flipY = false
      bellTex.anisotropy = 8
      // 凹凸纹理：铸痕斑驳
      const bumpCv = document.createElement('canvas')
      bumpCv.width = 256
      bumpCv.height = 256
      const bctx2 = bumpCv.getContext('2d')!
      bctx2.fillStyle = '#808080'
      bctx2.fillRect(0, 0, 256, 256)
      for (let i = 0; i < 700; i++) {
        const g = 90 + Math.random() * 76
        bctx2.fillStyle = `rgb(${g},${g},${g})`
        bctx2.beginPath()
        bctx2.arc(Math.random() * 256, Math.random() * 256, 0.8 + Math.random() * 2.6, 0, Math.PI * 2)
        bctx2.fill()
      }
      const bumpTexture = new THREE.CanvasTexture(bumpCv)
      bumpTexture.wrapS = THREE.RepeatWrapping
      bumpTexture.wrapT = THREE.RepeatWrapping

      /* ---------- 钟身（敞开钟口） ---------- */
      const bellGeo = new THREE.LatheGeometry(
        BELL_PROFILE.map(([x, y]) => new THREE.Vector2(x, y)),
        80,
      )
      const bronze = new THREE.MeshStandardMaterial({
        map: bellTex,
        bumpMap: bumpTexture,
        bumpScale: 0.35,
        roughness: 0.42,
        metalness: 0.72,
      })
      const bellMesh = new THREE.Mesh(bellGeo, bronze)
      bellMesh.castShadow = true
      const bell = new THREE.Group()
      bell.position.set(0, 5.2, 0)
      bell.add(bellMesh)
      shadowCasters.push(bellMesh)

      /* ---------- 乳の紋：肩部两圈乳钉（真实梵钟的标志细节） ---------- */
      const nippleGeo = new THREE.SphereGeometry(0.16, 10, 10)
      const nippleMat = new THREE.MeshStandardMaterial({ color: 0xb08a55, roughness: 0.5, metalness: 0.6 })
      for (let ringI = 0; ringI < 2; ringI++) {
        const y = -2.1 - ringI * 1.05
        const r = ringI === 0 ? 3.78 : 4.28
        for (let i = 0; i < 22; i++) {
          const a = (i / 22) * Math.PI * 2
          const n = new THREE.Mesh(nippleGeo, nippleMat)
          n.position.set(Math.cos(a) * r, y, Math.sin(a) * r)
          bell.add(n)
        }
      }
      // 池ノ間/草ノ間 金弦带
      const band1 = new THREE.Mesh(new THREE.TorusGeometry(4.32, 0.16, 14, 90), gold)
      band1.rotation.x = Math.PI / 2
      band1.position.y = -4.6
      bell.add(band1)
      const band2 = new THREE.Mesh(new THREE.TorusGeometry(3.98, 0.15, 14, 90), gold)
      band2.rotation.x = Math.PI / 2
      band2.position.y = -8.6
      bell.add(band2)

      /* ---------- 撞座（下部撞板 + 圆环） ---------- */
      const strikerBossY = -9.6
      const strikerBossR = 4.1
      const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.3, 28), gold)
      boss.position.set(0, strikerBossY, strikerBossR)
      boss.rotation.x = Math.PI / 2
      bell.add(boss)
      const bossRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.09, 12, 48), gold)
      bossRing.position.set(0, strikerBossY, strikerBossR + 0.02)
      bell.add(bossRing)

      /* ---------- 冠钮（竜頭）：顶环 + 盖板 + 龙首钮头 ---------- */
      const crownPlate = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.35, 0.28, 28), bronze)
      crownPlate.position.y = 0.3
      bell.add(crownPlate)
      const crownNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.55, 16), bronze)
      crownNeck.position.y = 0.75
      bell.add(crownNeck)
      const crownKnob = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 16), bronze)
      crownKnob.position.y = 1.3
      crownKnob.scale.y = 1.2
      bell.add(crownKnob)
      const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.13, 12, 32), gold)
      crownRing.rotation.x = Math.PI / 2
      crownRing.position.y = 1.62
      bell.add(crownRing)
      const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), gold)
      hook.position.y = 2.15
      bell.add(hook)
      shadowCasters.push(crownPlate, crownNeck, crownKnob)

      // 摆动轴心在冠钮（挂点）处 → 撞钟时绕顶部自然晃荡
      const bellPivot = new THREE.Group()
      bellPivot.position.set(0, 5.2 + 2.15, 0)
      bell.position.y = -2.15
      bellPivot.add(bell)
      S.add(bellPivot)

      /* ---------- 撞木 ---------- */
      const striker = new THREE.Group()
      striker.position.set(9.6, 6.4, 0)
      const ropeMat = new THREE.MeshStandardMaterial({ color: 0x3b3329, roughness: 0.9 })
      for (const z of [-2.7, 2.7]) {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 11, 8), ropeMat)
        rope.position.set(0, -4.9, z)
        striker.add(rope)
      }
      const strikerBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 6.6, 20), wood)
      strikerBeam.rotation.z = Math.PI / 2
      strikerBeam.position.set(0, -5.2, 0)
      striker.add(strikerBeam)
      const strikerHead = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.0, 20), wood)
      strikerHead.rotation.z = Math.PI / 2
      strikerHead.position.set(3.9, -5.2, 0)
      striker.add(strikerHead)
      const strikerKnob = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), gold)
      strikerKnob.position.set(4.6, -5.2, 0)
      striker.add(strikerKnob)
      shadowCasters.push(strikerBeam, strikerHead)
      S.add(striker)
      shadowCasters.forEach((m) => (m.castShadow = true))

      /* ---------- 声波金环 / 嗡字 / 光闪 ---------- */
      const ringGeo = new THREE.TorusGeometry(4.4, 0.09, 12, 80)
      const flash = new THREE.PointLight(0xffd9a0, 0, 46, 2)
      flash.position.set(0, 0.8, 5.8)
      S.add(flash)

      const rig: BellRig = { bell, bellPivot, striker, strikeRequested: false, strikeT: -1, rings: [], oms: [], flash }
      rigRef.current = rig

      const spawnFx = (t0: number) => {
        rig.strikeT = t0
        rig.flash.intensity = 30
        for (let i = 0; i < 3; i++) {
          const mat = new THREE.MeshBasicMaterial({ color: 0xf1d25f, transparent: true, opacity: 0.9, depthWrite: false })
          const ringMesh = new THREE.Mesh(ringGeo, mat)
          ringMesh.rotation.x = Math.PI / 2
          ringMesh.position.set(0, -4.6, 0)
          S.add(ringMesh)
          rig.rings.push({ mesh: ringMesh, born: t0 + i * 0.28 })
        }
        const tex = new THREE.CanvasTexture(makeTextCanvas('嗡', { w: 256, h: 256, fontSize: 150, color: '#f6e69b' }))
        tex.colorSpace = THREE.SRGBColorSpace
        const omMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
        const sprite = new THREE.Sprite(omMat)
        sprite.scale.set(3.4, 3.4, 1)
        sprite.position.set(0, 6.2, 0)
        S.add(sprite)
        rig.oms.push({ sprite, born: t0 })
      }

      /* ---------- 拾取：点钟即撞 ---------- */
      stage.setPick(
        () => [bell, striker],
        () => strikeRef.current(),
      )

      /* ---------- 帧动画 ---------- */
      const stageRefLocal = stage
      stage.onFrame((dt, t) => {
        if (rig.strikeRequested) {
          rig.strikeRequested = false
          spawnFx(t)
        }
        // 空闲微摆（静止时在风里轻轻摇晃）
        const idleSway = stageRefLocal.reducedMotion ? 0.004 : 0.012
        bellPivot.rotation.x = Math.sin(t * 0.8) * idleSway
        // 击钟动画：撞木荡起 → 钟以冠钮为轴晃荡（衰减摆）
        if (rig.strikeT >= 0) {
          const k = t - rig.strikeT
          striker.rotation.z = -0.34 * Math.sin(9.4 * k) * Math.exp(-1.7 * k)
          if (k > 0.08) {
            const kk = k - 0.08
            bellPivot.rotation.x = 0.12 * Math.sin(3.1 * kk) * Math.exp(-0.55 * kk) + idleSway * Math.sin(t * 0.8)
          }
          if (k > 4.2) rig.strikeT = -1
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
          o.sprite.position.y = 6.2 + k * 5.0
          const sc = 3.4 * (1 + k * 0.5)
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
        <canvas ref={canvasRef} className="h-full w-full" aria-label={t('common.bellAlt')} />
        {ringing && (
          <span className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 font-song text-lg tracking-[0.3em] text-tibetan-600">
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
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3a6 6 0 0 0-6 6v3.5L4.5 15h15L18 12.5V9a6 6 0 0 0-6-6Z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
        {ringing ? t('dharma.ringing') : count > 0 ? t('dharma.ringAgain') : t('dharma.ringBell')}
      </button>
      <div className="text-center font-song text-sm text-ink-500" aria-live="polite">
        {count > 0 ? t('dharma.bellCount', { n: count }) : '\u00a0'}
        <p className="mt-1.5 font-sans text-[11px] text-ink-300">{t('common.bellHint')}</p>
      </div>
    </div>
  )
}
