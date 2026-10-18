/**
 * 横幅 / 导览卡图片体检
 * ---------------------------------------------------------------
 * 第 13 轮用户要求「以后所有这种 banner 图片都要检查一下是否符合要求」。
 * 这个脚本把「要求」变成可执行判据，避免再靠肉眼漏掉：
 *
 *   1. 具名图必须真的在它声明的桶里（`named()` 找不到会静默退回桶内第一张）；
 *      —— 第 13 轮的 `garden` bug 就是 `landscape-04` 配了 `grottoes` 校验桶，
 *         于是「关于本院」横幅悄悄显示成 `grottoes-01` 的阴暗浮雕特写。
 *   2. 文件必须存在，且是 WebP。
 *   3. 按真实显示比例（桌面 16:10 / 移动 4:3 / 导览卡 4:3）计算 cover 裁切
 *      的保留面积；竖构图必须显式给 `position` 焦点，否则裁掉主体也发现不了。
 *   4. 一份人工复核过的「不要用于横幅」清单（字幕、标牌、水印、电线、
 *      博物馆标签、过于压抑的考古特写等），命中即报错。
 *
 * 用法：node scripts/audit-banners.mjs [--json]
 * 退出码：0 = 无错误（警告可接受）；1 = 有错误。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PHOTOS = path.join(ROOT, 'public', 'photos', 'cn')
const MANIFEST = path.join(ROOT, 'src', 'data', 'photos-cn.json')
const CONTENT = path.join(ROOT, 'src', 'lib', 'content.ts')
const PAGES = path.join(ROOT, 'src', 'pages')

const json = process.argv.includes('--json')

/* ------------------------------------------------------------------ */
/* 人工复核：这些图不适合做横幅（原因写清楚，换图时知道为什么）          */
/* ------------------------------------------------------------------ */
const NOT_FOR_BANNER = new Map([
  ['grottoes-01.webp', '阴暗、局促的云冈浮雕特写；只适合做小图，做横幅会压抑'],
  ['grottoes-16.webp', '整龛佛像偏「考古现场」，中央像被两侧胁侍挤住'],
  ['halls-08.webp', 'HDR 蓝调过重，右侧电线、左下垃圾桶都进了画面'],
  ['statues-55.webp', '游客栏杆 + 竖构图，裁成横幅只剩躯干'],
  ['lotus-02.webp', '水面浑浊，画面里有塑料管 / 杂物，不像寺院莲池'],
  ['lotus-03.webp', '现代校园水池与灰楼，不是寺院莲池'],
  ['sutras-06.webp', '博物馆藏石拓，带蓝色藏品编号标签'],
  ['sutras-08.webp', '带色卡与藏品编号，属于档案照'],
  ['paintings-26.webp', '深色两联绢本，中缝明显，做横幅会「断」'],
  ['paintings-37.webp', '大面积空白绢本——上一轮已被用户点名「像空白图」'],
  ['statues-31.webp', '博物馆展柜与墙面标识入镜'],
  ['statues-22.webp', '展签上的中文说明牌入镜'],
])

/* ------------------------------------------------------------------ */
/* 页面规格：PageBanner 从源码解析；首页 hero / 四门卡手工列出            */
/* ------------------------------------------------------------------ */
const PAGE_ROUTE = {
  'About.tsx': '/about',
  'Dharma.tsx': '/dharma',
  'PrayerWall.tsx': '/prayer',
  'Lots.tsx': '/lots',
  'Articles.tsx': '/articles',
}

// 首页不是 PageBanner：hero 是 16:10 CoverImage；四门卡是 4:3。
const HOME_SPECS = [
  { page: 'Home.tsx', route: '/', role: 'hero', key: 'hero', aspect: 16 / 10, position: '50% 46%' },
  { page: 'Home.tsx', route: '/', role: 'door card', key: 'gate', aspect: 4 / 3 },
  { page: 'Home.tsx', route: '/', role: 'door card', key: 'bell', aspect: 4 / 3 },
  { page: 'Home.tsx', route: '/', role: 'door card', key: 'lantern', aspect: 4 / 3 },
  { page: 'Home.tsx', route: '/', role: 'door card', key: 'guanyinArt', aspect: 4 / 3, position: '50% 30%' },
]

function parsePageBanners() {
  const out = []
  for (const file of fs.readdirSync(PAGES)) {
    if (!file.endsWith('.tsx')) continue
    const src = fs.readFileSync(path.join(PAGES, file), 'utf8')
    const route = PAGE_ROUTE[file]
    if (!route) continue
    // PageBanner 都是自闭合标签；用非贪婪匹配到第一个 />
    for (const m of src.matchAll(/<PageBanner\b([\s\S]*?)\/>/g)) {
      const block = m[1]
      const key = block.match(/image=\{NAMED_PHOTOS\.(\w+)\(\)\}/)?.[1]
      if (!key) continue
      const position = block.match(/position="([^"]+)"/)?.[1]
      out.push({ page: file, route, role: 'banner', key, aspect: 16 / 10, position })
    }
  }
  return out
}

/* ------------------------------------------------------------------ */
/* 源码解析：具名图 → 校验桶                                           */
/* ------------------------------------------------------------------ */
function parseNamedBuckets() {
  const src = fs.readFileSync(CONTENT, 'utf8')
  const block = src.match(/const NAMED_KEY_FALLBACK = \{([\s\S]*?)\} as const/)?.[1]
  if (!block) throw new Error('content.ts 里找不到 NAMED_KEY_FALLBACK')
  const buckets = {}
  for (const m of block.matchAll(/(\w+):\s*'([^']+)'/g)) buckets[m[1]] = m[2]
  return buckets
}

/* ------------------------------------------------------------------ */
/* WebP 尺寸（不引依赖）：VP8 / VP8L / VP8X                            */
/* ------------------------------------------------------------------ */
function webpSize(file) {
  const b = fs.readFileSync(file)
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null
  const chunk = b.toString('ascii', 12, 16)
  if (chunk === 'VP8 ') {
    // 关键帧起始码 9d 01 2a 之后是 14-bit 宽高
    if (!(b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a)) return null
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff }
  }
  if (chunk === 'VP8L') {
    if (b[20] !== 0x2f) return null
    const bits = b.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (chunk === 'VP8X') {
    return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) }
  }
  return null
}

/** object-fit: cover 时保留的面积比例 */
function coverRetention(srcAspect, targetAspect) {
  return srcAspect >= targetAspect ? targetAspect / srcAspect : srcAspect / targetAspect
}

/* ------------------------------------------------------------------ */
/* 主流程                                                              */
/* ------------------------------------------------------------------ */
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
const namedMap = manifest.named ?? {}
const namedBuckets = parseNamedBuckets()
const specs = [...parsePageBanners(), ...HOME_SPECS]
const rows = []
const errors = []
const warnings = []

// 1) 所有具名图都检查「文件存在 + 在声明桶内」
for (const [key, bucket] of Object.entries(namedBuckets)) {
  const file = namedMap[key]
  if (!file) {
    errors.push(`具名图 ${key} 未在 photos-cn.json 的 named 字段登记`)
    continue
  }
  const disk = path.join(PHOTOS, file)
  if (!fs.existsSync(disk)) {
    errors.push(`具名图 ${key} → ${file} 磁盘上不存在`)
    continue
  }
  const arr = Array.isArray(manifest[bucket]) ? manifest[bucket] : []
  if (!arr.includes(file)) {
    errors.push(
      `具名图 ${key} → ${file} 不在校验桶 ${bucket} 内（named() 会静默退回桶内第一张）`,
    )
  }
}

// 2) 逐条核对每个显示位
for (const spec of specs) {
  const file = namedMap[spec.key]
  const row = {
    route: spec.route,
    role: spec.role,
    key: spec.key,
    file: file ?? '(missing)',
    size: null,
    aspect: null,
    retention: null,
    position: spec.position ?? '',
    notes: [],
    level: 'ok',
  }
  if (!file) {
    row.level = 'error'
    row.notes.push('named 未登记')
    errors.push(`${spec.route} ${spec.role}：named.${spec.key} 未登记`)
    rows.push(row)
    continue
  }
  const disk = path.join(PHOTOS, file)
  const size = fs.existsSync(disk) ? webpSize(disk) : null
  if (!size || !size.width || !size.height) {
    row.level = 'error'
    row.notes.push('无法读取 WebP 尺寸')
    errors.push(`${spec.route} ${spec.role}：${file} 无法读取尺寸（文件损坏或不是 WebP）`)
    rows.push(row)
    continue
  }
  const aspect = size.width / size.height
  const retention = coverRetention(aspect, spec.aspect)
  row.size = `${size.width}x${size.height}`
  row.aspect = aspect
  row.retention = retention

  if (NOT_FOR_BANNER.has(file)) {
    row.level = 'error'
    row.notes.push(`禁用于横幅：${NOT_FOR_BANNER.get(file)}`)
    errors.push(`${spec.route} ${spec.role}：${file} —— ${NOT_FOR_BANNER.get(file)}`)
  }

  // 竖构图必须显式给焦点；给焦点仍裁掉大半，只算警告。
  // 导览卡是 4:3 小图，容许比横幅更紧的裁切（43% + 焦点即可读）。
  const minRetention = spec.role === 'door card' ? 0.4 : 0.55
  if (aspect < 1 && !spec.position) {
    row.level = 'error'
    row.notes.push('竖构图但未设置 position 焦点')
    errors.push(`${spec.route} ${spec.role}：${file} 是竖构图（${aspect.toFixed(2)}），必须给 position 焦点`)
  } else if (retention < minRetention && !spec.position) {
    row.level = 'error'
    row.notes.push(`裁切只保留 ${(retention * 100).toFixed(0)}%，且无焦点`)
    errors.push(
      `${spec.route} ${spec.role}：${file} 在这个比例下只保留 ${(retention * 100).toFixed(0)}%，请换横图或给 position`,
    )
  } else if (retention < minRetention) {
    row.level = row.level === 'error' ? 'error' : 'warn'
    row.notes.push(`保留 ${(retention * 100).toFixed(0)}%（已给焦点 ${spec.position}）`)
    warnings.push(`${spec.route} ${spec.role}：${file} 保留 ${(retention * 100).toFixed(0)}%`)
  } else if (retention < 0.65 && spec.role !== 'door card') {
    row.level = row.level === 'error' ? 'error' : 'warn'
    row.notes.push(`保留 ${(retention * 100).toFixed(0)}%`)
    warnings.push(`${spec.route} ${spec.role}：${file} 保留 ${(retention * 100).toFixed(0)}%`)
  }

  if (!row.notes.length) row.notes.push(`保留 ${(retention * 100).toFixed(0)}%`)
  rows.push(row)
}

if (json) {
  console.log(JSON.stringify({ rows, errors, warnings }, null, 2))
} else {
  console.log('横幅 / 导览卡图片体检')
  console.log('─'.repeat(96))
  for (const r of rows) {
    const lvl = r.level === 'error' ? 'ERR ' : r.level === 'warn' ? 'WARN' : 'OK  '
    console.log(
      `${lvl} ${r.route.padEnd(10)} ${r.role.padEnd(9)} ${r.key.padEnd(8)} ${r.file.padEnd(24)} ${String(r.size).padEnd(10)} ar=${r.aspect?.toFixed(2) ?? '?'}  ${r.notes.join('；')}`,
    )
  }
  console.log('─'.repeat(96))
  console.log(`${rows.length} 个显示位 · ${errors.length} error · ${warnings.length} warn`)
  if (warnings.length) console.log(`\n警告：\n- ${warnings.join('\n- ')}`)
  if (errors.length) console.log(`\n错误：\n- ${errors.join('\n- ')}`)
}

process.exit(errors.length ? 1 : 0)
