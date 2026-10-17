/**
 * 每日法语体检：`src/data/verses.ts` 的机械判据。
 *
 * 为什么需要：每日法语是**长期可重复的任务**（见 scripts/RESUME.md §12）。
 * 每次增补后跑一遍，先把「重复 / 漏英文 / 太长 / 中文串进英文」这类
 * 机械错误挡掉，人只需要判断「这条够不够好、出处准不准」。
 *
 * 用法：node scripts/verse-audit.mjs
 * 退出码：0 = 全绿；1 = 有硬错误（重复 / 缺字段 / 英文夹中文）
 *
 * 判据（阈值有意偏宽，只挡明显问题）：
 *   - 正文 3–44 字（首页一栏 + 弹窗都能放下；「悲欣交集」这类四字也算合法）；
 *   - `source` / `en.text` / `en.source` 都不能空；
 *   - 中文条目的英文里不得出现 CJK 汉字；
 *   - 去标点后不得重复（同一句两条，轮换时会显得像坏了）。
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const FILE = path.join(ROOT, 'src/data/verses.ts')
const src = fs.readFileSync(FILE, 'utf8')

const UNESCAPE = (s) => s.replace(/\\'/g, "'").replace(/\\\\/g, '\\')

const re =
  /text:\s*'((?:\\.|[^'])*)',\s*\n\s*source:\s*'((?:\\.|[^'])*)',\s*\n\s*en:\s*\{\s*\n\s*text:\s*'((?:\\.|[^'])*)',\s*\n\s*source:\s*'((?:\\.|[^'])*)',/g

const entries = []
let m
while ((m = re.exec(src))) {
  entries.push({
    text: UNESCAPE(m[1]),
    source: UNESCAPE(m[2]),
    en: UNESCAPE(m[3]),
    enSource: UNESCAPE(m[4]),
  })
}

const errors = []
const warnings = []

if (entries.length === 0) errors.push('一条也没解析出来 —— 正则与文件格式可能已脱节')
const norm = (s) => s.replace(/[。！？；，、：\s「」“”"']/g, '')
const seen = new Map()
for (const [i, v] of entries.entries()) {
  const no = i + 1
  if (v.text.length < 3) errors.push(`#${no} 正文过短：${v.text}`)
  if (v.text.length > 44) warnings.push(`#${no} 正文 ${v.text.length} 字（>44）：${v.text}`)
  if (!v.source.trim()) errors.push(`#${no} 缺中文出处：${v.text}`)
  if (!v.en.trim()) errors.push(`#${no} 缺英文：${v.text}`)
  if (!v.enSource.trim()) errors.push(`#${no} 缺英文出处：${v.text}`)
  if (/[\u3400-\u4dbf\u4e00-\u9fff]/.test(v.en)) errors.push(`#${no} 英文里夹了汉字：${v.en}`)
  if (v.en.length > 260) warnings.push(`#${no} 英文 ${v.en.length} 字符（偏长）`)
  const key = norm(v.text)
  if (seen.has(key)) errors.push(`#${no} 与 #${seen.get(key)} 重复：${v.text}`)
  else seen.set(key, no)
}

// 重复统计按「正文」；顺序相同也算可疑（同源多条本身合法，只做提示）
const sourceCount = new Map()
for (const v of entries) sourceCount.set(v.source, (sourceCount.get(v.source) ?? 0) + 1)
const heavy = [...sourceCount.entries()].filter(([, n]) => n >= 6).sort((a, b) => b[1] - a[1])

console.log(`共 ${entries.length} 条 · 出处 ${sourceCount.size} 个`)
if (heavy.length) {
  console.log('出处集中度（>=6 条）：' + heavy.map(([s, n]) => `${s} ${n}`).join(' · '))
}
for (const w of warnings) console.log('warn  ' + w)
for (const e of errors) console.log('ERROR ' + e)
console.log(errors.length ? `\n✗ ${errors.length} 个硬错误` : '\n✓ 全绿')
process.exit(errors.length ? 1 : 0)
