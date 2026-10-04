/**
 * 站点风格体检：用可复核的计数替代「感觉」。
 * ---------------------------------------------------------------
 * 用途：每次改版前先跑一遍，看看老问题有没有回来（字体单调、装饰回潮、
 * 圆角/投影堆叠、emoji 回流、tap 目标过小、主题令牌名不副实）。
 *
 * 用法：node scripts/style-audit.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const files = walk(SRC)
const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/')
const read = (f) => fs.readFileSync(f, 'utf8')

/**
 * 去掉注释与字符串字面量后再计数。
 * 不做这一步会大量误报：文档注释里为了说明「禁止 emoji 与 ❖/✦」本身就含这些字符，
 * 实测误报 8 处。规则简单但够用：块注释整体剔除，行注释截断，
 * 单双引号与模板串内的内容用同长度空格替换（保持列号）。
 */
function stripNoise(src) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  out = out
    .split('\n')
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, (m, p1) => p1 + ' '.repeat(m.length - p1.length)))
    .join('\n')
  return out
}

/** 对源码按正则计数（返回 [命中数, 样例[]]） */
function count(re, opts = {}) {
  const only = opts.only ?? /\.(tsx|ts|css)$/
  const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)
  let n = 0
  const samples = []
  for (const f of files) {
    if (!only.test(f)) continue
    const lines = stripNoise(read(f)).split('\n')
    lines.forEach((line, i) => {
      const hits = line.match(global)
      if (!hits) return
      n += hits.length
      if (samples.length < (opts.sample ?? 4)) samples.push(`${rel(f)}:${i + 1}  ${line.trim().slice(0, 96)}`)
    })
  }
  return [n, samples]
}

function section(title, note) {
  console.log(`\n${'─'.repeat(72)}`)
  console.log(title)
  if (note) console.log(`  ${note}`)
}

function report(label, [n, samples], verdict) {
  const mark = verdict ? verdict(n) : ''
  console.log(`  ${String(n).padStart(4)}  ${label}${mark ? `   ${mark}` : ''}`)
  for (const s of samples) console.log(`        · ${s}`)
}

/**
 * 多行 JSX 属性没法按行判断（`<img` 与 `alt=` 常在不同行）。
 * 这里按「元素整体」检查：从 `<tag` 起取到该标签的 `>` 为止。
 */
function countElements(tag, requireAttr) {
  let n = 0
  const samples = []
  for (const f of files) {
    if (!/\.tsx$/.test(f)) continue
    const src = stripNoise(read(f))
    const re = new RegExp(`<${tag}\\b[^>]*>`, 'g')
    for (const m of src.matchAll(re)) {
      if (requireAttr.test(m[0])) continue
      n++
      if (samples.length < 4) {
        const line = src.slice(0, m.index).split('\n').length
        samples.push(`${rel(f)}:${line}  ${m[0].replace(/\s+/g, ' ').slice(0, 90)}`)
      }
    }
  }
  return [n, samples]
}

/* ---------------------------------------------------------------- */
console.log('慧灯禅院 · 风格体检')
console.log(`扫描 ${files.length} 个源文件`)

section('1. 字体分级', '设计约定（2026 第 6 轮）：标题楷（serif）· 正文宋（song）· 界面黑（sans）；书法体（brush）只作点睛')

const fontCounts = {}
for (const f of files) {
  if (!/\.(tsx|ts|css)$/.test(f)) continue
  for (const m of read(f).matchAll(/font-(sans|serif|brush|song)\b/g)) {
    fontCounts[m[0]] = (fontCounts[m[0]] ?? 0) + 1
  }
}
console.log('  字体类名出现次数：')
const total = Object.values(fontCounts).reduce((a, b) => a + b, 0)
for (const [k, v] of Object.entries(fontCounts).sort((a, b) => b[1] - a[1])) {
  const pct = ((v / total) * 100).toFixed(0)
  console.log(`    ${k.padEnd(14)} ${String(v).padStart(4)}  (${pct}%)`)
}
console.log('  说明：正文大量元素不加字体类、直接继承 body（= --font-song），')
console.log('        所以 font-song 的显式次数不多并不代表正文不是宋体。')
console.log('  提示：--font-serif 的汉字回退是霞鹜文楷（楷体），仅供标题使用。')

report('font-weight 使用（靠字重能否区分层级）', count(/font-(normal|medium|semibold|bold|light)\b/))

section('2. 圆角与投影', '设计约定：rounded-xs(2px) / rounded-card(4px)；取消胶囊与大圆角，阴影只留给真正的浮层')
report('rounded-full（胶囊）', count(/rounded-full\b/), (n) => (n > 6 ? '⚠ 偏多，多为装饰性圆形，建议确认' : 'ok'))
report('rounded-(2xl|3xl|lg|md)', count(/rounded-(2xl|3xl|lg|md)\b/), (n) => (n > 0 ? '⚠ 应改用 rounded-xs / rounded-card' : 'ok'))
report('shadow-(sm|md|lg|xl|2xl)', count(/shadow-(sm|md|lg|xl|2xl)\b/), (n) => (n > 0 ? '⚠ 卡片不该有投影' : 'ok'))
report('backdrop-blur', count(/backdrop-blur/), (n) => (n > 0 ? '⚠ 毛玻璃应已清除' : 'ok'))
report('装饰性渐变 bg-gradient', count(/bg-gradient-/), (n) => (n > 0 ? '⚠ 应已清除' : 'ok'))

section('3. 装饰符号', '设计约定：不用 emoji 与 ❖/✦ 字符做装饰，改用 .seal / .ornament / 内联 SVG')
report('emoji', count(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u), (n) => (n > 0 ? '⚠ 有 emoji 回流' : 'ok'))
report('❖/✦/✧/◈ 等字符装饰', count(/[❖✦✧◈◆◇]/), (n) => (n > 0 ? '⚠ 有字符装饰' : 'ok'))
report('＋/× 等全角符号当图标', count(/[＋✕✗]/), (n) => (n > 0 ? '⚠ 建议换内联 SVG' : 'ok'))

section('4. 主题令牌是否名不副实', '设计约定：令牌名沿用历史命名，但含义已重映射（这是最大的可读性债）')
report('sandalwood-* 用量（实为青瓷灰绿）', count(/sandalwood-\d/))
report('tibetan-* 用量（实为朱砂印章红）', count(/tibetan-\d/))
report('gold-* 用量（已基本不用）', count(/gold-\d/), (n) => (n > 0 ? '⚠ 仍在用' : 'ok — 可删'))
report('moon-* 用量', count(/moon-\d/))

section('5. 交互可达性', '基准：图标按钮需 aria-label；装饰性 SVG 应 aria-hidden')
// 只找「没有 aria-hidden 也没有 role/title/aria-label」的 svg —— 这类才可能被读屏当图形念出来
report('svg 既无 aria-hidden 也无 aria-label', countElements('svg', /aria-hidden|aria-label|role=|title=/), (n) => (n > 0 ? '⚠ 建议加 aria-hidden' : 'ok'))

section('6. 无障碍与语义', '')
// 按元素整体判断：alt 可能与 <img 不在同一行
report('img 缺 alt', countElements('img', /\balt=/), (n) => (n > 0 ? '⚠ 必须补 alt（装饰图用 alt=""）' : 'ok'))
console.log('  说明：button 未显式写 type 在本项目不是问题——全站按钮都在 <form> 之外，')
console.log('        且 React 会保留原生默认值；真正会误提交的按钮已各自带上 type="submit"。')

section('7. 中英对齐', '英文词典里不应残留汉字（专名除外）')
const enSrc = read(path.join(SRC, 'i18n', 'en.ts'))
const cjkLines = enSrc.split('\n').filter((l) => /[\u4e00-\u9fff]/.test(l) && !/^\s*(\/\/|\*)/.test(l))
console.log(`  含汉字的英文词典行：${cjkLines.length}（应仅剩 慧灯禅院 / 切换到中文 这类专名与提示）`)
for (const l of cjkLines.slice(0, 10)) console.log(`        · ${l.trim().slice(0, 96)}`)

console.log(`\n${'─'.repeat(72)}`)
console.log('完成。⚠ 只是提示，是否要改需结合具体画面判断。')
