/**
 * Scan English output files for MOJIBAKE artifacts (UTF-8 text that was decoded as
 * Latin-1/CP1252 and re-encoded). These are NOT CJK, so validate-en.mjs does not
 * catch them, yet they render as garbage such as "a-euro-quote" instead of quotes.
 * Usage: node scripts/scan-mojibake.mjs
 * Read-only; prints only.
 * NOTE: keep this file pure ASCII (PowerShell rewrites can mangle UTF-8).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const enDir = join(root, 'src/content/en')

// Common mojibake fingerprints:
//  U+00E2 U+20AC (a-circumflex + euro)  <- UTF-8 lead bytes of curly quotes/em dash
//  U+00C3 / U+00C2 followed by a C1 control or latin-1 letter <- double-encoded UTF-8
//  U+00EF U+00BC, U+00E3 U+20AC <- fullwidth punctuation mojibake
const PATTERNS = [
  /\u00e2\u20ac/, // a-circumflex + euro
  /\u00c3[\u0080-\u00bf]/, // A-tilde + C1
  /\u00c2[\u00a0-\u00bf]/, // A-circumflex + C1
  /\u00ef\u00bc/, // i-diaeresis + one-quarter
  /\u00e3\u20ac/, // a-tilde + euro
  /\ufffd/, // replacement char
]

// 2026-09-12 (defect-round-2): the fingerprints above only cover the C2/C3/E2/E3/EF
// lead bytes. Double-encoded C4/C5 ("A-diaeresis + guillemet" for i-macron) and E1
// ("a-acute + superscript-one + double-dagger" for n-dot-below) slipped through, so
// this scan reported 0/294 while en/ really held 5 such artifacts. Add a byte
// round-trip detector: map the candidate characters back to CP1252 bytes and try a
// strict UTF-8 decode. Only a VALID decode counts, so genuine latin-1 text (which is
// not valid UTF-8) is never reported.
const PUNCT_REV = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
}

function cp1252Byte(ch) {
  const cp = ch.codePointAt(0)
  if (Object.prototype.hasOwnProperty.call(PUNCT_REV, cp)) return PUNCT_REV[cp]
  if (cp >= 0xa0 && cp <= 0xff) return cp
  return -1
}

// A mis-read UTF-8 lead byte lands in U+00C2..U+00F4; continuation bytes land in
// U+0080..U+00FF or in the CP1252 0x80-0x9F punctuation block.
const CAND =
  /[\u00c2-\u00f4][\u0080-\u00ff\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178]{1,2}/g

export function roundtripHits(raw) {
  const out = []
  for (const m of raw.matchAll(CAND)) {
    const bytes = []
    let ok = true
    for (const ch of m[0]) {
      const b = cp1252Byte(ch)
      if (b < 0) { ok = false; break }
      bytes.push(b)
    }
    if (!ok) continue
    let dec
    try {
      dec = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes))
    } catch {
      continue // not valid UTF-8 -> genuine latin-1 text, not mojibake
    }
    if (dec !== m[0] && /[^\x00-\x7f]/.test(dec)) out.push({ seq: m[0], dec, index: m.index })
  }
  return out
}

const args = process.argv.slice(2)
const files = args.includes('--all')
  ? readdirSync(enDir).filter((f) => f.endsWith('.json'))
  : readdirSync(enDir).filter((f) => f.endsWith('.json'))

let affected = 0
const rows = []
for (const f of files) {
  const raw = readFileSync(join(enDir, f), 'utf8')
  const rt = roundtripHits(raw)
  const fingerprintHit = PATTERNS.some((p) => p.test(raw))
  if (!fingerprintHit && !rt.length) continue
  // count occurrences + sample context
  let hits = rt.length
  const samples = []
  for (const p of PATTERNS) {
    const re = new RegExp(p.source, 'g')
    const m = raw.match(re)
    if (m) hits += m.length
  }
  if (rt.length) samples.push(`${JSON.stringify(rt[0].seq)} -> ${JSON.stringify(rt[0].dec)}`)
  const idx = raw.search(PATTERNS[0])
  if (idx >= 0) samples.push(JSON.stringify(raw.slice(Math.max(0, idx - 30), idx + 30)))
  rows.push({ f, hits, sample: samples[0] || '' })
  affected++
}
rows.sort((a, b) => b.hits - a.hits)
console.log(`scanned ${files.length} files; mojibake-affected: ${affected}`)
for (const r of rows.slice(0, 40)) console.log(`  ${r.f.padEnd(46)} hits=${String(r.hits).padStart(4)}  ${r.sample}`)
if (rows.length > 40) console.log(`  ... and ${rows.length - 40} more`)
