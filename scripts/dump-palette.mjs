/**
 * 列出 src/index.css 里 4 套主题的色板令牌实际取值，
 * 用来给「名不副实的令牌」定新名（不能凭印象，必须看真值）。
 */
import fs from 'node:fs'

const s = fs.readFileSync('src/index.css', 'utf8')

// 拆出每个主题块：【...】{ ... }
const blocks = [...s.matchAll(/(:root[^{]*)\{([\s\S]*?)\n\}/g)]
console.log('主题块数:', blocks.length)

const fams = ['rice', 'sandalwood', 'tibetan', 'gold', 'moon', 'ink']
const table = {}

for (const b of blocks) {
  const selector = b[1].replace(/\s+/g, ' ').trim()
  const body = b[2]
  for (const fam of fams) {
    const re = new RegExp(`--site-${fam}-(\\d+):\\s*(#[0-9a-fA-F]{3,8})`, 'g')
    for (const m of body.matchAll(re)) {
      const key = `${fam}-${m[1]}`
      table[key] = table[key] || {}
      table[key][selector] = m[2]
    }
  }
}

// 只打印每族的首个主题值 + 是否各主题不同
const seen = {}
for (const [key, bySel] of Object.entries(table)) {
  const fam = key.split('-')[0]
  seen[fam] = seen[fam] || {}
  const vals = Object.values(bySel)
  seen[fam][key] = { first: vals[0], varies: new Set(vals).size > 1, n: vals.length }
}

for (const fam of fams) {
  if (!seen[fam]) continue
  console.log(`\n== ${fam}`)
  for (const [k, v] of Object.entries(seen[fam])) {
    console.log(`   ${k.padEnd(16)} ${v.first}  主题数=${v.n} 各主题不同=${v.varies}`)
  }
}
