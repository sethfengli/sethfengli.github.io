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
const articleState = new Map() // file -> { total, missing:[partName], done:n }

for (const p of plan) {
  const slug = p.file.replace(/\.json$/, '')
  if (enFiles.has(`${slug}.json`)) continue // 整篇已存在
  const zhPath = join(root, 'src/content/articles', p.file)
  if (!existsSync(zhPath)) continue
  if (readFileSync(zhPath).length > 300 * 1024) continue // B 期

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
  for (let i = 0; i < p.slices.length; i++) {
    const s = p.slices[i]
    const span = s.lastBlock - s.firstBlock + 1
    const nm = `${slug}.p${i + 1}.json`
    const have = parts.get(nm)
    if (have && have.fb === s.firstBlock && have.n >= span) continue // 完整
    if (have) continue // 旧 partial（结构不全），不计入「可派」
    if (enFiles.has(nm)) continue
    miss.push(nm)
  }
  if (!miss.length) continue
  articleState.set(p.file, { total: p.slices.length, done: p.slices.length - miss.length, miss })
  missingNow.push(...miss)
}

console.log(`A 期（<=300KB）当前缺失分片: ${missingNow.length} 片，涉及 ${articleState.size} 篇`)

// 只差 1 片的文章
const oneAway = [...articleState.entries()].filter(([, v]) => v.miss.length === 1)
console.log(`\n只差 1 片就能合并成整篇的文章: ${oneAway.length} 篇`)
for (const [f, v] of oneAway)
  console.log(`  ${f}  缺 ${v.miss[0]}  (${v.done}/${v.total} 片已就绪)`)

const twoAway = [...articleState.entries()].filter(([, v]) => v.miss.length === 2)
console.log(`\n只差 2 片的文章: ${twoAway.length} 篇`)
console.log(twoAway.map(([f, v]) => `  ${f}: ${v.miss.join(' ')}`).join('\n'))

console.log(`\n全部缺片总数（含被旧 partial 挡住的）: ${missingNow.length}`)
console.log(`其中「首片(includeMeta)」: ${missingNow.filter((m) => /\.p1\.json$/.test(m)).length}`)
