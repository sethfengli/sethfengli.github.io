/**
 * 收集「书法体（font-brush）」实际要渲染的字符，供 pyftsubset 做项目子集。
 *
 * 书法体只用在：签文诗句（lots.ts 的 poem）、祝福语（blessing）、
 * 以及 zen3d 里 canvas 上绘制的签文/题字。
 * 只收中文侧（英文侧是拉丁，走 Noto Serif）。
 *
 * 两种用法：
 *   node scripts/collect-brush.mjs                     # 写出 build/brush-chars.txt
 *   import { collectBrushChars } from './collect-brush.mjs'
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)

/** 书法体实际用字（去重、按码点排序）。 */
export function collectBrushChars() {
  const src = fs.readFileSync(ART('src/data/lots.ts'), 'utf8')

  const chars = new Set()

  // 只取 poem / blessing 里以「中文」为主的串：把每条的四个诗句与祝福语抽出
  // （不做 AST 解析，直接扫所有含汉字的字符串字面量即可——范围内只会多不会少，
  //   多收几个字对子集体积没有实质影响，漏收才会掉字。）
  for (const m of src.matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'/g)) {
    const s = m[1]
    if (!/[\u4e00-\u9fff]/.test(s)) continue
    // 英文侧的长句里也常夹着汉字（术语），一并收下即可
    for (const ch of s) {
      const cp = ch.codePointAt(0)
      if (
        (cp >= 0x4e00 && cp <= 0x9fff) ||
        (cp >= 0x3400 && cp <= 0x4dbf) ||
        (cp >= 0x3000 && cp <= 0x303f) ||
        (cp >= 0xff00 && cp <= 0xffef) ||
        cp === 0x00b7 || // ·
        cp === 0x2014 || // —
        cp === 0x2026 || // …
        cp === 0x2018 || cp === 0x2019 || cp === 0x201c || cp === 0x201d
      ) {
        chars.add(ch)
      }
    }
  }

  // 禅语 / 祝福等固定点缀文案（Lots 页与首页点睛处）
  for (const extra of [
    '慧灯禅院',
    '灵签',
    '签',
    '上上',
    '上吉',
    '中平',
    '下下',
    '下',
    '中',
    '上',
    '大吉',
    '观世音菩萨',
    '南无阿弥陀佛',
    '嗡嘛呢叭咪吽',
    '禅',
    '佛',
    '心',
    '缘',
    '静',
    '悟',
    '慧',
    '灯',
    '莲',
    '愿',
    '善',
    '福',
    '寿',
    '吉',
    '祥',
    '和',
    '安',
    '宁',
    '慈',
    '悲',
    '喜',
    '舍',
    '戒',
    '定',
    '般若',
    '波罗蜜',
    '菩提',
    '涅槃',
    '如来',
    '菩萨',
    '罗汉',
    '和尚',
    '居士',
    '法师',
  ]) {
    for (const ch of extra) chars.add(ch)
  }

  return [...chars].sort((a, b) => a.codePointAt(0) - b.codePointAt(0))
}

/** 写出 pyftsubset --text-file 的输入文件。 */
export function writeBrushCharsFile(outFile = ART('build/brush-chars.txt')) {
  const list = collectBrushChars()
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, list.join(''), 'utf8')
  return { file: outFile, chars: list }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { file, chars } = writeBrushCharsFile()
  const han = chars.filter((c) => {
    const cp = c.codePointAt(0)
    return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf)
  })
  console.log('书法体字符数（含标点）:', chars.length, ' 其中汉字:', han.length)
  console.log('→ ' + file)
}

