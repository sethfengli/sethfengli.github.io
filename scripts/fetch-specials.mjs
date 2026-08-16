/**
 * 补充抓取：6 张命名专用图（lotus/hero/lantern/gate/garden/blossom）
 * + 把这些类别里的其余候选并入文章封面池（photo-111 起）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PHOTOS_DIR = path.join(ROOT, 'public', 'photos')
const MANIFEST = path.join(ROOT, 'src', 'data', 'photos.json')

const UA = { 'User-Agent': 'HuidengChanlin/1.0 (site curation; contact via repo issues)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const SPECIALS = {
  lotus: 'Nelumbo nucifera',
  hero: 'Buddhist temples in Thailand',
  lantern: 'Paper lanterns',
  gate: 'Paifang',
  garden: 'Zen gardens',
  blossom: 'Cherry blossoms',
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

async function download(url, tries = 10) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA })
      if (r.ok) return Buffer.from(await r.arrayBuffer())
      if (r.status === 429 || r.status >= 500) {
        await sleep(60000)
        continue
      }
      return null
    } catch {
      await sleep(40000)
    }
  }
  return null
}

const credits = []
let poolNext = 111

for (const [key, cat] of Object.entries(SPECIALS)) {
  if (fs.existsSync(path.join(PHOTOS_DIR, `${key}.jpg`)) && key !== 'lotus') continue
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=' +
    encodeURIComponent('Category:' + cat) +
    '&gcmtype=file&gcmlimit=30&prop=imageinfo&iiprop=url%7Cextmetadata%7Csize%7Csha1%7Cmediatype&iiurlwidth=900&format=json&maxlag=5'
  const j = await apiJson(url)
  if (!j?.query) {
    console.log(`✗ 类别无结果：${cat}`)
    continue
  }
  const cands = []
  for (const p of Object.values(j.query.pages)) {
    const ii = p.imageinfo?.[0]
    if (!ii || ii.mediatype !== 'BITMAP' || ii.width < 800 || ii.height < 450) continue
    const meta = ii.extmetadata ?? {}
    const lic = (meta.LicenseShortName?.value ?? '').toLowerCase()
    if (!(lic.includes('cc0') || lic.includes('public domain') || lic.includes('cc by'))) continue
    cands.push({
      url: ii.thumburl ?? ii.url,
      page: ii.descriptionurl,
      author: (meta.Artist?.value ?? '未知').replace(/<[^>]+>/g, '').trim().slice(0, 80),
      license: meta.LicenseShortName?.value ?? '?',
      title: p.title.replace(/^File:/, ''),
    })
  }
  console.log(`✔ ${cat}: ${cands.length} 候选`)
  if (!cands.length) continue

  // 第一张 → 命名专用图
  const first = cands[0]
  const buf = await download(first.url)
  if (buf && buf.length > 15000 && buf[0] === 0xff && buf[1] === 0xd8) {
    fs.writeFileSync(path.join(PHOTOS_DIR, `${key}.jpg`), buf)
    credits.push(`| ${key}.jpg | [${first.title}](${first.page}) | ${first.author} | ${first.license} |`)
    console.log(`✔ 专用图 ${key}.jpg`)
  }
  await sleep(3000)

  // 其余并入封面池
  for (const c of cands.slice(1, 8)) {
    const name = `photo-${poolNext}.jpg`
    if (fs.existsSync(path.join(PHOTOS_DIR, name))) {
      poolNext++
      continue
    }
    const b = await download(c.url)
    if (b && b.length > 15000 && b[0] === 0xff && b[1] === 0xd8) {
      fs.writeFileSync(path.join(PHOTOS_DIR, name), b)
      credits.push(`| ${name} | [${c.title}](${c.page}) | ${c.author} | ${c.license} |`)
      poolNext++
    }
    await sleep(4000)
  }
  await sleep(3000)
}

// 更新 CREDITS 与清单
const creditsPath = path.join(PHOTOS_DIR, 'CREDITS.md')
let oldCredits = ''
if (fs.existsSync(creditsPath)) oldCredits = fs.readFileSync(creditsPath, 'utf8')
const extra = credits.length
  ? ['', '## 补充批次（专用图 + 扩充池）', '', '| 文件 | 来源页面 | 作者 | 许可 |', '| --- | --- | --- | --- |', ...credits].join('\n')
  : ''
fs.writeFileSync(creditsPath, oldCredits + extra, 'utf8')

const pool = fs
  .readdirSync(PHOTOS_DIR)
  .filter((n) => /^photo-\d+\.jpg$/.test(n))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  .filter((n) => !Object.values(SPECIALS).includes(n))
const excluded = ['photo-01.jpg', 'photo-48.jpg'] // guanyin/bell 源图（已有专用副本）
const photos = pool.filter((n) => !excluded.includes(n))
fs.writeFileSync(MANIFEST, JSON.stringify({ photos }, null, 1), 'utf8')
console.log(`✔ 封面池共 ${photos.length} 张，清单已更新`)
