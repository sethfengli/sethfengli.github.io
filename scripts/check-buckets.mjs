/**
 * Canonical completeness check for the photo buckets.
 *
 * Why this exists (RESUME 9.2 item 19): `node scripts/photos-status.mjs` exits 0
 * even when a bucket has holes -- it only reports empty buckets and broken named
 * photos. The real criterion is
 *
 *     manifest entries == files on disk == PICKS entries
 *
 * plus continuous numbering, where `<bucket>-NN` must sit at index NN-1.
 *
 * Output is ASCII only on purpose: the Windows PowerShell console re-encodes
 * non-ASCII child output and makes it look like mojibake.
 *
 * NOTE ON REGEX STYLE: do NOT use the `{n}` quantifier anywhere in this repo's
 * scripts -- it is silently rewritten at parse time in this toolchain (see
 * RESUME 10.1). Write `[0-9][0-9]` / `[0-9][0-9][0-9]` instead.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DIR = path.join(ROOT, 'public', 'photos', 'cn')
const MANIFEST = path.join(ROOT, 'src', 'data', 'photos-cn.json')
const CURATE = path.join(ROOT, 'scripts', 'curate-cn.mjs')

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))

const IMAGE_RE = /\.(webp|jpg|jpeg|png)$/i
// Two- or three-digit slot numbers (grottoes-01 / paintings-001).
const NAME_RE = /^([a-z]+)-([0-9][0-9][0-9]?|[0-9][0-9])\./
const PICK_LINE_RE = /^'([a-z]+-[0-9][0-9][0-9]?)',?$/

/** Parse the PICKS object out of curate-cn.mjs without executing it. */
function readPicks() {
  const src = fs.readFileSync(CURATE, 'utf8')
  const start = src.indexOf('const PICKS = {')
  if (start < 0) throw new Error('PICKS not found in curate-cn.mjs')
  const body = src.slice(src.indexOf('{', start))
  const end = body.search(/\r?\n\}\r?\n/)
  if (end < 0) throw new Error('PICKS closing brace not found')
  const text = body.slice(0, end)
  const picks = {}
  let bucket = null
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\/\/.*$/, '').trim()
    const open = line.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:\s*\[$/)
    if (open) {
      bucket = open[1]
      picks[bucket] = []
      continue
    }
    if (line === '],') {
      bucket = null
      continue
    }
    const id = line.match(PICK_LINE_RE)
    if (id && bucket) picks[bucket].push(id[1])
  }
  return picks
}

const picks = readPicks()

const disk = fs.readdirSync(DIR).filter((f) => IMAGE_RE.test(f))
const diskByBucket = new Map()
for (const f of disk) {
  const m = f.match(NAME_RE)
  if (!m) continue
  if (!diskByBucket.has(m[1])) diskByBucket.set(m[1], [])
  diskByBucket.get(m[1]).push(f)
}

// `named` in the manifest is an object (named photo map), not a bucket array.
const manifestBuckets = Object.keys(manifest).filter((k) => Array.isArray(manifest[k]))
const buckets = [...new Set([...manifestBuckets, ...Object.keys(picks), ...diskByBucket.keys()])].sort()

let bad = 0
const sum = { manifest: 0, picks: 0, disk: 0 }
console.log('bucket      picks manifest disk  continuous  notes')
for (const b of buckets) {
  const mList = Array.isArray(manifest[b]) ? manifest[b] : []
  const pList = picks[b] ?? []
  const dList = diskByBucket.get(b) ?? []
  sum.manifest += mList.length
  sum.picks += pList.length
  sum.disk += dList.length

  const notes = []
  if (!manifestBuckets.includes(b)) notes.push('MISSING-IN-MANIFEST')
  if (!(b in picks)) notes.push('MISSING-IN-PICKS')
  if (mList.length !== dList.length) notes.push('manifest!=disk')
  if (pList.length !== dList.length) notes.push('picks!=disk')

  // Continuous numbering: <bucket>-NN must sit at index NN-1 (NN == index + 1).
  // Report the slot number first, then the exact string, so the note stays short.
  let continuous = true
  mList.forEach((f, i) => {
    const m = f.match(NAME_RE)
    const slot = m ? Number(m[2]) : NaN
    if (slot !== i + 1) {
      continuous = false
      notes.push(`idx${i + 1}=${f} slot=${m ? slot : '?'}`)
    }
  })

  const missing = mList.filter((f) => !disk.includes(f))
  const listed = new Set(mList)
  const orphans = dList.filter((f) => !listed.has(f))
  if (missing.length) notes.push(`missing-on-disk=${missing.length}`)
  if (orphans.length) notes.push(`orphans=${orphans.length}`)

  const ok = notes.length === 0
  if (!ok) bad++
  console.log(
    `${b.padEnd(11)} ${String(pList.length).padStart(3)}  ${String(mList.length).padStart(6)}  ${String(dList.length).padStart(4)}  ${(continuous ? 'yes' : 'NO ').padEnd(10)}  ${ok ? 'ok' : notes.join(' ')}`,
  )
}

console.log(
  `\nTOTAL picks=${sum.picks} manifest=${sum.manifest} disk=${sum.disk} | bad buckets=${bad}`,
)
console.log(
  sum.picks === sum.manifest && sum.manifest === sum.disk && bad === 0
    ? 'RESULT: consistent (manifest == disk == PICKS, numbering continuous)'
    : 'RESULT: INCONSISTENT',
)
process.exit(bad === 0 && sum.picks === sum.disk ? 0 : 1)
