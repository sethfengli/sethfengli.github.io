/**
 * §3.8 父代理确定性组装：JSONL(每行 {"n":<序号>,"src8":"<源块前8字>","en":"<英文>"})
 *   -> src/content/en/<slug.pN>.json
 *
 * 结构（t / 片段数 / href / rows）一律取自源 build/slices/<part>.src.json，
 * src8 锚点逐行回校；缺失 / 重复 / 越界 / 锚点不符一律抛错拒收（不写文件）。
 * meta=yes 的片：正文由 JSONL 提供，title/author/excerpt 从 src/content/catalog-en.json 取既有英文。
 *
 * usage:
 *   node scripts/recover-r9-assemble.mjs <part> <out.jsonl> [--parts=p6,p7,...] [--anchors]
 *     <part>      形如 205jgj-jiangyi.p6（与 build/slices/<part>.src.json 对应）
 *     <out.jsonl> 子代理产物；给 --parts= 时忽略本参数位置
 *   --anchors   打印每个块的 src8 -> 英文开头 40 字符（抽验用）
 */
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import path from 'node:path'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)


const argv = process.argv.slice(2)
const flags = argv.filter((a) => a.startsWith('--'))
const pos = argv.filter((a) => !a.startsWith('--'))
const showAnchors = flags.includes('--anchors')
const partsFlag = flags.find((a) => a.startsWith('--parts='))

const txt = (b) => {
  if (!b) return ''
  if (typeof b.text === 'string') return b.text
  if (Array.isArray(b.rows)) return b.rows.map((r) => r.map((c) => (c || []).map((s) => s.s || '').join('')).join(' ')).join(' ')
  return (b.inline || []).map((s) => s.s || '').join('')
}
const clean = (s) => String(s || '').replace(/\s+/g, '')
const plain = (s) => String(s || '').replace(/\s+/g, ' ').trim()

function parseJsonl(path) {
  if (!existsSync(path)) throw new Error(`JSONL not found: ${path}`)
  let raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
  const out = []
  raw.split(/\r?\n/).forEach((line, ln) => {
    let s = line.trim()
    if (!s) return
    if (s.startsWith('```')) return
    if (s.startsWith('[') && s.endsWith(']') && !s.includes('{"n"')) return
    try {
      const o = JSON.parse(s)
      out.push({ ...o, __line: ln + 1 })
    } catch (e) {
      throw new Error(`${path}:${ln + 1} bad JSON: ${e.message}`)
    }
  })
  return out
}

const assembleOne = (part, jsonlPath) => {
  const srcPath = ART(`build/slices/${part}.src.json`)
  if (!existsSync(srcPath)) throw new Error(`src not found: ${srcPath}`)
  const src = JSON.parse(readFileSync(srcPath, 'utf8'))
  const rows = parseJsonl(jsonlPath)
  const sb = src.blocks
  const N = sb.length
  const byN = new Map()
  for (const r of rows) {
    if (typeof r.n !== 'number' || !Number.isInteger(r.n)) throw new Error(`${jsonlPath}:${r.__line} n is not an integer`)
    if (r.n < 0 || r.n >= N) throw new Error(`${jsonlPath}:${r.__line} n=${r.n} out of range 0..${N - 1}`)
    if (byN.has(r.n)) throw new Error(`${jsonlPath}:${r.__line} duplicate n=${r.n}`)
    if (typeof r.en !== 'string') throw new Error(`${jsonlPath}:${r.__line} n=${r.n} missing/empty-string "en"`)
    byN.set(r.n, r)
  }
  const missing = []
  for (let i = 0; i < N; i++) if (!byN.has(i)) missing.push(i)
  if (missing.length) throw new Error(`${part}: ${missing.length} block(s) missing, first: ${missing.slice(0, 10).join(',')}`)

  // anchor check (tolerate a 1-char boundary difference, per §3.8 ②)
  const anchorBad = []
  for (let i = 0; i < N; i++) {
    const want = clean(txt(sb[i])).slice(0, 8)
    const got = clean(byN.get(i).src8 || '').slice(0, 8)
    const okPrefix = want && got && (want.startsWith(got) || got.startsWith(want)) && Math.abs(want.length - got.length) <= 1
    if (!(want === got || okPrefix)) anchorBad.push(`${i}: want ${JSON.stringify(want)} got ${JSON.stringify(got)}`)
  }
  if (anchorBad.length) {
    throw new Error(`${part}: ${anchorBad.length} anchor mismatch(es):\n  ` + anchorBad.slice(0, 8).join('\n  '))
  }

  const blocks = sb.map((s, i) => {
    const en = byN.get(i).en
    if (Array.isArray(s.rows)) {
      throw new Error(`${part}: block ${i} is a table; JSONL assembly for tables is unsupported (handle it separately per §3.8 ①)`)
    }
    if (typeof s.text === 'string') return { t: s.t, text: en }
    const si = s.inline || []
    if (si.length <= 1) {
      const seg = si.length === 1 && si[0].href ? { s: en, href: si[0].href } : { s: en }
      return { t: s.t, inline: [seg] }
    }
    // multi-fragment: parent decides the split; put the whole EN in the first non-empty
    // fragment and empty strings after it (InlineSegs concatenates with no separator, so the
    // rendering is identical), preserving every source href.
    let first = si.findIndex((seg) => !seg.href)
    if (first < 0) first = 0
    return {
      t: s.t,
      inline: si.map((seg, k) => {
        const piece = k === first ? en : ''
        return seg.href ? { s: piece, href: seg.href } : { s: piece }
      }),
    }
  })

  const outObj = { firstBlock: src.firstBlock, blocks }
  if (src.includeMeta) {
    const catPath = 'src/content/catalog-en.json'
    const cat = existsSync(catPath) ? JSON.parse(readFileSync(catPath, 'utf8')) : null
    const slug = part.replace(/\.p\d+$/, '')
    // catalog-en.json is an object keyed by slug (older shape) or an array of {slug}
    const list = Array.isArray(cat) ? cat : cat && Array.isArray(cat.articles) ? cat.articles : cat ? Object.values(cat) : []
    const hit = (cat && !Array.isArray(cat) && cat[slug]) || list.find((x) => x && x.slug === slug)
    if (!hit) throw new Error(`${part}: includeMeta but no catalog entry for ${slug}`)
    if (hit.title) outObj.title = hit.title
    if (hit.author) outObj.author = hit.author
    if (hit.excerpt) outObj.excerpt = hit.excerpt
  }
  const outPath = `src/content/en/${part}.json`
  writeFileSync(outPath, JSON.stringify(outObj, null, 1) + '\n', 'utf8')

  // hard post-checks mirroring scripts/verify-slices.mjs
  const CJK = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/
  const rawOut = readFileSync(outPath, 'utf8')
  const problems = []
  if (CJK.test(rawOut)) problems.push('CJK/fullwidth residue')
  blocks.forEach((b, i) => {
    const z = plain(txt(sb[i]))
    const e = plain(txt(b))
    if (!e && z) problems.push(`emptyEN@${src.firstBlock + i}`)
    if (/undefined/i.test(e)) problems.push(`undefined@${src.firstBlock + i}`)
  })
  const srcHref = (JSON.stringify(src).match(/"href"\s*:/g) || []).length
  const enHref = (rawOut.match(/"href"\s*:/g) || []).length
  if (enHref < srcHref) problems.push(`href ${enHref}<${srcHref}`)
  console.log(`[assembled] ${outPath} fb=${src.firstBlock} n=${N} bytes=${Buffer.byteLength(rawOut)}${problems.length ? '  PROBLEMS: ' + problems.slice(0, 8).join('; ') : '  checks=clean'}`)
  if (problems.length) {
    rmSync(outPath, { force: true })
    console.log(`[removed] ${outPath} (failed checks; fix the JSONL and re-run)`)
  }
  if (showAnchors) {
    for (const i of [0, N - 1]) console.log(`  [${i}] src8=${JSON.stringify(clean(txt(sb[i])).slice(0, 8))} -> ${JSON.stringify(plain(txt(blocks[i])).slice(0, 40))}`)
  }
  return problems.length
}

if (partsFlag) {
  const parts = partsFlag.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean)
  let bad = 0
  for (const p of parts) {
    const jl = pos[0] ? pos[0] : ART(`build/${p}-out.jsonl`)
    try {
      bad += assembleOne(p, jl)
    } catch (e) {
      bad++
      console.log(`[REJECT] ${e.message}`)
    }
  }
  if (bad) process.exit(1)
} else {
  const [part, jsonl] = pos
  if (!part || !jsonl) {
    console.log('usage: node scripts/recover-r9-assemble.mjs <part> <out.jsonl> [--anchors] | --parts=p1,p2 [--anchors]')
    process.exit(2)
  }
  try {
    const problems = assembleOne(part, jsonl)
    if (problems) process.exit(1)
  } catch (e) {
    console.log(`[REJECT] ${e.message}`)
    process.exit(1)
  }
}
