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

const args = process.argv.slice(2)
const files = args.includes('--all')
  ? readdirSync(enDir).filter((f) => f.endsWith('.json'))
  : readdirSync(enDir).filter((f) => f.endsWith('.json'))

let affected = 0
const rows = []
for (const f of files) {
  const raw = readFileSync(join(enDir, f), 'utf8')
  if (!PATTERNS.some((p) => p.test(raw))) continue
  // count occurrences + sample context
  let hits = 0
  const samples = []
  for (const p of PATTERNS) {
    const re = new RegExp(p.source, 'g')
    const m = raw.match(re)
    if (m) hits += m.length
  }
  const idx = raw.search(PATTERNS[0])
  if (idx >= 0) samples.push(JSON.stringify(raw.slice(Math.max(0, idx - 30), idx + 30)))
  rows.push({ f, hits, sample: samples[0] || '' })
  affected++
}
rows.sort((a, b) => b.hits - a.hits)
console.log(`scanned ${files.length} files; mojibake-affected: ${affected}`)
for (const r of rows.slice(0, 40)) console.log(`  ${r.f.padEnd(46)} hits=${String(r.hits).padStart(4)}  ${r.sample}`)
if (rows.length > 40) console.log(`  ... and ${rows.length - 40} more`)
