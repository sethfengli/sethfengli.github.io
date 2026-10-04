/**
 * 「标题楷 / 正文宋」迁移：把**非标题**的 font-serif 改成 font-song。
 * ---------------------------------------------------------------
 * 背景：body 的默认字体已改为宋体（--font-song），所以
 *   · 不加字体类的正文 → 自动宋体（不用改）
 *   · 加了 font-serif 的元素 → 仍是楷体（= 标题/点睛，保留）
 * 但有些元素虽然带着 font-serif，语义上其实是正文或界面文字
 * （摘要、释义、说明、碑铭式短句、加载态、计数），它们会被"误判"成标题而留楷体。
 * 本脚本按行精确替换这些点。
 *
 * 判断口径：
 *   保留 font-serif（楷体）= h1/h2/h3、文章标题、偈颂/诗句、刊头、书名字号
 *   改为 font-song（宋体）= 摘要、释义、说明、标签、加载态、计数、碑铭短句
 *
 * 用法：node scripts/migrate-to-song.mjs [--dry]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dry = process.argv.includes('--dry')

/** 逐文件逐行：file → 需要改的行号集合 */
const TARGETS = {
  'src/components/zen/IncenseBurner.tsx': [61],
  'src/components/zen/TempleBell.tsx': [150, 217],
  'src/components/zen3d/Bell3D.tsx': [451, 468],
  'src/pages/ArticleReader.tsx': [170, 180, 277, 325],
  'src/pages/Articles.tsx': [99, 130],
  'src/pages/Dharma.tsx': [45],
  'src/pages/Home.tsx': [133, 182, 228, 271],
  'src/pages/Lots.tsx': [178, 198, 225, 241, 245, 261, 293, 313, 419],
  'src/pages/NotFound.tsx': [15],
  'src/pages/PrayerWall.tsx': [175, 284, 296, 309, 311, 339, 340, 360],
  'src/pages/About.tsx': [117, 136, 167, 173, 213, 225, 234, 255, 265, 279, 283, 287, 304, 314],
}

let changedFiles = 0
let changedLines = 0
const problems = []

for (const [file, linesToFix] of Object.entries(TARGETS)) {
  const abs = path.join(ROOT, file)
  const lines = fs.readFileSync(abs, 'utf8').split('\n')
  let touched = 0

  for (const ln of linesToFix) {
    const idx = ln - 1
    const line = lines[idx]
    if (line === undefined) {
      problems.push(`${file}:${ln} 行不存在`)
      continue
    }
    if (!line.includes('font-serif')) {
      problems.push(`${file}:${ln} 该行没有 font-serif：${line.trim().slice(0, 80)}`)
      continue
    }
    // 只替换独立的 font-serif，不影响 font-serif 之外的词
    lines[idx] = line.replace(/\bfont-serif\b/g, 'font-song')
    touched++
  }

  if (touched) {
    changedFiles++
    changedLines += touched
    console.log(`  ${dry ? '(dry) ' : ''}${file}  ${touched} 行`)
    if (!dry) fs.writeFileSync(abs, lines.join('\n'), 'utf8')
  }
}

console.log(`\n${dry ? '将修改' : '已修改'} ${changedFiles} 个文件 / ${changedLines} 行`)
if (problems.length) {
  console.log(`\n⚠ ${problems.length} 处未按预期：`)
  for (const p of problems) console.log(`  ${p}`)
}
if (dry) console.log('（--dry：未写入）')
