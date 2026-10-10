/**
 * 图版抓取（WebP 版）· 直接「清单 → 文件」对应，不再有「编号 → 前 N 条」的欠定映射。
 * ---------------------------------------------------------------------------
 * 与旧管线（fetch-cn-picked.mjs + rebuild-photo-manifest.mjs）的区别：
 *
 *   旧：逐条尝试下载，成功一张才 +1 编号。于是磁盘上的 <bucket>-NN 究竟对应
 *       清单里第几条**只能反推**，中断一次就整体错位，还要靠 rebuild 脚本猜。
 *   新：编号 == 清单下标 + 1，**恒定**。下载失败的条目留空（不进清单、不进署名），
 *       因此任意时刻「清单 = 磁盘实况 = 署名」三者天然一致。
 *
 * 另外就是格式：统一输出 **WebP q80**（视觉无损，体积约减 40%）。
 *
 * 用法：
 *   node scripts/fetch-cn-webp.mjs                     # 抓所有桶
 *   node scripts/fetch-cn-webp.mjs --only=halls,sutras # 只抓这些桶
 *   node scripts/fetch-cn-webp.mjs --migrate           # 把已有 .jpg 一键转 .webp（不下载）
 *
 * 环境变量：PACE_MS（默认 14000）、FORCE=1（忽略已存在重下）
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'photos', 'cn')
const RAW = path.join(OUT_DIR, '_raw')
const PICKED = path.join(__dirname, 'cn-picked.json')
const MANIFEST = path.join(ROOT, 'src', 'data', 'photos-cn.json')
const CREDITS = path.join(OUT_DIR, 'CREDITS.md')

const PYTHON =
  process.env.DSH_PYTHON ??
  'C:\\Users\\sethf\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe'

const UA = { 'User-Agent': 'HuidengChanlin/2.0 (non-commercial Buddhist site curation)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').split('=')[1]
const onlySet = only ? new Set(only.split(',')) : null
const migrate = process.argv.includes('--migrate')

const picked = JSON.parse(fs.readFileSync(PICKED, 'utf8'))
fs.mkdirSync(OUT_DIR, { recursive: true })

/** 转码为 WebP（长边 ≤1600），并输出尺寸。 */
const PY = `
import sys, json, warnings
warnings.filterwarnings('ignore')
from PIL import Image, ImageOps
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src)
im = ImageOps.exif_transpose(im).convert('RGB')
im.thumbnail((1600, 1600), Image.LANCZOS)
im.save(dst, 'WEBP', quality=80, method=5)
print(json.dumps({'w': im.width, 'h': im.height}))
`

function toWebp(src, dst) {
  try {
    const out = execFileSync(PYTHON, ['-c', PY, src, dst], {
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 1 << 20,
      env: { ...process.env, PYTHONWARNINGS: 'ignore' },
    }).trim()
    return JSON.parse(out.split('\n').filter(Boolean).pop() ?? '{}')
  } catch (e) {
    console.error(`  ! Pillow：${String(e.stderr ?? e.message).slice(0, 200)}`)
    return null
  }
}

async function download(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 45000)
    try {
      const r = await fetch(url, { headers: UA, signal: ac.signal })
      clearTimeout(timer)
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer())
        // 只做粗筛；格式判定交给 Pillow（Commons 上大量中国佛画是 PNG/TIFF）
        if (buf.length < 12000) return null
        if (buf.length > 15 * 1024 * 1024) return null
        return buf
      }
      if (r.status === 429 || r.status >= 500) {
        if (i >= 1) return null
        console.log(`    · 限流 ${r.status}，等待 40s`)
        await sleep(40000)
        continue
      }
      return null
    } catch (e) {
      clearTimeout(timer)
      console.log(`    · 重试 ${i + 1}/${tries}（${String(e?.name ?? e).slice(0, 40)}）`)
      await sleep(3000 + i * 4000)
    }
  }
  return null
}

function creditsHeader() {
  return [
    '# 图片素材来源与署名（Wikimedia Commons · 中国传统佛教题材）',
    '',
    '**只收录中国传统佛教题材**：中国大陆及港台之佛画（敦煌经变、宋元明清绢画、水墨观音）、',
    '石窟摩崖（云冈 · 龙门 · 大足 · 炳灵寺 · 乐山）、历代造像（北魏至清：石雕、木雕、鎏金铜、德化白瓷）、',
    '殿宇佛塔、敦煌写经与刻经、山水云海、莲池。',
    '',
    '已剔除日本、韩国、越南、泰国、缅甸、印度、尼泊尔、藏传及欧美本地题材。',
    '',
    '注：不少中国造像/佛画现藏于海外博物馆（大英博物馆、吉美、宾大、克利夫兰、斯德哥尔摩东亚馆等），',
    '其**文物来源为中国**，故予以保留。',
    '',
    '注：文件名与来源条目**一一对应**（`<bucket>-NN.webp` = 该桶清单第 NN 条），',
    '因此中断续抓后不会出现「编号 → 标题」错位。',
    '',
    '| 文件 | 桶 | 来源页面 | 作者 | 许可 |',
    '| --- | --- | --- | --- | --- |',
  ]
}

/** 落盘：清单 + 署名，两者都由 rows 单一来源生成。 */
function persist(manifest, rows) {
  const ordered = {}
  for (const [b, arr] of Object.entries(manifest)) ordered[b] = arr
  const prev = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {}
  if (prev.named) ordered.named = prev.named
  fs.writeFileSync(MANIFEST, JSON.stringify(ordered, null, 1) + '\n', 'utf8')
  fs.writeFileSync(
    CREDITS,
    creditsHeader()
      .concat(
        rows.map(
          (r) => `| ${r.file} | ${r.bucket} | [${r.title}](${r.page}) | ${r.author} | ${r.license} |`,
        ),
      )
      .join('\n') + '\n',
    'utf8',
  )
}

/* ────────────────────────────────────────────────────────────
   模式一：--migrate —— 把已有 .jpg 就地转成 .webp（不联网）
   ──────────────────────────────────────────────────────────── */
if (migrate) {
  let n = 0
  const rows = []
  for (const [bucket, arr] of Object.entries(picked)) {
    for (let i = 0; i < arr.length; i++) {
      const base = `${bucket}-${String(i + 1).padStart(2, '0')}`
      const jpg = path.join(OUT_DIR, `${base}.jpg`)
      const webp = path.join(OUT_DIR, `${base}.webp`)
      if (!fs.existsSync(jpg)) continue
      if (!fs.existsSync(webp) || process.env.FORCE) {
        const fp = toWebp(jpg, webp)
        if (!fp) {
          console.log(`  ✗ ${base} 转码失败`)
          continue
        }
      }
      fs.rmSync(jpg, { force: true })
      rows.push({ file: `${base}.webp`, bucket, ...arr[i] })
      n++
    }
  }
  const manifest = {}
  for (const [b, arr] of Object.entries(picked)) {
    manifest[b] = rows.filter((r) => r.bucket === b).map((r) => r.file)
  }
  persist(manifest, rows)
  console.log(`\n✔ 迁移完成：${n} 张 → WebP`)
  console.log(`→ ${path.relative(ROOT, MANIFEST)} / CREDITS.md 已同步`)
  process.exit(0)
}

/* ────────────────────────────────────────────────────────────
   模式二：正常抓取
   ──────────────────────────────────────────────────────────── */
fs.mkdirSync(RAW, { recursive: true })

const manifest = {}
const rows = []
let downloaded = 0
let reused = 0
let failed = 0

for (const [bucket, arr] of Object.entries(picked)) {
  manifest[bucket] = []
  if (onlySet && !onlySet.has(bucket)) {
    // 不抓这个桶：沿用磁盘上已存在的文件（编号 == 下标 + 1，可精确判断）
    for (let i = 0; i < arr.length; i++) {
      const f = `${bucket}-${String(i + 1).padStart(2, '0')}.webp`
      if (fs.existsSync(path.join(OUT_DIR, f))) {
        manifest[bucket].push(f)
        rows.push({ file: f, bucket, ...arr[i] })
      }
    }
    continue
  }

  for (let i = 0; i < arr.length; i++) {
    const c = arr[i]
    const base = `${bucket}-${String(i + 1).padStart(2, '0')}`
    const webp = path.join(OUT_DIR, `${base}.webp`)

    if (fs.existsSync(webp) && !process.env.FORCE) {
      reused++
      manifest[bucket].push(`${base}.webp`)
      rows.push({ file: `${base}.webp`, bucket, ...c })
      continue
    }

    const buf = await download(c.url)
    if (!buf) {
      console.log(`  ✗ ${base}  ${c.title.slice(0, 68)}`)
      failed++
      continue
    }
    const rawPath = path.join(RAW, `${base}.bin`)
    fs.writeFileSync(rawPath, buf)
    const fp = toWebp(rawPath, webp)
    fs.rmSync(rawPath, { force: true })
    if (!fp) {
      console.log(`  ✗ ${base} 转码失败`)
      failed++
      continue
    }
    downloaded++
    manifest[bucket].push(`${base}.webp`)
    rows.push({ file: `${base}.webp`, bucket, ...c })
    persist(manifest, rows)
    console.log(`  ✓ ${base}  ${c.title.slice(0, 62)}`)
    await sleep(Number(process.env.PACE_MS ?? 14000))
  }
  console.log(`\n✔ ${bucket}: ${manifest[bucket].length}`)
  persist(manifest, rows)
}

fs.rmSync(RAW, { recursive: true, force: true })

const total = Object.values(manifest).reduce((a, v) => a + v.length, 0)
console.log(`\n合计 ${total} 张（新下 ${downloaded} · 复用 ${reused} · 失败 ${failed}）`)
console.log(`→ src/data/photos-cn.json / CREDITS.md 已同步`)
