/**
 * 图版备选源：大都会艺术博物馆开放数据（Met Open Access）
 * ---------------------------------------------------------------
 * 为什么需要它：Wikimedia Commons 对连续抓取限流很凶（约 6-8 张/分钟就 429），
 * 而这批「中国传统佛教题材」图版里立轴、石刻的候选本就集中在 Commons。
 * Met 的开放数据 API + images.metmuseum.org CDN 没有这个限制，
 * 且它馆藏的中国佛教绘画/造像质量与著录（朝代、材质、出土）比 Commons 更整齐。
 *
 * 取图条件（硬性）：
 *   isPublicDomain === true  且 primaryImage 非空
 *   且 culture / title / classification 命中「中国 + 佛教」，
 *   且命中排除词（日/韩/越/泰/印/尼泊尔/藏传）就丢弃。
 *
 * 用法：
 *   node scripts/fetch-met-photos.mjs --bucket=paintings --terms="Buddhist painting" --limit=12
 *   node scripts/fetch-met-photos.mjs --probe            # 只看能搜到什么，不下载
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'photos', 'cn', 'met')
const RAW = path.join(OUT_DIR, '_raw')
const INDEX = path.join(OUT_DIR, 'INDEX.json')
const CREDITS = path.join(OUT_DIR, 'CREDITS.md')

const PYTHON =
  process.env.DSH_PYTHON ??
  'C:\\Users\\sethf\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe'

const UA = { 'User-Agent': 'HuidengChanlin/2.0 (non-commercial Buddhist site curation)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a)
    return m ? [m[1], m[2] ?? 'true'] : [a, 'true']
  }),
)

const API = 'https://collectionapi.metmuseum.org/public/collection/v1'

/** 中国题材 / 佛教题材 / 排除词（与 Commons 管线同一套口径） */
const CHINA = /china|chinese|中国|中華|中华|yuan dynasty|ming dynasty|qing dynasty|song dynasty|tang dynasty|northern wei|sui dynasty|han dynasty|five dynasties|liao dynasty|jin dynasty|zhou dynasty|dunhuang|yungang|longmen|dazu/i
const BUDDHIST =
  /buddh|bodhisattva|guanyin|avalokite|arhat|luohan|luo han|diamond sutra|lotus sutra|sutra|pagoda|stupa|monastery|monk|dharma|amitabha|amitā|maitreya|ksitigarbha|manjushri|samantabhadra|shakyamuni|śākyamuni|vairocana|nirvana|parinirvana|paradise|pure land|deity|lohan|arhat|观音|菩薩|菩萨|佛像|造像|佛寺|寺院|禅|禪|莲|蓮|lotus|incense|censer|wooden fish|香炉|香爐|念珠|reliquary/i
const REJECT =
  /japan|korea|vietnam|thai|siam|burma|myanmar|cambodia|angkor|india|indian|gandhar|nepal|tibet|tibetan|thangka|mongol|islam|mosque|christ|europe|greek|roman|egypt|africa|persia|islamic|mughal|sword|armor|coin|textile|carpet|jade bi|snuff bottle/i

async function api(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 40000)
    try {
      const r = await fetch(url, { headers: UA, signal: ac.signal })
      clearTimeout(timer)
      if (r.status === 429) {
        await sleep(15000)
        continue
      }
      if (!r.ok) return null
      return await r.json()
    } catch {
      clearTimeout(timer)
      await sleep(3000)
    }
  }
  return null
}

/** Met v1.1 搜索（v1 的 /search 已于 2026-10-01 退役） */
async function search(q, extra = '') {
  const url = `${API}.1/search?q=${encodeURIComponent(q)}${extra}&hasImages=true&limit=120`
  const j = await api(url)
  return j?.objectIDs ?? []
}

async function object(id) {
  return api(`${API}/objects/${id}`)
}

function qualify(o) {
  if (!o || !o.isPublicDomain || !o.primaryImage) return null
  // 只要亚洲艺术部，避免混入欧洲藏品里的「中国风」器物
  if (o.department && o.department !== 'Asian Art') return null
  const blob = [o.title, o.culture, o.period, o.dynasty, o.objectName, o.classification, o.medium, o.artistDisplayName]
    .filter(Boolean)
    .join(' | ')
  if (REJECT.test(blob)) return null
  if (!CHINA.test(blob)) return null
  if (!BUDDHIST.test(blob)) return null
  return o
}

async function download(url) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 60000)
  try {
    const r = await fetch(url, { headers: UA, signal: ac.signal })
    clearTimeout(timer)
    if (!r.ok) return null
    const buf = Buffer.from(await r.arrayBuffer())
    return buf.length > 12000 ? buf : null
  } catch {
    clearTimeout(timer)
    return null
  }
}

const PY = `
import sys, warnings
warnings.filterwarnings('ignore')
from PIL import Image, ImageOps
src, dst = sys.argv[1], sys.argv[2]
im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
im.thumbnail((1600, 1600), Image.LANCZOS)
im.save(dst, 'JPEG', quality=84, optimize=True, progressive=True, subsampling='4:2:0')
w, h = im.size
print(f'{w}x{h}')
`

function reencode(src, dst) {
  try {
    return execFileSync(PYTHON, ['-c', PY, src, dst], {
      encoding: 'utf8',
      timeout: 60000,
      maxBuffer: 1 << 20,
      env: { ...process.env, PYTHONWARNINGS: 'ignore' },
    }).trim()
  } catch (e) {
    console.error(`  ! Pillow：${String(e.stderr ?? e.message).slice(0, 160)}`)
    return null
  }
}

const DEFAULT_TERMS = [
  'Buddhist painting',
  'Buddhist sculpture',
  'Guanyin',
  'Buddha',
  'arhat',
  'sutra',
  'Buddhist temple',
]

async function main() {
  const terms = args.terms ? String(args.terms).split('|') : DEFAULT_TERMS
  const bucket = args.bucket ?? 'met'
  const limit = Number(args.limit ?? 14)
  const probe = args.probe === 'true'

  console.log(`搜索词：${terms.join(' / ')}`)
  const ids = new Set()
  for (const t of terms) {
    const got = await search(t, '&departmentId=6')
    console.log(`  "${t}" → ${got.length} 条`)
    got.forEach((x) => ids.add(x))
    await sleep(1200)
  }
  console.log(`候选 object：${ids.size}`)

  const hits = []
  for (const id of ids) {
    const o = await object(id)
    const q = qualify(o)
    if (q) hits.push(q)
    await sleep(220)
  }
  console.log(`合格：${hits.length}`)

  if (probe) {
    for (const o of hits.slice(0, 60)) {
      console.log(`  [${o.objectID}] ${o.title}  ·  ${o.culture} · ${o.dynasty || o.period} · ${o.objectName}`)
    }
    return
  }

  fs.mkdirSync(RAW, { recursive: true })
  const index = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, 'utf8')) : []
  const existing = new Set(index.map((x) => x.objectID))
  let n = index.filter((x) => x.bucket === bucket).length

  for (const o of hits) {
    if (n >= limit) break
    if (existing.has(o.objectID)) continue
    const name = `${bucket}-met-${String(n + 1).padStart(2, '0')}`
    const raw = path.join(RAW, `${name}.img`)
    const out = path.join(OUT_DIR, `${name}.jpg`)
    const buf = await download(o.primaryImage)
    if (!buf) {
      console.log(`  ✗ ${name}  ${o.title}`)
      continue
    }
    fs.writeFileSync(raw, buf)
    const size = reencode(raw, out)
    if (!size) {
      console.log(`  ✗ ${name} 转码失败`)
      continue
    }
    n++
    index.push({
      file: `${name}.jpg`,
      bucket,
      objectID: o.objectID,
      title: o.title,
      culture: o.culture ?? '',
      period: o.dynasty || o.period || '',
      medium: o.medium ?? '',
      objectName: o.objectName ?? '',
      page: o.objectURL,
      image: o.primaryImage,
      size,
      source: 'The Met (CC0)',
    })
    console.log(`  ✓ ${name}  ${o.title.slice(0, 58)}  [${size}]`)
    // Met CDN 没有 Commons 那么敏感，但仍留间隔
    await sleep(Number(process.env.PACE_MS ?? 1200))
  }

  fs.writeFileSync(INDEX, JSON.stringify(index, null, 1), 'utf8')
  const rows = index.filter((x) => x.bucket === bucket)
  fs.writeFileSync(
    CREDITS,
    [
      '# 图版来源 · 大都会艺术博物馆开放数据（Met Open Access, CC0）',
      '',
      '与 `public/photos/cn/` 下的 Wikimedia 图版同类：**只收中国传统佛教题材**。',
      'Met 开放数据对公版藏品提供 CC0 高清图，且著录（朝代 / 材质 / 门类）比 Commons 更整齐，',
      '此处作为 Commons 限流时的备选源。',
      '',
      '| 文件 | 桶 | 标题 | 文化 | 年代 | 门类 | 素材页 |',
      '| --- | --- | --- | --- | --- | --- | --- |',
      ...rows.map(
        (x) =>
          `| ${x.file} | ${x.bucket} | ${x.title} | ${x.culture} | ${x.period} | ${x.objectName} | [Met ${x.objectID}](${x.page}) |`,
      ),
    ].join('\n') + '\n',
    'utf8',
  )
  console.log(`\n${bucket}: 累计 ${rows.length} 张 → ${path.relative(ROOT, OUT_DIR)}`)
}

await main()
