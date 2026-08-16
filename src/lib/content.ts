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
import photosJson from '../data/photos.json'

export const CATALOG: ArticleMeta[] = catalogJson as ArticleMeta[]

/** 免版权真实照片（Wikimedia Commons，本地托管 public/photos/） */
export const PHOTO_NAMES: string[] = (photosJson as { photos?: string[] }).photos ?? []

/** 按目录序 + 步长分配封面照片：相邻文章跳到相隔 7 张（跨类别）的照片，避免雷同/重复 */
export function photoForSlug(slug: string): string {
  if (PHOTO_NAMES.length === 0) return ''
  const idx = CATALOG.findIndex((a) => a.slug === slug)
  const base = idx < 0 ? 0 : idx
  const pick = (((base * 7) % PHOTO_NAMES.length) + PHOTO_NAMES.length) % PHOTO_NAMES.length
  return `/photos/${PHOTO_NAMES[pick]}`
}

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

/** 文章正文各级标题 → 目录（带层级标号：一、二、三 / 1、2、3 / （1）（2）） */
export interface TocItem {
  id: string
  level: 2 | 3 | 4
  text: string
  num: string
}

const CN_NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

function toCnNum(n: number): string {
  if (n <= 0) return String(n)
  if (n <= 10) return CN_NUMS[n - 1]
  if (n < 20) return `十${n === 10 ? '' : CN_NUMS[(n % 10) - 1]}`
  if (n < 100) {
    const tens = CN_NUMS[Math.floor(n / 10) - 1]
    const ones = n % 10
    return `${tens}十${ones ? CN_NUMS[ones - 1] : ''}`
  }
  return String(n)
}

/** 标题自带编号（一、/1./（一）开头）时，目录不再前置标号，避免“一 一、培养目标”式重复 */
function hasOwnNumber(text: string): boolean {
  return /^[一二三四五六七八九十百]+[、.．，,]/.test(text) || /^\d+[、.．]/.test(text) || /^[（(][一二三四五六七八九十\d]+[)）]/.test(text)
}

export function tocOf(doc: ArticleDoc): TocItem[] {
  const out: TocItem[] = []
  let h2c = 0
  let h3c = 0
  let h4c = 0
  for (const b of doc.blocks) {
    if (b.t === 'h2') {
      h2c++
      h3c = 0
      h4c = 0
      out.push({ id: `s-${h2c}`, level: 2, text: b.text, num: hasOwnNumber(b.text) ? '' : toCnNum(h2c) })
    } else if (b.t === 'h3') {
      h3c++
      h4c = 0
      out.push({ id: `s-${h2c}-${h3c}`, level: 3, text: b.text, num: hasOwnNumber(b.text) ? '' : String(h3c) })
    } else if (b.t === 'h4') {
      h4c++
      out.push({ id: `s-${h2c}-${h3c}-${h4c}`, level: 4, text: b.text, num: hasOwnNumber(b.text) ? '' : `（${h4c}）` })
    }
  }
  return out
}

/** 标题文本 → 锚点 id 映射（供表格单元格等跳转使用） */
export function headingAnchorMap(doc: ArticleDoc): Map<string, string> {
  const map = new Map<string, string>()
  for (const item of tocOf(doc)) map.set(item.text, item.id)
  return map
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
