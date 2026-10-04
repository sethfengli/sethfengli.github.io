/**
 * 候选池采集（只取分类成员，不做标题启发式筛选）。
 * 目的：把「中国佛教艺术」已验证分类里的文件全部列出来，供人工按标题筛选，
 *       再由 scripts/fetch-cn-photos.mjs --stage=fetch --pick=<清单> 精确下载。
 *
 * 用法：node scripts/collect-pool.mjs
 *   → scripts/cn-pool.json（含 url/page/author/license/尺寸）
 *   → scripts/cn-pool.txt （便于眼筛的纯文本清单）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const POOL = path.join(__dirname, 'cn-pool.json')
const TXT = path.join(__dirname, 'cn-pool.txt')

const UA = { 'User-Agent': 'HuidengChanlin/2.0 (non-commercial Buddhist site curation)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 分类 → 桶。均为「中国传统佛教题材」已验证分类（probe-cats.mjs 实测存在） */
const SOURCES = [
  // —— 佛画 / 经变 / 绢画 ——
  ['paintings', 'Category:Buddhist paintings from China'],
  ['paintings', 'Category:Buddhist paintings from China in the Metropolitan Museum of Art'],
  ['paintings', 'Category:Buddhist paintings from China in the Cleveland Museum of Art'],
  ['paintings', 'Category:Buddhist paintings from China in the British Museum'],
  ['paintings', 'Category:Buddhist paintings from China in the Walters Art Museum'],
  ['paintings', 'Category:Buddhist paintings of the Tang Dynasty'],
  ['paintings', 'Category:Buddhist paintings of the Ming Dynasty'],
  ['paintings', 'Category:Buddhist murals in China'],
  ['paintings', 'Category:Mogao Caves'],
  ['paintings', 'Category:Dunhuang paintings'],
  ['paintings', 'Category:Paintings of Guanyin'],
  ['paintings', 'Category:Chinese Buddhist art'],
  // —— 造像 / 石雕 / 木雕 / 鎏金 / 白瓷 ——
  ['statues', 'Category:Buddhist sculptures from China'],
  ['statues', 'Category:Stone Buddhist sculptures from China'],
  ['statues', 'Category:Wood Buddhist sculptures from China'],
  ['statues', 'Category:Bronze Buddhist sculptures from China'],
  ['statues', 'Category:Porcelain Buddhist sculptures from China'],
  ['statues', 'Category:Marble Buddhist sculptures from China'],
  ['statues', 'Category:Clay Buddhist sculptures from China'],
  ['statues', 'Category:Buddhist sculptures from China by museum'],
  ['statues', 'Category:Statues of Guanyin in China'],
  ['statues', 'Category:Buddhist statues in China'],
  ['statues', 'Category:Guanyin 觀音 (M.C. 9594)'],
  // —— 石窟 / 摩崖 ——
  ['grottoes', 'Category:Yungang Grottoes'],
  ['grottoes', 'Category:Longmen Grottoes'],
  ['grottoes', 'Category:Dazu Rock Carvings'],
  ['grottoes', 'Category:Maijishan Grottoes'],
  ['grottoes', 'Category:Bingling Temple'],
  ['grottoes', 'Category:Leshan Giant Buddha'],
  ['grottoes', 'Category:Baodingshan'],
  // —— 殿宇 / 山门 / 塔 / 廊庑 ——
  ['halls', 'Category:Buddhist temples in China'],
  ['halls', 'Category:Buddhist temples in Hong Kong'],
  ['halls', 'Category:Buddhist temples in Taiwan'],
  ['halls', 'Category:Mahavira Hall'],
  ['halls', 'Category:Shanmen'],
  ['halls', 'Category:Pagodas in China'],
  ['halls', 'Category:Buddhist architecture of China'],
  ['halls', 'Category:Sculptures in Buddhist temples in China'],
  // —— 经卷 / 写经 / 刻经 ——
  ['sutras', 'Category:Dunhuang manuscripts'],
  ['sutras', 'Category:Diamond Sutra'],
  ['sutras', 'Category:Chinese Buddhist texts'],
  ['sutras', 'Category:Woodblock printed Chinese books'],
  // —— 法器 ——
  ['ritual', 'Category:Wooden fish'],
  ['ritual', 'Category:Chinese bronzeware'],
  ['ritual', 'Category:Incense burners'],
  ['ritual', 'Category:Chinese ritual objects'],
  // —— 山水 / 云海 ——
  ['landscape', 'Category:Chinese landscape paintings'],
  ['landscape', 'Category:Shan shui'],
  ['landscape', 'Category:Huangshan'],
  ['landscape', 'Category:Mountains of China'],
  ['landscape', 'Category:Pine forests in China'],
  // —— 莲 ——
  ['lotus', 'Category:Lotus ponds in China'],
  ['lotus', 'Category:Nelumbo nucifera'],
]

const UA_LANG = { ...UA, 'Accept-Language': 'zh-CN,zh;q=0.9' }

async function api(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA_LANG })
      const t = await r.text()
      if (r.status === 429 || t.includes('too many requests')) {
        await sleep((i + 1) * 9000)
        continue
      }
      return JSON.parse(t)
    } catch {
      await sleep((i + 1) * 3000)
    }
  }
  return null
}

function licenseOk(short) {
  const l = (short ?? '').toLowerCase()
  if (!l || l.includes('fair use') || l.includes('non-free')) return false
  return l.includes('cc0') || l.includes('public domain') || l.includes('cc by')
}

const pool = {}
const seen = new Set()
let idx = 0

for (const [bucket, cat] of SOURCES) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers' +
    `&gcmtitle=${encodeURIComponent(cat)}&gcmtype=file&gcmlimit=100` +
    '&prop=imageinfo&iiprop=url%7Cextmetadata%7Csize%7Csha1%7Cmediatype&iiurlwidth=1600' +
    '&format=json&maxlag=5'
  const j = await api(url)
  const pages = j?.query?.pages ? Object.values(j.query.pages) : []
  let added = 0
  for (const p of pages) {
    const ii = p.imageinfo?.[0]
    if (!ii || ii.mediatype !== 'BITMAP') continue
    if (ii.width < 1000 || ii.height < 667) continue
    const ar = ii.width / ii.height
    if (ar < 0.5 || ar > 2.6) continue
    if (seen.has(ii.sha1)) continue
    const meta = ii.extmetadata ?? {}
    const lic = meta.LicenseShortName?.value ?? ''
    if (!licenseOk(lic)) continue
    seen.add(ii.sha1)
    const title = p.title.replace(/^File:/, '')
    if (!pool[bucket]) pool[bucket] = []
    pool[bucket].push({
      id: `${bucket}-${String(pool[bucket].length + 1).padStart(3, '0')}`,
      title,
      url: ii.thumburl ?? ii.url,
      page: ii.descriptionurl,
      author: String(meta.Artist?.value ?? 'Unknown').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 70) || 'Unknown',
      license: lic,
      w: ii.width,
      h: ii.height,
      sha1: ii.sha1,
      cat,
    })
    added++
  }
  idx++
  console.log(`[${idx}/${SOURCES.length}] ${cat} → +${added}（${bucket} 累计 ${pool[bucket]?.length ?? 0}）`)
  await sleep(700)
}

fs.writeFileSync(POOL, JSON.stringify(pool, null, 1), 'utf8')

const lines = []
let total = 0
for (const [bucket, arr] of Object.entries(pool)) {
  lines.push(`\n===== ${bucket}  (${arr.length}) =====`)
  for (const c of arr) {
    lines.push(`${c.id}\t${c.title}\t${c.w}x${c.h}\t${c.license}`)
    total++
  }
}
fs.writeFileSync(TXT, lines.join('\n'), 'utf8')
console.log(`\n合计 ${total} 条 → ${path.relative(process.cwd(), POOL)} / ${path.relative(process.cwd(), TXT)}`)
