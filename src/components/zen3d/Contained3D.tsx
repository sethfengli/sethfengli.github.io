import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Defer a 3D scene until either the viewport gate opens or (optionally) the
 * reader asks for it.
 *
 * Why two gates: `three.js` is a 707 KB chunk. Round 9 proved the viewport gate
 * works when the scene is genuinely below the fold (`/` = 615.6 KB first screen,
 * censer at y=3489). Round 10 measured the other three routes and found the
 * scene sits *inside* the fold there, so the viewport gate correctly lets it
 * through and those routes still pay the full 707 KB:
 *
 *   route     scene top   doc height   why the viewport gate opens
 *   /dharma   573         2506         in first screen
 *   /prayer   722         2011         in first screen
 *   /lots     860         2593         inside the 802+400 rootMargin band
 *
 * Pushing those scenes past `fold + rootMargin` (i.e. y > 1202) was measured to
 * be a layout rewrite, not a nudge: `/dharma` would need +630px and `/prayer`
 * +481px, while the whole document is only 2506/2011px — the top of the page
 * would end up half empty. So on those routes the 3D becomes an explicit
 * upgrade instead: the placeholder IS the scene's existing DOM fallback
 * (`TempleBell` / `WishTree` / `LotCylinder` / `IncenseBurner`), which is fully
 * interactive without WebGL, and requesting the 3D version is the reader's
 * choice. Same 707 KB saved, no layout change.
 *
 * Ordering note: `requireOptIn` only arms the viewport gate — it never bypasses
 * it. A click while the scene is still off-screen records the intent and the
 * IntersectionObserver still waits, so clicking can never pull `three.js` into
 * the first screen.
 */
export function Contained3D({
  children,
  placeholder,
  minHeight = 320,
  rootMargin = '400px 0px',
  /** Show an explicit "enable 3D" control instead of loading on scroll. */
  requireOptIn = false,
  /** Label for that control. */
  optInLabel,
}: {
  children: ReactNode
  placeholder: ReactNode
  /** Reserve the scene's height so nothing shifts when it arrives. */
  minHeight?: number
  rootMargin?: string
  requireOptIn?: boolean
  optInLabel?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [requested, setRequested] = useState(false)

  useEffect(() => {
    if (visible) return
    // Opt-in mode stays shut until the reader asks for the scene.
    if (requireOptIn && !requested) return
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
  }, [visible, rootMargin, requireOptIn, requested])

  return (
    <div ref={ref} className="relative" style={{ minHeight }}>
      {visible ? (
        children
      ) : (
        <>
          {placeholder}
          {requireOptIn && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setRequested(true)}
                aria-label={optInLabel}
                className="btn-ghost pointer-events-auto rounded-xs bg-rice-50/85 px-3 py-1.5 text-xs backdrop-blur-[2px]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinejoin="round"
                >
                  <path d="M8 1.5 14 5v6l-6 3.5L2 11V5z" />
                  <path d="M2 5l6 3.5L14 5M8 8.5V15" />
                </svg>
                {optInLabel}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
