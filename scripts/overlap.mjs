/**
 * For the given slugs, list existing part ranges (including orphan parts that no
 * longer match slice-plan) next to the current slice-plan slices, and report how
 * many blocks of each planned slice are already covered by existing parts.
 * Usage: node scripts/overlap.mjs <slug> [<slug> ...]
 * Read-only; prints only. Use it to decide whether dispatching a planned slice
 * would re-translate blocks that already exist.
 * NOTE: keep this file pure ASCII on purpose (PowerShell rewrites can mangle UTF-8).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const enDir = join(root, 'src/content/en')
const enFiles = readdirSync(enDir)
const plan = JSON.parse(readFileSync(join(root, 'scripts/slice-plan.json'), 'utf8'))

for (const s of process.argv.slice(2)) {
  const zhPath = join(root, 'src/content/articles', `${s}.json`)
  if (!existsSync(zhPath)) {
    console.log(`${s}: NO ZH SOURCE`)
    continue
  }
  const zh = JSON.parse(readFileSync(zhPath, 'utf8'))
  const p = plan.find((x) => x.file === `${s}.json`)
  const parts = []
  for (const f of enFiles.filter((x) => x.startsWith(`${s}.p`) && /\.p\d+\.json$/.test(x))) {
    try {
      const d = JSON.parse(readFileSync(join(enDir, f), 'utf8'))
      parts.push({ f, fb: d.firstBlock, n: (d.blocks || []).length })
    } catch {
      parts.push({ f, fb: '?', n: '?' })
    }
  }
  parts.sort((a, b) => (a.fb === '?' ? 1 : b.fb === '?' ? -1 : a.fb - b.fb))

  const buildCover = (excludeName) => {
    const c = new Array(zh.blocks.length).fill(false)
    for (const x of parts) {
      if (x.f === excludeName || typeof x.fb !== 'number') continue
      for (let i = x.fb; i < x.fb + x.n && i < c.length; i++) c[i] = true
    }
    return c
  }
  const all = buildCover(null)
  const cov = all.filter(Boolean).length
  console.log(`\n=== ${s}  zh=${zh.blocks.length} blocks  covered=${cov}/${zh.blocks.length} (${Math.round((cov / zh.blocks.length) * 100)}%) ===`)
  console.log('  existing parts (sorted by firstBlock):')
  for (const x of parts) {
    console.log(
      `    ${x.f.padEnd(42)} fb=${String(x.fb).padStart(4)} n=${String(x.n).padStart(4)}  range=[${x.fb}, ${typeof x.fb === 'number' ? x.fb + x.n - 1 : '?'}]`,
    )
  }
  if (p) {
    console.log('  current slice-plan slices:')
    for (let i = 0; i < p.slices.length; i++) {
      const sl = p.slices[i]
      const nm = `${s}.p${i + 1}.json`
      const ex = parts.find((x) => x.f === nm)
      const span = sl.lastBlock - sl.firstBlock + 1
      const other = buildCover(nm)
      let pre = 0
      for (let k = sl.firstBlock; k <= sl.lastBlock && k < other.length; k++) if (other[k]) pre++
      console.log(
        `    ${nm.padEnd(42)} [${sl.firstBlock}-${sl.lastBlock}] span=${String(span).padStart(3)}  file:${ex ? ex.n + ' blocks' : 'none'}  already covered by other parts: ${pre}/${span}`,
      )
    }
  }
}
