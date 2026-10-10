import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Defer a 3D scene until it is (nearly) scrolled into view.
 *
 * Why: `three.js` is a 707 KB chunk. Round 9 measured that even with the zen3d
 * components behind `lazy()`, the four routes that contain a scene still pulled
 * it during the first screen (Home 1337 KB, /lots 1377 KB) — because the scene
 * sits above the fold on a tall window or simply mounts early. The scenes are all
 * decoration below the fold (a censer, a bell, a tree, a lot cylinder), so gating
 * on the viewport removes three.js from the first screen entirely while keeping
 * the placeholder (the DOM fallback) interactive.
 *
 * `rootMargin` pre-loads a little before the scene arrives so the hand-off is
 * invisible in practice. If IntersectionObserver is unavailable (very old
 * browsers) it loads immediately -- correct, just not deferred.
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
    <div ref={ref} style={{ minHeight }}>
      {visible ? children : placeholder}
    </div>
  )
}
