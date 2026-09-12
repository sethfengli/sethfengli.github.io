/**
 * 临时：按 slice-plan + 现有英文分片，统计「72 片可派」到底能换来什么。
 * 用法：node scripts/analyze-eta.mjs
 * 只读、只打印。用于修正预计完成时间（多少片能立刻补成整篇、多少篇只差 1 片…）。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const plan = JSON.parse(readFileSync(join(root, 'scripts/slice-plan.json'), 'utf8'))
const enDir = join(root, 'src/content/en')
const enFiles = new Set(readdirSync(enDir))

const missingNow = []
const partialsAll = []
const orphansAll = []
const articleState = new Map() // file -> { total, miss, partial, orphans }

for (const p of plan) {
  const slug = p.file.replace(/\.json$/, '')
  if (enFiles.has(`${slug}.json`)) continue // 整篇已存在
  const zhPath = join(root, 'src/content/articles', p.file)
  if (!existsSync(zhPath)) continue
  if (readFileSync(zhPath).length > 30 * 1024 * 1024) continue // B 期

  const parts = new Map()
  for (const f of enFiles) {
    if (!f.startsWith(`${slug}.p`) || !/\.p\d+\.json$/.test(f)) continue
    try {
      const d = JSON.parse(readFileSync(join(enDir, f), 'utf8'))
      parts.set(f, { fb: d.firstBlock, n: (d.blocks || []).length })
    } catch {
      /* ignore */
    }
  }
  const miss = []
  const partial = []
  for (let i = 0; i < p.slices.length; i++) {
    const s = p.slices[i]
    const span = s.lastBlock - s.firstBlock + 1
    const nm = `${slug}.p${i + 1}.json`
    const have = parts.get(nm)
    if (have && have.fb === s.firstBlock && have.n >= span) continue // 完整
    if (have && have.fb === s.firstBlock) {
      // 旧 partial：文件在、块数不足 → 仍需工作（补译剩余块），必须计入，不能跳过
      partial.push({ nm, need: span - have.n, span, have: have.n })
      continue
    }
    if (have) {
      // 文件名对得上但 firstBlock 不符 → 错位分片，等于要重做整片
      partial.push({ nm, need: span, span, have: have.n, wrongFb: have.fb })
      continue
    }
    if (enFiles.has(nm)) continue
    miss.push(nm)
  }
  // plan 之外的多余分片（例如 p11/p12 超出 10 片计划）
  const orphans = [...parts.keys()].filter((f) => {
    const idx = Number(f.match(/\.p(\d+)\.json$/)[1]) - 1
    return idx >= p.slices.length
  })
  if (!miss.length && !partial.length && !orphans.length) continue
  articleState.set(p.file, {
    total: p.slices.length,
    done: p.slices.length - miss.length - partial.length,
    miss,
    partial,
    orphans,
  })
  missingNow.push(...miss)
  partialsAll.push(...partial.map((x) => ({ ...x, file: p.file })))
  orphansAll.push(...orphans.map((f) => ({ f, file: p.file })))
}

console.log(`A 期（<=300KB）当前缺失分片（文件完全不存在）: ${missingNow.length} 片，涉及 ${articleState.size} 篇`)
console.log(`其中「旧 partial 需补译」: ${partialsAll.length} 片，共需补 ${partialsAll.reduce((a, b) => a + b.need, 0)} 块`)
console.log(`其中「plan 之外的多余分片」: ${orphansAll.length} 个（需人工确认是否删除）`)

// 只差 1 片的文章（真空缺：无 partial、无 orphan）
const oneAway = [...articleState.entries()].filter(
  ([, v]) => v.miss.length === 1 && v.partial.length === 0 && v.orphans.length === 0,
)
console.log(`\n【真空缺】只差 1 片就能合并成整篇的文章: ${oneAway.length} 篇`)
for (const [f, v] of oneAway) console.log(`  ${f}  缺 ${v.miss[0]}`)

console.log(`\n有旧 partial 的文章（ETA 里常被低估的部分）: ${[...articleState.entries()].filter(([, v]) => v.partial.length).length} 篇`)
for (const [f, v] of [...articleState.entries()].filter(([, v]) => v.partial.length))
  console.log(`  ${f}: ${v.partial.map((x) => `${x.nm} ${x.have}/${x.span} 缺${x.need}块`).join('; ')}`)

if (orphansAll.length) {
  console.log(`\nplan 之外的多余分片:`)
  for (const o of orphansAll) console.log(`  ${o.f}  (${o.file})`)
}

console.log(`\n文件完全不存在的缺片总数: ${missingNow.length}`)
console.log(`其中「首片(includeMeta)」: ${missingNow.filter((m) => /\.p1\.json$/.test(m)).length}`)
console.log(`真实剩余工作量 = ${missingNow.length} 片全新 + ${partialsAll.length} 片补译 ≈ ${missingNow.length + partialsAll.length} 片的量`)
