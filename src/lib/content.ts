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
import cnPhotosJson from '../data/photos-cn.json'

export const CATALOG: ArticleMeta[] = catalogJson as ArticleMeta[]

/** slug → 英文标题/摘录/作者（由 scripts/build-catalog-en.mjs 从 en/*.json 生成） */
export const CATALOG_EN: Record<string, { title?: string; author?: string; excerpt?: string }> =
  catalogEnJson as Record<string, { title?: string; author?: string; excerpt?: string }>

/** 是否已有英文正文覆盖（决定阅读器是否显示“原文+机翻”兜底提示） */
export function hasEnglish(slug: string): boolean {
  return Boolean(enFiles[`../content/en/${slug}.json`])
}

/* ------------------------------------------------------------------
   配图：Wikimedia Commons 免版权素材，**只取中国传统佛教题材**
   （佛画 / 石窟 / 造像 / 殿宇 / 写经 / 山水 / 莲），见 public/photos/cn/CREDITS.md。
   抓取与转码见 scripts/collect-pool.mjs → curate-cn.mjs → fetch-cn-picked.mjs。
   ------------------------------------------------------------------- */
type PhotoManifest = {
  [bucket: string]: unknown
}

const CN_PHOTOS = cnPhotosJson as PhotoManifest

/** 取某桶的文件名数组（桶不存在时为空） */
function bucketOf(name: string): string[] {
  const v = CN_PHOTOS[name]
  return Array.isArray(v) ? (v as string[]) : []
}

/** 全部中国佛教图版文件名（用于「关于本院」照片墙与统计） */
export const PHOTO_NAMES: string[] = Object.values(CN_PHOTOS)
  .filter(Array.isArray)
  .flatMap((v) => v as string[])

/** 对外路径：public/photos/cn/<file> */
function photoUrl(file: string): string {
  return `/photos/cn/${file}`
}

/**
 * 各校/各页面语义对应的图片桶：
 *   净修院（净土）→ 佛画（经变、观音）＋ 莲池 ＋ 写经 ＋ 造像
 *   禅修院（禅门）→ 石窟摩崖 ＋ 山水 ＋ 造像 ＋ 佛画
 *   修学园地（随笔）→ 殿宇 ＋ 佛画 ＋ 造像 ＋ 写经
 */
const POOLS: Record<School, string[]> = {
  jing: ['paintings', 'lotus', 'sutras', 'statues'],
  chan: ['grottoes', 'landscape', 'statues', 'paintings'],
  xiuxue: ['halls', 'paintings', 'statues', 'sutras'],
}

/** 每桶在池中的权重：靠前的桶出现更多，用于拉开比重 */
const POOL_WEIGHT: Record<string, number> = {
  paintings: 3,
  lotus: 2,
  sutras: 1,
  statues: 2,
  grottoes: 3,
  landscape: 2,
  halls: 2,
}

/**
 * 把若干桶按权重**交错**成一条序列。
 *
 * 做法：按「轮」生成。每一轮中，每个桶按自己的权重取 w 个名额
 * （桶内按 round % 长度 循环，权重 2 的桶则取第 2r、2r+1 张）。
 * 循环轮数 = max(⌈该桶张数 / 权重⌉)，因此**每张图都会被取到至少一次**。
 *
 * 交错而不是「先铺完 A 再铺 B」：后者会让全部 A 集中在列表前段，
 * 于是该院系的文章配图先清一色是 A、后清一色是 B。
 */
function interleave(buckets: string[]): string[] {
  const lists = buckets
    .map((b) => ({ files: bucketOf(b), w: POOL_WEIGHT[b] ?? 1 }))
    .filter((l) => l.files.length > 0)
  if (lists.length === 0) return []

  const rounds = Math.max(...lists.map((l) => Math.ceil(l.files.length / l.w)))
  const out: string[] = []
  for (let r = 0; r < rounds; r++) {
    for (const l of lists) {
      for (let k = 0; k < l.w; k++) {
        // 权重 w 的桶每轮取 w 张，使各桶按 w:1 的占空比同时推进
        out.push(l.files[(r * l.w + k) % l.files.length])
      }
    }
  }
  return out
}

/** 院系 → 交错好的配图序列（模块级缓存，避免每次调用重算） */
const POOL_CACHE = new Map<School, string[]>()

function poolFor(school: School): string[] {
  const cached = POOL_CACHE.get(school)
  if (cached) return cached
  const built = interleave(POOLS[school])
  POOL_CACHE.set(school, built)
  return built
}

/**
 * 按「该院系内的序号」连续取图。
 *
 * 上一版用「全目录序 × 7 对池长取模」，看似能跳开相邻重复，实则：
 * ① 池长与步长不互质时序列会退化成很小的循环——实测禅修院只有 5 篇文章，
 *    而池长 236，`(7i mod 236)` 只取到 5 个值，**46 张石窟图里只用到 3 张**；
 * ② 同一篇文章既会出现在全目录里、也是院系列表的一员，两处取图不一致。
 * 现改为「院系内序号 → 交错序列」，既不重复也不会饿死任何一张图。
 */
export function photoForSlug(slug: string): string {
  const idx = CATALOG.findIndex((a) => a.slug === slug)
  const meta = idx >= 0 ? CATALOG[idx] : null
  const school = meta?.school ?? 'xiuxue'
  const pool = poolFor(school)
  if (pool.length === 0) return PHOTO_NAMES.length ? photoUrl(PHOTO_NAMES[0]) : ''
  // 院系内序号：同一院系的文章依次取图，走完一遍再从头来
  const localIdx = CATALOG.slice(0, Math.max(idx, 0)).filter((a) => a.school === school).length
  return photoUrl(pool[localIdx % pool.length])
}

/**
 * 具名专用图：首页 Hero、各页题头、关于页拼贴等固定位置。
 * 取值来自各自语义最贴切的那个桶（详见上方各页调用处）。
 */
export const NAMED_PHOTOS = {
  /** 首页 Hero：中国石窟摩崖大佛（炳灵寺） */
  hero: () => photoUrl(bucketOf('grottoes')[3] ?? PHOTO_NAMES[0]),
  /** 山门匾额（文库题头） */
  gate: () => photoUrl(bucketOf('halls')[0] ?? PHOTO_NAMES[0]),
  /** 观音造像（灵签题头与造像位） */
  guanyin: () => photoUrl(bucketOf('statues')[80] ?? bucketOf('statues')[0] ?? PHOTO_NAMES[0]),
  /** 梵钟（听经题头） */
  bell: () => photoUrl(bucketOf('halls')[6] ?? PHOTO_NAMES[0]),
  /** 供灯意象（祈福题头） */
  lantern: () => photoUrl(bucketOf('paintings')[35] ?? bucketOf('paintings')[0] ?? PHOTO_NAMES[0]),
  /** 山水（关于页题头） */
  garden: () => photoUrl(bucketOf('landscape')[10] ?? PHOTO_NAMES[0]),
  /** 绢本经变（关于页拼贴） */
  blossom: () => photoUrl(bucketOf('paintings')[3] ?? PHOTO_NAMES[0]),
  /** 莲（关于页拼贴 · 徽记） */
  lotus: () => photoUrl(bucketOf('lotus')[2] ?? PHOTO_NAMES[0]),
  /** 写经（关于页拼贴） */
  sutra: () => photoUrl(bucketOf('sutras')[5] ?? PHOTO_NAMES[0]),
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
