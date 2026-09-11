/**
 * Scan Chinese article metadata for suspicious `author` values:
 *   - author identical to title (or to a prefix/suffix of it)
 *   - author containing book-title brackets 《》「」
 *   - author that looks like a section heading / category rather than a person
 * Usage: node scripts/meta-scan.mjs
 * Read-only. Pure ASCII.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const artDir = join(root, 'src/content/articles')
const files = readdirSync(artDir).filter((f) => f.endsWith('.json'))

const suspects = []
for (const f of files) {
  let d
  try {
    d = JSON.parse(readFileSync(join(artDir, f), 'utf8'))
  } catch {
    continue
  }
  const t = (d.title || '').trim()
  const a = (d.author || '').trim()
  const ex = (d.excerpt || '').trim()
  if (!a) continue
  const reasons = []
  if (a === t) reasons.push('author == title')
  else if (t && (t.includes(a) || a.includes(t))) reasons.push('author overlaps title')
  if (/[《》「」【】]/.test(a)) reasons.push('author contains title brackets')
  if (a.length > 20) reasons.push('author unusually long')
  if (/^(摘自|选自|节选)/.test(a)) reasons.push('author looks like a source note')
  // Extraction artifact: the "author" string is the OPENING text of a body block
  // (e.g. zhAuthor "时维" = first words of a dateline the extractor sliced off into
  // its own block). A legitimate author name may appear in prose, so only a
  // block-initial occurrence counts as suspicious.
  const blockStarts = (d.blocks || []).map((b) => {
    const first = (b.inline || [])[0]
    return (first && first.s) || b.text || ''
  })
  if (a.length >= 2 && blockStarts.some((s) => s.startsWith(a))) reasons.push('author is the opening text of a body block')
  if (reasons.length) suspects.push({ f, t, a, ex: ex.slice(0, 50), reasons })
}

console.log(`articles=${files.length}  suspicious author values=${suspects.length} (REVIEW LIST - may contain false positives such as a legitimate byline block)`)
for (const s of suspects) {
  console.log(`  ${s.f}`)
  console.log(`      title  = ${s.t}`)
  console.log(`      author = ${s.a}          [${s.reasons.join('; ')}]`)
  if (s.ex) console.log(`      excerpt= ${s.ex}`)
}
