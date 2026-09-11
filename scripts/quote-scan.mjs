/**
 * Measure quote style in English outputs: typographic curly quotes (U+201C/201D)
 * vs straight ASCII double quotes inside string values.
 * Usage: node build/quote-scan.mjs
 * Read-only. Pure ASCII on purpose.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const enDir = join(root, 'src/content/en')
const files = readdirSync(enDir).filter((f) => f.endsWith('.json'))
const LQ = '\u201c'
const RQ = '\u201d'

let curlyOnly = 0
let straightOnly = 0
let mixed = 0
let neither = 0
const mixedList = []
for (const f of files) {
  const raw = readFileSync(join(enDir, f), 'utf8')
  const curly = raw.split(LQ).length - 1 + (raw.split(RQ).length - 1)
  // count escaped straight double quotes inside string values
  const straight = (raw.match(/\\"/g) || []).length
  if (curly && straight) {
    mixed++
    mixedList.push([f, curly, straight])
  } else if (curly) curlyOnly++
  else if (straight) straightOnly++
  else neither++
}
console.log(`files=${files.length}`)
console.log(`  curly only   : ${curlyOnly}`)
console.log(`  straight only: ${straightOnly}`)
console.log(`  mixed        : ${mixed}`)
console.log(`  neither      : ${neither}`)
mixedList.sort((a, b) => b[2] - a[2])
for (const [f, c, s] of mixedList.slice(0, 20)) console.log(`  MIXED ${f.padEnd(46)} curly=${String(c).padStart(4)} straight=${s}`)
