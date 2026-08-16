import { storageGet, storageSet } from './storage'

export type ReaderTheme = 'light' | 'dark' | 'sepia' | 'parchment' | 'moon'

export interface ReadingPrefs {
  fontSize: number // px
  lineHeight: number
  theme: ReaderTheme
}

const PREFS_KEY = 'hdc.readingPrefs'
const PROGRESS_KEY = 'hdc.readingProgress' // { [slug]: 0-100 }

export const DEFAULT_PREFS: ReadingPrefs = {
  fontSize: 18,
  lineHeight: 1.9,
  theme: 'light',
}

export const FONT_SIZE_RANGE = { min: 15, max: 24, step: 1 }
export const LINE_HEIGHT_RANGE = { min: 1.6, max: 2.6, step: 0.1 }

export function loadPrefs(): ReadingPrefs {
  const saved = storageGet<Partial<ReadingPrefs> | null>(PREFS_KEY, null)
  if (!saved) return DEFAULT_PREFS
  return {
    fontSize:
      typeof saved.fontSize === 'number'
        ? Math.min(FONT_SIZE_RANGE.max, Math.max(FONT_SIZE_RANGE.min, saved.fontSize))
        : DEFAULT_PREFS.fontSize,
    lineHeight:
      typeof saved.lineHeight === 'number'
        ? Math.min(
            LINE_HEIGHT_RANGE.max,
            Math.max(LINE_HEIGHT_RANGE.min, saved.lineHeight),
          )
        : DEFAULT_PREFS.lineHeight,
    theme:
      saved.theme && ['light', 'dark', 'sepia', 'parchment', 'moon'].includes(saved.theme)
        ? (saved.theme as ReaderTheme)
        : DEFAULT_PREFS.theme,
  }
}

export function savePrefs(prefs: ReadingPrefs) {
  storageSet(PREFS_KEY, prefs)
}

export function getProgress(slug: string): number {
  const all = storageGet<Record<string, number>>(PROGRESS_KEY, {})
  const p = all[slug]
  return typeof p === 'number' ? Math.min(100, Math.max(0, p)) : 0
}

export function setProgress(slug: string, percent: number) {
  const all = storageGet<Record<string, number>>(PROGRESS_KEY, {})
  const p = Math.min(100, Math.max(0, Math.round(percent)))
  if (p <= 0) delete all[slug]
  else all[slug] = p
  storageSet(PROGRESS_KEY, all)
}

export function resetReadingPrefs() {
  try {
    localStorage.removeItem(PREFS_KEY)
  } catch {
    /* ignore */
  }
}
