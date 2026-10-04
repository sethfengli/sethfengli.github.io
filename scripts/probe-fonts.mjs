/**
 * 用无头 Chrome 的 --dump-dom 无法取计算样式，改用一个小页面 + CDP 太重；
 * 这里走最简可靠的路子：让页面把「关键元素的 computed font-family」写成纯文本，
 * 再用 --dump-dom 取回来。
 *
 * 用法：node scripts/probe-fonts.mjs <url>
 *   页面需在 window.__FONT_PROBE__ 上挂一个 () => Record<string,string>
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const url = process.argv[2] ?? 'http://127.0.0.1:5190/?mode=font'

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => fs.existsSync(p))
if (!CHROME) throw new Error('找不到 Chrome')

// 用 profile 目录避免复用已开着的 Chrome 实例
const profile = path.join(ROOT, 'build', 'chrome-profile')
fs.mkdirSync(profile, { recursive: true })

const dom = execFileSync(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profile}`,
    '--virtual-time-budget=12000',
    '--dump-dom',
    url,
  ],
  { encoding: 'utf8', timeout: 120000, maxBuffer: 32 << 20 },
)

// 页面把结果写在 <pre id="font-probe"> 里
const m = /<pre id="font-probe"[^>]*>([\s\S]*?)<\/pre>/.exec(dom)
if (!m) {
  console.error('页面上没找到 #font-probe。DOM 片段：')
  console.error(dom.slice(0, 1200))
  process.exit(1)
}
const text = m[1]
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
console.log(text)
