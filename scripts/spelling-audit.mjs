/**
 * Which spelling convention does the English corpus use (BrE vs AmE)? Item ⑤
 * introduced "practise", so this checks the house style instead of assuming.
 *
 * Usage: node build/spelling-audit.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const DIRS = [path.join(process.cwd(), 'src', 'content', 'en'), path.join(process.cwd(), 'src', 'i18n')]
const PAIRS = [
  ['practice', 'practise'],
  ['practices', 'practises'],
  ['practicing', 'practising'],
  ['realize', 'realise'],
  ['realized', 'realised'],
  ['recognize', 'recognise'],
  ['color', 'colour'],
  ['honor', 'honour'],
  ['center', 'centre'],
  ['organized', 'organised'],
  ['fulfill', 'fulfil'],
  ['toward', 'towards'],
]

const text = []
for (const dir of DIRS) {
  for (const f of fs.readdirSync(dir)) {
    if (!/\.(json|ts)$/.test(f)) continue
    text.push(fs.readFileSync(path.join(dir, f), 'utf8'))
  }
}
const all = text.join('\n')

console.log(`scanned ${text.length} files\n`)
for (const [am, br] of PAIRS) {
  const ca = (all.match(new RegExp(`\\b${am}\\b`, 'gi')) ?? []).length
  const cb = (all.match(new RegExp(`\\b${br}\\b`, 'gi')) ?? []).length
  if (ca + cb === 0) continue
  const pick = ca >= cb ? am : br
  console.log(`${String(ca).padStart(6)} ${am.padEnd(12)} ${String(cb).padStart(6)} ${br.padEnd(12)} -> house style: ${pick}`)
}
