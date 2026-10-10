/**
 * 色板令牌改名：把「名不副实」的令牌名换成实义名。
 * ---------------------------------------------------------------
 * 实测（见 scripts/dump-palette.mjs 的真值）：
 *   --site-sandalwood-*  #789085 一族实际是**青瓷灰绿**（G>R），不是檀木色
 *   --site-tibetan-*     #b8382e 一族实际是**朱砂印章红**，与藏传无关
 * 两者合计约 309 处，是项目里最大的可读性债。
 *
 * 改名：sandalwood → celadon（青瓷）· tibetan → cinnabar（朱砂）
 *       gold → brass（黄铜，非鎏金）· moon → mist（青雾灰蓝，非月白）
 *
 * ⚠ 只改**色板令牌**，不碰散文词与语义标识：
 *   - `src/content/**` 是英文正文数据，里面的 "gold"/"moon" 是散文词（如「gold of
 *     last night」「the moon in water」），动了就破坏译文；
 *   - `gold`/`moon` 在全站**另有语义用法**，必须保留：
 *       · `.btn-gold`（CSS 类名，实为焦墨实底按钮，与色板无关）
 *       · `illustration: 'moon'`（ZenIllustration 的插画变体名，12 式之一）
 *       · `ReaderTheme = 'moon'` + `.reader-theme-moon`（阅读主题，用自己的
 *         `--reader-*` 变量，与 `--site-moon-*` 无关）
 *   故本脚本对每个词形都用**令牌-数字**边界（`\\b(?:gold|moon)-(\\d{2,3})\\b`），
 *   裸词一律不动 —— 这正是第 7 轮「按令牌名一刀切改会破坏图版排雷正则」的教训。
 *
 * 用法：node scripts/rename-tokens.mjs [--dry]
 */
import fs from 'node:fs'
import path from 'node:path'

const MAP = [
  ['sandalwood', 'celadon'],
  ['tibetan', 'cinnabar'],
  ['gold', 'brass'],
  ['moon', 'mist'],
]

/** 令牌名 + 数字（`gold-500`）；也匹配 @theme 块里 `--color-gold-50` 这类 */
const tokenRe = (from) => new RegExp(`\\b${from}-(\\d{2,3})\\b`, 'g')

const dry = process.argv.includes('--dry')

/** 收集要处理的文件（排除正文数据、产物、依赖） */
function collect(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    const rel = p.replace(/\\/g, '/')
    if (/node_modules|\.git\/|dist\/|preview-dist\/|src\/content\//.test(rel)) continue
    if (e.isDirectory()) collect(p, acc)
    else if (/\.(ts|tsx|css|json|html|md|mjs)$/.test(e.name)) acc.push(p)
  }
  return acc
}

const files = []
for (const r of ['src', 'scripts', 'docs', 'preview', 'index.html']) {
  if (!fs.existsSync(r)) continue
  const st = fs.statSync(r)
  if (st.isDirectory()) collect(r, files)
  else files.push(r)
}

// 排除正文数据，以及**把 tibetan / gold / moon 当题材词用的脚本** ——
// 那两个脚本里的 /tibetan/i 是图片排雷的正则，改了会破坏图版筛选（实测踩过）；
// scan-mojibake 的 CP1252 映射表里有 "gold" 之类的 ASCII 词样本，同样不能碰。
const EXCLUDE = [
  'src/content/',
  'scripts/curate-cn.mjs',
  'scripts/fetch-met-photos.mjs',
  'scripts/scan-mojibake.mjs',
]
const target = files.filter((f) => {
  const rel = f.replace(/\\/g, '/')
  return !EXCLUDE.some((x) => rel.includes(x))
})

let total = 0
const report = []
for (const f of target) {
  const before = fs.readFileSync(f, 'utf8')
  let after = before
  for (const [from, to] of MAP) {
    after = after.replace(tokenRe(from), `${to}-$1`)
  }
  if (after === before) continue
  const n = MAP.reduce((acc, [from]) => acc + (before.match(tokenRe(from)) || []).length, 0)
  total += n
  report.push([f, n])
  if (!dry) fs.writeFileSync(f, after, 'utf8')
}

report.sort((a, b) => b[1] - a[1])
for (const [f, n] of report) console.log(`  ${String(n).padStart(4)}  ${f}`)
console.log(`\n${dry ? '(dry) ' : ''}共 ${total} 处，涉及 ${report.length} 个文件`)

// 抽查一：关键文件里不应再残留旧令牌名（只查「旧名+数字」）
const tokenRe1 = (from) => new RegExp(`\\b${from}-(\\d{2,3})\\b`)
const leftovers = []
for (const [from] of MAP) {
  for (const f of ['src/index.css', 'vite.config.ts', 'package.json']) {
    if (!fs.existsSync(f)) continue
    const t = fs.readFileSync(f, 'utf8')
    if (tokenRe1(from).test(t)) leftovers.push(`${f}: ${from}-*`)
  }
}
console.log(leftovers.length ? `⚠ 仍残留：${leftovers.join(', ')}` : '✔ 关键文件已无旧令牌名')

// 抽查二：正文数据与抓取脚本里**不该有任何改动**（散文词 gold/moon 必须原样）
const untouched = []
for (const [from] of MAP) {
  for (const d of ['src/content', 'scripts']) {
    if (!fs.existsSync(d)) continue
    for (const f of collect(d)) {
      const rel = f.replace(/\\/g, '/')
      if (!EXCLUDE.some((x) => rel.includes(x))) continue
      // 只关心令牌形（gold-500）；散文词 gold 本就该在这里，不算命中
      if (tokenRe1(from).test(fs.readFileSync(f, 'utf8'))) untouched.push(`${rel}: ${from}-*`)
    }
  }
}
console.log(
  untouched.length ? `⚠ 排除区出现令牌形改名：${untouched.join(', ')}` : '✔ 排除区（正文/抓取脚本）无令牌形命中',
)
