/**
 * Pick the best next dispatch candidates for the A phase.
 * Criteria: incomplete A-phase article (<=300KB), covered by existing parts, and
 *   - exactly ONE uncovered range (so one task COMPLETES the article),
 *   - zero structurally-bad parts (bad=0 => merging adds no `warn` debt),
 *   - no mojibake-affected part (merging would lock corruption into the article).
 * Usage: node scripts/pick-next.mjs [N]
 * Read-only. Pure ASCII.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const enDir = join(root, 'src/content/en')
const plan = JSON.parse(readFileSync(join(root, 'scripts/slice-plan.json'), 'utf8'))
const enFiles = readdirSync(enDir)

const BAD = [/\u00e2\u20ac/, /\u00c3[\u0080-\u00bf]/, /\u00c2[\u00a0-\u00bf]/, /\u00ef\u00bc/, /\u00e3\u20ac/, /\ufffd/]
// Existing parts can carry latent CJK/fullwidth residue (e.g. a stray U+3014 bracket).
// Merging such an article EXPOSES it as a new `crit` in validate-en, so exclude those slugs.
const CJK = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/
const mojibakeSlugs = new Set()
const cjkSlugs = new Set()
for (const f of enFiles.filter((x) => /\.p\d+\.json$/.test(x))) {
  const raw = readFileSync(join(enDir, f), 'utf8')
  if (BAD.some((p) => p.test(raw))) mojibakeSlugs.add(f.split('.p')[0])
  if (CJK.test(raw)) cjkSlugs.add(f.split('.p')[0])
}

const N = Number(process.argv[2]) || 10
const rows = []
for (const p of plan) {
  const s = p.file.replace(/\.json$/, '')
  if (enFiles.includes(`${s}.json`)) continue
  const zhPath = join(root, 'src/content/articles', p.file)
  if (!existsSync(zhPath)) continue
  if (readFileSync(zhPath).length > 30 * 1024 * 1024) continue
  const zh = JSON.parse(readFileSync(zhPath, 'utf8'))
  const total = zh.blocks.length
  const cover = new Array(total).fill(false)
  let bad = 0
  let hasParts = false
  for (const f of enFiles.filter((x) => x.startsWith(`${s}.p`) && /\.p\d+\.json$/.test(x))) {
    hasParts = true
    let d
    try {
      d = JSON.parse(readFileSync(join(enDir, f), 'utf8'))
    } catch {
      bad++
      continue
    }
    const fb = d.firstBlock
    const n = (d.blocks || []).length
    if (typeof fb !== 'number' || fb < 0 || fb >= total) {
      bad++
      continue
    }
    for (let i = fb; i < Math.min(fb + n, total); i++) cover[i] = true
    for (let i = 0; i < n && fb + i < total; i++) {
      const a = zh.blocks[fb + i]
      const b = d.blocks[i]
      if (!a || !b || a.t !== b.t || (a.inline || []).length !== (b.inline || []).length) {
        bad++
        break
      }
    }
  }
  if (!hasParts) continue
  const gaps = []
  let i = 0
  while (i < total) {
    if (cover[i]) {
      i++
      continue
    }
    const st = i
    while (i < total && !cover[i]) i++
    gaps.push([st, i - 1])
  }
  if (gaps.length !== 1) continue
  if (bad !== 0) continue
  if (mojibakeSlugs.has(s)) continue
  if (cjkSlugs.has(s)) continue
  const [a, b] = gaps[0]
  rows.push({ s, gap: a === 0 ? `[0-${b}]` : `[${a}-${b}]`, blocks: b - a + 1, head: a === 0, total })
}
rows.sort((a, b) => a.blocks - b.blocks)
console.log('single-gap + bad=0 + no-mojibake candidates (one task completes the article):')
for (const r of rows.slice(0, N))
  console.log(`  ${r.s.padEnd(36)} gap=${r.gap.padEnd(12)} blocks=${String(r.blocks).padStart(4)}  head(meta)=${r.head ? 'yes' : 'no '}  article=${r.total}`)
console.log(`\ntotal such candidates: ${rows.length}`)
if (cjkSlugs.size) console.log(`excluded (CJK residue in existing parts): ${[...cjkSlugs].join(' ')}`)
if (mojibakeSlugs.size) console.log(`excluded (mojibake parts): ${[...mojibakeSlugs].join(' ')}`)
