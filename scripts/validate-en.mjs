/**
 * 校验英文覆盖文件 src/content/en/<slug>.json。
 * 分级：
 *  - CRITICAL（须修复）：JSON 可解析失败；正文含 CJK；块数量/类型不符；表维度不符；标题层级不符；href 丢失。
 *  - WARN（尽力）：p/quote 行内片段数量不一致（纯文本合并，无超链接丢失时不影响呈现）。
 * 用法：node scripts/validate-en.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const zhDir = join(root, 'src', 'content', 'articles')
const enDir = join(root, 'src', 'content', 'en')

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff【】〔〕《》]/

function sig(b) {
  if (!b || typeof b !== 'object') return 'bad'
  if (b.t === 'table') {
    const rows = Array.isArray(b.rows) ? b.rows : []
    return `table:${rows.length}x${rows.map((r) => (Array.isArray(r) ? r.length : 0)).join(',')}:${rows
      .flat()
      .map((c) => (Array.isArray(c) ? c.length : 0))
      .join(',')}`
  }
  if (b.t === 'hr') return 'hr'
  if (b.t === 'h2' || b.t === 'h3' || b.t === 'h4') return b.t
  if (b.t === 'p' || b.t === 'quote') return `${b.t}:${Array.isArray(b.inline) ? b.inline.length : -1}`
  return `bad:${b.t}`
}

// hrefs at every level (inline / 表格)
function hrefsOf(b) {
  const out = new Set()
  const collect = (val) => {
    if (Array.isArray(val)) val.forEach(collect)
    else if (val && typeof val === 'object') {
      if (val.href) out.add(val.href)
      for (const k of Object.keys(val)) if (k !== 'href') collect(val[k])
    }
  }
  collect(b)
  return out
}

const zhFiles = readdirSync(zhDir).filter((f) => f.endsWith('.json'))
const r = { ok: [], crit: [], warn: [], parts: [] }

for (const f of zhFiles) {
  const slug = f.replace(/\.json$/, '')
  const enPath = join(enDir, `${slug}.json`)
  const parts = readdirSync(enDir).filter((x) => x.startsWith(`${slug}.p`) && /\.p\d+\.json$/.test(x))
  if (parts.length) {
    r.parts.push(slug)
    continue
  }
  if (!existsSync(enPath)) {
    r.crit.push(`${slug}:missing`)
    continue
  }
  let en, zh
  try {
    en = JSON.parse(readFileSync(enPath, 'utf8'))
    zh = JSON.parse(readFileSync(join(zhDir, f), 'utf8'))
  } catch (e) {
    r.crit.push(`${slug}:json-${e.message.split('\n')[0]}`)
    continue
  }
  const problems = []
  if (CJK.test(JSON.stringify(en))) problems.push('cjk')
  if ((zh.blocks?.length ?? 0) !== (en.blocks?.length ?? 0)) {
    problems.push(`blocks:${zh.blocks?.length}->${en.blocks?.length}`)
  } else {
    for (let i = 0; i < zh.blocks.length; i++) {
      const z = zh.blocks[i]
      const e = en.blocks[i]
      const zs = sig(z)
      const es = sig(e)
      const zt = z?.t; const et = e?.t
      if (zt !== et || (zt === 'table' && zs !== es)) problems.push(`block${i}:type/dims`)
      if (zt !== et) continue
      if (zt === 'h2' || zt === 'h3' || zt === 'h4') {
        // heading count/level already consistent; nothing else
      } else if (zt === 'p' || zt === 'quote') {
        if (zs !== es) problems.push(`block${i}:inline${z.inline.length}->${e.inline.length}`)
        const zhrefs = hrefsOf(z)
        const ehrefs = hrefsOf(e)
        for (const h of zhrefs) if (!ehrefs.has(h)) problems.push(`block${i}:href-lost:${h}`)
      }
    }
  }
  if (!problems.length) r.ok.push(slug)
  else if (problems.every((p) => p.startsWith('block') && p.includes('inline'))) r.warn.push(slug)
  else r.crit.push(`${slug}:${problems.join(',')}`)
}

console.log(
  `ok=${r.ok.length} crit=${r.crit.length} warn=${r.warn.length} parts=${r.parts.length}`,
)
if (r.crit.length) console.log('CRITICAL:', r.crit.join(' ; '))
if (r.warn.length) console.log('WARN(ine seg count):', r.warn.join(' '))
