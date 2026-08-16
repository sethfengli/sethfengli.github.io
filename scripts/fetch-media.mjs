/**
 * 统一媒体下载器：照片 + 梵呗音档（Wikimedia Commons，CC0/PD/CC BY）
 * - Phase A：经 API 收集候选（类别遍历 + 音频题名），已下载的自动跳过；
 * - Phase B：耐心下载（429 等待 90s，最多 12 次重试），断点续跑（重跑即续传）；
 * - 输出：public/photos/*.jpg + public/audio/*.ogg + 各自 CREDITS.md + src/data/photos.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PHOTOS_DIR = path.join(ROOT, 'public', 'photos')
const AUDIO_DIR = path.join(ROOT, 'public', 'audio')
const MANIFEST = path.join(ROOT, 'src', 'data', 'photos.json')
const JOB_CACHE = path.join(__dirname, '.media-jobs.json')

const UA = { 'User-Agent': 'HuidengChanlin/1.0 (site curation; contact via repo issues)' }
const MAX_PHOTOS = 110
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const CATEGORIES = [
  'Statues of Guanyin',
  'Temple bells',
  'Buddhist temples in China',
  'Buddhist temples in Taiwan',
  'Buddha statues in China',
  'Pagodas in China',
  'Buddhist monasteries in China',
  'Buddhist temple interiors',
  'Buddhist art of China',
  'Temples in Hong Kong',
  'Buddhist temples in Japan',
  'Nelumbo nucifera',
  'Zen gardens',
  'Cherry blossoms',
  'Paifang',
  'Paper lanterns',
  'Buddhist temples in Thailand',
  'Buddhist temples in Vietnam',
  'Buddhist temples in South Korea',
  'Stupas',
  'Tibetan Buddhist monasteries',
  'Mountains of China',
  'Landscapes of China',
  'Chinese architecture',
]

const AUDIO_TRACKS = [
  { out: 'chant-lingyin.ogg', title: 'File:Chanting at Lingyin Temple, Hangzhou.ogg', label: '灵隐寺 · 僧众梵呗' },
  { out: 'chant-guanyin.ogg', title: 'File:Avalokiteśvara.ogg', label: '南无观世音菩萨 · 圣号' },
  { out: 'chant-heartsutra.ogg', title: 'File:Bore Xinjing 般若心经 (Heart Sutra) in Mandarin recited by a Chinese Buddhist layperson.ogg', label: '般若心经 · 念诵' },
  { out: 'chant-mani.ogg', title: 'File:20260602 145937 Dingjue Om mani padme hum.ogg', label: '六字大明咒 · 定觉寺' },
  { out: 'bell-chomeiji.ogg', title: 'File:Bonsyou5599.ogg', label: '梵钟 · 長命寺（日本）' },
]

fs.mkdirSync(PHOTOS_DIR, { recursive: true })
fs.mkdirSync(AUDIO_DIR, { recursive: true })

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

/* ---------- Phase A：收集任务 ---------- */
let jobs = []
if (fs.existsSync(JOB_CACHE)) {
  jobs = JSON.parse(fs.readFileSync(JOB_CACHE, 'utf8'))
  console.log(`断点续跑：载入缓存任务 ${jobs.length} 条`)
} else {
  const seenSha = new Set()
  for (const cat of CATEGORIES) {
    const url =
      'https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=' +
      encodeURIComponent('Category:' + cat) +
      '&gcmtype=file&gcmlimit=60&prop=imageinfo&iiprop=url%7Cextmetadata%7Csize%7Csha1%7Cmediatype&iiurlwidth=900&format=json&maxlag=5'
    const j = await apiJson(url)
    if (!j?.query) {
      console.log(`✗ 类别无结果：${cat}`)
      continue
    }
    for (const p of Object.values(j.query.pages)) {
      const ii = p.imageinfo?.[0]
      if (!ii || ii.mediatype !== 'BITMAP') continue
      if (ii.width < 800 || ii.height < 450) continue
      if (seenSha.has(ii.sha1)) continue
      seenSha.add(ii.sha1)
      const meta = ii.extmetadata ?? {}
      const lic = (meta.LicenseShortName?.value ?? '').toLowerCase()
      if (!(lic.includes('cc0') || lic.includes('public domain') || lic.includes('cc by'))) continue
      jobs.push({
        kind: 'photo',
        out: `photo-${String(jobs.length + 1).padStart(2, '0')}.jpg`,
        url: ii.thumburl ?? ii.url,
        page: ii.descriptionurl,
        author: (meta.Artist?.value ?? '未知').replace(/<[^>]+>/g, '').trim().slice(0, 80),
        license: meta.LicenseShortName?.value ?? '?',
        cat,
      })
      if (jobs.filter((x) => x.kind === 'photo').length >= MAX_PHOTOS) break
    }
    await sleep(2500)
    if (jobs.filter((x) => x.kind === 'photo').length >= MAX_PHOTOS) break
  }
  for (const tr of AUDIO_TRACKS) {
    const url =
      'https://commons.wikimedia.org/w/api.php?action=query&titles=' +
      encodeURIComponent(tr.title) +
      '&prop=imageinfo&iiprop=url%7Cextmetadata&format=json'
    const j = await apiJson(url)
    const p = Object.values(j?.query?.pages ?? {})[0]
    const ii = p?.imageinfo?.[0]
    if (!ii) {
      console.log(`✗ 未找到音频：${tr.title}`)
      continue
    }
    const meta = ii.extmetadata ?? {}
    jobs.push({
      kind: 'audio',
      out: tr.out,
      url: ii.url,
      page: ii.descriptionurl,
      author: (meta.Artist?.value ?? '未知').replace(/<[^>]+>/g, '').trim().slice(0, 80),
      license: meta.LicenseShortName?.value ?? '?',
      label: tr.label,
    })
    await sleep(2500)
  }
  fs.writeFileSync(JOB_CACHE, JSON.stringify(jobs, null, 1), 'utf8')
  console.log(`任务收集完成：${jobs.length} 条（照片 ${jobs.filter((x) => x.kind === 'photo').length} / 音频 ${jobs.filter((x) => x.kind === 'audio').length}）`)
}

/* ---------- Phase B：耐心下载 ---------- */
async function download(job) {
  for (let i = 0; i < 12; i++) {
    try {
      const r = await fetch(job.url, { headers: UA })
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer())
        const okPhoto = job.kind === 'photo' && buf.length > 15000 && buf[0] === 0xff && buf[1] === 0xd8
        const okAudio = job.kind === 'audio' && buf.length > 5000 && buf[0] === 0x4f && buf[1] === 0x67
        if (okPhoto || okAudio) return buf
        return null
      }
      if (r.status === 429 || r.status >= 500) {
        await sleep(90000)
        continue
      }
      return null
    } catch {
      await sleep(60000)
    }
  }
  return null
}

let done = 0
for (const job of jobs) {
  const dir = job.kind === 'photo' ? PHOTOS_DIR : AUDIO_DIR
  const target = path.join(dir, job.out)
  if (fs.existsSync(target) && fs.statSync(target).size > 15000) {
    done++
    continue
  }
  const buf = await download(job)
  if (buf) {
    fs.writeFileSync(target, buf)
    done++
    console.log(`✔ ${job.out} (${(buf.length / 1024).toFixed(0)} KB)`)
  } else {
    console.log(`✗ 放弃 ${job.out}`)
  }
  await sleep(8000)
}

/* ---------- 输出清单与署名 ---------- */
const photoJobs = jobs.filter((j) => j.kind === 'photo')

// 专用图：命名复制并排除出文章封面池，避免同一张图在 UI 与封面上重复
const specials = {
  lotus: 'Nelumbo nucifera',
  hero: 'Buddhist temples in Thailand',
  lantern: 'Paper lanterns',
  gate: 'Paifang',
  garden: 'Zen gardens',
  blossom: 'Cherry blossoms',
  guanyin: 'Statues of Guanyin',
  bell: 'Temple bells',
}
const specialSources = new Set()
for (const [key, catName] of Object.entries(specials)) {
  const j = photoJobs.find((x) => x.cat === catName && !specialSources.has(x.out))
  if (j && fs.existsSync(path.join(PHOTOS_DIR, j.out))) {
    fs.copyFileSync(path.join(PHOTOS_DIR, j.out), path.join(PHOTOS_DIR, `${key}.jpg`))
    specialSources.add(j.out)
    console.log(`✔ 专用图 ${key}.jpg（源自 ${j.out}，已移出封面池）`)
  }
}

// 文章封面池：排除专用图源文件
const photos = photoJobs
  .filter((j) => !specialSources.has(j.out))
  .filter((j) => fs.existsSync(path.join(PHOTOS_DIR, j.out)))
  .map((j) => j.out)
  .slice(0, MAX_PHOTOS)

fs.writeFileSync(MANIFEST, JSON.stringify({ photos }, null, 1), 'utf8')

const photoCredits = ['# 图片素材来源与署名（Wikimedia Commons）', '', '| 文件 | 来源页面 | 作者 | 许可 |', '| --- | --- | --- | --- |']
for (const j of photoJobs) {
  if (photos.includes(j.out)) {
    photoCredits.push(`| ${j.out} | [${j.page.split('/wiki/').pop()}](${j.page}) | ${j.author} | ${j.license} |`)
  }
}
fs.writeFileSync(path.join(PHOTOS_DIR, 'CREDITS.md'), photoCredits.join('\n'), 'utf8')

const audioCredits = ['# 音频素材来源与署名（Wikimedia Commons）', '', '| 文件 | 来源页面 | 作者 | 许可 |', '| --- | --- | --- | --- |']
for (const j of jobs.filter((x) => x.kind === 'audio')) {
  if (fs.existsSync(path.join(AUDIO_DIR, j.out))) {
    audioCredits.push(`| ${j.out}（${j.label}） | [${j.page.split('/wiki/').pop()}](${j.page}) | ${j.author} | ${j.license} |`)
  }
}
fs.writeFileSync(path.join(AUDIO_DIR, 'CREDITS.md'), audioCredits.join('\n'), 'utf8')

console.log(`\n✔ 照片 ${photos.length} 张 → public/photos/`)
console.log(`✔ 音频 ${jobs.filter((x) => x.kind === 'audio').filter((j) => fs.existsSync(path.join(AUDIO_DIR, j.out))).length} 段 → public/audio/`)
console.log('✔ 清单与署名已更新')
