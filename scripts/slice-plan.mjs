/**
 * 为超大文章生成分片翻译计划：
 * 对超过 SLICE_KB 的 zh 文章，按块（blocks）边界切成若干行区间，
 * 输出 scripts/slice-plan.json，供子代理按行区间只读对应块并翻译。
 * 用法：node scripts/slice-plan.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const zhDir = join(root, 'src', 'content', 'articles')
const outFile = join(root, 'scripts', 'slice-plan.json')

const SLICE_BYTES = 28 * 1024 // 每片约 28KB（分片以控制在写出的 JSON ≤ ~25KB）

const plan = []
for (const f of readdirSync(zhDir).filter((x) => x.endsWith('.json'))) {
  const p = join(zhDir, f)
  const size = Buffer.byteLength(readFileSync(p, 'utf8'))
  if (size <= SLICE_BYTES) continue
  const lines = readFileSync(p, 'utf8').split('\n')
  // 每行起始字节偏移（行文本 + 换行符）
  const lineOffset = [0]
  for (const ln of lines) lineOffset.push(lineOffset[lineOffset.length - 1] + Buffer.byteLength(ln, 'utf8') + 1)
  // 顶层块起始行（两个空格 + '{'）；块序号 = 该行之前出现的块数
  const blockStarts = []
  let count = 0
  lines.forEach((ln, i) => {
    if (/^  \{/.test(ln)) {
      blockStarts.push({ line: i + 1, index: count })
      count++
    }
  })
  const totalBlocks = count
  // 按 ~SLICE_BYTES 字节切片，并对齐到块边界
  const slices = []
  let startIdx = 0
  while (startIdx < totalBlocks) {
    const startLine = blockStarts[startIdx].line
    const startOff = lineOffset[startLine - 1]
    let endIdx = startIdx
    while (endIdx + 1 < totalBlocks && lineOffset[blockStarts[endIdx + 1].line - 1] - startOff < SLICE_BYTES) {
      endIdx++
    }
    const endLine = endIdx + 1 < totalBlocks ? blockStarts[endIdx + 1].line - 1 : lines.length
    slices.push({
      file: f,
      firstBlock: startIdx,
      lastBlock: endIdx,
      blockCount: endIdx - startIdx + 1,
      lineStart: startLine,
      lineEnd: endLine,
    })
    startIdx = endIdx + 1
  }
  plan.push({ file: f, size, totalBlocks, lines: lines.length, slices })
}

writeFileSync(outFile, JSON.stringify(plan, null, 1) + '\n', 'utf8')
for (const p of plan) {
  console.log(
    `${p.file}: ${(p.size / 1024).toFixed(0)}KB, ${p.totalBlocks} blocks → ${p.slices.length} slices`,
  )
  for (const s of p.slices)
    console.log(
      `    lines ${s.lineStart}-${s.lineEnd}  blocks [${s.firstBlock}..${s.lastBlock}] (${s.blockCount})`,
    )
}
