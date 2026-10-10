/**
 * §3.7/§4 占位符 / 空块扫描（缺陷类 E 的第四道判据）。
 * 对给定 slug 的全部（或指定）en 分片逐块比对源：
 *   - 英文里出现 undefined / null / NaN 等占位符
 *   - 源有正文而英文为空 / 纯标点
 *   - undefined 形态的 inline 片段
 * 退出码：有命中 = 1。
 *
 * usage: node scripts/recover-r9-scan.mjs <slug> [p6 p7 ...]
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)


const slug = process.argv[2]
if (!slug) {
  console.log('usage: node scripts/recover-r9-scan.mjs <slug> [pN ...]')
  process.exit(2)
}
const only = process.argv.slice(3)

const txt = (b) => {
  if (!b) return ''
  if (typeof b.text === 'string') return b.text
  if (Array.isArray(b.rows)) return b.rows.map((r) => r.map((c) => (c || []).map((s) => s.s || '').join('')).join(' ')).join(' ')
  return (b.inline || []).map((s) => s.s || '').join('')
}
const plain = (s) => String(s || '').replace(/\s+/g, ' ').trim()
const placeholders = /^(undefined|null|NaN|\[object Object\])$/i

const enDir = 'src/content/en'
const files = (only.length ? only.map((p) => `${slug}.${p}.json`) : readdirSync(enDir).filter((f) => f.startsWith(`${slug}.p`) && f.endsWith('.json'))).sort()
let hits = 0
let scannedBlocks = 0
for (const f of files) {
  const enPath = `${enDir}/${f}`
  if (!existsSync(enPath)) { console.log(`MISS ${f}`); hits++; continue }
  const en = JSON.parse(readFileSync(enPath, 'utf8'))
  const srcPath = ART(`build/slices/${f.replace(/\.json$/, '')}.src.json`)
  const zh = JSON.parse(readFileSync(`src/content/articles/${slug}.json`, 'utf8'))
  const src = existsSync(srcPath) ? JSON.parse(readFileSync(srcPath, 'utf8')) : null
  const fb = en.firstBlock
  const probs = []
  en.blocks.forEach((b, i) => {
    scannedBlocks++
    const e = txt(b)
    const z = plain(txt(zh.blocks[fb + i]))
    const segs = Array.isArray(b.rows) ? b.rows.flat().flat() : b.inline || (typeof b.text === 'string' ? [{ s: b.text }] : [])
    for (const seg of segs) {
      const s = plain(seg.s)
      if (placeholders.test(s)) probs.push(`placeholder "${s}" @local ${i} abs ${fb + i}`)
    }
    if (placeholders.test(plain(e))) probs.push(`block is literal placeholder @local ${i} abs ${fb + i}`)
    if (!plain(e) && z) probs.push(`emptyEN @local ${i} abs ${fb + i} (zh="${z.slice(0, 30)}")`)
    if (plain(e) && !/[A-Za-z0-9]/.test(plain(e))) probs.push(`no-alnum EN @local ${i} abs ${fb + i} (en="${plain(e).slice(0, 30)}")`)
    if (src && !src.blocks[i]) probs.push(`no source block @local ${i}`)
  })
  if (probs.length) {
    hits += probs.length
    console.log(`HIT  ${f} fb=${fb} n=${en.blocks.length}`)
    for (const p of probs.slice(0, 12)) console.log('      ' + p)
    if (probs.length > 12) console.log(`      ... and ${probs.length - 12} more`)
  } else {
    console.log(`clean ${f} fb=${fb} n=${en.blocks.length}`)
  }
}
console.log(`recover-r9-scan: ${files.length} part(s), ${scannedBlocks} blocks, ${hits} hit(s) -> ${hits === 0 ? 'clean' : 'PROBLEMS'}`)
process.exit(hits === 0 ? 0 : 1)
