/**
 * 高清明亮 Banner 图：重新抓取 8 张具名图（1600px 宽），
 * 覆盖现有 public/photos/<name>.jpg，用于全站页面横幅。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PHOTOS_DIR = path.join(ROOT, 'public', 'photos')

const UA = { 'User-Agent': 'HuidengChanlin/1.0 (site curation; contact via repo issues)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const BANNERS = {
  lotus: 'Nelumbo nucifera',
  hero: 'Buddhist temples in Thailand',
  lantern: 'Paper lanterns',
  gate: 'Paifang',
  garden: 'Zen gardens',
  blossom: 'Blossoms',
  guanyin: 'Statues of Guanyin',
  bell: 'Temple bells',
}

async function apiJson(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: UA })
    const txt = await r.text()
    if (txt.includes('You are making too many requests')) {
      await sleep(20000)
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

async function download(url, tries = 8) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA })
      if (r.ok) return Buffer.from(await r.arrayBuffer())
      if (r.status === 429 || r.status >= 500) {
        await sleep(40000)
        continue
      }
      return null
    } catch {
      await sleep(30000)
    }
  }
  return null
}

for (const [key, cat] of Object.entries(BANNERS)) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=' +
    encodeURIComponent('Category:' + cat) +
    '&gcmtype=file&gcmlimit=40&prop=imageinfo&iiprop=url%7Cextmetadata%7Csize%7Csha1%7Cmediatype&iiurlwidth=1600&format=json&maxlag=5'
  const j = await apiJson(url)
  if (!j?.query) {
    console.log(`✗ 无候选：${key}`)
    continue
  }
  const cands = []
  for (const p of Object.values(j.query.pages)) {
    const ii = p.imageinfo?.[0]
    if (!ii || ii.mediatype !== 'BITMAP' || ii.width < 1200) continue
    const meta = ii.extmetadata ?? {}
    const lic = (meta.LicenseShortName?.value ?? '').toLowerCase()
    if (!(lic.includes('cc0') || lic.includes('public domain') || lic.includes('cc by'))) continue
    cands.push({ url: ii.thumburl ?? ii.url, w: ii.width, h: ii.height, page: ii.descriptionurl })
  }
  console.log(`✔ ${key}: ${cands.length} 候选（≥1200px）`)
  // 横幅优先横图（除 lotus/guanyin/blossom 可竖图）
  const preferLandscape = !['lotus', 'guanyin', 'blossom'].includes(key)
  cands.sort((a, b) => {
    const score = (c) => {
      const ar = c.w / c.h
      if (preferLandscape) return ar >= 1.2 && ar <= 2.2 ? 0 : ar > 2.2 ? 1 : 2
      return ar >= 0.5 && ar <= 1.6 ? 0 : 1
    }
    return score(a) - score(b)
  })
  let ok = false
  for (const c of cands) {
    const buf = await download(c.url)
    if (buf && buf.length > 40000 && buf[0] === 0xff && buf[1] === 0xd8) {
      fs.writeFileSync(path.join(PHOTOS_DIR, `${key}.jpg`), buf)
      console.log(`  → ${key}.jpg (${(buf.length / 1024).toFixed(0)} KB, ${c.w}x${c.h})`)
      ok = true
      break
    }
  }
  if (!ok) console.log(`  ✗ 下载失败：${key}`)
  await sleep(2500)
}
console.log('done')
