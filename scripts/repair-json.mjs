import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** 修复 JSON 字符串值内的裸控制字符（未转义的换行/制表符等），保留结构空白 */
function repair(s) {
  let out = ''
  let inStr = false
  let esc = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (!inStr) {
      out += c
      if (c === '"') inStr = true
      continue
    }
    // in string
    if (esc) {
      out += c
      esc = false
      continue
    }
    if (c === '\\') {
      out += c
      esc = true
      continue
    }
    if (c === '"') {
      out += c
      inStr = false
      continue
    }
    const code = c.charCodeAt(0)
    if (code < 0x20) {
      if (c === '\n') out += '\\n'
      else if (c === '\r') out += '\\r'
      else if (c === '\t') out += '\\t'
      else out += '\\u' + code.toString(16).padStart(4, '0')
      continue
    }
    out += c
  }
  return out
}

let fixed = 0
for (const f of readdirSync('src/content/en')) {
  if (!f.endsWith('.json')) continue
  const p = join('src/content/en', f)
  let old = readFileSync(p, 'utf8')
  // 去掉文件头的 UTF-8 BOM
  if (old.charCodeAt(0) === 0xfeff) old = old.slice(1)
  let ok = false
  try {
    JSON.parse(old)
    ok = true
  } catch {
    ok = false
  }
  if (ok) {
    if (readFileSync(p, 'utf8').charCodeAt(0) === 0xfeff) {
      writeFileSync(p, old)
      console.log('[bom-stripped]', f)
    }
    continue
  }
  const nun = repair(old)
  try {
    JSON.parse(nun)
    writeFileSync(p, nun)
    fixed++
    console.log('[repaired]', f)
  } catch (e) {
    console.log('[still-bad]', f, e.message.split('\n')[0])
  }
}
console.log('repaired files:', fixed)
