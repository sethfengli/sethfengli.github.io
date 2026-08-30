/**
 * 合并灵棋经英文分片：scripts/lingqi-en-A.json + B → src/content/lingqi-en.json
 * 用法：node scripts/merge-lingqi.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const aPath = join(root, 'src', 'content', 'lingqi-en-A.json')
const bPath = join(root, 'src', 'content', 'lingqi-en-B.json')
const outPath = join(root, 'src', 'content', 'lingqi-en.json')

const items = []
for (const p of [aPath, bPath]) {
  if (!existsSync(p)) {
    console.log(`[wait] ${p} not found`)
    continue
  }
  const arr = JSON.parse(readFileSync(p, 'utf8'))
  items.push(...arr)
}
if (!items.length) {
  console.log('nothing to merge')
  process.exit(0)
}
// 去重并按 code 排序（code 为三位数字符串，按数值排序）
const seen = new Set()
const unique = items.filter((x) => {
  const k = String(x.code)
  if (seen.has(k)) return false
  seen.add(k)
  return true
})
unique.sort((a, b) => Number(a.code) - Number(b.code))
writeFileSync(outPath, JSON.stringify(unique, null, 1) + '\n', 'utf8')
console.log(`lingqi-en.json: ${unique.length} items`)
if (unique.length !== 125) console.log(`WARNING: expected 125 items`)
