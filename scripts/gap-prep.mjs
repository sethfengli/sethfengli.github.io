/**
 * Prepare source files for GAP-ONLY dispatch.
 *
 * Context: many articles already have English parts on an older, finer slicing grid.
 * Their remaining work is not a whole planned slice (~60 blocks) but a small uncovered
 * range (sometimes only 9 blocks). `merge-parts` only needs firstBlock contiguity and
 * ignores file names, so a gap part may be written as any free `<slug>.pN.json`.
 *
 * Usage: node scripts/gap-prep.mjs <slug> [<slug> ...]
 *        node scripts/gap-prep.mjs <slug>:<start>-<end>      (explicit range; use to split a big gap)
 * For each slug it finds uncovered block ranges and prepares a source file as
 *   build/slices/<slug>.p<N>.src.json   (N = smallest free part index)
 * and prints the output filename the translator must write.
 * NOTE: two calls for the SAME slug both pick the same free index — give each half its
 *       own file (see below) when splitting a gap across two agents.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const enDir = join(root, 'src/content/en')
const zhDir = join(root, 'src/content/articles')
const outDir = join(root, 'build', 'slices')
const enFiles = readdirSync(enDir)

for (const raw of process.argv.slice(2)) {
  // Accept either "<slug>" (prepare first gap) or "<slug>:<start>-<end>" (explicit range)
  let s = raw
  let forced = null
  const m = raw.match(/^(.+):(\d+)-(\d+)$/)
  if (m) {
    s = m[1]
    forced = [Number(m[2]), Number(m[3])]
  }
  const zhPath = join(zhDir, `${s}.json`)
  if (!existsSync(zhPath)) {
    console.log(`${s}: NO ZH SOURCE`)
    continue
  }
  const zh = JSON.parse(readFileSync(zhPath, 'utf8'))
  const total = zh.blocks.length
  const cover = new Array(total).fill(false)
  const usedIdx = new Set()
  for (const f of enFiles.filter((x) => x.startsWith(`${s}.p`) && /\.p\d+\.json$/.test(x))) {
    usedIdx.add(Number(f.match(/\.p(\d+)\.json$/)[1]))
    try {
      const d = JSON.parse(readFileSync(join(enDir, f), 'utf8'))
      const fb = d.firstBlock
      const n = (d.blocks || []).length
      if (typeof fb === 'number') for (let i = fb; i < fb + n && i < total; i++) cover[i] = true
    } catch {
      /* ignore */
    }
  }
  // Also reserve part indices already prepared (but not yet written) under build/slices,
  // so two calls for the same slug (splitting one gap) do not collide on the same name.
  if (existsSync(outDir)) {
    for (const f of readdirSync(outDir)) {
      const m = f.match(new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.p(\\d+)\\.src\\.json$`))
      if (m) usedIdx.add(Number(m[1]))
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
  if (!gaps.length) {
    console.log(`${s}: NO GAP (already fully covered -> run merge-parts)`)
    continue
  }
  let n = 1
  while (usedIdx.has(n)) n++
  const partName = `${s}.p${n}.json`
  const [a, b] = forced && forced[1] < total && forced[0] <= forced[1] ? forced : gaps[0]
  const data = { firstBlock: a, blocks: zh.blocks.slice(a, b + 1) }
  const includeMeta = a === 0
  if (includeMeta) {
    for (const [k, src] of [['zhTitle', 'title'], ['zhAuthor', 'author'], ['zhExcerpt', 'excerpt']]) {
      if (typeof zh[src] === 'string' && zh[src].trim()) data[k] = zh[src].trim()
    }
    data.includeMeta = true
  }
  writeFileSync(join(outDir, partName.replace(/\.json$/, '') + '.src.json'), JSON.stringify(data, null, 1) + '\n', 'utf8')
  console.log(
    `${s}: gaps=${gaps.map((g) => `[${g[0]}-${g[1]}](${g[1] - g[0] + 1}b)`).join(' ')}  ->  prepared ${partName} fb=${a} lb=${b} blocks=${b - a + 1} meta=${includeMeta} (output: src/content/en/${partName})`,
  )
}
