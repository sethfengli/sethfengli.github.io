/**
 * 免版权真实照片抓取 v2：Wikimedia Commons（CC0 / Public domain / CC BY*）
 * 策略：按“类别”遍历（每类 1 次 API 请求）+ 429 指数退避重试，
 *       避免搜索接口的激进限流。
 * → 本地托管 public/photos/ + 清单 src/data/photos.json + 署名 CREDITS.md
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'photos')
const MANIFEST = path.join(ROOT, 'src', 'data', 'photos.json')
const CREDITS = path.join(OUT_DIR, 'CREDITS.md')

const CATEGORIES = [
  'Statues of Guanyin',
  'Temple bells',
  'Incense in Buddhism',
  'Buddhist temples in China',
  'Buddhist temples in Taiwan',
  'Buddha statues in China',
  'Pagodas in China',
  'Buddhist monasteries in China',
  'Buddhist temple interiors',
  'Buddhist art of China',
  'Temples in Hong Kong',
  'Buddhist temples in Japan',
]

const UA = { 'User-Agent': 'HuidengChanlin/1.0 (site curation; contact via repo issues)' }
const MAX_PHOTOS = 48
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

fs.mkdirSync(OUT_DIR, { recursive: true })

async function apiJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: UA })
    const txt = await r.text()
    if (txt.includes('You are making too many requests')) {
      console.log(`  ⏳ 限流，等待 ${(i + 1) * 20}s 重试…`)
      await sleep((i + 1) * 20000)
      continue
    }
    try {
      return JSON.parse(txt)
    } catch {
      return null
    }
  }
  return null
}

const candidates = []
const seenSha = new Set()

for (const cat of CATEGORIES) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=' +
    encodeURIComponent('Category:' + cat) +
    '&gcmtype=file&gcmlimit=60&prop=imageinfo&iiprop=url%7Cextmetadata%7Csize%7Csha1%7Cmediatype&iiurlwidth=900&format=json&maxlag=5'
  const j = await apiJson(url)
  if (!j?.query) {
    console.log(`✗ 类别不存在或无结果：${cat}`)
    continue
  }
  let n = 0
  for (const p of Object.values(j.query.pages)) {
    const ii = p.imageinfo?.[0]
    // mediatype: 'BITMAP'（JPEG/PNG 等位图）；JPEG 校验在下载时按魔数二次确认
    if (!ii || ii.mediatype !== 'BITMAP') continue
    if (ii.width < 800 || ii.height < 450) continue
    if (seenSha.has(ii.sha1)) continue
    seenSha.add(ii.sha1)
    const meta = ii.extmetadata ?? {}
    const lic = (meta.LicenseShortName?.value ?? '').toLowerCase()
    if (!(lic.includes('cc0') || lic.includes('public domain') || lic.includes('cc by'))) continue
    candidates.push({
      title: p.title.replace(/^File:/, ''),
      url: ii.thumburl ?? ii.url,
      page: ii.descriptionurl,
      author: (meta.Artist?.value ?? '未知').replace(/<[^>]+>/g, '').trim().slice(0, 80),
      license: meta.LicenseShortName?.value ?? '?',
      cat,
    })
    n++
  }
  console.log(`✔ ${cat}: +${n}（累计 ${candidates.length}）`)
  await sleep(2500)
}

console.log(`\ncandidates: ${candidates.length}`)

async function download(url, tries = 8) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA })
      if (r.ok) return Buffer.from(await r.arrayBuffer())
      if (r.status === 429 || r.status >= 500) {
        await sleep(30000)
        continue
      }
      return null
    } catch {
      await sleep(2500)
    }
  }
  return null
}

const photos = []
const credits = ['# 图片素材来源与署名（Wikimedia Commons）', '', '| 文件 | 来源页面 | 作者 | 许可 |', '| --- | --- | --- | --- |']

for (const c of candidates) {
  if (photos.length >= MAX_PHOTOS) break
  const buf = await download(c.url)
  if (!buf || buf.length < 15000 || buf[0] !== 0xff || buf[1] !== 0xd8) continue
  const name = `photo-${String(photos.length + 1).padStart(2, '0')}.jpg`
  fs.writeFileSync(path.join(OUT_DIR, name), buf)
  photos.push(name)
  credits.push(`| ${name} | [${c.title}](${c.page}) | ${c.author} | ${c.license} |`)
  process.stdout.write(`\rdownloaded ${photos.length}/${MAX_PHOTOS}`)
  await sleep(3000)
}
console.log('')

// 具名专用图：观音像 / 铜钟 / 香炉（各自类别第一张）
const named = { guanyin: 'Statues of Guanyin', bell: 'Temple bells', incense: 'Incense in Buddhism' }
for (const [key, catName] of Object.entries(named)) {
  const pos = candidates.findIndex((c) => c.cat === catName)
  if (pos >= 0 && pos < photos.length) {
    try {
      fs.copyFileSync(path.join(OUT_DIR, photos[pos]), path.join(OUT_DIR, `${key}.jpg`))
      console.log(`✔ 专用图 ${key}.jpg`)
    } catch {
      /* ignore */
    }
  }
}

fs.writeFileSync(MANIFEST, JSON.stringify({ photos }, null, 1), 'utf8')
fs.writeFileSync(CREDITS, credits.join('\n'), 'utf8')
console.log(`✔ ${photos.length} 张照片 → public/photos/`)
console.log('✔ 清单 → src/data/photos.json')
console.log('✔ 署名 → public/photos/CREDITS.md')
