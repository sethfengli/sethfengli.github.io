/**
 * Normalize ASCII " -- " to a proper em dash (U+2014) inside English JSON strings.
 * Walks the parsed JSON (so the result is always valid JSON) and only rewrites
 * files that actually change.
 * Usage: node build/fix-dashes.mjs [--apply]     (without --apply: dry run)
 * Pure ASCII on purpose.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const enDir = join(root, 'src/content/en')
const apply = process.argv.includes('--apply')
const EM = '\u2014'

let changedFiles = 0
let changedStrings = 0

function walk(node, cb) {
  if (typeof node === 'string') return cb(node)
  if (Array.isArray(node)) return node.map((x) => walk(x, cb))
  if (node && typeof node === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(node)) out[k] = walk(v, cb)
    return out
  }
  return node
}

for (const f of readdirSync(enDir).filter((x) => x.endsWith('.json'))) {
  const p = join(enDir, f)
  const raw = readFileSync(p, 'utf8')
  if (!raw.includes(' -- ')) continue
  let hits = 0
  const data = JSON.parse(raw)
  const out = walk(data, (s) => {
    const n = s.split(' -- ').length - 1
    if (n) {
      hits += n
      return s.split(' -- ').join(` ${EM} `)
    }
    return s
  })
  if (!hits) continue
  changedFiles++
  changedStrings += hits
  console.log(`${apply ? 'FIX  ' : 'DRY  '} ${f.padEnd(46)} replacements=${hits}`)
  if (apply) writeFileSync(p, JSON.stringify(out, null, 1) + '\n', 'utf8')
}
console.log(`\n${apply ? 'applied' : 'dry-run'}: files=${changedFiles} strings=${changedStrings}`)
