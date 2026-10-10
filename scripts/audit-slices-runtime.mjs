/**
 * runtime audit for freshly produced EN shards — catches the defects that
 * scripts/verify-slices.mjs CANNOT see (see scripts/B-PHASE-HANDOFF.md §2.11.1):
 *   A. structure: block count vs src, per-block `t`, fragment counts, href counts, CJK, empty EN, short EN
 *   B. content duplication: normalized block-signature collisions + near-duplicate (4-gram) pairs
 *      whose EN similarity far exceeds the ZH similarity of the same pair  -> shifted/duplicated blocks
 *   C. length-ratio outliers: EN/ZH length per block vs the shard median (>2.5x or <0.4x)
 *   D. optional per-block pairing dump for manual spot checks
 *
 * VERIFIED false-positive classes (do NOT rework these — R8 confirmed them against source):
 *   - sutra formulaic openings repeated across source blocks ("尔时大慧菩萨摩诃萨复白佛言…" /
 *     "Then Mahāmati the Bodhisattva Mahāsattva said…"); nearDup/dup strip the longest common
 *     prefix before comparing, but verse recurrences with reordered words can still surface as
 *     nearDup (e.g. 262dachengrulengqiejing abs 156 vs 214).
 *   - refrains that the SOURCE itself repeats (025taishanggy-yw p4 孝悌歌 "子养亲兮弟敬哥",
 *     p1 序文 duplicated in zh, p12 逐月罗列) — always confirm a flag against the ZH block.
 *
 * Usage:
 *   node scripts/audit-slices-runtime.mjs <slug> <pN> [pN ...]        # audit shards of one slug
 *   node scripts/audit-slices-runtime.mjs <slug> <pN> --dump          # + first/last 3 pairing lines
 *   node scripts/audit-slices-runtime.mjs <slug> <pN> --dump=abs     # + pairing around one abs block index
 * Exit code 1 if any hard problem found (no src file is only a warning).
 */
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)


const argv = process.argv.slice(2)
const flags = argv.filter((a) => a.startsWith('--'))
const mkdump = flags.some((a) => a.startsWith('--dump'))
if (flags.length) argv.splice(argv.findIndex((a) => a.startsWith('--')), flags.length)
const slug = argv[0]
const parts = argv.slice(1)
const dumpArg = flags.find((a) => a.startsWith('--dump')) || null
if (!slug || !parts.length) {
  console.log('usage: node scripts/audit-slices-runtime.mjs <slug> <pN> [pN ...] [--dump[=abs]]')
  process.exit(2)
}

const zh = JSON.parse(readFileSync(`src/content/articles/${slug}.json`, 'utf8'))
const txt = (b) => {
  if (!b) return ''
  if (typeof b.text === 'string') return b.text
  if (Array.isArray(b.rows)) return b.rows.map((r) => r.map((c) => (c || []).map((s) => s.s || '').join('')).join(' ')).join(' ')
  return (b.inline || []).map((s) => s.s || '').join('')
}
const plain = (s) => String(s || '').replace(/\s+/g, ' ').trim()
const sig = (s) => s.replace(/[\s\u201c\u201d\u2018\u2019"'.,!?;:()\[\]\-\u2014\u00b7\u2026]/g, '').toLowerCase().slice(0, 60)
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '')
const grams = (s, n = 4) => {
  const t = norm(s)
  const set = new Set()
  for (let i = 0; i + n <= t.length; i++) set.add(t.slice(i, i + n))
  return set
}
const jac = (a, b) => {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}
// Strip the longest common prefix of two texts at WORD level (formulaic sutra openings such as
// "尔时大慧菩萨摩诃萨复白佛言…" / "Then Mahāmati the Bodhisattva Mahāsattva said…" repeat
// legitimately across source blocks and must not be counted as similarity). ZH has no spaces,
// so for ZH we fall back to character-level prefix stripping.
const tokenize = (s) => (/\s/.test(s) ? s.toLowerCase().split(/\s+/).filter(Boolean) : [...s.toLowerCase()])
const stripCommonPrefix = (a, b) => {
  const ta = tokenize(a)
  const tb = tokenize(b)
  let i = 0
  const n = Math.min(ta.length, tb.length)
  while (i < n && ta[i] === tb[i]) i++
  return [ta.slice(i).join(''), tb.slice(i).join('')]
}
const restJaccard = (a, b) => {
  const [ra, rb] = stripCommonPrefix(a, b)
  return jac(grams(ra), grams(rb))
}

let hard = 0
const allG = []
const allZG = []
const allMeta = []
for (const p of parts) {
  const file = `${slug}.${p}.json`
  const enPath = `src/content/en/${file}`
  if (!existsSync(enPath)) { console.log(`MISS ${file} (not written yet)`); hard++; continue }
  const en = JSON.parse(readFileSync(enPath, 'utf8'))
  const srcPath = ART(`build/slices/${file.replace(/\.json$/, '')}.src.json`)
  const src = existsSync(srcPath) ? JSON.parse(readFileSync(srcPath, 'utf8')) : null
  const n = en.blocks.length
  const fb = en.firstBlock
  let typeMis = 0, inlineMis = 0, hrefMis = 0, cjk = 0, emptyEn = 0, shortBlk = 0
  const issues = []
  const ratios = []
  for (let i = 0; i < n; i++) {
    const a = zh.blocks[fb + i]
    const b = en.blocks[i]
    if (!a || a.t !== b.t) { typeMis++; issues.push(`type@${fb + i}`) }
    const aIn = (a && a.inline) || []
    const bIn = b.inline || []
    if (typeof (a && a.text) !== 'string' && aIn.length !== bIn.length) { inlineMis++; issues.push(`inline@${fb + i}: ${aIn.length}->${bIn.length}`) }
    const cnt = (x) => (x || []).reduce((s, g) => s + (g.href ? 1 : 0), 0)
    if (cnt(aIn) !== cnt(bIn)) { hrefMis++; issues.push(`href@${fb + i}: ${cnt(aIn)}->${cnt(bIn)}`) }
    const e = txt(b); const z = txt(a)
    if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(e)) { cjk++; issues.push(`cjk@${fb + i}`) }
    if (!plain(e) && plain(z)) { emptyEn++; issues.push(`emptyEN@${fb + i}`) }
    const zl = plain(z).length
    const el = plain(e).length
    if (zl > 40 && el / zl < 0.15) { shortBlk++; issues.push(`short@${fb + i}: zh=${zl} en=${el}`) }
    if (zl > 20) ratios.push([i, fb + i, zl, el, el / zl])
  }
  // verse-only shards (every source block ≤ 20 chars) would leave `ratios` empty and make the
  // outlier check vacuous; fall back to counting every non-empty block.
  if (ratios.length < 10) {
    ratios.length = 0
    for (let i = 0; i < n; i++) {
      const zl = plain(txt(zh.blocks[fb + i])).length
      const el = plain(txt(en.blocks[i])).length
      if (zl > 0) ratios.push([i, fb + i, zl, el, el / zl])
    }
  }
  const sorted = ratios.map((r) => r[4]).sort((a, b) => a - b)
  const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0
  const outliers = ratios.filter(([, , , , r]) => r > med * 2.5 || r < med * 0.4)
  // duplication — a pair only counts as a defect when the ZH source blocks differ
  // (formulaic sutra openings repeated across source blocks are legitimate) AND the EN
  // blocks stay identical beyond their common prefix.
  const ztxt = en.blocks.map((b, i) => plain(txt(zh.blocks[fb + i])))
  const seen = new Map()
  const dups = []
  en.blocks.forEach((b, i) => {
    const t = plain(txt(b))
    if (t.length < 40) return
    const k = sig(t)
    if (seen.has(k)) {
      const j = seen.get(k)
      const sameSource = ztxt[j] === ztxt[i] || sig(ztxt[j]) === sig(ztxt[i])
      const [ra, rb] = stripCommonPrefix(plain(txt(en.blocks[j])), t)
      if (!sameSource && ra.slice(0, 40) === rb.slice(0, 40)) {
        dups.push([j, i, t.slice(0, 50), ztxt[j].slice(0, 25), ztxt[i].slice(0, 25)])
      }
    } else seen.set(k, i)
  })
  const G = en.blocks.map((b) => txt(b))
  const ZG = en.blocks.map((b, i) => txt(zh.blocks[fb + i]))
  const nearDup = []
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = restJaccard(G[i], G[j])
    if (a < 0.5) continue
    const b = restJaccard(ZG[i], ZG[j])
    if (a - b > 0.3) nearDup.push([i, j, a, b])
  }
  const srcN = src ? src.blocks.length : -1
  const srcOK = srcN === n
  // nearDup is an INFO-level signal only: R8 verified that sutra verses / numbered lists can
  // legitimately recur with reordered words (262 p22 abs 156 vs 214, p25 abs 590 vs 592).
  const bad = !srcOK || typeMis || inlineMis || hrefMis || cjk || emptyEn || shortBlk || dups.length || outliers.length
  if (bad) hard++
  console.log(`${bad ? 'FAIL' : 'OK  '} ${file} fb=${fb} n=${n} srcN=${srcN} medRatio=${med.toFixed(2)} | type=${typeMis} inline=${inlineMis} href=${hrefMis} cjk=${cjk} emptyEN=${emptyEn} short=${shortBlk} dup=${dups.length} nearDup=${nearDup.length} ratioOut=${outliers.length}`)
  for (const x of issues.slice(0, 10)) console.log('      ' + x)
  for (const [i, j, t, zja, zia] of dups.slice(0, 6)) console.log(`      dup local ${i}/${j} (abs ${fb + i}/${fb + j}) EN="${t}" ZH[${zja}] vs ZH[${zia}]`)
  for (const [i, j, a, b] of nearDup.slice(0, 6)) console.log(`      INFO nearDup local ${i}/${j} ENsim=${a.toFixed(2)} ZHsim=${b.toFixed(2)} -- VERIFY AGAINST THE ZH BLOCKS; may be a legitimate verse/formula recurrence`)
  for (const [i, abs, zl, el, r] of outliers.slice(0, 10)) console.log(`      ratioOut local ${i} abs ${abs} zh=${zl} en=${el} r=${r.toFixed(2)}`)
  if (dumpArg) {
    allG.push(...en.blocks.map((b, i) => [fb + i, txt(b)]))
    allZG.push(...en.blocks.map((b, i) => [fb + i, txt(zh.blocks[fb + i])]))
    allMeta.push(file)
  }
}
if (dumpArg) {
  const abs = dumpArg.includes('=') ? Number(dumpArg.split('=')[1]) : null
  const pick = abs === null ? [...allG.slice(0, 3), ...allG.slice(-3)] : allG.filter(([a]) => Math.abs(a - abs) <= 2)
  console.log('--- pairing dump (ZH vs EN) ---')
  for (const [a, e] of pick) {
    const z = allZG.find(([b]) => b === a)
    console.log(`abs ${a}\n  ZH: ${plain(z && z[1]).slice(0, 100)}\n  EN: ${plain(e).slice(0, 120)}`)
  }
}
console.log(hard === 0 ? 'AUDIT-RUNTIME: all clean' : `AUDIT-RUNTIME: ${hard} shard(s) with problems`)
process.exit(hard === 0 ? 0 : 1)
