/**
 * 用无头 Chrome 给 preview-dist/ 拍照，用于肉眼核对 SVG / 插画改动。
 *
 * 用法：node scripts/shoot-preview.mjs [--out=build/shots] [--w=1280] [--full]
 * 前置：npx vite build --config preview/vite.config.ts
 *
 * 说明：Chrome 的 --screenshot 只能整页截一张；需要分区域核对时用 --clip=y,h。
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(__dirname, '..')
const DIST = path.join(REPO, 'preview-dist')

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a)
    return m ? [m[1], m[2] ?? 'true'] : [a, 'true']
  }),
)

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]

const chrome = CHROME_CANDIDATES.find((p) => p && fs.existsSync(p))
if (!chrome) throw new Error('找不到 Chrome / Edge 可执行文件')

const indexPath = path.join(DIST, 'index.html')
if (!fs.existsSync(indexPath)) {
  throw new Error(`预览产物不存在：${indexPath}\n请先运行：npx vite build --config preview/vite.config.ts`)
}

const outDir = path.resolve(REPO, args.out ?? 'build/shots')
fs.mkdirSync(outDir, { recursive: true })

const width = Number(args.w ?? 1280)
const height = Number(args.h ?? 2400)
const outFile = path.join(outDir, `${args.name ?? 'preview'}-${width}.png`)

const cmd = [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--virtual-time-budget=6000',
  `--window-size=${width},${height}`,
  `--screenshot=${outFile}`,
  pathToFileURL(indexPath).href,
]

execFileSync(chrome, cmd, { stdio: 'inherit', timeout: 120000 })
console.log(`\n→ ${path.relative(REPO, outFile)}`)
