import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const dir = 'src/content/en'
let changed = 0
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.json')) continue
  const p = join(dir, f)
  const s = readFileSync(p, 'utf8')
  const t = s
    .replace(/【/g, '[')
    .replace(/】/g, ']')
    .replace(/〔/g, '[')
    .replace(/〕/g, ']')
    .replace(/《/g, '"')
    .replace(/》/g, '"')
  if (t !== s) {
    writeFileSync(p, t)
    changed++
  }
}
console.log('normalized files:', changed)
