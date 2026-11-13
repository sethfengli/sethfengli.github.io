/**
 * CSS 体检：把 `vite build` 里那两条 lightningcss 警告变成 0.2 s 内可判的判据。
 *
 * 为什么需要（第 15 轮的真因）：`src/index.css` 里一处区块注释的**开头被吃掉**（少了
 * 起始符与 `====` 横线），剩下三行裸文本 + 一个没有开头的注释收尾符。`tsc` 看不见，
 * `style-audit.mjs` 反而先 stripNoise 把注释整段剔掉，`npm run typecheck` 更不可能发现；
 * 只有 `vite build` 在 lightningcss 优化阶段报「Invalid dangling combinator in selector」，
 * 而 build 在受沙箱里跑不动（`optimizeSafeRealPathSync` 用 exec → spawn EPERM）。
 * 所以直接把 lightningcss 请出来当判据。
 *
 * 这里跑两条：
 *   1. 注释配平 —— 逐字符走一遍，报出「注释外出现的收尾符」在第几行（这条就够抓上面那种坑）；
 *   2. lightningcss 解析 —— 过滤掉 Tailwind 自己的 `@theme` / `@apply`（lightningcss 不认识，
 *      由 Tailwind 预处理先吃掉，属预期噪音），剩下的任何警告都算回退。
 *
 * 用法：node scripts/check-css.mjs   （npm run audit:css）
 * 退出码：0 = 干净；1 = 有裸收尾符或非预期警告
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { transform } = require('lightningcss')

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

/** 注释配平：返回「注释外收尾符」的行号，与「注释没闭合就 EOF」的起始行号 */
function scanComments(src) {
  const bare = []
  let inComment = false
  let line = 1
  let openedAt = 0
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '\n') {
      line++
      continue
    }
    if (!inComment && c === '/' && src[i + 1] === '*') {
      inComment = true
      openedAt = line
      i++
      continue
    }
    if (inComment && c === '*' && src[i + 1] === '/') {
      inComment = false
      i++
      continue
    }
    if (!inComment && c === '*' && src[i + 1] === '/') {
      bare.push(line)
      i++
    }
  }
  return { bare, unclosedAt: inComment ? openedAt : 0 }
}

const files = (() => {
  const explicit = process.argv.filter((a) => a.startsWith('--file=')).map((a) => a.slice('--file='.length))
  if (explicit.length) return explicit.map((p) => path.resolve(ROOT, p))
  return walk(SRC).filter((f) => f.endsWith('.css'))
})()
if (files.length === 0) {
  console.log('src 下没有 .css 文件，判据无从谈起')
  process.exit(1)
}

let problems = 0
for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/')
  const src = fs.readFileSync(f, 'utf8')

  const { bare, unclosedAt } = scanComments(src)
  for (const l of bare) {
    console.log(`ERROR ${rel}:${l}  注释之外出现了 */（缺开头的 /*）`)
    problems++
  }
  if (unclosedAt) {
    console.log(`ERROR ${rel}:${unclosedAt}  注释到文件末尾都没闭合`)
    problems++
  }

  let warnings = []
  try {
    const res = transform({
      filename: rel,
      code: Buffer.from(src),
      minify: true,
      errorRecovery: true,
      targets: { chrome: 120 << 16 },
    })
    warnings = (res.warnings ?? []).map((w) => String(w.message ?? w))
  } catch (e) {
    console.log(`ERROR ${rel}  lightningcss 解析抛错：${e.message}`)
    problems++
    continue
  }
  const unexpected = warnings.filter((m) => !/^Unknown at rule/.test(m))
  for (const m of unexpected) {
    console.log(`ERROR ${rel}  lightningcss：${m}`)
    problems++
  }
  const noise = warnings.length - unexpected.length
  console.log(
    `  ${rel}: 裸 */ ${bare.length} · 未闭合 ${unclosedAt ? 1 : 0} · ` +
      `警告 ${warnings.length}（Tailwind 预期噪音 ${noise}）`,
  )
}

console.log(problems ? `\n✗ ${problems} 个问题` : '\n✓ CSS 干净（注释配平、无非预期警告）')
process.exit(problems ? 1 : 0)
