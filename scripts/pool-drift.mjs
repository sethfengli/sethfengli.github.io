/**
 * 临时核对器：判断 cn-pool.json 是否与已提交的 cn-picked.json 一致
 * （即 pool 重抓后 id→条目 的映射有没有漂移）。
 * 判据：对每个桶，把 picked 第 i 条与 pool 第 i 条比 title。全等 → pool 未漂移。
 */
import fs from 'node:fs'
import path from 'node:path'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)


const pool = JSON.parse(fs.readFileSync(ART('scripts/cn-pool.json'), 'utf8'))
const picked = JSON.parse(fs.readFileSync(ART('scripts/cn-picked.json'), 'utf8'))

for (const [bucket, arr] of Object.entries(picked)) {
  const p = pool[bucket] ?? []
  let same = 0
  const diffs = []
  // picked 的每一条都带原始 id（形如 grottoes-078）——用它直接查 pool
  for (const c of arr) {
    const byId = p.find((x) => x.id === c.id)
    if (!byId) {
      diffs.push(`${c.id}: pool 里不存在`)
      continue
    }
    if (byId.title === c.title) same++
    else diffs.push(`${c.id}: picked="${c.title.slice(0, 40)}" pool="${byId.title.slice(0, 40)}"`)
  }
  console.log(
    `${bucket.padEnd(11)} picked=${String(arr.length).padStart(3)} pool=${String(p.length).padStart(3)}  title一致=${same}  不一致=${diffs.length}`,
  )
  for (const d of diffs.slice(0, 6)) console.log(`    ✗ ${d}`)
  if (diffs.length > 6) console.log(`    … 另有 ${diffs.length - 6} 条`)
}
