/**
 * 每日法语候选挖掘：从本站 294 篇正文里捞出「短、独立、像格言」的句子。
 *
 * 为什么需要：`src/data/verses.ts` 的每日法语要持续补充（长期可重复的任务），
 * 而站内正文本身就是最大的语料库。人工翻 294 篇不现实，这里先做机械筛选，
 * 再由人逐条读上下文、定出处 —— **脚本只负责把候选缩小到可读的一两百条**。
 *
 * 用法：
 *   node scripts/verse-candidates.mjs                 # 打印前 120 条
 *   node scripts/verse-candidates.mjs --top=300       # 多打一些
 *   node scripts/verse-candidates.mjs --json=build/verse-candidates.json
 *   node scripts/verse-candidates.mjs --min=6 --max=40
 *
 * 判据（都偏保守，宁可漏、不可错）：
 *   - 一句话 8–36 字（首页一栏能放下，中英对照也不至于过长）；
 *   - 必须有句末标点，且整句只有这一句（不截断长句）；
 *   - 含「心 / 佛 / 念 / 修行 / 烦恼 / 生死 / 因果 / 放下 / 慈悲 / 清净 …」之一；
 *   - 去掉重复（同一句在不同文章反复出现，通常是引文，反而更可信）；
 *   - 附带 slug / 标题 / 作者，方便回查上下文与定出处。
 *
 * ⚠ 候选**不是**可直接入库的成品：必须人工读上下文，确认不是反讽、设问、
 *   转述他人观点或残缺句，再补英文翻译与出处。
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : def
}
const MIN = Number(arg('min', '8'))
const MAX = Number(arg('max', '36'))
const TOP = Number(arg('top', '120'))
const JSON_OUT = arg('json', '')

const KEYWORDS = [
  '心', '佛', '念', '修行', '烦恼', '生死', '因果', '放下', '慈悲', '清净',
  '觉悟', '智慧', '解脱', '众生', '无常', '执着', '妄念', '净土', '菩提', '禅',
]

const catalog = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/content/catalog.json'), 'utf8'),
)
const bySlug = new Map(catalog.map((a) => [a.slug, a]))

/** 正文在 blocks[].inline[].s；b.text 多为空串（见 RESUME §4.6） */
function blockText(b) {
  if (Array.isArray(b.inline)) return b.inline.map((s) => s.s ?? '').join('')
  return b.text ?? ''
}

const seen = new Map()
for (const meta of catalog) {
  const file = path.join(ROOT, 'src/content/articles', `${meta.slug}.json`)
  if (!fs.existsSync(file)) continue
  let doc
  try {
    doc = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    continue
  }
  for (const b of doc.blocks ?? []) {
    const text = blockText(b).replace(/\s+/g, '')
    // 按句末标点切，保留标点；只收「恰好一句」
    for (const raw of text.split(/(?<=[。！？；])/)) {
      const s = raw.trim()
      if (s.length < MIN || s.length > MAX) continue
      if (!/[。！？；]$/.test(s)) continue
      if (/[0-9０-９]/.test(s)) continue
      if (/^(问|答|曰|云|所谓|何以|为何|若是|如果|譬如|例如)/.test(s)) continue
      if (!KEYWORDS.some((k) => s.includes(k))) continue
      const key = s.replace(/[。！？；]$/, '')
      const hit = seen.get(key)
      if (hit) {
        hit.count += 1
        continue
      }
      seen.set(key, {
        text: s,
        count: 1,
        slug: meta.slug,
        title: meta.title,
        author: meta.author ?? '',
        school: meta.school ?? '',
      })
    }
  }
}

const list = [...seen.values()]
  .filter((v) => v.count >= 2 || v.text.length <= 26)
  .sort((a, b) => b.count - a.count || a.text.length - b.text.length)
  .slice(0, TOP)

for (const [i, v] of list.entries()) {
  console.log(
    `${String(i + 1).padStart(3)}. ${v.text}  〔${v.title}${v.author ? ' · ' + v.author : ''}〕${v.count > 1 ? ` ×${v.count}` : ''}`,
  )
}
console.log(`\n候选 ${list.length} 条 / 去重后 ${seen.size} 条（${catalog.length} 篇正文）`)

if (JSON_OUT) {
  const out = path.resolve(ROOT, JSON_OUT)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(list, null, 1), 'utf8')
  console.log('→', path.relative(ROOT, out))
}
