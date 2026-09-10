/**
 * 分片规划器（替代 audit-slices.mjs 的进阶版）
 * 1) 校验 scripts/slice-plan.json 与中文源块数一致（totalBlocks / 末片边界）；
 * 2) 汇总 src/content/en 现有块覆盖；
 * 3) `--next [N]` 输出下一批“可安全派发”的切片：计划内、磁盘无同名产出、
 *    且（是首片 或 直接前一片已完整覆盖）；
 * 4) `--files` 输出各文章缺口统计（缺几片、其中多少可用）。
 * 用法：
 *   node scripts/plan-slices.mjs             # 体检 + 缺口概览
 *   node scripts/plan-slices.mjs --next 15   # 列出下一批 15 个可派切片（含任务 JSON）
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const zhDir = join(root, 'src', 'content', 'articles')
const enDir = join(root, 'src', 'content', 'en')
const planPath = join(root, 'scripts', 'slice-plan.json')

/** 修复 slice-plan 中 slices 为空的条目（按 ~28KB 块边界重切），--fix 时写回并退出 */
function fixEmptySlices() {
  const raw = JSON.parse(readFileSync(planPath, 'utf8'))
  const SLICE_BYTES = 28 * 1024
  let fixed = 0
  for (const p of raw) {
    if (p.slices && p.slices.length) continue
    if (!existsSync(join(zhDir, p.file))) continue
    const txt = readFileSync(join(zhDir, p.file), 'utf8')
    const zh = JSON.parse(txt)
    if (!Array.isArray(zh.blocks) || !zh.blocks.length) continue
    const sizes = zh.blocks.map((b) => Buffer.byteLength(JSON.stringify(b, null, 1)) + 1)
    const slices = []
    let i = 0
    while (i < zh.blocks.length) {
      let bytes = 0
      let j = i
      while (j < zh.blocks.length && (j === i || bytes + sizes[j] <= SLICE_BYTES)) {
        bytes += sizes[j]
        j++
      }
      slices.push({ file: p.file, firstBlock: i, lastBlock: j - 1, blockCount: j - i, lineStart: 0, lineEnd: 0 })
      i = j
    }
    p.size = Buffer.byteLength(txt)
    p.totalBlocks = zh.blocks.length
    p.lines = txt.split('\n').length
    p.slices = slices
    fixed++
    console.log(`[fix] ${p.file}: ${zh.blocks.length} blocks → ${slices.length} slices`)
  }
  writeFileSync(planPath, JSON.stringify(raw, null, 1) + '\n', 'utf8')
  console.log(`plan-slices --fix: 修复 ${fixed} 条`)
}

if (process.argv.includes('--fix')) {
  fixEmptySlices()
  process.exit(0)
}

const plan = JSON.parse(readFileSync(planPath, 'utf8'))
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
const DEFER_BYTES = 300 * 1024

const enFiles = new Set(readdirSync(enDir))

function zhBlocks(file) {
  try {
    return JSON.parse(readFileSync(join(zhDir, file), 'utf8')).blocks.length
  } catch {
    return -1
  }
}

function done(file) {
  const p = join(enDir, file)
  if (!existsSync(p)) return false
  try {
    return !CJK.test(readFileSync(p, 'utf8'))
  } catch {
    return false
  }
}

/** 读取某 slug 的所有分片，按 firstBlock 排序 */
function partsOf(slug) {
  const out = []
  for (const f of enFiles) {
    if (!f.startsWith(`${slug}.p`) || !/\.p\d+\.json$/.test(f)) continue
    try {
      const d = JSON.parse(readFileSync(join(enDir, f), 'utf8'))
      out.push({ f, fb: d.firstBlock ?? -1, n: (d.blocks || []).length, bad: false })
    } catch {
      out.push({ f, fb: -1, n: 0, bad: true })
    }
  }
  return out.sort((a, b) => a.fb - b.fb)
}

const planIssues = []
const rows = []
for (const p of plan) {
  const slug = p.file.replace(/\.json$/, '')
  const size = existsSync(join(zhDir, p.file)) ? readFileSync(join(zhDir, p.file)).length : -1
  const nBlocks = zhBlocks(p.file)
  if (nBlocks < 0) {
    planIssues.push(`${slug}: 中文源缺失`)
    continue
  }
  if (p.totalBlocks !== nBlocks) planIssues.push(`${slug}: plan.totalBlocks=${p.totalBlocks} != zh=${nBlocks}`)
  if (!p.slices.length) {
    planIssues.push(`${slug}: slices 为空`)
    continue
  }
  const last = p.slices[p.slices.length - 1]
  if (last.lastBlock !== nBlocks - 1) planIssues.push(`${slug}: 末片 lastBlock=${last.lastBlock} != ${nBlocks - 1}`)
  for (const s of p.slices) {
    if (s.firstBlock < 0 || s.lastBlock >= nBlocks || s.firstBlock > s.lastBlock) {
      planIssues.push(`${slug}: 越界分片 ${s.firstBlock}-${s.lastBlock}`)
    }
  }
  if (done(p.file)) continue
  if (size > DEFER_BYTES) continue // B 期
  const parts = partsOf(slug)
  const missing = []
  let usable = 0
  for (let i = 0; i < p.slices.length; i++) {
    const s = p.slices[i]
    const partName = `${slug}.p${i + 1}.json`
    const span = s.lastBlock - s.firstBlock + 1
    const exact = parts.find((c) => c.fb === s.firstBlock && c.n >= span)
    if (exact) continue
    const partial = parts.find((c) => c.fb === s.firstBlock && c.n > 0)
    const prev = i === 0 ? { ok: true } : (() => {
      const ps = p.slices[i - 1]
      const e = parts.find((c) => c.fb === ps.firstBlock && c.n >= ps.lastBlock - ps.firstBlock + 1)
      return { ok: !!e }
    })()
    const noFile = !existsSync(join(enDir, partName)) && !partial
    const ok = noFile && prev.ok
    if (ok) usable++
    missing.push({
      partName,
      firstBlock: s.firstBlock,
      lastBlock: s.lastBlock,
      lineStart: s.lineStart,
      lineEnd: s.lineEnd,
      includeMeta: i === 0,
      ready: ok,
      blockedByPrev: !prev.ok,
      stalePartial: partial ? `${partial.f}=${partial.n}/${span}` : null,
    })
  }
  if (missing.length) rows.push({ slug, file: p.file, slices: p.slices.length, missing: missing.length, usable, missingList: missing })
}

if (process.argv.includes('--next')) {
  const idx = process.argv.indexOf('--next')
  const want = Number(process.argv[idx + 1]) || 15
  const flat = []
  // 优先：同一文章剩余片数少（更易整篇完成），其次块序号靠前
  rows.sort((a, b) => a.missing - b.missing || a.slug.localeCompare(b.slug))
  for (const r of rows) {
    for (const m of r.missingList) if (m.ready) flat.push({ slug: r.slug, file: r.file, ...m })
  }
  const pick = flat.slice(0, want)
  console.log(JSON.stringify(pick, null, 1))
  console.error(`plan-slices: 可派 ${flat.length} 片，选中 ${pick.length} 片`)
} else if (process.argv.includes('--files')) {
  for (const r of rows) console.log(`${r.slug}: plan=${r.slices} missing=${r.missing} usable=${r.usable}`)
  console.log(`plan-slices: ${rows.length} 篇有缺口`)
} else {
  for (const r of rows.slice(0, 25)) {
    const un = r.missingList.filter((m) => !m.ready && m.stalePartial)
    console.log(
      `${r.slug}: plan=${r.slices} missing=${r.missing} usable=${r.usable}` +
        (un.length ? `\n    STALE_PARTIAL ${un.map((m) => `${m.partName}[${m.firstBlock}-${m.lastBlock}] ${m.stalePartial}`).join(' ')}` : ''),
    )
  }
  const totalMissing = rows.reduce((a, b) => a + b.missing, 0)
  const totalUsable = rows.reduce((a, b) => a + b.usable, 0)
  console.log(`plan-slices: ${rows.length} 篇有缺口 / 缺 ${totalMissing} 片 / 可立即派发 ${totalUsable} 片`)
  console.log(`plan-slices: plan 一致性问题 ${planIssues.length} 条${planIssues.length ? ':\n  ' + planIssues.slice(0, 10).join('\n  ') : ''}`)
}
