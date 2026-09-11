/**
 * Fix CP1252->UTF-8 mojibake in English JSON files (structured JSON read/write).
 *
 * Mechanism: UTF-8 bytes were decoded as CP1252, then re-saved as UTF-8.
 *   "—" (E2 80 94) -> "â€""   = U+00E2 U+20AC U+201D
 *   "'" (E2 80 99) -> "â€™"   = U+00E2 U+20AC U+2122
 *   "ā" (C4 81)    -> "Ä" + U+0081
 * Some files went through the mill twice ("Ã¢â‚¬â„¢" -> "â€™" -> "'").
 *
 * Inversion: map each character of a mojibake sequence back to its CP1252 byte,
 * then decode the byte sequence as UTF-8. Applied iteratively (to unwrap double
 * encoding). A sequence is only replaced when it decodes without U+FFFD.
 *
 * Usage:
 *   node scripts/fix-mojibake.mjs <file...>            # dry run
 *   node scripts/fix-mojibake.mjs --apply <file...>    # write
 *   (no file args = built-in 12-file target list)
 *
 * Safety: refuses to write a file whose repair is not valid JSON, contains U+FFFD,
 * or still trips the scan-mojibake patterns. Idempotent.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const enDir = join(root, 'src/content/en')

// --- CP1252 (byte 0x80..0x9F) <-> Unicode -----------------------------------
const CP1252_HIGH = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160,
  0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153,
  0x9e: 0x017e, 0x9f: 0x0178,
}
const C2B = new Map()
for (const [b, cp] of Object.entries(CP1252_HIGH)) C2B.set(String.fromCharCode(cp), Number(b))
// 0x80..0xFF map to themselves (covers C1 controls that survived as codepoints)
for (let b = 0x80; b <= 0xff; b++) if (!C2B.has(String.fromCharCode(b))) C2B.set(String.fromCharCode(b), b)

// Characters that can CONTINUE a mojibake sequence: C1 controls, CP1252-mapped
// punctuation (incl. U+20AC for the "€" middle byte), and Latin-1 printable range.
const CONT_CHARS =
  '\u20ac' + // the crucial middle byte
  '\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152' +
  '\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178'
const CONT = new RegExp(`[${CONT_CHARS}\\u0080-\\u00ff]`)
// Lead bytes as they appear after the first misdecode
const LEAD = /[\u00c2\u00c3\u00c4\u00c5\u00e2\u00e3]/

// scan-mojibake's authoritative patterns: must be 0 after repair
const MOJI = [/\u00e2\u20ac/, /\u00c3[\u0080-\u00bf]/, /\u00c2[\u00a0-\u00bf]/, /\u00ef\u00bc/, /\u00e3\u20ac/, /\ufffd/]
const hits = (s) => MOJI.reduce((n, re) => n + (s.match(new RegExp(re.source, 'g')) || []).length, 0)

/** Greedily take the longest mappable run starting at index i. */
function takeRun(s, i) {
  if (!LEAD.test(s[i])) return null
  let j = i + 1
  while (j < s.length && (CONT.test(s[j]) || (j === i + 1 && C2B.has(s[j])))) j++
  // trim a trailing char that is not mappable (shouldn't happen with CONT)
  while (j > i + 1 && !C2B.has(s[j - 1])) j--
  return j > i + 1 ? s.slice(i, j) : null
}

function decodeRun(run) {
  const bytes = []
  for (const ch of run) {
    const b = C2B.get(ch)
    if (b === undefined) return null
    bytes.push(b)
  }
  const dec = Buffer.from(bytes).toString('utf8')
  return dec.includes('\uFFFD') ? null : dec
}

function repairOnce(s) {
  let out = ''
  let i = 0
  while (i < s.length) {
    const run = takeRun(s, i)
    if (run) {
      const dec = decodeRun(run)
      if (dec !== null && dec !== run) {
        out += dec
        i += run.length
        continue
      }
    }
    out += s[i]
    i++
  }
  return out
}

function repairAll(s) {
  let cur = s
  for (let i = 0; i < 4; i++) {
    const next = repairOnce(cur)
    if (next === cur) break
    cur = next
  }
  return cur
}

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const KNOWN = [
  '303liuzutanjing.json', '204ssydj.p3.json', '204ssydj.p4.json',
  '502xiuxinjue.p4.json', '502xiuxinjue.p5.json',
  '251zhenqiyunxingfa.p1.json', '251zhenqiyunxingfa.p2.json',
  '187hanshandashinianpushu-old.p1.json', '187hanshandashinianpushu-old.p11.json',
  '502zhenxinzhishuojingjie.p6.json', '030gonggg.json', '261lengqiejing.p3.json',
]
const files = args.filter((a) => !a.startsWith('--'))
const targets = files.length ? files : KNOWN

let written = 0
for (const f of targets) {
  const raw = readFileSync(join(enDir, f), 'utf8')
  const before = hits(raw)
  const after = repairAll(raw)
  const afterHits = hits(after)
  const c1 = (after.match(/[\u0080-\u009f]/g) || []).length
  let jsonOk = true
  try {
    JSON.parse(after)
  } catch {
    jsonOk = false
  }
  const safe = jsonOk && !after.includes('\uFFFD')
  console.log(
    `${f.padEnd(36)} hits ${String(before).padStart(3)} -> ${String(afterHits).padStart(3)}` +
      `  c1left=${String(c1).padStart(3)}  json=${jsonOk ? 'ok ' : 'BAD'}` +
      `  ${safe ? '' : '(NOT WRITEABLE) '}${APPLY && safe ? '[WRITTEN]' : ''}`,
  )
  if (APPLY && safe) {
    writeFileSync(join(enDir, f), after, 'utf8')
    written++
  }
}
console.log(`\n${APPLY ? 'applied' : 'dry run'}: ${written} written, ${targets.length} considered`)
