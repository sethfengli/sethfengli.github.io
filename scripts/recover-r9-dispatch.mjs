/**
 * §3.8 派发器：把编号源里每个块前 8 字（去空白）算出来，写成给子代理抄的锚点清单。
 * 子代理只许可照抄这些 src8，父代理组装时逐行回校 —— 错位在构造上不可能发生。
 *
 * usage: node scripts/recover-r9-dispatch.mjs <slug.pN> [<slug.pN> ...]
 *   -> 读 build/slices/<part>.src.json，逐行打印 "<n>\t<src8>\t<t>"
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)


const txt = (b) => {
  if (!b) return ''
  if (typeof b.text === 'string') return b.text
  if (Array.isArray(b.rows)) return b.rows.map((r) => r.map((c) => (c || []).map((s) => s.s || '').join('')).join(' ')).join(' ')
  return (b.inline || []).map((s) => s.s || '').join('')
}
const clean = (s) => String(s || '').replace(/\s+/g, '').slice(0, 8)

for (const part of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(ART(`build/slices/${part}.src.json`), 'utf8'))
  const n = d.blocks.length
  console.log(`### ${part} firstBlock=${d.firstBlock} n=${n}`)
  console.log(`[0]\t${clean(txt(d.blocks[0]))}\t${d.blocks[0].t}`)
  if (n > 1) console.log(`[${n - 1}]\t${clean(txt(d.blocks[n - 1]))}\t${d.blocks[n - 1].t}`)
  const segs = d.blocks.filter((b) => !Array.isArray(b.rows) && typeof b.text !== 'string' && (b.inline || []).length > 1)
  console.log(`multiSegBlocks=${segs.length} tableBlocks=${d.blocks.filter((b) => Array.isArray(b.rows)).length}`)
}
