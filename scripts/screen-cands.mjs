/**
 * 用 `curate-cn.mjs` 里**真正的** TITLE_REJECT 预筛候选 id。
 * 为什么必须有：被排雷剔掉的 id 不进 `cn-picked.json`，于是该桶少一条、
 * **后面每条的下标全部前移 1**，编号（== 下标+1）与磁盘整体错位（§9.2 第 21 条）。
 * 实测踩过：想把 landscape-050 换成 landscape-007，结果 007 因标题含 "Tibetan Plateau"
 * 被 /tibetan/i 剔掉，landscape 变成 19 条。
 *
 * 用法：
 *   node scripts/screen-cands.mjs                      # 列出未选中且能通过的 landscape 候选
 *   node scripts/screen-cands.mjs <id> [id...]         # 逐条判定指定 id
 *   node scripts/screen-cands.mjs <bucket> <id> [...]  # 指定桶
 */
import fs from 'node:fs'
import path from 'node:path'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)


const src = fs.readFileSync(ART('scripts/curate-cn.mjs'), 'utf8')
const block = src.match(/TITLE_REJECT\s*=\s*\[([\s\S]*?)\n\]/)[1]
const res = [...block.matchAll(/\/([^/\n]+)\/([a-z]*)/g)].map((m) => new RegExp(m[1], m[2]))

const pool = JSON.parse(fs.readFileSync(ART('scripts/cn-pool.json'), 'utf8'))
const buckets = Object.keys(pool)
const argv = process.argv.slice(2)
const bucket = buckets.includes(argv[0]) ? argv.shift() : 'landscape'
const ids = argv

const pickedFor = (b) => {
  const m = src.match(new RegExp(`${b}:\\s*\\[([^\\]]*)\\]`, 's'))
  return new Set(m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [])
}

if (ids.length) {
  for (const id of ids) {
    const p = (pool[bucket] ?? []).find((x) => x.id === id)
    if (!p) {
      console.log(`${id}  ✗ 池中不存在`)
      continue
    }
    const hit = res.find((r) => r.test(p.title))
    console.log(`${id}  ${hit ? '✗ 会被剔 by /' + hit.source + '/' : '✓ 通过'}  ${p.title}`)
  }
} else {
  const used = pickedFor(bucket)
  console.log(`TITLE_REJECT 共 ${res.length} 条；${bucket} 桶未选中且**能通过**的候选：`)
  for (const p of pool[bucket] ?? []) {
    if (used.has(p.id)) continue
    if (res.some((r) => r.test(p.title))) continue
    console.log(`  ${p.id}  ${p.w}x${p.h}  ${p.title}`)
  }
}
