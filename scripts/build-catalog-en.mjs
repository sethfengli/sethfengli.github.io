/**
 * 汇总 src/content/en/*.json（文章英文覆盖）中的标题/作者/摘录，
 * 生成/更新 src/content/catalog-en.json（slug → { title, author, excerpt }），
 * 供 /articles 列表页与主页推荐卡片在英文界面使用。
 * 合并式更新：已存在的条目若无覆盖文件则保留（不删除）。
 * 用法：node scripts/build-catalog-en.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const enDir = join(root, 'src', 'content', 'en')
const outFile = join(root, 'src', 'content', 'catalog-en.json')

const map = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {}

let updated = 0
for (const f of readdirSync(enDir).sort()) {
  if (!f.endsWith('.json') || f.includes('.part')) continue
  const slug = f.replace(/\.json$/, '')
  let data
  try {
    data = JSON.parse(readFileSync(join(enDir, f), 'utf8'))
  } catch (e) {
    console.error(`[skip] ${f}: ${e.message}`)
    continue
  }
  const entry = {}
  if (typeof data.title === 'string' && data.title.trim()) entry.title = data.title.trim()
  if (typeof data.author === 'string' && data.author.trim()) entry.author = data.author.trim()
  if (typeof data.excerpt === 'string' && data.excerpt.trim()) entry.excerpt = data.excerpt.trim()
  if (Object.keys(entry).length) {
    map[slug] = { ...(map[slug] ?? {}), ...entry }
    updated++
  }
}

const sorted = {}
for (const k of Object.keys(map).sort()) sorted[k] = map[k]
writeFileSync(outFile, JSON.stringify(sorted, null, 1) + '\n', 'utf8')
console.log(`catalog-en.json: ${Object.keys(sorted).length} entries (${updated} updated from overlays)`)
