/**
 * 梵呗音频抓取：Wikimedia Commons（CC0 / CC BY*）
 * → 本地托管到 public/audio/ + 生成署名清单 CREDITS.md
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'audio')
const CREDITS = path.join(OUT_DIR, 'CREDITS.md')

const TRACKS = [
  {
    name: 'chant-lingyin.ogg',
    title: 'File:Chanting at Lingyin Temple, Hangzhou.ogg',
    label: '灵隐寺 · 僧众梵呗',
  },
  {
    name: 'chant-guanyin.ogg',
    title: 'File:Avalokiteśvara.ogg',
    label: '南无观世音菩萨 · 圣号',
  },
  {
    name: 'chant-heartsutra.ogg',
    title: 'File:Bore Xinjing 般若心经 (Heart Sutra) in Mandarin recited by a Chinese Buddhist layperson.ogg',
    label: '般若心经 · 念诵',
  },
  {
    name: 'chant-mani.ogg',
    title: 'File:20260602 145937 Dingjue Om mani padme hum.ogg',
    label: '六字大明咒 · 定觉寺',
  },
  {
    name: 'bell-chomeiji.ogg',
    title: 'File:Bonsyou5599.ogg',
    label: '梵钟 · 長命寺（日本）',
  },
]

const UA = { 'User-Agent': 'HuidengChanlin/1.0 (site curation; contact via repo issues)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function dlWithRetry(url, tries = 8) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA })
      if (r.ok) return Buffer.from(await r.arrayBuffer())
      await sleep(25000)
    } catch {
      await sleep(25000)
    }
  }
  return Buffer.alloc(0)
}
fs.mkdirSync(OUT_DIR, { recursive: true })

const credits = ['# 音频素材来源与署名（Wikimedia Commons）', '', '| 文件 | 来源页面 | 作者 | 许可 |', '| --- | --- | --- | --- |']

for (const tr of TRACKS) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&titles=' +
    encodeURIComponent(tr.title) +
    '&prop=imageinfo&iiprop=url%7Cextmetadata&format=json'
  try {
    const r = await fetch(url, { headers: UA })
    const j = await r.json()
    const p = Object.values(j.query?.pages ?? {})[0]
    const ii = p?.imageinfo?.[0]
    if (!ii) {
      console.log(`✗ 未找到 ${tr.name}`)
      continue
    }
    const meta = ii.extmetadata ?? {}
    const lic = meta.LicenseShortName?.value ?? '?'
    const artist = (meta.Artist?.value ?? '未知').replace(/<[^>]+>/g, '').trim().slice(0, 80)
    const dl = await dlWithRetry(ii.url)
    const buf = dl
    if (buf.length < 5000 || buf[0] !== 0x4f /* OggS */ || buf[1] !== 0x67) {
      console.log(`✗ 太小 ${tr.name}`)
      continue
    }
    fs.writeFileSync(path.join(OUT_DIR, tr.name), buf)
    credits.push(`| ${tr.name}（${tr.label}） | [${tr.title.replace(/^File:/, '')}](${ii.descriptionurl}) | ${artist} | ${lic} |`)
    console.log(`✔ ${tr.name} (${(buf.length / 1024).toFixed(0)} KB, ${lic})`)
  } catch (e) {
    console.log(`✗ ${tr.name}: ${e.message}`)
  }
  await new Promise((r) => setTimeout(r, 4000))
}

fs.writeFileSync(CREDITS, credits.join('\n'), 'utf8')
console.log('✔ 署名 → public/audio/CREDITS.md')
