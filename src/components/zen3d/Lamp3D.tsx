import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createStage, type Stage } from './stage'
import { useI18n } from '../../i18n'

/**
 * 3D 慧灯（长明灯）
 * ---------------------------------------------------------------
 * 「慧灯常照，点亮心灯」不只是一句口号，关于页需要一盏真正亮着的灯。
 * 造型取汉地长明灯：双层莲座 + 束腰灯柱 + 浅口灯盏 + 灯芯火苗；
 * 铜质用低粗糙度金属 + 环境反射，火苗用自发光 + 加色 Sprite 光晕，
 * 再配一盏真实点光源，让灯座与莲瓣被暖光吃掉一部分边缘。
 *
 * 依赖 three.js（707 KB），由 `Contained3D` 视口门控 + `lazy()` 按需加载；
 * 加载期间与 WebGL 不可用时都回退到同构图的 `HuiLamp` 水墨线描。
 * 交互：拖拽旋转 / 滚轮缩放；prefers-reduced-motion 下火苗与自动旋转静止。
 */
export interface Props {
  heightClass?: string
  fallback?: ReactNode
}

/** 火苗光晕：加色混合的柔光团，让火焰周围「有空气」 */
function makeGlowTexture(THREE: typeof import('three')): import('three').CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 256
  cv.height = 256
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 126)
  g.addColorStop(0, 'rgba(255,232,176,0.9)')
  g.addColorStop(0.32, 'rgba(255,180,90,0.4)')
  g.addColorStop(0.7, 'rgba(240,130,50,0.12)')
  g.addColorStop(1, 'rgba(240,130,50,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** 背光圆环：始终面向相机，旋转视角时不会变成一条线 */
function makeHaloTexture(THREE: typeof import('three')): import('three').CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 256
  cv.height = 256
  const ctx = cv.getContext('2d')!
  ctx.clearRect(0, 0, 256, 256)
  ctx.strokeStyle = 'rgba(255,222,160,0.8)'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.arc(128, 128, 104, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,205,130,0.22)'
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.arc(128, 128, 104, 0, Math.PI * 2)
  ctx.stroke()
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function Lamp3D({ heightClass = 'h-[400px] w-full max-w-[440px]', fallback }: Props) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
          distance: 6.6,
          minDistance: 4.8,
          maxDistance: 10.5,
          theta: 0.55,
          phi: 1.16,
          targetY: 0.95,
          autoRotate: 0.06,
          lightPosition: [5, 8, 6],
          hemiIntensity: 0.9,
        })
      } catch {
        setFailed(true)
        return
      }
      const S = stage.scene
      const reduced = stage.reducedMotion

      // 不铺整块淡墨地台：灯是「悬在纸面上的一盏灯」，地台在浅色纸底上
      // 会显出一条方形边缘。只留一小圈接地软阴影，让莲座坐得住。
      stage.addCatchShadow({ radius: 0.9, y: -0.01, opacity: 0.42 })

      const bronze = new THREE.MeshStandardMaterial({ color: 0x71543a, metalness: 0.62, roughness: 0.36 })
      const bronzeDark = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, metalness: 0.55, roughness: 0.44 })
      const lotusMat = new THREE.MeshStandardMaterial({ color: 0xb98a80, metalness: 0.06, roughness: 0.82 })
      const lotusInner = new THREE.MeshStandardMaterial({ color: 0xcfa79e, metalness: 0.04, roughness: 0.86 })
      const oilMat = new THREE.MeshStandardMaterial({ color: 0x2a1608, metalness: 0.35, roughness: 0.18 })
      const flameMat = new THREE.MeshStandardMaterial({
        color: 0xffa24a,
        emissive: 0xff6812,
        emissiveIntensity: 2.3,
        roughness: 0.4,
        transparent: true,
        opacity: 0.94,
      })
      const flameCore = new THREE.MeshStandardMaterial({
        color: 0xfff3c8,
        emissive: 0xffd36a,
        emissiveIntensity: 2.9,
        roughness: 0.24,
      })

      const group = new THREE.Group()
      S.add(group)

      /* ---------- 莲座：外圈 16 瓣 + 内圈 10 瓣 ---------- */
      const outerPetal = new THREE.SphereGeometry(0.195, 12, 8)
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2
        const p = new THREE.Mesh(outerPetal, lotusMat)
        p.scale.set(0.62, 0.3, 1)
        p.position.set(Math.cos(a) * 0.56, 0.19, Math.sin(a) * 0.56)
        p.rotation.y = Math.PI / 2 - a
        p.rotation.x = -0.16
        p.castShadow = true
        group.add(p)
      }
      const innerPetal = new THREE.SphereGeometry(0.15, 10, 8)
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.18
        const p = new THREE.Mesh(innerPetal, lotusInner)
        p.scale.set(0.58, 0.3, 1)
        p.position.set(Math.cos(a) * 0.36, 0.26, Math.sin(a) * 0.36)
        p.rotation.y = Math.PI / 2 - a
        p.rotation.x = -0.22
        group.add(p)
      }

      /* ---------- 底座、灯柱、束腰 ---------- */
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.12, 48), bronzeDark)
      base.position.y = 0.06
      base.castShadow = true
      base.receiveShadow = true
      group.add(base)

      const baseTop = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.58, 0.1, 48), bronze)
      baseTop.position.y = 0.16
      baseTop.receiveShadow = true
      group.add(baseTop)

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.125, 0.92, 24), bronze)
      stem.position.y = 0.65
      stem.castShadow = true
      group.add(stem)

      for (const y of [0.3, 0.98]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.018, 8, 32), bronzeDark)
        ring.rotation.x = Math.PI / 2
        ring.position.y = y
        group.add(ring)
      }

      /* ---------- 灯盏：Lathe 旋成的浅口铜碗 ---------- */
      const profile = [
        [0.02, 0],
        [0.28, 0.02],
        [0.46, 0.09],
        [0.55, 0.22],
        [0.5, 0.34],
        [0.3, 0.4],
        [0.02, 0.38],
      ].map(([r, y]) => new THREE.Vector2(r, y))
      const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), bronze)
      bowl.position.y = 1.1
      bowl.castShadow = true
      bowl.receiveShadow = true
      group.add(bowl)

      // 盏沿一圈高光，灯口才不是「一刀切」
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.505, 0.014, 8, 64), bronzeDark)
      rim.rotation.x = Math.PI / 2
      rim.position.y = 1.44
      group.add(rim)

      // 灯油：几乎黑中透一点琥珀
      const oil = new THREE.Mesh(new THREE.CircleGeometry(0.4, 40), oilMat)
      oil.rotation.x = -Math.PI / 2
      oil.position.y = 1.43
      group.add(oil)

      /* ---------- 灯芯与火苗 ---------- */
      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.15, 10), bronzeDark)
      wick.position.y = 1.5
      group.add(wick)

      const flameGroup = new THREE.Group()
      flameGroup.position.y = 1.55
      group.add(flameGroup)

      const flameOuter = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 16), flameMat)
      flameOuter.scale.set(1, 2.05, 1)
      flameOuter.position.y = 0.13
      flameGroup.add(flameOuter)

      const flameInner = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 14), flameCore)
      flameInner.scale.set(1, 1.7, 1)
      flameInner.position.y = 0.09
      flameGroup.add(flameInner)

      /* ---------- 光晕 / 背光 / 真点光源 ---------- */
      const glowTex = makeGlowTexture(THREE)
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xffc06a,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      )
      glow.scale.setScalar(1.9)
      glow.position.y = 1.68
      group.add(glow)

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: makeHaloTexture(THREE),
          color: 0xffd9a0,
          transparent: true,
          opacity: 0.32,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      )
      halo.scale.setScalar(1.55)
      halo.position.set(0, 1.66, -0.18)
      group.add(halo)

      const flameLight = new THREE.PointLight(0xffa14a, 5.2, 4.2, 2)
      flameLight.position.set(0, 1.68, 0)
      group.add(flameLight)

      /* ---------- 帧动画：火苗明灭 + 极轻的自转 ---------- */
      stage.onFrame((dt, t) => {
        if (reduced) return
        const flick = 1 + Math.sin(t * 7.3) * 0.055 + Math.sin(t * 17.1 + 1.2) * 0.025
        flameGroup.scale.set(1 + (flick - 1) * 0.5, flick, 1 + (flick - 1) * 0.5)
        flameGroup.rotation.z = Math.sin(t * 9.1) * 0.035
        flameLight.intensity = 5.2 + Math.sin(t * 11.7) * 0.65 + Math.sin(t * 5.3) * 0.3
        glow.material.opacity = 0.5 + Math.sin(t * 6.2) * 0.055
        group.rotation.y = Math.sin(t * 0.18) * 0.05
        void dt
      })

      // 场景与贴图都就绪后再揭开画布；此前让 HuiLamp 占位，
      // 避免「SVG 占位 → 空白 canvas → 3D」的闪空。
      setReady(true)
    })

    return () => {
      disposed = true
      stage?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (failed) return <>{fallback}</>

  return (
    <div className={`relative ${heightClass}`}>
      <canvas
        ref={canvasRef}
        className={`h-full w-full transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-0'}`}
        aria-label={t('common.lampAlt')}
      />
      {!ready && fallback ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">{fallback}</div>
      ) : null}
      {ready && (
        <p className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded-xs border border-paper/15 bg-celadon-950/85 px-3 py-1 font-sans text-[11px] tracking-wider text-paper/75">
          {t('common.dragRotate')} · {t('common.scrollZoom')} · {t('common.lampHint')}
        </p>
      )}
    </div>
  )
}
