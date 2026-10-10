/**
 * 重建正文宋体（CJK）的项目子集。
 * ---------------------------------------------------------------
 * 为什么需要：正文宋体走系统栈（macOS 宋体-简 / Windows 中易宋体 / Linux 思源宋体），
 * 三端观感不一致，Windows 的中易宋体明显偏弱。要全平台统一就得内置汉字字体，
 * 而 Noto Serif SC 的**完整**汉字表有 30928 个字形（源文件 11.1 MB）；
 * @fontsource 的做法是切成 101 个 unicode-range 分片，实测本站要用的汉字
 * 会命中 **86 个分片、合计 2.92 MB**，而且单取 chinese-simplified 那一个分片
 * 还缺 1253 个本站用字（含 淨/觀/釋 等繁体）。
 *
 * 做法：取 Noto Serif SC 的完整 Regular（SubsetOTF/SC，约 11 MB），
 * 按「全站实际用字」子集化 → 单个约 1.4 MB 的 woff2。
 * 比 fontsource 方案小一半，且**一个文件**、无 unicode-range 命中问题。
 *
 * 依赖：
 *   python -m pip install fonttools brotli
 *   （字体源从 jsdelivr CDN 拉取；已本地有 build/NotoSerifSC-Regular.otf 时不再下载）
 *
 * 用法：node scripts/make-song-subset.mjs
 *   ⚠ 改动文章正文 / 界面文案后请重跑一次，否则新增的字会掉回系统字体。
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { writeCharsFile } from './collect-cjk.mjs'
import { readWoff2Cmap } from './woff2-cmap.mjs'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)

const PYTHON =
  process.env.DSH_PYTHON ??
  'C:\\Users\\sethf\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe'

const SOURCE_URL =
  'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Serif/SubsetOTF/SC/NotoSerifSC-Regular.otf'
const SOURCE = ART('build/NotoSerifSC-Regular.otf')
const CHARS = ART('build/cjk-chars.txt')
const OUT = 'public/fonts/noto-serif-sc-subset.woff2'

// 1) 收集全站用字（直接 import 调用，不再 spawn 兄弟脚本 —— spawn 依赖 cwd 与相对路径）
const { chars } = writeCharsFile(CHARS)
console.log(`全站用字 ${chars.length} 个 → ${CHARS}`)

/**
 * 2) **单调性保护**：把「当前已发布子集里已有的字」并进子集。
 *
 * 为什么必须：src/ 的用字集合是**会缩水**的（换稿、删正文、清理重复文件都会让某些字
 * 从全站用字里消失）。若只按 src/ 重新子集化，那些字就从字体里被删掉，而它们可能
 * 仍出现在**旧稿/外链/搜索进来的页面**上 —— 一旦掉落就悄悄退回系统字体。
 * 实测：本轮按 src/ 重跑得到 6965 字，而**已提交的子集有 6965 字但其中 331 个
 * （龍/龜/資/報/問 … 繁体与异体）不在当前 src/ 里**，直接重建会让这 331 字从
 * 「站内字体」退回系统字体。取并集后重建即**幂等且有增无减**。
 *
 * 读的是**磁盘上现有的成品字体**（scripts/check-font-coverage.mjs 的 woff2 cmap 读取），
 * 所以首次构建（文件还不存在）时自然退化为「只用 src/ 用字」。
 */
const existing = fs.existsSync(ART(OUT)) ? readWoff2Cmap(ART(OUT)) : new Set()
if (existing.size) {
  const before = chars.length
  const merged = new Set(chars)
  for (const cp of existing) merged.add(String.fromCodePoint(cp))
  const extra = merged.size - before
  if (extra > 0) {
    const list = [...merged].sort((a, b) => a.codePointAt(0) - b.codePointAt(0))
    fs.writeFileSync(CHARS, list.join(''), 'utf8')
    console.log(
      `并入已发布子集的字形：+${extra} 字（现共 ${list.length}）——其中 ${existing.size} 个来自现有字体`,
    )
  } else {
    console.log(`已发布子集未带来新字形（现有 ${existing.size} 个码位）`)
  }
}

// 3) 取字体源（本地已有就不重复下载）
if (!fs.existsSync(SOURCE)) {
  console.log(`下载字体源：${SOURCE_URL}`)
  const r = await fetch(SOURCE_URL)
  if (!r.ok) throw new Error(`下载失败 HTTP ${r.status}`)
  const buf = Buffer.from(await r.arrayBuffer())
  fs.writeFileSync(SOURCE, buf)
  console.log(`  → ${SOURCE}（${(buf.length / 1048576).toFixed(1)} MB）`)
} else {
  console.log(`复用已有字体源 ${SOURCE}`)
}

// 3) 子集化
fs.mkdirSync(path.dirname(OUT), { recursive: true })

// 直接以命令行调用 pyftsubset（不要去改写 sys.argv —— 踩过：改写后再用
// sys.argv[i] 取自己的参数会读到 pyftsubset 的 flag，报 "no such file: --flavor=woff2"）
execFileSync(
  PYTHON,
  [
    '-m', 'fontTools.subset',
    SOURCE,
    `--text-file=${CHARS}`,
    '--flavor=woff2',
    '--layout-features=kern,liga,clig,calt,locl,ccmp,mark,mkmk',
    '--no-hinting',
    '--desubroutinize',
    '--name-IDs=1,2,3,4,6',
    `--output-file=${OUT}`,
  ],
  { stdio: 'inherit' },
)

// 4) 复核：覆盖是否有缺字（缺字会掉回系统字体，必须显式报出来）
const verify = `
import os, sys
from fontTools.ttLib import TTFont
f = TTFont(sys.argv[1])
need = open(sys.argv[2], encoding='utf-8').read()
cm = f.getBestCmap()
miss = [c for c in need if ord(c) not in cm]
print('glyphs:', len(cm), ' missing:', len(miss), ''.join(miss[:20]))
print('bytes:', os.path.getsize(sys.argv[1]))
`
execFileSync(PYTHON, ['-X', 'utf8', '-c', verify, OUT, CHARS], { stdio: 'inherit' })

console.log(`\n→ ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`)
console.log('→ 许可 OFL-1.1：见 public/fonts/noto-serif-sc-OFL.txt')
