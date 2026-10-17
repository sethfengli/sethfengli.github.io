import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Defer a 3D scene until its container is (nearly) in view.
 *
 * Why a viewport gate: `three.js` is a 707 KB chunk. Route-level lazy loading
 * alone already keeps it out of *other* routes; this gate keeps it out of the
 * first screen of pages whose scene sits far below the fold (`/` — censer at
 * y≈3489). Where the scene is genuinely visible on arrival (`/dharma`,
 * `/prayer`, `/lots`) the observer fires on the first frame and the scene
 * simply plays — there is no opt-in button and no click-to-load step.
 *
 * The placeholder is the scene's own DOM fallback (`TempleBell` / `WishTree` /
 * `LotCylinder` / `IncenseBurner`), so the area is never blank and stays
 * interactive while the chunk downloads.
 */
export function Contained3D({
  children,
  placeholder,
  minHeight = 320,
  rootMargin = '400px 0px',
}: {
  children: ReactNode
  placeholder: ReactNode
  /** Reserve the scene's height so nothing shifts when it arrives. */
  minHeight?: number
  rootMargin?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (visible) return
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible, rootMargin])

  return (
    <div ref={ref} className="relative" style={{ minHeight }}>
      {visible ? children : placeholder}
    </div>
  )
}
