/**
 * 统计全站需要渲染的汉字集合，用于给 Noto Serif SC 做**项目子集**。
 * 范围：src/ 下所有 .ts/.tsx/.json/.css/.html（界面文案 + 内容数据）。
 *
 * 两种用法：
 *   node scripts/collect-cjk.mjs                     # 写出 build/cjk-chars.txt（子集化用）
 *   import { collectChars } from './collect-cjk.mjs' # 直接拿字符数组（判据脚本用）
 *
 * ⚠ 被 import 时不能执行 CLI 部分：这里用 `import.meta.url` 与 `process.argv[1]`
 * 对比判断，**不要**用 `import.meta.main`（Node 24.19 实测其为 undefined）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.cwd()

const roots = ['src']
const exts = new Set(['.ts', '.tsx', '.json', '.css', '.html'])

/** 是否属于「需要内置字体覆盖」的字符：汉字（含扩展 A / 兼容区）+ CJK 标点 + 全角符号 */
export function isSiteCjk(cp) {
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0x3000 && cp <= 0x303f) ||
    (cp >= 0xff00 && cp <= 0xffef)
  )
}

/** 全站用字，去重后按码点排序。 */
export function collectChars(scanRoots = roots) {
  const chars = new Set()

  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (exts.has(path.extname(e.name))) {
        const t = fs.readFileSync(p, 'utf8')
        for (const ch of t) if (isSiteCjk(ch.codePointAt(0))) chars.add(ch)
      }
    }
  }

  for (const r of scanRoots) if (fs.existsSync(r)) walk(r)
  return [...chars].sort((a, b) => a.codePointAt(0) - b.codePointAt(0))
}

/** 写出 pyftsubset --text-file 的输入文件。 */
export function writeCharsFile(outFile = path.join(ROOT, 'build', 'cjk-chars.txt'), scanRoots = roots) {
  const list = collectChars(scanRoots)
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, list.join(''), 'utf8')
  return { file: outFile, chars: list }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { file, chars } = writeCharsFile()
  const han = chars.filter((c) => {
    const cp = c.codePointAt(0)
    return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf) || (cp >= 0xf900 && cp <= 0xfaff)
  })
  console.log('总字符数（含标点/全角）:', chars.length)
  console.log('其中汉字:', han.length)
  console.log('→ ' + file)
}
