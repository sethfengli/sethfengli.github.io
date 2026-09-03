import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { zh } from './zh'
import { en } from './en'
import type { Dict, PathsOf } from './types'

export type Lang = 'zh' | 'en'

const LANG_KEY = 'hdc.lang'

const dicts: Record<Lang, Dict> = { zh, en }

export interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  toggleLang: () => void
  /** 用 {{key}} 占位符插值的翻译函数 */
  t: (key: PathsOf<Dict>, vars?: Record<string, string | number>) => string
  /** 返回数组/对象型词典节点（如 about.faq、about.heritage） */
  arr: (key: PathsOf<Dict>) => unknown
}

const Ctx = createContext<I18nCtx | null>(null)

function resolve(d: Dict, path: string): unknown {
  let node: unknown = d
  for (const seg of path.split('.')) {
    if (node == null || typeof node !== 'object') return path
    node = (node as Record<string, unknown>)[seg]
  }
  return node === undefined ? path : node
}

function interpolate(raw: string, vars?: Record<string, string | number>): string {
  if (!vars) return raw
  return raw.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
    k in vars ? String(vars[k]) : `{{${k}}}`,
  )
}

/** 依据浏览器语言偏好猜测初始语言（无/无效的本地偏好时生效） */
function detectBrowserLang(): Lang {
  try {
    const list = navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language]
    const primary = (list[0] || navigator.language || '').toLowerCase()
    // 中文浏览器用中文，其余浏览器默认英文（不再一律回退到中文）
    return primary.startsWith('zh') ? 'zh' : 'en'
  } catch {
    return 'zh'
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    // 1. 用户已显式选择过 → 尊重保存值
    try {
      const saved = localStorage.getItem(LANG_KEY)
      if (saved === 'zh' || saved === 'en') return saved
    } catch {
      /* 隐私模式下忽略 */
    }
    // 2. 首次访问 → 跟随浏览器语言偏好
    return detectBrowserLang()
  })

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      /* 隐私模式下忽略 */
    }
  }, [lang])

  const setLang = useCallback((l: Lang) => setLangState(l), [])
  const toggleLang = useCallback(
    () => setLangState((p) => (p === 'zh' ? 'en' : 'zh')),
    [],
  )

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      const raw = resolve(dicts[lang], path)
      return typeof raw === 'string' ? interpolate(raw, vars) : String(raw ?? path)
    },
    [lang],
  )

  const arr = useCallback(
    (path: string) => resolve(dicts[lang], path),
    [lang],
  )

  const value = useMemo<I18nCtx>(
    () => ({
      lang,
      setLang,
      toggleLang,
      t: t as I18nCtx['t'],
      arr: arr as I18nCtx['arr'],
    }),
    [lang, setLang, toggleLang, t, arr],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
