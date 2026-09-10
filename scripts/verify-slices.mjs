/**
 * 核验分片英文文件：JSON 合法 + 无 CJK/全角标点 + 块数/结构/href 与源切片一致。
 * 用法：node scripts/verify-slices.mjs <partName> [<partName> ...]
 *       node scripts/verify-slices.mjs --all   （核验 build/slices 下所有已有英文产出的切片）
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'build', 'slices')
const enDir = join(root, 'src', 'content', 'en')
const CJK = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/

function countHrefs(str) {
  return (str.match(/"href"\s*:/g) || []).length
}

function verify(partName) {
  const srcPath = join(srcDir, partName.replace(/\.json$/, '') + '.src.json')
  const enPath = join(enDir, partName)
  if (!existsSync(enPath)) return { partName, status: 'missing-en' }
  if (!existsSync(srcPath)) return { partName, status: 'missing-src' }
  const raw = readFileSync(enPath, 'utf8')
  let en
  let src
  try {
    en = JSON.parse(raw)
    src = JSON.parse(readFileSync(srcPath, 'utf8'))
  } catch (e) {
    return { partName, status: 'bad-json', err: e.message }
  }
  const problems = []
  if (en.firstBlock !== src.firstBlock) problems.push(`firstBlock ${en.firstBlock}!=${src.firstBlock}`)
  const eb = en.blocks || []
  const sb = src.blocks || []
  if (eb.length !== sb.length) problems.push(`blocks ${eb.length}!=${sb.length}`)
  const n = Math.min(eb.length, sb.length)
  for (let i = 0; i < n; i++) {
    if (sb[i].t !== eb[i].t) { problems.push(`#${i} t ${eb[i].t}!=${sb[i].t}`); continue }
    const si = sb[i].inline || []
    const ei = eb[i].inline || []
    if (si.length !== ei.length) problems.push(`#${i} inline ${ei.length}!=${si.length}`)
    if (sb[i].t === 'table') {
      const sr = sb[i].rows || []
      const er = eb[i].rows || []
      if (sr.length !== er.length) problems.push(`#${i} rows ${er.length}!=${sr.length}`)
      for (let r = 0; r < Math.min(sr.length, er.length); r++) {
        if ((sr[r] || []).length !== (er[r] || []).length) problems.push(`#${i} row${r} cells`)
      }
    }
  }
  if (src.includeMeta) for (const k of ['title', 'author', 'excerpt']) {
    if (typeof src['zh' + k[0].toUpperCase() + k.slice(1)] === 'string' && !en[k]) problems.push(`meta ${k} missing`)
  }
  const srcHref = countHrefs(JSON.stringify(src))
  const enHref = countHrefs(raw)
  if (enHref < srcHref) problems.push(`href ${enHref}<${srcHref}`)
  const cjk = CJK.test(raw)
  if (cjk) problems.push('CJK/fullwidth residue')
  const big = Buffer.byteLength(raw) > 60 * 1024 ? [`${Math.round(Buffer.byteLength(raw) / 1024)}KB`] : []
  return {
    partName,
    status: problems.length ? 'crit' : big.length ? 'ok(big)' : 'ok',
    blocks: eb.length,
    srcBlocks: sb.length,
    problems,
  }
}

let names = process.argv.slice(2)
if (!names.length || names[0] === '--all') {
  names = readdirSync(srcDir)
    .filter((x) => x.endsWith('.src.json'))
    .map((x) => x.replace(/\.src\.json$/, '.json'))
    .filter((x) => existsSync(join(enDir, x)))
}
let ok = 0
let crit = 0
for (const nm of names) {
  const r = verify(nm)
  if (r.status === 'ok' || r.status === 'ok(big)') ok++
  else crit++
  console.log(`${r.status.padEnd(10)} ${r.partName} blocks=${r.blocks ?? '-'}/${r.srcBlocks ?? '-'}${r.problems?.length ? ' :: ' + r.problems.join('; ') : ''}`)
}
console.log(`verify-slices: ${ok} ok, ${crit} crit (of ${names.length})`)
