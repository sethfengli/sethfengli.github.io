/**
 * Measure how much of an article is already covered by EXISTING part files,
 * including parts produced under an older slicing grid (orphan `pN` files).
 * Usage: node scripts/coverage.mjs [slug ...]   (default: all A-phase articles that have parts)
 * Read-only; prints only.
 *
 * Why: slice-plan.json was regenerated with a coarser grid, while many English parts
 * were produced earlier on a finer grid. Those parts are block-aligned but their
 * file names / boundaries no longer match the plan, which makes `plan-slices --next`
 * (and any "missing slice" count) understate the real remaining work. This script
 * reports, per article: coverage %, aligned/broken parts, uncovered block ranges.
 * Coverage 100% => the article can be re-sliced mechanically, no re-translation.
 * NOTE: keep this file pure ASCII on purpose (PowerShell rewrites can mangle UTF-8).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const enDir = join(root, 'src/content/en')
const enFiles = readdirSync(enDir)
const plan = JSON.parse(readFileSync(join(root, 'scripts/slice-plan.json'), 'utf8'))

let slugs = process.argv.slice(2)
if (!slugs.length) {
  slugs = []
  for (const p of plan) {
    const s = p.file.replace(/\.json$/, '')
    if (enFiles.includes(`${s}.json`)) continue
    if (!existsSync(join(root, 'src/content/articles', p.file))) continue
    if (readFileSync(join(root, 'src/content/articles', p.file)).length > 30 * 1024 * 1024) continue
    slugs.push(s) // include articles with no parts at all (0% coverage)
  }
}

const rows = []
for (const s of slugs) {
  const zhPath = join(root, 'src/content/articles', `${s}.json`)
  if (!existsSync(zhPath)) continue
  const zh = JSON.parse(readFileSync(zhPath, 'utf8'))
  const total = zh.blocks.length
  const cover = new Array(total).fill(false)
  let alignedParts = 0
  let badParts = 0
  const parts = []
  for (const f of enFiles.filter((x) => x.startsWith(`${s}.p`) && /\.p\d+\.json$/.test(x))) {
    let d
    try {
      d = JSON.parse(readFileSync(join(enDir, f), 'utf8'))
    } catch {
      badParts++
      continue
    }
    const fb = d.firstBlock
    const n = (d.blocks || []).length
    if (typeof fb !== 'number' || fb < 0 || fb >= total) {
      badParts++
      continue
    }
    parts.push({ f, fb, n })
    for (let i = fb; i < Math.min(fb + n, total); i++) cover[i] = true
    let ok = true
    for (let i = 0; i < n && fb + i < total; i++) {
      const a = zh.blocks[fb + i]
      const b = d.blocks[i]
      if (!a || !b || a.t !== b.t || (a.inline || []).length !== (b.inline || []).length) {
        ok = false
        break
      }
    }
    if (ok) alignedParts++
    else badParts++
  }
  const covered = cover.filter(Boolean).length
  const gaps = []
  let i = 0
  while (i < total) {
    if (cover[i]) {
      i++
      continue
    }
    const st = i
    while (i < total && !cover[i]) i++
    gaps.push(`${st}-${i - 1}`)
  }
  rows.push({
    s,
    total,
    pct: Math.round((covered / total) * 100),
    parts: parts.length,
    alignedParts,
    badParts,
    gaps,
    gapBlocks: gaps.reduce((a, g) => a + (Number(g.split('-')[1]) - Number(g.split('-')[0]) + 1), 0),
  })
}

rows.sort((a, b) => b.pct - a.pct || a.gapBlocks - b.gapBlocks)
console.log('slug                              cover%  parts  ok  bad  uncovered_blocks  gap_ranges(first 8)')
for (const r of rows) {
  console.log(
    `${r.s.padEnd(33)} ${String(r.pct).padStart(6)}% ${String(r.parts).padStart(6)} ${String(r.alignedParts).padStart(3)} ${String(r.badParts).padStart(4)} ${String(r.gapBlocks).padStart(17)}  ${r.gaps.slice(0, 8).join(',')}${r.gaps.length > 8 ? ',...' : ''}`,
  )
}
const full = rows.filter((r) => r.pct === 100)
const totalGap = rows.reduce((a, r) => a + r.gapBlocks, 0)
console.log(`\narticles scanned: ${rows.length}`)
console.log(`fully covered (re-slice mechanically, no re-translation): ${full.length}`)
if (full.length) console.log('  ' + full.map((r) => r.s).join(' '))
console.log(`total uncovered blocks across scanned articles: ${totalGap}`)
