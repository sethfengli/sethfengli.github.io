import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createStage, type Stage } from './stage'
import { createCenser, type CenserVariant } from './censer'
import { useI18n } from '../../i18n'

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
  /** 相机距离（初始即全景，最小缩放） */
  distance?: number
  /** 最大距离（默认 = distance，起始即放到最远） */
  maxDistance?: number
  fallback?: ReactNode
}

export function Incense3D({
  variant = 'sticks',
  scale = 1,
  heightClass = 'h-[300px]',
  distance = 7,
  maxDistance,
  fallback,
}: Props) {
  const { t } = useI18n()
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
        // 起始即最小缩放（相机放到最远），由用户自行拉近
        stage = createStage(THREE, canvas, {
          distance: maxDistance ?? distance,
          minDistance: 4,
          maxDistance: maxDistance ?? distance,
          autoRotate: 0,
          phi: 1.0,
        })
      } catch {
        setFailed(true)
        return
      }
      const S = stage.scene
      const { group, rig } = createCenser(THREE, variantRef.current, scale)
      // 入场轻缩放：从 0.82 → 1（最短距离为全景，物体不会遮挡视野）
      group.scale.setScalar(scale * 0.82)
      S.add(group)

      stage.onFrame((dt, t) => {
        rig.update(dt, t)
        const k = Math.min(1, t / 1.6)
        const s = scale * (0.82 + 0.18 * (1 - Math.pow(1 - k, 3)))
        group.scale.setScalar(s)
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
      <canvas ref={canvasRef} className="h-full w-full" aria-label={t('common.censerAlt')} />
      <p className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded-xs border border-paper/15 bg-sandalwood-950/85 px-3 py-1 font-sans text-[11px] tracking-wider text-paper/75">
        {t('common.dragRotate')} · {t('common.scrollZoom')} · {t('common.censerHint')}
      </p>
    </div>
  )
}
