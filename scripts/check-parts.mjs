/**
 * 临时：核验「已存在的分片」是否与 slice-plan 区间结构一致（含 CJK/href 检查）。
 * 用法：node scripts/check-parts.mjs <slug> [<slug> ...]
 * 只读，只打印；不改任何文件。用于合并前预检，避免 merge-parts 失败。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const CJK = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/
const hrefs = (s) => (s.match(/"href"\s*:/g) || []).length
const plan = JSON.parse(readFileSync(join(root, 'scripts/slice-plan.json'), 'utf8'))
const slugs = process.argv.slice(2)

let total = 0
let crit = 0
for (const s of slugs) {
  const p = plan.find((x) => x.file === `${s}.json`)
  if (!p) {
    console.log(`NO-PLAN ${s}`)
    continue
  }
  if (!existsSync(join(root, 'src/content/articles', `${s}.json`))) {
    console.log(`NO-ZH   ${s}`)
    continue
  }
  const zh = JSON.parse(readFileSync(join(root, 'src/content/articles', `${s}.json`), 'utf8'))
  for (const f of readdirSync(join(root, 'src/content/en'))
    .filter((f) => f.startsWith(`${s}.`) && /\.p\d+\.json$/.test(f))
    .sort()) {
    const idx = Number(f.match(/\.p(\d+)\.json$/)[1]) - 1
    const sl = p.slices[idx]
    const raw = readFileSync(join(root, 'src/content/en', f), 'utf8')
    if (!sl) {
      console.log(`NO-SLICE ${f}`)
      crit++
      continue
    }
    let en
    try {
      en = JSON.parse(raw)
    } catch (e) {
      console.log(`crit     ${f} bad-json: ${e.message}`)
      crit++
      continue
    }
    const sb = zh.blocks.slice(sl.firstBlock, sl.lastBlock + 1)
    const eb = en.blocks || []
    const probs = []
    if (en.firstBlock !== sl.firstBlock) probs.push(`fb ${en.firstBlock}!=${sl.firstBlock}`)
    if (eb.length !== sb.length) probs.push(`blocks ${eb.length}!=${sb.length}`)
    for (let i = 0; i < Math.min(eb.length, sb.length); i++) {
      if (sb[i].t !== eb[i].t) {
        probs.push(`#${i} t ${eb[i].t}!=${sb[i].t}`)
        continue
      }
      if ((sb[i].inline || []).length !== (eb[i].inline || []).length)
        probs.push(`#${i} inline ${(eb[i].inline || []).length}!=${(sb[i].inline || []).length}`)
    }
    if (hrefs(raw) < hrefs(JSON.stringify(sb))) probs.push('href lost')
    if (CJK.test(raw)) probs.push('CJK residue')
    console.log(`${probs.length ? 'crit    ' : 'ok      '} ${f} blocks=${eb.length}/${sb.length}${probs.length ? ' :: ' + probs.join('; ') : ''}`)
    total++
    if (probs.length) crit++
  }
}
console.log(`check-parts: ${total - crit} ok, ${crit} crit (of ${total})`)
