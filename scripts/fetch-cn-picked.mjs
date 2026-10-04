/**
 * 下载人工精选清单（scripts/cn-picked.json）→ public/photos/cn/<bucket>-NN.jpg
 * 复用 Pillow 统一转码（长边 ≤1600、sRGB、渐进式 JPEG q84）+ 双指纹去重。
 * 产出：public/photos/cn/CREDITS.md、src/data/photos-cn.json
 *
 * 用法：node scripts/fetch-cn-picked.mjs [--only=paintings,statues] [FORCE=1]
 *
 * 注：具名专用图（首页 Hero、各页题头等）在下载完成后由 scripts/pick-named-photos.mjs
 * 按桶内的实际文件名写入 photos-cn.json 的 named 字段，不在此处硬编码序号。
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

const PYTHON =
  process.env.DSH_PYTHON ??
  'C:\\Users\\sethf\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe'

const UA = { 'User-Agent': 'HuidengChanlin/2.0 (non-commercial Buddhist site curation)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').split('=')[1]
const onlySet = only ? new Set(only.split(',')) : null

const picked = JSON.parse(fs.readFileSync(PICKED, 'utf8'))
fs.mkdirSync(RAW, { recursive: true })

async function download(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 45000)
    try {
      const r = await fetch(url, { headers: UA, signal: ac.signal })
      clearTimeout(timer)
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer())
        // 只做「够大」的粗筛，真正的格式判定交给 Pillow。
        // 不要在这里要求 JPEG 魔数：Commons 上大量中国佛画是 PNG/TIFF，
        // 早先按 JPEG 魔数过滤，把敦煌绢画、台北故宫立轴整批丢掉了。
        if (buf.length < 12000) return null
        // 超过 15MB 的多为未缩放的原始扫描件，转码后一样是 1600px，没必要下载
        if (buf.length > 15 * 1024 * 1024) return null
        return buf
      }
      if (r.status === 429 || r.status >= 500) {
        // Commons 在连续抓取时会返回 429（正文只是普通错误页，不含提示语）。
        // 退避要够长，但也不能太长：单个条目最多等 2 次就该放弃，
        // 否则一个被限流的条目会把整条队列拖住几分钟。
        if (i >= 1) return null
        console.log(`    · 限流 ${r.status}，等待 40s`)
        await sleep(40000)
        continue
      }
      return null
    } catch (e) {
      clearTimeout(timer)
      // 超时/连接被重置：退避后重试，绝不无限等待
      console.log(`    · 重试 ${i + 1}/${tries}（${String(e?.name ?? e).slice(0, 40)}）`)
      await sleep(3000 + i * 4000)
    }
  }
  return null
}

const PY = `
import sys, json, warnings
warnings.filterwarnings('ignore')
from PIL import Image, ImageOps
src, dst = sys.argv[1], sys.argv[2]
resize = len(sys.argv) < 4 or sys.argv[3] != 'keep'
im = Image.open(src)
im = ImageOps.exif_transpose(im).convert('RGB')
if resize:
    im.thumbnail((1600, 1600), Image.LANCZOS)
    im.save(dst, 'JPEG', quality=84, optimize=True, progressive=True, subsampling='4:2:0')
    out = im
else:
    out = im

# 判重指纹 = dHash（结构） + 8x6 网格 RGB 均值（颜色）
# 只比 dHash 会把「同为立轴、大片留白」的不同佛画误判成同一张，
# 因此必须同时要求颜色也接近。
small = out.convert('L').resize((9, 8), Image.LANCZOS)
px = list(small.get_flattened_data()) if hasattr(small, 'get_flattened_data') else list(small.getdata())
bits = 0
for r in range(8):
    for c in range(8):
        bits = (bits << 1) | (1 if px[r*9+c] > px[r*9+c+1] else 0)

grid = out.resize((8, 6), Image.LANCZOS)
gp = list(grid.get_flattened_data()) if hasattr(grid, 'get_flattened_data') else list(grid.getdata())
hist = []
for (rr, gg, bb) in gp:
    hist.append(round(rr / 255.0, 3))
    hist.append(round(gg / 255.0, 3))
    hist.append(round(bb / 255.0, 3))

print(json.dumps({'h': bits, 'c': hist, 'w': out.width, 'h2': out.height}))
`

/**
 * 转码 + 取指纹。
 * `resize=false` 时只读现有成品、不改写、不做缩放——用于「复用已下载图片」。
 * 必须支持这条路：_raw 会在成功一轮后清掉，若复用判定只能读 _raw，
 * 下一轮就会把已有图片全部当成「产物无法读取」重新下载一遍（实测踩过）。
 */
function reencode(src, dst, resize = true) {
  try {
    const out = execFileSync(
      PYTHON,
      ['-c', PY, src, dst, ...(resize ? [] : ['keep'])],
      {
        encoding: 'utf8',
        timeout: 60000,
        maxBuffer: 1 << 20,
        env: { ...process.env, PYTHONWARNINGS: 'ignore' },
      },
    ).trim()
    const last = out.split('\n').filter(Boolean).pop() ?? ''
    return JSON.parse(last)
  } catch (e) {
    console.error(`  ! Pillow：${String(e.stderr ?? e.message).slice(0, 180)}`)
    return null
  }
}

const hamming = (a, b) => {
  let x = a ^ b
  let n = 0
  while (x) {
    n += x & 1
    x >>= 1
  }
  return n
}

/**
 * 判重：**默认关闭**。
 * 理由：清单是人工逐条挑选的，各条本就不同；而中国佛画多为「立轴 + 大片留白」，
 * 结构指纹（dHash）与颜色均值都高度相似，任何阈值都会误杀真品
 * （实测把「释迦三尊图轴」与「罗汉图轴」判成同一张）。
 * 若确需判重（例如批量抓取而非人工精选），设 DEDUP=1 启用：
 * 结构 dHash ≤ 3 **且** 颜色 48 维网格均值 L1 均值 ≤ 0.10 才算重复。
 */
const DEDUP = process.env.DEDUP === '1'

function isDuplicate(hashes, fp) {
  if (!DEDUP) return null
  for (const x of hashes) {
    if (hamming(x.h, fp.h) > 3) continue
    let l1 = 0
    for (let i = 0; i < fp.c.length; i++) l1 += Math.abs(fp.c[i] - x.c[i])
    if (l1 / fp.c.length <= 0.1) return x
  }
  return null
}

const manifest = {}
const hashes = []
const credits = [
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
  '| 文件 | 桶 | 来源页面 | 作者 | 许可 |',
  '| --- | --- | --- | --- | --- |',
]

let total = 0
for (const [bucket, arr] of Object.entries(picked)) {
  manifest[bucket] = []
  if (onlySet && !onlySet.has(bucket)) {
    // 本次不抓这个桶：只登记**磁盘上真实存在**的文件。
    // 不要按 arr 全量生成文件名——那会让清单里出现一堆不存在的图，
    // 前端就会去请求 404（实测踩过：清单 232 条、磁盘只有 125 张）。
    for (let k = 1; k <= arr.length; k++) {
      const f = `${bucket}-${String(k).padStart(2, '0')}.jpg`
      if (fs.existsSync(path.join(OUT_DIR, f))) manifest[bucket].push(f)
    }
    total += manifest[bucket].length
    continue
  }
  let i = 0
  for (const c of arr) {
    const name = `${bucket}-${String(i + 1).padStart(2, '0')}`
    const rawPath = path.join(RAW, `${name}.jpg`)
    const outPath = path.join(OUT_DIR, `${name}.jpg`)
    if (fs.existsSync(outPath) && !process.env.FORCE) {
      // 已下载：直接读成品取指纹（不缩放、不改写）；
      // _raw 可能已被清掉，所以不能依赖它。
      const fp = reencode(outPath, outPath, false)
      if (!fp) {
        console.log(`  ⟳ ${name} 成品损坏，重新下载`)
        fs.rmSync(outPath, { force: true })
      } else {
        hashes.push({ ...fp, name })
        manifest[bucket].push(`${name}.jpg`)
        credits.push(`| ${name}.jpg | ${bucket} | [${c.title}](${c.page}) | ${c.author} | ${c.license} |`)
        i++
        total++
        continue
      }
    }
    const buf = await download(c.url)
    if (!buf) {
      console.log(`  ✗ ${name}  ${c.title.slice(0, 70)}`)
      continue
    }
    fs.writeFileSync(rawPath, buf)
    const fp = reencode(rawPath, outPath)
    if (!fp) {
      console.log(`  ✗ ${name} 转码失败`)
      continue
    }
    const dup = isDuplicate(hashes, fp)
    if (dup) {
      fs.rmSync(outPath, { force: true })
      console.log(`  ↺ ${name} 与 ${dup.name} 视觉重复，跳过  ${c.title.slice(0, 55)}`)
      continue
    }
    hashes.push({ ...fp, name })
    manifest[bucket].push(`${name}.jpg`)
    credits.push(`| ${name}.jpg | ${bucket} | [${c.title}](${c.page}) | ${c.author} | ${c.license} |`)
    i++
    total++
    console.log(`  ✓ ${name}  ${c.title.slice(0, 62)}`)
    // 节流：Commons 对连续抓取很敏感（约 6-8 张/分钟就会 429），
    // 每次成功下载后留足间隔，比事后长退避划算得多。
    await sleep(Number(process.env.PACE_MS ?? 6500))
  }
  console.log(`\n✔ ${bucket}: ${manifest[bucket].length}`)
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n', 'utf8')
fs.writeFileSync(path.join(OUT_DIR, 'CREDITS.md'), credits.join('\n') + '\n', 'utf8')
console.log(`\n合计 ${total} 张 → public/photos/cn/`)
console.log(`清单 → src/data/photos-cn.json`)

/* 全部成功后清掉原始大图（约 200MB），只留转码后的成品 */
if (!onlySet && !process.env.KEEP_RAW) {
  fs.rmSync(RAW, { recursive: true, force: true })
  console.log('已清理 public/photos/cn/_raw/')
}
