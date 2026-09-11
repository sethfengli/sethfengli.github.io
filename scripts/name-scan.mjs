/**
 * Check consistency of Buddhist name/diacritic variants across English outputs.
 * Counts files using each variant so mixed usage can be spotted.
 * Usage: node scripts/name-scan.mjs
 * Read-only. Pure ASCII.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const enDir = join(root, 'src/content/en')
const files = readdirSync(enDir).filter((f) => f.endsWith('.json'))

const groups = [
  ['Ananda', 'Ānanda'],
  ['Sakyamuni', 'Śākyamuni', 'Shakyamuni'],
  ['Vaidehi', 'Vaidehī'],
  ['Amitabha', 'Amitābha'],
  ['nirvana', 'nirvāṇa'],
  ['samadhi', 'samādhi'],
  ['prajna', 'prajñā'],
  ['dharmakaya', 'dharmakāya'],
  ['Saha world', 'Sahā world'],
  ['Sukhāvatī', 'Sukhavati'],
]

const rows = []
for (const f of files) {
  const raw = readFileSync(join(enDir, f), 'utf8')
  const counts = groups.map((g) => g.map((v) => raw.split(v).length - 1))
  const mixedGroups = []
  groups.forEach((g, i) => {
    const used = counts[i].filter((c) => c > 0).length
    if (used > 1) mixedGroups.push(g.filter((_, k) => counts[i][k] > 0).join('/'))
  })
  if (mixedGroups.length) rows.push([f, mixedGroups])
}

console.log(`scanned=${files.length} files with MIXED diacritic variants=${rows.length}`)
for (const [f, g] of rows.slice(0, 25)) console.log(`  ${f.padEnd(46)} ${g.join('  |  ')}`)
console.log('\nvariant totals across corpus (files using each):')
for (const g of groups) {
  const t = g.map((v) => [v, files.filter((f) => readFileSync(join(enDir, f), 'utf8').includes(v)).length])
  console.log(`  ${t.map(([v, n]) => `${v}=${n}`).join('  ')}`)
}
