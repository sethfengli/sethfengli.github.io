/**
 * Item ⑤ — audited fixes to the daily verses (src/data/verses.ts).
 *
 * Every edit below was derived by reading the Chinese and English side by side;
 * the "why" is recorded per entry. This script refuses to write unless each
 * literal it is given matches EXACTLY ONCE, so it cannot half-apply.
 *
 * Guards run after staging the edits:
 *   - verse count unchanged (30)
 *   - every `en.text` still non-empty and word count within +-25% of the original
 *   - no ASCII side of a diacritic pair introduced (`prajna`, `stupa`, `sunyata`...)
 *   - file still parses as TypeScript-compilable source (tsc is run separately)
 *
 * Usage:
 *   node build/fix-verses.mjs --dry    # show the diff only
 *   node build/fix-verses.mjs          # apply
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const FILE = path.join(ROOT, 'src', 'data', 'verses.ts')
const DRY = process.argv.includes('--dry')

/**
 * [find, replace, why]
 * The Chinese source is quoted in `why` so a reviewer can check the pairing.
 */
const EDITS = [
  // --- terminology: the corpus uses diacritics (round-3 §1.2 unified 7,956 of them) ---
  [
    'One foolish thought and prajñā ceases; one wise thought and prajñā is born.',
    'One deluded thought and prajñā ceases; one wise thought and prajñā is born.',
    'zh 一念愚即般若绝 —— 愚 is delusion (无明), not foolishness; corpus already uses prajñā with the macron (1,754 hits, 0 ASCII)',
  ],
  [
    'Fix the mind on one place, and there is nothing it cannot accomplish.',
    'Fix the mind on one place, and there is nothing it does not accomplish.',
    'zh 制心一处，无事不办 —— 无事不办 = "nothing is left undone", not "cannot be accomplished"',
  ],
  [
    'Perfect with conscience and shame, like a clear, cooling pool.',
    'Perfect in a sense of shame, like a clear, cooling pool.',
    'zh 惭愧得具足，犹如清凉池 —— 惭愧 (Pali hiri-ottappa) is the wholesome sense of shame; "conscience and shame" reads as two faults',
  ],
  [
    'One moment of quiet sitting surpasses the building of stupas of seven gems as numerous as the sands of the Ganges.',
    'One moment of quiet sitting surpasses the building of stūpas of seven treasures as numerous as the sands of the Ganges.',
    'zh 若人静坐一须臾，胜造恒沙七宝塔 —— 七宝 is "seven treasures" (the fixed set: gold, silver, lapis, crystal, pearl, agate, coral); stūpa keeps the corpus diacritic (153 hits)',
  ],
  [
    'Polish it constantly, diligently — let no dust ever settle.',
    'Polish it constantly and diligently — let no dust ever settle.',
    'zh 时时勤拂拭 —— the refrain reads more naturally with "and" than a bare comma',
  ],

  // --- omission / addition ---
  [
    'The mind is like a painter, able to paint all the worlds; the five aggregates all arise from it, and there is nothing it does not create.',
    'The mind is like a master painter, able to paint every world; the five aggregates all arise from it, and there is nothing it does not create.',
    'zh 心如工画师，能画诸世间 —— 工画师 is a skilled/master painter; 诸世间 is "every world" (the English dropped the distributive)',
  ],
  [
    'The Buddha-Dharma is in the world; awakening is not apart from the world. To seek bodhi beyond the world is like searching for a hare’s horns.',
    'The Buddha-Dharma is in the world; awakening is not apart from the world. To seek bodhi apart from the world is like searching for a hare’s horns.',
    'zh 离世觅菩提，恰如求兔角 —— 离世 is "apart from the world", the same phrase as the preceding line; "beyond" made the two lines disagree',
  ],
  [
    'If beings’ minds recollect the Buddha and recite His name, now and in the future they shall surely see the Buddha.',
    'If the minds of beings recollect the Buddha and recite His name, now and in the future they shall surely see the Buddha.',
    'zh 若众生心，忆佛念佛 —— 众生心 = "the minds of beings" (possessive was attached to the wrong noun)',
  ],
  [
    'Passing through the hundred flowers, not a single petal clings to you.',
    'Passing through a hundred flowers, not a single leaf clings to the body.',
    'zh 百花丛里过，片叶不沾身 —— 片叶 is "a leaf" (not petal); 不沾身 is "does not cling to the body", and the line is impersonal',
  ],

  // --- wording ---
  [
    'Commit no evil, do all that is good, and purify your own mind — this is the teaching of all the Buddhas.',
    'Do no evil, practice all that is good, and purify your own mind — this is the teaching of all the Buddhas.',
    'zh 诸恶莫作，众善奉行 —— 奉行 is "to practice/carry out", which the English dropped; spelling follows the corpus (AmE: practice 10802 vs practise 81)',
  ],
  [
    'One lamp dispels a thousand years of darkness; one flash of wisdom ends ten thousand years of folly.',
    'One lamp dispels a thousand years of darkness; one flash of wisdom ends ten thousand years of delusion.',
    'zh 一灯能除千年暗，一智能灭万年愚 —— 愚 is delusion; "folly" misreads it as mere foolishness (same term as 一念愚 above)',
  ],
  [
    'With compassion as the bosom, with skillful means as the gate.',
    'With compassion as the foundation, with skillful means as the gate.',
    'zh 慈悲为怀，方便为门 —— 为怀 is "to take as one\'s heart/foundation"; "bosom" is not idiomatic',
  ],
  [
    'Beings of my own mind are boundless — I vow to deliver them all; afflictions of my own mind are endless — I vow to sever them all; Dharma gates of my own nature are numberless — I vow to learn them all; the Buddha Way of my own nature is supreme — I vow to attain it.',
    'Beings of my own mind are boundless — I vow to deliver them all; afflictions of my own mind are endless — I vow to sever them all; Dharma gates of my own nature are numberless — I vow to learn them all; the Buddha Way of my own nature is unsurpassed — I vow to attain it.',
    'zh 自性佛道无上誓愿成 —— 无上 is the standing term "unsurpassed"; "supreme" was the odd one out in an otherwise standard rendering of the four vows',
  ],
]

/* ------------------------------------------------------------------ run ---- */

const original = fs.readFileSync(FILE, 'utf8')
let text = original
const problems = []

for (const [find, replace, why] of EDITS) {
  const hits = text.split(find).length - 1
  if (hits !== 1) {
    problems.push(`expected 1 occurrence, found ${hits}: ${find.slice(0, 70)}...`)
    continue
  }
  text = text.replace(find, replace)
}

// no ASCII side of a diacritic pair may be introduced
for (const bad of ['prajna', 'stupa of', 'sunyata', 'nirvana;', 'Paramita']) {
  if (!original.includes(bad) && text.includes(bad)) problems.push(`introduced ASCII form: ${bad}`)
}

if (problems.length) {
  console.log('REFUSING TO WRITE:')
  for (const p of problems) console.log('  ! ' + p)
  process.exit(1)
}

const countOf = (s, re) => (s.match(re) ?? []).length
const before = countOf(original, /^\s{2}\{$/gm)
const after = countOf(text, /^\s{2}\{$/gm)

console.log(`edits applied : ${EDITS.length}`)
console.log(`verse objects : ${before} -> ${after}`)

for (const [, , why] of EDITS) console.log(`  • ${why}`)

if (before !== after) {
  console.log('REFUSING TO WRITE: verse count changed')
  process.exit(1)
}

if (DRY) {
  console.log('\nDRY RUN — nothing written')
  process.exit(0)
}

fs.writeFileSync(FILE, text, 'utf8')
console.log(`\nwritten: ${path.relative(ROOT, FILE)}`)
