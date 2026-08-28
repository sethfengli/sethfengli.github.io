import { useEffect, useRef, useState, type ReactNode } from 'react'
import type * as THREE from 'three'
import { createStage, type Stage } from './stage'
import { useI18n } from '../../i18n'

/**
 * 3D 朱漆描金签筒：回纹金带、卍字与莲徽、廿四签支。
 * 拖拽旋转 / 滚轮缩放；点击签筒摇签（抖动 + 签支跳动 + 一签飞升）。
 * WebGL 不可用时回退到 2D 签筒（fallback）。
 */

interface CylinderRig {
  group: THREE.Group
  sticks: THREE.Group
  stickBases: number[]
  flyStick: THREE.Group | null
  flyT: number
  shaker: { shaking: boolean; revealed: boolean }
}

interface Props {
  shaking: boolean
  revealed: boolean
  onShake: () => void
  fallback?: ReactNode
}

function drawCylinderTexture(): HTMLCanvasElement {
  const w = 1024
  const h = 512
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')!
  // 朱漆底
  const g = ctx.createLinearGradient(0, 0, w, 0)
  g.addColorStop(0, '#8f2e28')
  g.addColorStop(0.16, '#c24538')
  g.addColorStop(0.5, '#d95a48')
  g.addColorStop(0.84, '#c24538')
  g.addColorStop(1, '#8f2e28')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // 金带 + 回纹
  const band = (y: number) => {
    ctx.fillStyle = '#d4a92c'
    ctx.fillRect(0, y, w, 60)
    ctx.strokeStyle = '#8c6619'
    ctx.lineWidth = 6
    ctx.strokeRect(0, y, w, 60)
    ctx.beginPath()
    for (let x = 30; x < w; x += 62) {
      ctx.moveTo(x, y + 12)
      ctx.lineTo(x + 26, y + 12)
      ctx.lineTo(x + 26, y + 24)
      ctx.lineTo(x, y + 24)
      ctx.closePath()
      ctx.moveTo(x + 8, y + 36)
      ctx.lineTo(x + 34, y + 36)
      ctx.lineTo(x + 34, y + 48)
      ctx.lineTo(x + 8, y + 48)
      ctx.closePath()
    }
    ctx.stroke()
  }
  band(66)
  band(392)

  // 竖排金字（仿真实签筒：觀音靈籤 + 吉语），居中标字、两侧吉语
  ctx.fillStyle = '#f6e69b'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const vtext = (text: string, cx: number, y0: number, fs: number) => {
    ctx.font = `bold ${fs}px "LXGW WenKai","KaiTi","SimSun",serif`
    for (let i = 0; i < text.length; i++) {
      ctx.fillText(text[i], cx, y0 + i * (fs + 10))
    }
  }
  vtext('觀音靈籤', 512, 134, 40)
  vtext('有求必應', 152, 172, 34)
  vtext('慈航普渡', 872, 172, 34)
  ctx.stroke()
  return cv
}

export function LotCylinder3D({ shaking, revealed, onShake, fallback }: Props) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rigRef = useRef<CylinderRig | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false
    let stage: Stage | null = null

    void import('three').then((THREE) => {
      if (disposed || !canvas.isConnected) return
      try {
        stage = createStage(THREE, canvas, { distance: 8.5, autoRotate: 0, phi: 1.05 })
      } catch {
        setFailed(true)
        return
      }
      const S = stage.scene

      /* ---------- 筒身 ---------- */
      const tex = new THREE.CanvasTexture(drawCylinderTexture())
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 8
      const group = new THREE.Group()
      group.scale.setScalar(0.86)
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(2.15, 2.15, 5.4, 64),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.15 }),
      )
      group.add(body)
      // 筒口
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(2.15, 0.16, 16, 64),
        new THREE.MeshStandardMaterial({ color: 0xd4a92c, roughness: 0.3, metalness: 0.7 }),
      )
      rim.rotation.x = Math.PI / 2
      rim.position.y = 2.7
      group.add(rim)
      const cap = new THREE.Mesh(
        new THREE.CircleGeometry(2.0, 64),
        new THREE.MeshStandardMaterial({ color: 0x461713, roughness: 0.9 }),
      )
      cap.rotation.x = -Math.PI / 2
      cap.position.y = 2.72
      group.add(cap)
      // 底座
      const base1 = new THREE.Mesh(
        new THREE.CylinderGeometry(2.45, 2.65, 0.5, 64),
        new THREE.MeshStandardMaterial({ color: 0xb38620, roughness: 0.35, metalness: 0.6 }),
      )
      base1.position.y = -2.9
      group.add(base1)
      const base2 = new THREE.Mesh(
        new THREE.CylinderGeometry(2.75, 2.9, 0.36, 64),
        new THREE.MeshStandardMaterial({ color: 0x8c6619, roughness: 0.35, metalness: 0.6 }),
      )
      base2.position.y = -3.3
      group.add(base2)
      S.add(group)
      // 底座接地软阴影（视觉“落地”）
      stage.addCatchShadow({ radius: 3.4, y: -3.62, opacity: 0.5 })

      /* ---------- 廿四签支（扁平签条，竹色 + 红签头） ---------- */
      const sticks = new THREE.Group()
      const stickMat = new THREE.MeshStandardMaterial({ color: 0xf0e3c8, roughness: 0.75 })
      const tipMat = new THREE.MeshStandardMaterial({ color: 0xc24538, roughness: 0.5 })
      const stickBases: number[] = []
      for (let i = 0; i < 24; i++) {
        const st = new THREE.Group()
        const a = (i / 24) * Math.PI * 2
        const r = 0.75 + ((i * 37) % 10) * 0.08
        // 签身：扁平竹条（宽 0.19、厚 0.035、长 2.1），顶头圆角由签头红漆段过渡
        const stick = new THREE.Mesh(new THREE.BoxGeometry(0.19, 2.1, 0.035), stickMat)
        stick.position.y = 1.05
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.14, 0.037), tipMat)
        tip.position.y = 2.14
        st.add(stick, tip)
        st.position.set(Math.cos(a) * r, 2.78, Math.sin(a) * r)
        st.rotation.y = -a
        st.rotation.x = Math.sin(a) * 0.1
        st.rotation.z = Math.cos(a) * 0.1
        sticks.add(st)
        stickBases.push(2.78)
      }
      group.add(sticks)

      const rig: CylinderRig = {
        group,
        sticks,
        stickBases,
        flyStick: null,
        flyT: -1,
        shaker: { shaking: false, revealed: false },
      }
      rigRef.current = rig

      stage.setPick(
        () => [group],
        () => onShake(),
      )

      /* ---------- 帧动画 ---------- */
      stage.onFrame((dt, t) => {
        const sh = rig.shaker
        if (sh.shaking) {
          group.position.x = Math.sin(t * 34) * 0.14
          group.position.z = Math.cos(t * 28) * 0.1
          group.rotation.z = Math.sin(t * 30) * 0.06
          for (let i = 0; i < rig.sticks.children.length; i++) {
            const st = rig.sticks.children[i]
            st.position.y = rig.stickBases[i] + Math.abs(Math.sin(t * 38 + i * 1.7)) * 0.3
          }
        } else {
          group.position.x += (0 - group.position.x) * Math.min(1, dt * 8)
          group.position.z += (0 - group.position.z) * Math.min(1, dt * 8)
          group.rotation.z += (0 - group.rotation.z) * Math.min(1, dt * 8)
          for (let i = 0; i < rig.sticks.children.length; i++) {
            const st = rig.sticks.children[i]
            st.position.y += (rig.stickBases[i] - st.position.y) * Math.min(1, dt * 8)
          }
        }
        if (sh.revealed) {
          if (!rig.flyStick) {
            rig.flyStick = rig.sticks.children[0] as THREE.Group
            rig.flyT = 0
          }
          rig.flyT += dt
          const k = Math.min(1, rig.flyT / 1.15)
          const st = rig.flyStick
          st.position.y = 3.05 + 9 * k * k
          st.rotation.x -= dt * 5
          if (k >= 1) st.visible = false
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

  // 父级相位同步
  useEffect(() => {
    const rig = rigRef.current
    if (!rig) return
    rig.shaker.shaking = shaking
    rig.shaker.revealed = revealed
    if (!shaking && !revealed && rig.flyStick) {
      rig.flyStick.visible = true
      rig.flyStick.rotation.x = 0
      rig.flyStick.position.y = 2.78
      rig.flyStick = null
      rig.flyT = -1
    }
  }, [shaking, revealed])

  if (failed) return <>{fallback}</>

  return (
    <div className="relative h-[300px] w-full max-w-[400px] sm:h-[340px]">
      <canvas ref={canvasRef} className="h-full w-full" aria-label="3D 签筒" />
      <p className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-sandalwood-950/60 px-3 py-1 text-[11px] text-paper/80 backdrop-blur-sm">
        {t('common.lotHint')}
      </p>
    </div>
  )
}
