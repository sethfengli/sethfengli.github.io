/**
 * 把 agent-tasks.json 的每个任务切片预提取为独立小文件 build/slices/<partName>.src.json，
 * 内容为 {"firstBlock":B,"blocks":[源切片全部块]}，供子代理只读该小文件快速翻译。
 * 用法：node scripts/prep-slices.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const zhDir = join(root, 'src', 'content', 'articles')
const tasksPath = join(root, 'scripts', 'agent-tasks.json')
const outDir = join(root, 'build', 'slices')

const tasks = JSON.parse(readFileSync(tasksPath, 'utf8')).flatMap((b) => b.tasks)
mkdirSync(outDir, { recursive: true })

const done = []
let skipped = 0
const seen = new Set()
let dup = 0
for (const t of tasks) {
  const out = join(outDir, t.partName.replace(/\.json$/, '') + '.src.json')
  if (seen.has(t.partName)) { dup++; continue }
  seen.add(t.partName)
  const enPath = join(root, 'src', 'content', 'en', t.partName)
  if (existsSync(enPath)) { skipped++; continue }
  // 读取源切片块（整文件块数组索引 firstBlock..lastBlock）
  const zh = JSON.parse(readFileSync(join(zhDir, t.file), 'utf8'))
  const blocks = zh.blocks.slice(t.slice.firstBlock, t.slice.lastBlock + 1)
  const data = { firstBlock: t.slice.firstBlock, blocks }
  // includeMeta 任务：从中文源头取出 title/author/excerpt，供子代理翻译后写入
  if (t.includeMeta) {
    if (typeof zh.title === 'string' && zh.title.trim()) data.zhTitle = zh.title.trim()
    if (typeof zh.author === 'string' && zh.author.trim()) data.zhAuthor = zh.author.trim()
    if (typeof zh.excerpt === 'string' && zh.excerpt.trim()) data.zhExcerpt = zh.excerpt.trim()
    data.includeMeta = true
  }
  writeFileSync(out, JSON.stringify(data, null, 1) + '\n', 'utf8')
  done.push(t.partName)
}
console.log(`prep-slices: ${done.length} written, ${skipped} skipped (en exists), ${dup} dup`)
