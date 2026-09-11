/**
 * Plan the remaining A-phase work as a concrete TASK QUEUE.
 * A "task" = one contiguous uncovered block range; ranges larger than SPLIT are
 * divided so no single subagent gets an oversized job.
 * Usage: node scripts/task-plan.mjs [maxTaskBlocks]
 * Read-only. Pure ASCII.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const enDir = join(root, 'src/content/en')
const plan = JSON.parse(readFileSync(join(root, 'scripts/slice-plan.json'), 'utf8'))
const enFiles = readdirSync(enDir)
const MAX = Number(process.argv[2]) || 120

const CJK = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/
const BAD = [/\u00e2\u20ac/, /\u00c3[\u0080-\u00bf]/, /\u00c2[\u00a0-\u00bf]/, /\u00ef\u00bc/, /\u00e3\u20ac/, /\ufffd/]
const blocked = new Set()
for (const f of enFiles.filter((x) => /\.p\d+\.json$/.test(x))) {
  const raw = readFileSync(join(enDir, f), 'utf8')
  if (CJK.test(raw) || BAD.some((p) => p.test(raw))) blocked.add(f.split('.p')[0])
}

const queue = []
let articlesWithGaps = 0
let totalUncovered = 0
for (const p of plan) {
  const s = p.file.replace(/\.json$/, '')
  if (enFiles.includes(`${s}.json`)) continue
  const zhPath = join(root, 'src/content/articles', p.file)
  if (!existsSync(zhPath)) continue
  if (readFileSync(zhPath).length > 300 * 1024) continue
  const zh = JSON.parse(readFileSync(zhPath, 'utf8'))
  const total = zh.blocks.length
  const cover = new Array(total).fill(false)
  let hasParts = false
  for (const f of enFiles.filter((x) => x.startsWith(`${s}.p`) && /\.p\d+\.json$/.test(x))) {
    hasParts = true
    try {
      const d = JSON.parse(readFileSync(join(enDir, f), 'utf8'))
      const fb = d.firstBlock
      const n = (d.blocks || []).length
      if (typeof fb === 'number') for (let i = fb; i < fb + n && i < total; i++) cover[i] = true
    } catch {
      /* ignore */
    }
  }
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
  if (!gaps.length) continue
  articlesWithGaps++
  const gapBlocks = gaps.reduce((a, g) => a + (g[1] - g[0] + 1), 0)
  totalUncovered += gapBlocks
  for (const [a, b] of gaps) {
    // split oversized ranges from the START, keeping the head (which carries metadata) first
    let x = a
    while (x <= b) {
      const y = Math.min(x + MAX - 1, b)
      queue.push({ slug: s, a: x, b: y, blocks: y - x + 1, head: x === 0, total, blocked: blocked.has(s) })
      x = y + 1
    }
  }
}
queue.sort((p, q) => p.blocks - q.blocks)
const runnable = queue.filter((t) => !t.blocked)
console.log(`A-phase articles with gaps: ${articlesWithGaps}`)
console.log(`uncovered blocks: ${totalUncovered}`)
console.log(`TASK QUEUE (max ${MAX} blocks/task): ${queue.length} tasks, of which runnable now = ${runnable.length}`)
console.log(`blocked (CJK/mojibake in existing parts, fix first): ${queue.length - runnable.length} tasks\n`)
for (const t of runnable.slice(0, 30))
  console.log(`  ${t.slug.padEnd(34)} [${t.a}-${t.b}] ${String(t.blocks).padStart(4)}b head=${t.head ? 'Y' : 'n'}`)
if (runnable.length > 30) console.log(`  ... and ${runnable.length - 30} more`)
for (const perRound of [5, 8, 10]) {
  const mins = Math.ceil(runnable.length / perRound) * 8
  console.log(`\nat ${perRound} parallel, ~8 min/round: ${Math.ceil(runnable.length / perRound)} rounds ~= ${mins} min`)
}
