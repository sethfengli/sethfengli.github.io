// 抓取 https://github.com/seth2000/linqijing 全部 125 卦 md → src/content/lingqi.json
// 用法: node scripts/fetch-lingqi.mjs
import { writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = 'https://raw.githubusercontent.com/seth2000/linqijing/main'
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'lingqi.json')

const codes = []
for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4; b++) for (let c = 0; c <= 4; c++) codes.push(`${a}${b}${c}`)

const NUM = { 一: '1', 二: '2', 三: '3', 四: '4' }
/** 「一上一中二下」→ 上中下 各数字（缺失=0）→ '112' */
function levelText(pos) {
  const out = ['0', '0', '0']
  for (let i = 0; i < pos.length; i++) {
    const ch = pos[i]
    const idx = ch === '上' ? 0 : ch === '中' ? 1 : ch === '下' ? 2 : -1
    const num = NUM[pos[i - 1]]
    if (idx >= 0) out[idx] = num ?? out[idx]
  }
  return out.join('')
}

function parseMd(raw, code) {
  const lines = raw.split(/\r?\n/).filter(Boolean)
  const title = lines[0].replace(/^#\s*/, '').trim()
  // 例：`一上一中一下 大通卦 升腾之象`；个别卦名无「卦」字（如 433 救助教）
  // 尝试两种形态： [...]卦 象 | 卦名 象
  let m = title.match(/^(.*?)\s+(\S+卦)\s+(.*)$/)
  let name = ''
  let image = ''
  let pos = ''
  if (m) {
    pos = m[1]
    name = m[2]
    image = m[3]
  } else {
    m = title.match(/^(.*?)\s+(\S{2,4})\s+(\S+之象)$/)
    if (m) {
      pos = m[1]
      name = m[2]
      image = m[3]
    }
  }
  const fields = {}
  for (const [k, label] of [['xiang', '象'], ['yan', '颜'], ['he', '何'], ['chen', '陈'], ['liu', '刘'], ['shi', '诗']]) {
    const fm = raw.match(new RegExp(`\\*\\*${label}曰\\*\\*\\s*([^\\n]+)`))
    if (fm) fields[k] = fm[1].trim()
  }
  // 附加说明行（如「二阳孤立 乾天西北」）
  let note = ''
  if (lines[1] && !lines[1].startsWith('**') && !lines[1].includes('[')) note = lines[1].trim()
  return { code, levelText: levelText(pos), name, image, note, ...fields }
}

async function main() {
  const out = []
  let fail = 0
  for (const code of codes) {
    try {
      const res = await fetch(`${BASE}/${code}.md`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      out.push(parseMd(await res.text(), code))
      process.stdout.write('.')
    } catch {
      fail++
      process.stdout.write('!')
    }
  }
  console.log(`\nfetched ${out.length}, failed ${fail}`)
  await writeFile(OUT, JSON.stringify(out, null, 2), 'utf8')
  console.log(`written ${OUT}`)
}

main()
