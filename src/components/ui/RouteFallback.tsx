/**
 * 路由级懒加载的占位骨架。
 *
 * 为什么不返回 `null`：本项目用 `viewTransition` 做页面过渡，若 Suspense 的
 * fallback 是空节点，切换路由的瞬间会出现**整屏空白帧**（第 9 轮的验收判据明确
 * 要求「不出现明显空白」）。这里用与 `PageBanner` 同构的题头骨架占位：
 * 标题区留出相近的高度与左右留白，内容区用呼吸动画提示「正在加载」，
 * 既有稳定版式、又不搬运任何真实内容（避免加载完成后再闪一次大幅位移）。
 *
 * ⚠ 它会被打进**共享 chunk**（App.tsx 静态 import），所以必须保持零依赖：
 * 不要在这里 import i18n、图片清单或任何页面组件，否则会把首屏成本加回去。
 */
export function RouteFallback() {
  return (
    <div aria-busy="true" aria-live="polite" className="container-page py-16 lg:py-24">
      <div className="animate-pulse">
        <div className="h-2 w-16 rounded-xs bg-rice-200" />
        <div className="mt-6 h-9 w-2/3 max-w-xl rounded-xs bg-rice-200 sm:h-11" />
        <div className="mt-4 h-3 w-1/2 max-w-md rounded-xs bg-rice-100" />
      </div>
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse border border-hairline bg-surface">
            <div className="h-32 bg-rice-100" />
            <div className="space-y-3 p-6">
              <div className="h-2 w-8 rounded-xs bg-rice-200" />
              <div className="h-4 w-3/4 rounded-xs bg-rice-200" />
              <div className="h-3 w-full rounded-xs bg-rice-100" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}
