/**
 * Font subset coverage probe.
 *
 * Why: the Noto Serif SC subset in `public/fonts/` is built from "the set of CJK
 * characters the site currently uses" (scripts/collect-cjk.mjs ->
 * build/cjk-chars.txt -> scripts/make-song-subset.mjs). If a later copy edit
 * introduces a character that was not used at subset time, that character
 * silently falls back to a system font: no build error, no type error, only a
 * visual mismatch that is easy to miss.
 *
 * This probe reads the woff2 that actually ships, decodes its cmap with plain
 * Node (scripts/woff2-cmap.mjs -- no Python/fonttools), and diffs the mapped code
 * points against the characters the site uses. The character set is computed live
 * from `src/` by importing collect-cjk.mjs, so the probe needs no pre-generated
 * artifact and cannot go stale behind a deleted build/ file.
 *
 * Usage:
 *   node scripts/check-font-coverage.mjs                  # live scan of src/
 *   node scripts/check-font-coverage.mjs --chars=<file>   # use a saved char list
 *   node scripts/check-font-coverage.mjs --font=<file>
 *
 * Exit 0 when every used character is mapped; exit 1 listing the missing ones.
 *
 * ⚠ Fallback gaps are NOT failures, but they are worth knowing about: when the
 * subset was last rebuilt the set of "characters the site uses" was larger (e.g.
 * before a content rewrite removed traditional-Chinese pages), and rebuilding
 * from today's `src/` alone would silently drop those glyphs for anyone still
 * reaching the older text. scripts/make-song-subset.mjs therefore merges the
 * existing subset's glyphs into the new one, and this probe reports the gap so the
 * regression is visible instead of silent.
 */
import fs from 'node:fs'
import path from 'node:path'
import { collectChars } from './collect-cjk.mjs'
import { readWoff2, readCmap } from './woff2-cmap.mjs'

const ROOT = process.cwd()
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? path.resolve(ROOT, hit.slice(name.length + 3)) : fallback
}
const FONT = arg('font', path.join(ROOT, 'public', 'fonts', 'noto-serif-sc-subset.woff2'))
const CHARS = arg('chars', null)

/* ------------------------------------------------------------------ run ---- */

if (!fs.existsSync(FONT)) {
  console.log(`font not found: ${FONT}`)
  process.exit(1)
}

const used = CHARS ? [...new Set([...fs.readFileSync(CHARS, 'utf8')])] : collectChars()
const usedLabel = CHARS ? `${path.relative(ROOT, CHARS)} (file)` : 'src/** (live scan)'

const woff2 = fs.readFileSync(FONT)
const { tables, blob } = readWoff2(woff2)
const cmapTable = tables.find((t) => t.tag === 'cmap')
if (!cmapTable) throw new Error('cmap table missing from woff2')
const { cps, formats } = readCmap(blob, cmapTable.off)

const missing = used.filter((ch) => !cps.has(ch.codePointAt(0)))

/**
 * A handful of characters are legitimately absent from the subset and were
 * accepted when it was built (notably U+FA2D CJK COMPATIBILITY IDEOGRAPH-FA2D).
 * They fall back to a system font and look fine, so they are a WARN, not a
 * failure. Real missing Han means the subset predates a copy edit.
 */
const ACCEPTED = new Set([0xfa2d])
const hard = missing.filter((ch) => !ACCEPTED.has(ch.codePointAt(0)))
const tolerated = missing.filter((ch) => ACCEPTED.has(ch.codePointAt(0)))

const hanOf = (s) => (s.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) ?? []).length

console.log(`font   : ${path.relative(ROOT, FONT)}`)
console.log(
  `         ${(woff2.length / 1024).toFixed(0)} KB on disk, ${tables.length} tables, cmap format(s) ${formats.join('/') || 'none'}`,
)
console.log(`         ${cps.size} mapped code points`)
console.log(`chars  : ${usedLabel} (${used.length} used)`)
console.log(`covered: ${used.length - missing.length} / ${used.length}`)
console.log(`missing: ${missing.length} (accepted fallbacks ${tolerated.length}, action needed ${hard.length})`)
for (const ch of tolerated) {
  console.log(`  ok   U+${ch.codePointAt(0).toString(16).toUpperCase()} ${ch}  (accepted: falls back to system font)`)
}
for (const ch of hard) {
  console.log(`  FAIL U+${ch.codePointAt(0).toString(16).toUpperCase()} ${ch}`)
}
if (hard.length) console.log('  -> rerun: node scripts/make-song-subset.mjs')

/**
 * Extra information: glyphs the shipped subset carries that the live src/ scan no
 * longer asks for. This is the size of the "old content" reserve baked into the
 * font. A big number is not a bug -- it just means the subset was last built from
 * a wider corpus -- but it explains any size difference versus a naive rebuild.
 */
const liveSet = new Set(used.map((ch) => ch.codePointAt(0)))
const reserve = [...cps].filter((cp) => !liveSet.has(cp) && cp >= 0x3000 && cp <= 0x9fff)
if (reserve.length) {
  console.log(
    `\nreserve: ${reserve.length} code points in the font are not used by the current src/ scan`,
  )
  console.log(
    `         (${hanOf(String.fromCodePoint(...reserve.slice(0, 200)))} Han in the first 200: ${reserve
      .slice(0, 24)
      .map((cp) => String.fromCodePoint(cp))
      .join('')} ...)`,
  )
  console.log('         A rebuild keeps them: make-song-subset.mjs merges the existing cmap.')
}

process.exit(hard.length === 0 ? 0 : 1)
