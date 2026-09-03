export type SiteTheme = 'rice' | 'vermilion' | 'celadon' | 'night'

const KEY = 'hdc.siteTheme'
const VALID: SiteTheme[] = ['rice', 'vermilion', 'celadon', 'night']

/** 依据浏览器本地时区判断当前是否属于夜间（白天/夜晚的判定起点） */
const NIGHT_START_HOUR = 19 // 本地时间 19:00 起算夜晚
const NIGHT_END_HOUR = 6 // 本地时间 06:00 之前仍算夜晚

function detectBrowserTimeTheme(): SiteTheme {
  const hour = new Date().getHours() // 浏览器本地时区的小时
  const isNight = hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR
  return isNight ? 'night' : 'rice'
}

export function loadSiteTheme(): SiteTheme {
  // 1. 用户已显式选择过 → 尊重保存值（兼容直接存储的裸字符串）
  try {
    const raw = localStorage.getItem(KEY)
    if (raw != null) {
      // 兼容历史上可能以 JSON 字符串形式写入的值（如 "rice"）
      let value: string = raw
      try {
        const parsed = JSON.parse(raw)
        if (typeof parsed === 'string') value = parsed
      } catch {
        /* 裸字符串，保留原样 */
      }
      if ((VALID as string[]).includes(value)) return value as SiteTheme
    }
  } catch {
    /* 隐私模式下忽略 */
  }
  // 2. 首次访问 → 按浏览器时区判定白天/夜晚，默认不再是白天
  return detectBrowserTimeTheme()
}

export function applySiteTheme(theme: SiteTheme) {
  document.documentElement.dataset.siteTheme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* ignore */
  }
}

/** 初始化：在 React 渲染前应用（main.tsx 调用），避免主题闪烁 */
export function initSiteTheme() {
  applySiteTheme(loadSiteTheme())
}
