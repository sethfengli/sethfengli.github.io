/**
 * 核对「cn-picked.json 的条目 → 磁盘文件名」映射是否仍然成立。
 * ---------------------------------------------------------------
 * 判据：按抓取时的同一 URL 与同一转码参数重新生成一张，与磁盘成品**逐字节比较**。
 * 之所以需要它：池子/清单可能被重抓过，而文件名是按「下标 + 1」定的，
 * 一旦清单换了，磁盘上的旧文件就会**名义上**对应到新条目（署名张冠李戴）。
 *
 * 用法：node scripts/verify-photo-ids.mjs                 # 默认抽 4 张
 *       node scripts/verify-photo-ids.mjs "grottoes:25,grottoes:31,halls:1"
 *
 * 注意：会真的联网下载（每张间隔 9s 避开 429）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)


const PYTHON =
  process.env.DSH_PYTHON ??
  'C:\\Users\\sethf\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe'

const ENC_JPEG = `
import sys
from PIL import Image, ImageOps
im = Image.open(sys.argv[1])
im = ImageOps.exif_transpose(im).convert('RGB')
im.thumbnail((1600, 1600), Image.LANCZOS)
im.save(sys.argv[2], 'JPEG', quality=84, optimize=True, progressive=True, subsampling='4:2:0')
`
const ENC_WEBP = `
import sys
from PIL import Image, ImageOps
im = Image.open(sys.argv[1])
im = ImageOps.exif_transpose(im).convert('RGB')
im.thumbnail((1600, 1600), Image.LANCZOS)
im.save(sys.argv[2], 'WEBP', quality=80, method=5)
`

const UA = { 'User-Agent': 'HuidengChanlin/2.0 (non-commercial Buddhist site curation)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const arg = process.argv[2] ?? ''
const targets = arg
  ? arg.split(',').map((s) => {
      const i = s.lastIndexOf(':')
      return [s.slice(0, i), Number(s.slice(i + 1))]
    })
  : [
      ['grottoes', 25],
      ['grottoes', 31],
      ['halls', 1],
      ['sutras', 6],
    ]

const picked = JSON.parse(fs.readFileSync('scripts/cn-picked.json', 'utf8'))
fs.mkdirSync(ART('build/verify'), { recursive: true })

for (const [b, n] of targets) {
  const c = picked[b]?.[n - 1]
  const name = `${b}-${String(n).padStart(2, '0')}`
  if (!c) {
    console.log(`${name}  清单里没有第 ${n} 条`)
    continue
  }
  const r = await fetch(c.url, { headers: UA })
  if (!r.ok) {
    console.log(`${name}  HTTP ${r.status}`)
    continue
  }
  const raw = `${ART('build/verify')}/${name}-raw`
  fs.writeFileSync(raw, Buffer.from(await r.arrayBuffer()))

  // 磁盘上是 .webp（新管线）还是 .jpg（旧管线）？
  const webp = `public/photos/cn/${name}.webp`
  const jpg = `public/photos/cn/${name}.jpg`
  const disk = fs.existsSync(webp) ? webp : fs.existsSync(jpg) ? jpg : null
  if (!disk) {
    console.log(`${name}  磁盘上没有这个文件（尚未抓到）`)
    continue
  }
  const out = `${ART('build/verify')}/${name}${path.extname(disk)}`
  execFileSync(PYTHON, ['-c', path.extname(disk) === '.webp' ? ENC_WEBP : ENC_JPEG, raw, out], {
    stdio: 'ignore',
  })
  const same = fs.readFileSync(disk).equals(fs.readFileSync(out))
  console.log(`${name}  条目="${c.title.slice(0, 44).padEnd(46)}" 与磁盘逐字节相同: ${same}`)
  await sleep(9000)
}
