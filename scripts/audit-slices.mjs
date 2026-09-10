/**
 * 对账：slice-plan.json（每篇应有哪些块区间）↔ src/content/en 现有产出 ↔ agent-tasks.json。
 * 输出每篇还缺哪些块区间（gap），以及这些 gap 是否已在任务清单里排队。
 * 用法：node scripts/audit-slices.mjs [--json]
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const enDir = join(root, 'src', 'content', 'en')
const plan = JSON.parse(readFileSync(join(root, 'scripts', 'slice-plan.json'), 'utf8'))
const tasks = JSON.parse(readFileSync(join(root, 'scripts', 'agent-tasks.json'), 'utf8')).flatMap((b) =>
  b.tasks.map((t) => ({ ...t, batch: b.id })),
)
const taskParts = new Set(tasks.map((t) => t.partName))
const enFiles = new Set(readdirSync(enDir))

const MIN_BLOCKS = 0 // 分片里块数少于计划区间 60% 视为不可信

const rows = []
for (const p of plan) {
  const slug = p.file.replace(/\.json$/, '')
  if (enFiles.has(`${slug}.json`)) continue // 已合并整篇
  // 收集该 slug 的分片产出（含任意编号），按块区间覆盖
  const covered = []
  for (const f of enFiles) {
    if (!f.startsWith(`${slug}.p`) || !/\.json$/.test(f)) continue
    try {
      const d = JSON.parse(readFileSync(join(enDir, f), 'utf8'))
      const n = (d.blocks || []).length
      covered.push({ f, fb: d.firstBlock ?? -1, n })
    } catch {
      covered.push({ f, fb: -1, n: 0, bad: true })
    }
  }
  const gaps = []
  let expected = 0
  for (let i = 0; i < p.slices.length; i++) {
    const s = p.slices[i]
    const partName = `${slug}.p${i + 1}.json`
    const span = s.lastBlock - s.firstBlock + 1
    const hit = covered.find((c) => c.fb === s.firstBlock && c.n >= span * 0.999)
    if (hit) {
      expected = s.lastBlock + 1
      continue
    }
    const partial = covered.find((c) => c.fb === s.firstBlock && c.n > 0)
    gaps.push({
      sliceIndex: i + 1,
      range: [s.firstBlock, s.lastBlock],
      partName,
      queued: taskParts.has(partName),
      partial: partial ? `${partial.f}=${partial.n}/${span}` : null,
    })
  }
  if (gaps.length) {
    rows.push({
      slug,
      planned: p.slices.length,
      have: covered.length,
      gaps: gaps.length,
      unqueued: gaps.filter((g) => !g.queued).length,
      detail: gaps,
      extra: covered.filter((c) => c.bad).map((c) => c.f),
    })
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 1))
} else {
  let totalGap = 0
  let totalUnqueued = 0
  for (const r of rows) {
    totalGap += r.gaps
    totalUnqueued += r.unqueued
    const unq = r.detail.filter((g) => !g.queued).map((g) => `${g.partName}[${g.range[0]}-${g.range[1]}]${g.partial ? ' partial:' + g.partial : ''}`)
    console.log(
      `${r.slug}: plan=${r.planned} have=${r.have} gaps=${r.gaps} unqueued=${r.unqueued}` +
        (unq.length ? `\n    UNQUEUED ${unq.join(' ')}` : '') +
        (r.extra.length ? `\n    BAD ${r.extra.join(' ')}` : ''),
    )
  }
  console.log(`audit-slices: ${rows.length} files with gaps, ${totalGap} gaps, ${totalUnqueued} not queued`)
}
