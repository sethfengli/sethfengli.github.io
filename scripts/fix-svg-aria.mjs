/**
 * 一次性修补：给「纯装饰性」的内联 SVG 补上 aria-hidden="true"。
 * ---------------------------------------------------------------
 * 为什么要修：这些 SVG 没有任何文本替代，读屏器会把它们当作
 * 「未标注的图形」念出来（实测 11 处）。它们的功能语义都由外层承担——
 * 要么是 <button aria-label>，要么是纯装饰。
 *
 * 只改 `<svg ...>` 开标签，且只在该标签既无 aria-hidden 也无 aria-label/role 时插入；
 * 插入位置紧跟 `<svg`，不重排其余属性，因此 diff 最小。
 *
 * 用法：node scripts/fix-svg-aria.mjs [--dry]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const dry = process.argv.includes('--dry')

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (p.endsWith('.tsx')) out.push(p)
  }
  return out
}

let touched = 0
let inserted = 0

for (const file of walk(SRC)) {
  const src = fs.readFileSync(file, 'utf8')
  let changed = false

  const out = src.replace(/<svg\b[^>]*>/g, (tag) => {
    if (/aria-hidden|aria-label|role=/.test(tag)) return tag
    changed = true
    inserted++
    // 插在 <svg 之后，保持其余属性原样
    return tag.replace(/^<svg\b/, '<svg aria-hidden="true"')
  })

  if (changed) {
    touched++
    const rel = path.relative(ROOT, file).replace(/\\/g, '/')
    console.log(`  ${dry ? '(dry) ' : ''}${rel}`)
    if (!dry) fs.writeFileSync(file, out, 'utf8')
  }
}

console.log(`\n${dry ? '将修改' : '已修改'} ${touched} 个文件，补 ${inserted} 处 aria-hidden`)
if (dry) console.log('（--dry：未写入）')
