/**
 * 图版清单体检：核对 src/data/photos-cn.json 与 public/photos/cn/ 的真实状态。
 * ---------------------------------------------------------------
 * 用法：
 *   node scripts/photos-status.mjs            # 打印各桶张数 + 体积 + 具名图指向
 *   node scripts/photos-status.mjs --prune     # 顺手把清单里已不存在的文件名剔除并写回
 *   node scripts/photos-status.mjs --quiet     # 只打印一行摘要（给脚本调用）
 *
 * 存在的理由：抓取会因 Commons 限流而中断，清单与磁盘很容易不一致；
 * 清单里出现不存在的文件，前端就会去请求 404。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const MANIFEST = path.join(ROOT, 'src', 'data', 'photos-cn.json')
const DIR = path.join(ROOT, 'public', 'photos', 'cn')

const argv = process.argv.slice(2)
const prune = argv.includes('--prune')
const quiet = argv.includes('--quiet')

if (!fs.existsSync(MANIFEST)) {
  console.error(`缺少清单：${MANIFEST}`)
  process.exit(1)
}

const onDisk = new Set(
  fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.jpg')) : [],
)
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))

const buckets = {}
let listed = 0
let missing = 0
for (const [key, value] of Object.entries(manifest)) {
  if (!Array.isArray(value)) continue
  const keep = value.filter((f) => onDisk.has(f))
  missing += value.length - keep.length
  buckets[key] = keep
  listed += keep.length
}

const named = manifest.named ?? {}
const namedBroken = Object.entries(named).filter(([, f]) => !onDisk.has(f))

let bytes = 0
for (const f of onDisk) {
  try {
    bytes += fs.statSync(path.join(DIR, f)).size
  } catch {
    /* 忽略 */
  }
}
const mb = (bytes / 1024 / 1024).toFixed(1)

const emptyBuckets = Object.entries(buckets)
  .filter(([, v]) => v.length === 0)
  .map(([k]) => k)

if (quiet) {
  console.log(`manifest=${listed} disk=${onDisk.size} empty=${emptyBuckets.join(',') || 'none'} mb=${mb}`)
} else {
  console.log(`图版清单体检（${path.relative(ROOT, DIR)}）`)
  console.log(`  磁盘文件      ${onDisk.size} 张 / ${mb} MB`)
  console.log(`  清单登记      ${listed} 条`)
  if (missing > 0) console.log(`  ⚠ 清单里不存在的  ${missing} 条${prune ? '（已剔除）' : '（用 --prune 剔除）'}`)
  console.log('')
  for (const [k, v] of Object.entries(buckets)) {
    const bar = v.length === 0 ? '  ← 空桶，该桶相关的具名图会回退' : ''
    console.log(`  ${k.padEnd(11)} ${String(v.length).padStart(4)} 张${bar}`)
  }
  console.log('')
  console.log('  具名图：')
  for (const [k, f] of Object.entries(named)) {
    const ok = onDisk.has(f)
    console.log(`    ${ok ? '✓' : '✗'} ${k.padEnd(9)} → ${f}`)
  }
  if (namedBroken.length) console.log(`\n  ⚠ ${namedBroken.length} 个具名图指向不存在的文件，请重跑 scripts/pick-named-photos.mjs`)
}

if (prune && missing > 0) {
  manifest.named = named
  for (const k of Object.keys(buckets)) manifest[k] = buckets[k]
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n', 'utf8')
  if (!quiet) console.log(`\n→ 已剔除 ${missing} 条并写回清单`)
}

// 退出码：空桶或具名图损坏都算「还需要续抓」，方便脚本判断
process.exit(emptyBuckets.length || namedBroken.length ? 2 : 0)
