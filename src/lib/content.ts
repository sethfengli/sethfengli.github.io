import type { IllustrationVariant } from '../components/zen/ZenIllustration'

export type School = 'jing' | 'chan' | 'xiuxue'
export type Lang = 'zh' | 'en'

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

/** 英文覆盖数据（src/content/en/<slug>.json），字段与中文文章一一对应 */
export interface ArticleEn {
  slug: string
  title?: string
  author?: string
  excerpt?: string
  blocks?: Block[]
}

/* ---------------- 目录 ---------------- */
import catalogJson from '../content/catalog.json'
import catalogEnJson from '../content/catalog-en.json'
import photosJson from '../data/photos.json'

export const CATALOG: ArticleMeta[] = catalogJson as ArticleMeta[]

/** slug → 英文标题/摘录/作者（由 scripts/build-catalog-en.mjs 从 en/*.json 生成） */
export const CATALOG_EN: Record<string, { title?: string; author?: string; excerpt?: string }> =
  catalogEnJson as Record<string, { title?: string; author?: string; excerpt?: string }>

/** 是否已有英文正文覆盖（决定阅读器是否显示“原文+机翻”兜底提示） */
export function hasEnglish(slug: string): boolean {
  return Boolean(enFiles[`../content/en/${slug}.json`])
}

/** 免版权真实照片（Wikimedia Commons，本地托管 public/photos/） */
export const PHOTO_NAMES: string[] = (photosJson as { photos?: string[] }).photos ?? []

/* ------------------------------------------------------------------
   封面照片按院系语义分池（2026-08 意境核对）：
   - 净修院（净土/莲花）→ 莲池、清净园林
   - 禅修院（禅门）→ 梵钟、山峦、禅修雕像
   - 修学园地（随笔）→ 寺院山门、殿堂、行脚路
   已从池中剔除与佛法意境不符的照片（大象象牙雕、军工博物馆、
   军乐队、武士刀镡、面目狰狞雕像等，见 public/photos/CREDITS.md）。
------------------------------------------------------------------- */
const LOTUS_POOL = ['photo-111', 'photo-112', 'photo-113', 'photo-114', 'photo-115', 'photo-116', 'photo-117']
const BELL_POOL = [
  'photo-50', 'photo-53', 'photo-55', 'photo-56', 'photo-58', 'photo-59', 'photo-65',
  'photo-66', 'photo-68', 'photo-69', 'photo-74', 'photo-77', 'photo-79', 'photo-81',
]
const STATUE_POOL = [
  'photo-02', 'photo-03', 'photo-04', 'photo-06', 'photo-07', 'photo-09', 'photo-10',
  'photo-12', 'photo-13', 'photo-14', 'photo-15', 'photo-16', 'photo-17', 'photo-18',
  'photo-19', 'photo-20', 'photo-21', 'photo-22', 'photo-23', 'photo-24', 'photo-25',
  'photo-26', 'photo-27', 'photo-28', 'photo-29', 'photo-30', 'photo-31', 'photo-32',
  'photo-33', 'photo-34', 'photo-35', 'photo-36', 'photo-37', 'photo-38', 'photo-39',
  'photo-40', 'photo-41', 'photo-42', 'photo-43', 'photo-44', 'photo-45', 'photo-46',
  'photo-47', 'photo-95', 'photo-96', 'photo-97', 'photo-98', 'photo-105', 'photo-108',
]
const TEMPLE_POOL = [
  'photo-49', 'photo-52', 'photo-54', 'photo-60', 'photo-61', 'photo-62', 'photo-63',
  'photo-64', 'photo-71', 'photo-72', 'photo-73', 'photo-75', 'photo-76', 'photo-78',
  'photo-83', 'photo-88', 'photo-89', 'photo-99', 'photo-101', 'photo-102', 'photo-103',
  'photo-104', 'photo-106', 'photo-107', 'photo-109',
]
const MOUNTAIN_POOL = ['photo-84', 'photo-89', 'photo-118', 'photo-119']

function poolFor(school: School): string[] {
  switch (school) {
    case 'jing':
      return [...LOTUS_POOL, ...LOTUS_POOL, ...TEMPLE_POOL] // 莲池为主，穿插清净园林
    case 'chan':
      return [...BELL_POOL, ...BELL_POOL, ...MOUNTAIN_POOL, ...STATUE_POOL.slice(0, 14)]
    case 'xiuxue':
      return [...TEMPLE_POOL, ...TEMPLE_POOL, ...STATUE_POOL.slice(14, 30)]
  }
}

/** 按目录序 + 步长分配封面照片：同院系相邻文章跳 7 张，避免雷同/重复 */
export function photoForSlug(slug: string): string {
  const idx = CATALOG.findIndex((a) => a.slug === slug)
  const meta = idx >= 0 ? CATALOG[idx] : null
  const pool = poolFor(meta?.school ?? 'xiuxue')
  if (pool.length === 0) return PHOTO_NAMES.length ? `/photos/${PHOTO_NAMES[0]}` : ''
  const base = idx < 0 ? 0 : idx
  const pick = (((base * 7) % pool.length) + pool.length) % pool.length
  return `/photos/${pool[pick]}.jpg`
}

export const SCHOOL_LABEL_ZH: Record<School, string> = {
  jing: '净修院',
  chan: '禅修院',
  xiuxue: '修学园地',
}

export const SCHOOL_LABEL_EN: Record<School, string> = {
  jing: 'Pure Practice',
  chan: 'Chan School',
  xiuxue: 'Study Garden',
}

export function schoolLabel(school: School, lang: Lang): string {
  return lang === 'en' ? SCHOOL_LABEL_EN[school] : SCHOOL_LABEL_ZH[school]
}

/** 按语言取文章元信息（标题/作者/摘录），英文缺失时回退中文 */
export function localizedMeta(
  a: ArticleMeta,
  lang: Lang,
): { title: string; author: string; excerpt: string } {
  if (lang !== 'en') return { title: a.title, author: a.author, excerpt: a.excerpt }
  const en = CATALOG_EN[a.slug]
  if (!en) return { title: a.title, author: a.author, excerpt: a.excerpt }
  return {
    title: en.title ?? a.title,
    author: en.author ?? a.author,
    excerpt: en.excerpt ?? a.excerpt,
  }
}

/* ---------------- 文章懒加载（Vite 按需分包） ---------------- */
const files = import.meta.glob<{ default: ArticleDoc }>('../content/articles/*.json')
const enFiles = import.meta.glob<{ default: ArticleEn }>('../content/en/*.json')

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

/** 按语言加载文章：英文模式且有原生译文时，将标题/作者/摘录/正文替换为英文 */
export async function loadArticleForLang(slug: string, lang: Lang): Promise<ArticleDoc | null> {
  const doc = await loadArticle(slug)
  if (!doc || lang !== 'en') return doc
  const loader = enFiles[`../content/en/${slug}.json`]
  if (!loader) return doc
  try {
    const mod = await loader()
    const en = mod.default
    return {
      ...doc,
      title: en.title ?? doc.title,
      author: en.author ?? doc.author,
      excerpt: en.excerpt ?? doc.excerpt,
      blocks: en.blocks ?? doc.blocks,
    }
  } catch {
    return doc
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

const ROMAN = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
] as const

function toRomanNum(n: number): string {
  if (n <= 0) return String(n)
  let out = ''
  let rest = n
  for (const [v, s] of ROMAN) {
    while (rest >= v) {
      out += s
      rest -= v
    }
  }
  return out
}

/** 标题自带编号（一、/1./（一）开头）时，目录不再前置标号，避免“一 一、培养目标”式重复 */
function hasOwnNumber(text: string): boolean {
  return /^[一二三四五六七八九十百]+[、.．，,]/.test(text) || /^\d+[、.．]/.test(text) || /^[（(][一二三四五六七八九十\d]+[)）]/.test(text)
}

export function tocOf(doc: ArticleDoc, lang: Lang = 'zh'): TocItem[] {
  const out: TocItem[] = []
  let h2c = 0
  let h3c = 0
  let h4c = 0
  const en = lang === 'en'
  for (const b of doc.blocks) {
    if (b.t === 'h2') {
      h2c++
      h3c = 0
      h4c = 0
      out.push({
        id: `s-${h2c}`,
        level: 2,
        text: b.text,
        num: hasOwnNumber(b.text) ? '' : en ? `${toRomanNum(h2c)}.` : toCnNum(h2c),
      })
    } else if (b.t === 'h3') {
      h3c++
      h4c = 0
      out.push({
        id: `s-${h2c}-${h3c}`,
        level: 3,
        text: b.text,
        num: hasOwnNumber(b.text) ? '' : en ? `${h3c}.` : String(h3c),
      })
    } else if (b.t === 'h4') {
      h4c++
      out.push({
        id: `s-${h2c}-${h3c}-${h4c}`,
        level: 4,
        text: b.text,
        num: hasOwnNumber(b.text) ? '' : en ? `(${h4c})` : `（${h4c}）`,
      })
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
