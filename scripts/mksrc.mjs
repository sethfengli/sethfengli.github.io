// Generate a line-numbered source text for a shard: <n>\t<src text>\t[flags]
// Flags: t=<type> for non-p, segs=<count> for multi-fragment blocks, HREF for links.
// Usage: node scripts/mksrc.mjs <slug.pN> [out.txt]   (default out: build/<slug.pN>.src.txt)
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)


const part = process.argv[2]
const out = process.argv[3] ?? ART(`build/${part}.src.txt`)
const d = JSON.parse(readFileSync(ART(`build/slices/${part}.src.json`), 'utf8'))
const txt = (b) => {
  if (typeof b.text === 'string') return b.text
  if (Array.isArray(b.rows)) return b.rows.map((r) => r.map((c) => (c || []).map((s) => s.s || '').join(' | ')).join(' || ')).join(' / ')
  return (b.inline || []).map((s) => s.s || '').join('')
}
const lines = d.blocks.map((b, i) => {
  const flags = []
  if (b.t !== 'p') flags.push('t=' + b.t)
  if ((b.inline || []).length > 1) flags.push('segs=' + b.inline.length)
  if ((b.inline || []).some((s) => s.href)) flags.push('HREF')
  return `${i}\t${txt(b)}${flags.length ? '\t[' + flags.join(',') + ']' : ''}`
})
writeFileSync(out, lines.join('\n') + '\n', 'utf8')
console.log(`${out}: ${d.blocks.length} lines, firstBlock=${d.firstBlock}, src8[0]=${JSON.stringify(txt(d.blocks[0]).replace(/\s+/g, '').slice(0, 8))}`)
