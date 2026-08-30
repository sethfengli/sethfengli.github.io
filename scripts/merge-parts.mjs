/**
 * 合并分片翻译结果：
 * 对 scripts/slice-plan.json 中的大文件，读取 src/content/en/<slug>.part*.json
 * （每个 part 含 firstBlock 与 blocks），按 firstBlock 排序拼装，
 * 校验块数连续且与中文原文一致后写出 src/content/en/<slug>.json。
 * 用法：node scripts/merge-parts.mjs [slug...]（不带参数处理全部）
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const zhDir = join(root, 'src', 'content', 'articles')
const enDir = join(root, 'src', 'content', 'en')
const planPath = join(root, 'scripts', 'slice-plan.json')

const plan = JSON.parse(readFileSync(planPath, 'utf8'))
const want = process.argv.slice(2)

let mergedCount = 0
for (const p of plan) {
  if (want.length && !want.includes(p.file.replace(/\.json$/, ''))) continue
  const slug = p.file.replace(/\.json$/, '')
  const outPath = join(enDir, `${slug}.json`)
  if (existsSync(outPath)) {
    console.log(`[skip] ${slug} already merged`)
    continue
  }
  const parts = readdirSync(enDir)
    .filter((x) => x.startsWith(`${slug}.p`) && /\.p\d+\.json$/.test(x))
    .map((x) => {
      try {
        const d = JSON.parse(readFileSync(join(enDir, x), 'utf8'))
        return { name: x, firstBlock: d.firstBlock ?? -1, data: d }
      } catch (e) {
        console.error(`[bad part] ${x}: ${e.message}`)
        return null
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.firstBlock - b.firstBlock)

  if (!parts.length) {
    console.log(`[wait] ${slug}: no parts yet`)
    continue
  }
  const zh = JSON.parse(readFileSync(join(zhDir, p.file), 'utf8'))
  const blocks = []
  const meta = {}
  let next = 0
  let broken = false
  for (const pt of parts) {
    if (pt.firstBlock !== next) {
      console.error(`[gap] ${slug}: expect block ${next}, got ${pt.firstBlock} (${pt.name})`)
      broken = true
      break
    }
    for (const k of ['title', 'author', 'excerpt']) {
      if (typeof pt.data[k] === 'string' && pt.data[k].trim()) meta[k] = pt.data[k].trim()
    }
    for (const b of pt.data.blocks ?? []) blocks.push(b)
    next += (pt.data.blocks ?? []).length
  }
  if (broken || blocks.length !== zh.blocks.length) {
    console.error(
      `[fail] ${slug}: merged ${blocks.length}/${zh.blocks.length} blocks (next=${next})`,
    )
    continue
  }
  const out = {
    slug,
    ...(meta.title ? { title: meta.title } : {}),
    ...(meta.author ? { author: meta.author } : {}),
    ...(meta.excerpt ? { excerpt: meta.excerpt } : {}),
    blocks,
  }
  writeFileSync(outPath, JSON.stringify(out, null, 1) + '\n', 'utf8')
  // 删除已合并的分片
  for (const pt of parts) {
    try {
      unlinkSync(join(enDir, pt.name))
    } catch {
      /* keep */
    }
  }
  console.log(`[merged] ${slug}: ${blocks.length} blocks`)
  mergedCount++
}
console.log(`done, merged ${mergedCount}`)
