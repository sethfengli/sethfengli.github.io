/**
 * 重建书法体（font-brush）的项目子集。
 * ---------------------------------------------------------------
 * 背景：`@fontsource/ma-shan-zheng` 把汉字切成 92 个 unicode-range 分片，
 * 合计 5.99 MB —— 而书法体全站只用在签文诗句 / 祝福语 / zen3d 画布题字上，
 * 实际字符不到 1000 个。首屏虽然只按需下载，但 dist 要背 92 个文件、
 * 且 canvas 里的 `ctx.font = '18px "Ma Shan Zheng"'` 在字体未就绪时会画成回退体。
 *
 * 做法：把 92 个分片 merge 成一份完整字体，再按「全站书法体实际用字」子集化，
 * 输出单个 `public/fonts/ma-shan-zheng-subset.woff2`（约 380 KB）。
 *
 * 依赖：python 侧需要 fonttools + brotli
 *   <python> -m pip install fonttools brotli
 *
 * 用法：node scripts/make-brush-subset.mjs
 *   （改动签文/祝福语后重跑一次即可；src/index.css 里的 @font-face 无需改动）
 *
 * ⚠ 路径处理：Windows 绝对路径含反斜杠（`D:\FengLi\...`），**不能**内联进 Python
 *   源码字符串 —— `\F` 会被当成转义序列，实测报
 *   `SyntaxWarning: invalid escape sequence '\F'` 并写出 `Web\x0cou` 这种坏路径。
 *   这里一律走 argv 传参（Python 用 `sys.argv[n]` 取）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { writeBrushCharsFile } from './collect-brush.mjs'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)

const PYTHON =
  process.env.DSH_PYTHON ??
  'C:\\Users\\sethf\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe'

const PKG = 'node_modules/@fontsource/ma-shan-zheng/files'
const OUT = 'public/fonts/ma-shan-zheng-subset.woff2'
const BRUSH_CHARS = ART('build/brush-chars.txt')
const MERGED_TTF = ART('build/msz-full.ttf')

// 1) 收集书法体实际用字（直接 import 调用，不再 spawn 兄弟脚本）
const { chars } = writeBrushCharsFile(BRUSH_CHARS)
console.log(`书法体用字 ${chars.length} 个 → ${BRUSH_CHARS}`)

// 2) ASCII 可打印字符也带上，避免 canvas 上中英混排时换字体
let ascii = ''
for (let i = 32; i < 127; i++) ascii += String.fromCharCode(i)
const all = [...new Set([...chars, ...ascii])].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join('')
fs.writeFileSync(BRUSH_CHARS, all, 'utf8')

fs.mkdirSync(path.dirname(OUT), { recursive: true })

// 3) merge 分片 → 子集化 → woff2
//    所有路径都从 argv 取（见文件头关于反斜杠转义的告警）。
//    merge 中间产物固定写 build/msz-full.ttf：与历史脚本一致，便于逐字节比对重现性。
const py = `
import glob, os, sys
from fontTools.merge import Merger
from fontTools.subset import main as subset_main

src_dir, text_file, out_file, ttf = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
files = sorted(glob.glob(os.path.join(src_dir, '*-400-normal.woff2')))
if not files:
    raise SystemExit('no source subsets found in: ' + src_dir)
merged = Merger().merge(files)
merged.save(ttf)
print('merged glyphs:', len(merged.getBestCmap()), file=sys.stderr)

sys.argv = ['pyftsubset', ttf,
            '--text-file=' + text_file,
            '--flavor=woff2',
            '--layout-features=*',
            '--no-hinting',
            '--desubroutinize',
            '--output-file=' + out_file]
subset_main()
print('subset bytes:', os.path.getsize(out_file), file=sys.stderr)
`
execFileSync(PYTHON, ['-X', 'utf8', '-c', py, ART(PKG), BRUSH_CHARS, ART(OUT), MERGED_TTF], {
  stdio: 'inherit',
})

console.log(`\n→ ${OUT} (${(fs.statSync(ART(OUT)).size / 1024).toFixed(0)} KB)`)
console.log('→ 记得把 OFL 许可一并保留：node_modules/@fontsource/ma-shan-zheng/LICENSE')
