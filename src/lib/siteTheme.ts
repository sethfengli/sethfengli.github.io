import { storageGet } from './storage'

export type SiteTheme = 'rice' | 'vermilion' | 'celadon' | 'night'

const KEY = 'hdc.siteTheme'
const VALID: SiteTheme[] = ['rice', 'vermilion', 'celadon', 'night']

export function loadSiteTheme(): SiteTheme {
  const saved = storageGet<string | null>(KEY, null)
  return saved && (VALID as string[]).includes(saved) ? (saved as SiteTheme) : 'rice'
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
