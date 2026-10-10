/** 列出每个等级的第一支签 id（供种历史、一次核对全部六档配色）。临时件。 */
import fs from 'node:fs'

const src = fs.readFileSync('src/data/lots.ts', 'utf8')
const ids = [...src.matchAll(/\bid:\s*(\d+)/g)].map((m) => Number(m[1]))
const levels = [...src.matchAll(/\blevel:\s*'([^']+)'/g)].map((m) => m[1])
console.log('ids:', ids.length, 'levels:', levels.length)
const first = new Map()
ids.forEach((id, i) => {
  const lv = levels[i]
  if (lv && !first.has(lv)) first.set(lv, id)
})
console.log(JSON.stringify([...first.entries()]))
console.log('seed:', [...first.values()].join(','))
