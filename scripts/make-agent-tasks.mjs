/**
 * 生成子代理翻译任务清单 scripts/agent-tasks.json：
 * - 整文件任务（≤200KB 且不在分片计划中）；
 * - 分片任务（>200KB，依 scripts/slice-plan.json 的块边界行区间）。
 * 每批（batch）累计源文 ≤ ~110KB，供一个子代理一次完成。
 * 用法：node scripts/make-agent-tasks.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const zhDir = join(root, 'src', 'content', 'articles')
const enDir = join(root, 'src', 'content', 'en')
const planPath = join(root, 'scripts', 'slice-plan.json')
const outFile = join(root, 'scripts', 'agent-tasks.json')

const SLICE_PLAN = JSON.parse(readFileSync(planPath, 'utf8'))
const planByFile = new Map(SLICE_PLAN.map((p) => [p.file, p]))

/** 本轮（优先后续）只做 ≤300KB 的文章；更大经典延后 */
const DEFER_BYTES = 30 * 1024 * 1024

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

/** 是否已有（无中文残留的）整篇英文覆盖 */
function alreadyDone(file) {
  const slug = file.replace(/\.json$/, '')
  const p = join(enDir, `${slug}.json`)
  if (!existsSync(p)) return false
  try {
    return !CJK.test(readFileSync(p, 'utf8'))
  } catch {
    return false
  }
}

const BATCH_TARGET = 110 * 1024

/** 估算任务源文字节数：整文件=文件大小；分片=(endLine-startLine) 按行估 */
function estSize(file, slice) {
  const p = join(zhDir, file)
  const lines = readFileSync(p, 'utf8').split('\n')
  if (!slice) return Buffer.byteLength(readFileSync(p, 'utf8'))
  let bytes = 0
  for (let i = slice.lineStart - 1; i < Math.min(slice.lineEnd, lines.length); i++) {
    bytes += Buffer.byteLength(lines[i], 'utf8') + 1
  }
  return bytes
}

const tasks = []
for (const f of readdirSync(zhDir).filter((x) => x.endsWith('.json'))) {
  // 跳过乱码文件名（GBK 残留）——已重命名，现无对象，保留以防万一
  if (/[\u2500-\u257f]/.test(f)) continue
  // 111mituoyuanzhongchao 已于本周从 CBETA 重建并经 C 项翻译完成；无需再排除
  // 跳过已有（无中文残留）英文覆盖的文章，避免重复翻译
  if (alreadyDone(f)) continue
  // A 阶段：只翻译 ≤300KB 的文章；超大经典（>300KB）留给 B 阶段
  const fileSize = statSync(join(zhDir, f)).size
  if (fileSize > DEFER_BYTES) continue
  const plan = planByFile.get(f)
  if (!plan) {
    tasks.push({ file: f, whole: true, est: estSize(f, null) })
  } else {
    plan.slices.forEach((s, i) => {
      const partName = `${f.replace(/\.json$/, '')}.p${i + 1}.json`
      // 分片文件已存在则跳过（避免重复翻译）
      if (existsSync(join(enDir, partName))) return
      tasks.push({
        file: f,
        slice: { lineStart: s.lineStart, lineEnd: s.lineEnd, firstBlock: s.firstBlock, lastBlock: s.lastBlock },
        partName,
        includeMeta: i === 0,
        est: estSize(f, s),
      })
    })
  }
}

// 小文件优先（让短文章先出英文版）
tasks.sort((a, b) => a.est - b.est)

const batches = []
let cur = []
let curSize = 0
let id = 0
for (const t of tasks) {
  if (cur.length && curSize + t.est > BATCH_TARGET) {
    batches.push({ id: `B${String(++id).padStart(3, '0')}`, size: curSize, tasks: cur })
    cur = []
    curSize = 0
  }
  cur.push(t)
  curSize += t.est
}
if (cur.length) batches.push({ id: `B${String(++id).padStart(3, '0')}`, size: curSize, tasks: cur })

writeFileSync(outFile, JSON.stringify(batches, null, 1) + '\n', 'utf8')
console.log(`agent-tasks.json: ${batches.length} batches, ${tasks.length} tasks`)
for (const b of batches) {
  console.log(`${b.id}: ${(b.size / 1024).toFixed(0)}KB, ${b.tasks.length} tasks`)
}
