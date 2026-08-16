import type { IllustrationVariant } from '../components/zen/ZenIllustration'

export type School = 'jing' | 'chan' | 'xiuxue'

/** 行内片段：s 为文本，href 为可选的站内文章链接 */
export interface Inline {
  s: string
  href?: string
}

export type Block =
  | { t: 'h2' | 'h3' | 'h4'; text: string }
  | { t: 'p'; inline: Inline[] }
  | { t: 'quote'; inline: Inline[] }
  | { t: 'table'; rows: Inline[][][] } // 行 → 单元格 → 片段
  | { t: 'hr' }

export interface ArticleMeta {
  slug: string
  title: string
  author: string
  school: School
  illustration: IllustrationVariant
  excerpt: string
  /** 正文字符数，用于估算阅读时长 */
  chars: number
}

export interface ArticleDoc extends ArticleMeta {
  blocks: Block[]
}

/* ---------------- 目录 ---------------- */
import catalogJson from '../content/catalog.json'

export const CATALOG: ArticleMeta[] = catalogJson as ArticleMeta[]

export const SCHOOL_LABEL_ZH: Record<School, string> = {
  jing: '净修院',
  chan: '禅修院',
  xiuxue: '修学园地',
}

/* ---------------- 文章懒加载（Vite 按需分包） ---------------- */
const files = import.meta.glob<{ default: ArticleDoc }>('../content/articles/*.json')

export async function loadArticle(slug: string): Promise<ArticleDoc | null> {
  const loader = files[`../content/articles/${slug}.json`]
  if (!loader) return null
  try {
    const mod = await loader()
    return mod.default
  } catch {
    return null
  }
}

export function neighborsOf(slug: string, school?: School): { prev: ArticleMeta | null; next: ArticleMeta | null } {
  const pool = school
    ? CATALOG.filter((a) => a.school === school)
    : CATALOG
  const idx = pool.findIndex((a) => a.slug === slug)
  if (idx < 0) return { prev: null, next: null }
  return {
    prev: idx > 0 ? pool[idx - 1] : null,
    next: idx < pool.length - 1 ? pool[idx + 1] : null,
  }
}

export function readingMinutes(chars: number): number {
  return Math.max(1, Math.round(chars / 400))
}

/** 文章正文各级标题 → 目录 */
export function tocOf(doc: ArticleDoc): Array<{ id: string; level: 2 | 3 | 4; text: string }> {
  const out: Array<{ id: string; level: 2 | 3 | 4; text: string }> = []
  let h2c = 0
  let h3c = 0
  let h4c = 0
  for (const b of doc.blocks) {
    if (b.t === 'h2') out.push({ id: `s-${++h2c}`, level: 2, text: b.text })
    else if (b.t === 'h3') out.push({ id: `s-${h2c}-${++h3c}`, level: 3, text: b.text })
    else if (b.t === 'h4') out.push({ id: `s-${h2c}-${h3c}-${++h4c}`, level: 4, text: b.text })
  }
  return out
}

/** 给渲染用的标题分配 id（与 tocOf 保持一致） */
export function headingId(doc: ArticleDoc, blockIndex: number): string {
  let h2c = 0
  let h3c = 0
  let h4c = 0
  for (let i = 0; i <= blockIndex; i++) {
    const b = doc.blocks[i]
    if (b.t === 'h2') {
      h2c++
      h3c = 0
      h4c = 0
    } else if (b.t === 'h3') h3c++
    else if (b.t === 'h4') h4c++
  }
  const b = doc.blocks[blockIndex]
  if (b.t === 'h2') return `s-${h2c}`
  if (b.t === 'h3') return `s-${h2c}-${h3c}`
  return `s-${h2c}-${h3c}-${h4c}`
}
