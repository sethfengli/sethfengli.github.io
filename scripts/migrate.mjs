/**
 * 旧站 HTML → 新站内容 批量迁移脚本
 * ============================================================
 * 用法：
 *   node scripts/migrate.mjs            # 生成 JSON（src/content/articles/*.json + catalog.json）
 *   node scripts/migrate.mjs --md       # 同时输出 Markdown 归档（docs/markdown/*.md）
 *
 * 思路（亦适用于其他旧站迁移）：
 *   1. 编码还原：旧站为 GB2312，用 TextDecoder('gb18030') 解码为 UTF-8；
 *   2. 结构解析：cheerio 读 DOM，提取 <title>/<h2~h4>/<p>/<table> 等；
 *   3. 语义归类：由旧站三张索引页（index.htm / index-chan.htm / xiuxueyd/index.htm）
 *      的链接关系自动判定文章所属院系（净修院/禅修院/修学园地）；
 *   4. 目录提取：旧文使用 <a name="...|outline"> 锚点标题，天然就是目录；
 *   5. 内链重写：指向已迁移文章的旧链接改写为 #/articles/<slug>；
 *   6. 噪音过滤：跳过 _vti_cnf 备份目录、_ 前缀文件、导航/品牌行、空段落；
 *   7. 插图分配：按 slug 关键词 + 稳定哈希分配到 12 种禅意 SVG 插画。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OLD = path.join(ROOT, '..', 'My Web Sites')
const OUT_ARTICLES = path.join(ROOT, 'src', 'content', 'articles')
const OUT_CATALOG = path.join(ROOT, 'src', 'content', 'catalog.json')
const OUT_MD = path.join(ROOT, 'docs', 'markdown')

const emitMd = process.argv.includes('--md')
const decoder = new TextDecoder('gb18030', { fatal: false })

/* ---------- 1. 编码还原 + 文件枚举 ---------- */
function readHtml(file) {
  const buf = fs.readFileSync(file)
  return decoder.decode(buf)
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '_vti_cnf' || entry.name.startsWith('_')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.html?$/i.test(entry.name)) out.push(full)
  }
  return out
}

const allFiles = walk(OLD)

/** 索引页链接 → 院系映射 */
function linksOf(file) {
  const $ = cheerio.load(readHtml(file))
  const set = new Set()
  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') ?? '').split('#')[0].trim()
    if (href && !/^https?:/i.test(href)) set.add(decodeURIComponent(href))
  })
  return set
}

const jingLinks = linksOf(path.join(OLD, 'index.htm'))
const chanLinks = linksOf(path.join(OLD, 'index-chan.htm'))

function slugOf(file) {
  return path.basename(file).replace(/\.html?$/i, '').toLowerCase()
}

/** 判断院系 */
function schoolOf(file) {
  const rel = path.relative(OLD, file).replace(/\\/g, '/')
  if (rel.startsWith('xiuxueyd/')) return 'xiuxue'
  const slug = slugOf(file)
  const inJing = [...jingLinks].some((h) => h.toLowerCase().endsWith(`${slug}.html`) || h.toLowerCase().endsWith(`${slug}.htm`))
  const inChan = [...chanLinks].some((h) => h.toLowerCase().endsWith(`${slug}.html`) || h.toLowerCase().endsWith(`${slug}.htm`))
  if (inChan && !inJing) return 'chan'
  return 'jing'
}

/* ---------- 2. 插画分配（与前端 variantForSlug 同构） ---------- */
const VARIANTS = ['lotus', 'incense', 'bell', 'bamboo', 'mountains', 'moon', 'enso', 'bodhi', 'sutra', 'koi', 'meditation', 'clouds']
const KEYWORD_MAP = [
  [/chan/, 'enso'],
  [/jingtu|amt|无量寿|nianfo/, 'lotus'],
  [/dishan|jie/, 'incense'],
  [/zhong/, 'bell'],
  [/xin/, 'meditation'],
  [/jing/, 'sutra'],
  [/yue/, 'moon'],
]
function variantForSlug(slug) {
  for (const [re, v] of KEYWORD_MAP) if (re.test(slug)) return v
  let h = 0
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return VARIANTS[h % VARIANTS.length]
}

/* ---------- 3. 噪音过滤 ---------- */
const NAV_STOP = /去净修院|去禅修院|去修学园地|净修院.*禅修院.*修学园地/
const BRAND_STOP = /如说修行.?网上佛学院/
const OFFLINE_STOP = /离线阅读下载|离线阅读/
const SPACE_ONLY = /^[\s\u3000\u00a0]*$/

function cleanTitle(raw) {
  return raw
    // 站点名后缀（含繁体变体）
    .replace(/[-—–]\s*(如说修行网?上?佛学院|如說修行網上佛學院|修学园地|修學園地|禅修院|淨修院|净修院)\s*$/g, '')
    .replace(/[-—–]\s*(如说修行网?上?佛学院|如說修行網上佛學院).*$/g, '')
    .replace(/^禅修院\s*[-—–]?\s*/g, '')
    .replace(/^修学园地\s*[-—–]?\s*/g, '')
    .replace(/^净修院\s*[-—–]?\s*/g, '')
    .trim()
}

/** 作者行误判黑名单（常见小标题） */
const AUTHOR_STOP = /学年|教材|课程|目录|引言|前言|目次|参考阅读|第一|第二|第三|第四|第五|第六/

/* ---------- 4. 正文抽取 ---------- */
function directCells($, tr) {
  const cells = []
  for (const child of tr.children) {
    if (child.type === 'tag' && (child.name === 'th' || child.name === 'td')) {
      const segs = inlineOf($, child)
      if (segs.length) cells.push(segs)
    }
  }
  return cells
}

/** 只统计直接单元格数量（不穿透嵌套 table），用于区分“内容表格”与“整页外框” */
function directCellCount(tableNode) {
  let count = 0
  const walk = (node) => {
    for (const child of node.children ?? []) {
      if (child.type !== 'tag') continue
      if (child.name === 'td' || child.name === 'th') count++
      else if (child.name === 'tr' || child.name === 'tbody' || child.name === 'thead' || child.name === 'tfoot') walk(child)
    }
  }
  walk(tableNode)
  return count
}

function inlineOf($, el) {
  const segs = []
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.type === 'text') {
        const s = child.data.replace(/\s+/g, ' ').trim()
        if (s) segs.push({ s })
      } else if (child.type === 'tag') {
        if (child.name === 'br') continue
        if (child.name === 'a') {
          const href = (child.attribs?.href ?? '').split('#')[0]
          const text = $(child).text().replace(/\s+/g, ' ').trim()
          if (!text) continue
          const m = href.match(/([^/]+)\.html?$/i)
          const target = m ? m[1].toLowerCase() : null
          if (target && slugSet.has(target)) segs.push({ s: text, href: `#/articles/${target}` })
          else segs.push({ s: text })
        } else if (['font', 'span', 'b', 'strong', 'i', 'em', 'u', 'sub', 'sup'].includes(child.name)) {
          walk(child)
        } else {
          const text = $(child).text().replace(/\s+/g, ' ').trim()
          if (text) segs.push({ s: text })
        }
      }
    }
  }
  walk(el)
  return segs
}

let slugSet = new Set()

function extract(file) {
  const $ = cheerio.load(readHtml(file))
  const slug = slugOf(file)
  const title = cleanTitle($('title').text()) || slug

  const blocks = []
  let author = ''
  let firstPara = null
  let chars = 0
  let sawSectionHeading = false

  const body = $('body')
  const seenText = new Set()

  body.find('h2,h3,h4,p,pre,table').each((_, el) => {
    const tag = el.name.toLowerCase()
    const $el = $(el)

    // 位于“多格内容表格”内的段落/标题由 table 块承载，跳过避免重复；
    // 老式单格包裹表格（整页外框）不在此列。
    let inContentTable = false
    if (tag !== 'table') {
      const wrap = $el.closest('table')
      if (wrap.length && directCellCount(wrap[0]) > 1) inContentTable = true
    }

    if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
      if (inContentTable) return
      const text = $el.text().replace(/\s+/g, ' ').trim()
      // 旧站 h2 常重复文章标题：与 title 相同则跳过
      if (!text || text === title || text.includes('如说修行') || text.includes('如說修行') || text === '离线阅读') return
      if (text.length > 60) return
      if (blocks[blocks.length - 1]?.t === tag && blocks[blocks.length - 1].text === text) return
      if (tag !== 'h2') sawSectionHeading = true
      const level = tag
      blocks.push({ t: level, text })
      return
    }

    if (tag === 'table') {
      const rows = []
      for (const tr of el.children) {
        if (tr.type !== 'tag') continue
        if (tr.name === 'tbody' || tr.name === 'thead') {
          for (const sub of tr.children) {
            if (sub.type === 'tag' && sub.name === 'tr') {
              const cells = directCells($, sub)
              if (cells.length) rows.push(cells)
            }
          }
        } else if (tr.name === 'tr') {
          const cells = directCells($, tr)
          if (cells.length) rows.push(cells)
        }
      }
      // 跳过“整页包裹表格”（仅 1 个单元格的老式排版外框）
      const cellCount = rows.reduce((n, r) => n + r.length, 0)
      if (cellCount > 1 && rows.length) blocks.push({ t: 'table', rows })
      return
    }

    // <p> / <pre>：跳过位于“多格内容表格”内部的
    if (inContentTable) return

    const raw = $el.text()
    if (SPACE_ONLY.test(raw)) return
    const text = raw.replace(/\s+/g, ' ').trim()
    if (!text) return
    if (NAV_STOP.test(text) && text.length < 60) return
    if (BRAND_STOP.test(text) && text.length < 40) return
    if (OFFLINE_STOP.test(text)) return

    const segs = inlineOf($, el)
    const joined = segs.map((s) => s.s).join('')

    // 作者行：仅接受“首个 h3/h4 标题出现之前”的极短纯汉字行，且不在黑名单中
    if (
      !author &&
      !sawSectionHeading &&
      segs.length === 1 &&
      text.length <= 8 &&
      /^[\u4e00-\u9fa5·\u3000\s]{1,6}$/.test(joined) &&
      !AUTHOR_STOP.test(joined)
    ) {
      author = joined.trim()
      return
    }

    if (joined.length < 2) return
    if (seenText.has(joined)) return
    seenText.add(joined)

    chars += joined.length
    if (!firstPara && joined.length > 12) firstPara = joined

    // 引文判定：整段加粗 + 引号包裹 → quote
    const isBold = $el.find('b,strong').length > 0
    const looksQuote = /^[“「].*[”」]$/.test(joined) && joined.length > 20
    blocks.push({ t: looksQuote || (isBold && joined.length > 80) ? 'quote' : 'p', inline: segs })
  })

  if (!blocks.length) return null

  // 清理：与后文标题重复的“目录导航段”降噪（旧站正文开头常带章节跳转链接）
  const headingTexts = new Set(
    blocks.filter((b) => b.t === 'h2' || b.t === 'h3' || b.t === 'h4').map((b) => b.text),
  )
  const cleaned = blocks.filter((b) => {
    if (b.t !== 'p') return true
    const text = b.inline.map((s) => s.s).join('')
    if (headingTexts.has(text)) return false
    if (b.inline.length === 1 && b.inline[0].s === '　') return false
    return true
  })
  if (!cleaned.length) return null

  const excerpt = (firstPara ?? cleaned.find((b) => b.t === 'p')?.inline.map((s) => s.s).join('') ?? title).slice(0, 90)

  return {
    slug,
    title,
    author,
    school: schoolOf(file),
    illustration: variantForSlug(slug),
    excerpt,
    chars,
    blocks: cleaned,
  }
}

/* ---------- 5. 主流程 ---------- */
function main() {
  slugSet = new Set(allFiles.map(slugOf))
  const catalog = []
  let ok = 0
  const failed = []

  fs.rmSync(OUT_ARTICLES, { recursive: true, force: true })
  fs.mkdirSync(OUT_ARTICLES, { recursive: true })
  if (emitMd) fs.rmSync(OUT_MD, { recursive: true, force: true })

  for (const file of allFiles) {
    const slug = slugOf(file)
    if (/^index/.test(slug) || /^style/.test(slug)) continue
    try {
      const doc = extract(file)
      if (!doc) {
        failed.push(`${slug}: 无有效正文`)
        continue
      }
      fs.writeFileSync(path.join(OUT_ARTICLES, `${slug}.json`), JSON.stringify(doc, null, 1), 'utf8')
      catalog.push({
        slug: doc.slug,
        title: doc.title,
        author: doc.author,
        school: doc.school,
        illustration: doc.illustration,
        excerpt: doc.excerpt,
        chars: doc.chars,
      })
      ok++

      if (emitMd) {
        const md = toMarkdown(doc)
        fs.mkdirSync(OUT_MD, { recursive: true })
        fs.writeFileSync(path.join(OUT_MD, `${slug}.md`), md, 'utf8')
      }
    } catch (err) {
      failed.push(`${slug}: ${err.message}`)
    }
  }

  catalog.sort((a, b) => a.slug.localeCompare(b.slug, 'zh-CN'))
  fs.writeFileSync(OUT_CATALOG, JSON.stringify(catalog, null, 1), 'utf8')

  console.log(`✔ 成功迁移 ${ok} 篇 → src/content/articles/*.json`)
  console.log(`✔ 目录清单 ${catalog.length} 条 → src/content/catalog.json`)
  const bySchool = { jing: 0, chan: 0, xiuxue: 0 }
  for (const c of catalog) bySchool[c.school]++
  console.log(`  净修院 ${bySchool.jing} · 禅修院 ${bySchool.chan} · 修学园地 ${bySchool.xiuxue}`)
  if (emitMd) console.log(`✔ Markdown 归档 → docs/markdown/*.md`)
  if (failed.length) {
    console.log(`\n⚠ 跳过 ${failed.length} 篇：`)
    for (const f of failed.slice(0, 20)) console.log('  -', f)
  }
}

function toMarkdown(doc) {
  const lines = [
    `# ${doc.title}`,
    '',
    doc.author ? `> 作者：${doc.author}　·　院系：${doc.school}　·　约 ${doc.chars} 字` : `> 院系：${doc.school}　·　约 ${doc.chars} 字`,
    '',
  ]
  for (const b of doc.blocks) {
    if (b.t === 'h2') lines.push(`## ${b.text}`, '')
    else if (b.t === 'h3') lines.push(`### ${b.text}`, '')
    else if (b.t === 'h4') lines.push(`#### ${b.text}`, '')
    else if (b.t === 'hr') lines.push('---', '')
    else if (b.t === 'table') {
      for (const row of b.rows) {
        lines.push('| ' + row.map((c) => c.map((s) => s.s).join('')).join(' | ') + ' |')
      }
      lines.push('')
    } else {
      const md = b.inline.map((s) => (s.href ? `[${s.s}](${s.href})` : s.s)).join('')
      lines.push(b.t === 'quote' ? `> ${md}` : md, '')
    }
  }
  return lines.join('\n')
}

main()
