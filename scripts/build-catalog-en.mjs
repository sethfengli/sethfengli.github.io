/**
 * 汇总 src/content/en/*.json（文章英文覆盖）中的标题/作者/摘录，
 * 生成/更新 src/content/catalog-en.json（slug → { title, author, excerpt }），
 * 供 /articles 列表页与主页推荐卡片在英文界面使用。
 * 合并式更新：已存在的条目若无覆盖文件则保留（不删除）。
 * prune：对本次扫描到的 slug，删掉「en 侧没有值」的 title/author/excerpt。
 *   —— 必须做，否则把 en/<slug>.json 的 author 清空/删行后，合并式更新只会跳过该字段，
 *   陈旧值会一直留在 catalog 里（RESUME.md §4.12 的坑）。
 * 用法：node scripts/build-catalog-en.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const enDir = join(root, 'src', 'content', 'en')
const outFile = join(root, 'src', 'content', 'catalog-en.json')

const map = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {}

const PRUNED_FIELDS = ['title', 'author', 'excerpt']

let updated = 0
let pruned = 0
for (const f of readdirSync(enDir).sort()) {
  // 只认整篇 en/<slug>.json，跳过分片（.pN.json / .partN.json）与目录预留
  if (!f.endsWith('.json') || f.includes('.part') || /\.p\d+\.json$/.test(f)) continue
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

  // 先 prune 再合并：删掉 en 侧已无值的陈旧字段（只处理本次扫描到的 slug）
  if (map[slug]) {
    for (const field of PRUNED_FIELDS) {
      if (field in entry) continue
      if (map[slug][field] !== undefined) {
        delete map[slug][field]
        pruned++
      }
    }
  }

  if (Object.keys(entry).length) {
    map[slug] = { ...(map[slug] ?? {}), ...entry }
    updated++
  } else if (map[slug] && Object.keys(map[slug]).length === 0) {
    delete map[slug]
  }
}

const sorted = {}
for (const k of Object.keys(map).sort()) sorted[k] = map[k]
writeFileSync(outFile, JSON.stringify(sorted, null, 1) + '\n', 'utf8')
console.log(
  `catalog-en.json: ${Object.keys(sorted).length} entries (${updated} updated from overlays, ${pruned} stale fields pruned)`
)
