/**
 * Count terminology variants across the English corpus, so verse fixes follow the
 * convention the site already uses rather than inventing a new one.
 *
 * Usage: node build/term-counts.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.join(process.cwd(), 'src', 'content', 'en')
const WORDS = [
  'prajnaparamita', 'prajñā', 'Prajñāpāramitā', 'Prajnaparamita',
  'stupa', 'stūpa', 'stupas', 'stūpas',
  'bodhi', 'Bodhi',
  'parinirvana', 'parinirvāṇa', 'Parinirvana',
  'samsara', 'saṃsāra',
  'Ganges', 'Gaṅgā', 'Gangā',
  'Mahasthamaprapta', 'Mahāsthāmaprāpta',
  'Avatamsaka', 'Avataṃsaka',
  'Shurangama', 'Śūraṅgama', 'Surangama',
  'Vimalakirti', 'Vimalakīrti',
  'Dhammapada', 'Dharmapada',
  'Samyukta', 'Saṃyukta', 'Agama', 'Āgama',
  'Platform Sutra', 'Diamond Sutra',
  'wisdom', 'folly',
  'five aggregates', 'five skandhas',
  'Pure Land', 'Buddha-land',
  'the Way', 'the path',
]

const counts = new Map(WORDS.map((w) => [w, 0]))
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'))

for (const f of files) {
  const text = fs.readFileSync(path.join(DIR, f), 'utf8')
  for (const w of WORDS) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')
    const m = text.match(re)
    if (m) counts.set(w, counts.get(w) + m.length)
  }
}

console.log(`scanned ${files.length} files in src/content/en\n`)
for (const [w, n] of counts) {
  if (n > 0) console.log(String(n).padStart(7), w)
}
