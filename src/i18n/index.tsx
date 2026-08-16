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

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY)
      return saved === 'en' ? 'en' : 'zh'
    } catch {
      return 'zh'
    }
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
