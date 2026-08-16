import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createStage, type Stage } from './stage'
import { createCenser, type CenserVariant } from './censer'

/**
 * 3D 鼎式香炉（独立场景）：三足双耳铜鼎、香灰、真实燃香细节、袅袅青烟。
 * 香型按场景切换：sticks=线香（礼佛）、coil=盘香（禅修）、cone=塔香（祈愿）。
 * 鼠标拖拽旋转 / 滚轮缩放；WebGL 不可用时回退 2D 香炉。
 */

interface Props {
  variant?: CenserVariant
  scale?: number
  /** 场景高度（配合版面） */
  heightClass?: string
  /** 相机距离（越小越近） */
  distance?: number
  fallback?: ReactNode
}

export function Incense3D({
  variant = 'sticks',
  scale = 1,
  heightClass = 'h-[300px]',
  distance = 7,
  fallback,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  const variantRef = useRef(variant)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false
    let stage: Stage | null = null

    void import('three').then((THREE) => {
      if (disposed || !canvas.isConnected) return
      try {
        stage = createStage(THREE, canvas, { distance, autoRotate: 0, phi: 1.0, minDistance: 4, maxDistance: 16 })
      } catch {
        setFailed(true)
        return
      }
      const S = stage.scene
      const { group, rig } = createCenser(THREE, variantRef.current, scale)
      S.add(group)

      stage.onFrame((dt, t) => {
        rig.update(dt, t)
        // 香炉微转（仅当用户未交互时由 stage 自行处理阻尼；此处不做自动旋转）
        group.rotation.y = Math.sin(t * 0.3) * 0.06
      })
    })

    return () => {
      disposed = true
      stage?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (failed) return <>{fallback}</>

  return (
    <div className={`relative w-full ${heightClass}`}>
      <canvas ref={canvasRef} className="h-full w-full" aria-label="3D 鼎式香炉" />
      <p className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-sandalwood-950/60 px-3 py-1 text-[11px] text-paper/80 backdrop-blur-sm">
        拖拽旋转 · 滚轮缩放 · 心香常燃
      </p>
    </div>
  )
}
