/**
 * 照片查重重排：按来源类别交错排序文章封面池，
 * 使相邻文章（同屏卡片）分配到不同类别的照片，避免“同一张/雷同图”反复出现。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PHOTOS_DIR = path.join(ROOT, 'public', 'photos')
const MANIFEST = path.join(ROOT, 'src', 'data', 'photos.json')
const JOB_CACHE = path.join(__dirname, '.media-jobs.json')

// 专用图源文件（有具名副本，不进封面池）
const EXCLUDED = new Set(['photo-01.jpg', 'photo-48.jpg'])

// fetch-specials 追加的 photo-111+：每类别最多 7 张、按类别顺序成块
const EXTRA_CATS = [
  'Nelumbo nucifera',
  'Buddhist temples in Thailand',
  'Paper lanterns',
  'Paifang',
  'Zen gardens',
]

function catOf(name) {
  const n = parseInt(name.match(/(\d+)/)[1], 10)
  if (n <= 110 && fs.existsSync(JOB_CACHE)) {
    const jobs = JSON.parse(fs.readFileSync(JOB_CACHE, 'utf8'))
    const job = jobs.find((j) => j.kind === 'photo' && j.out === name)
    return job?.cat ?? '其他'
  }
  const idx = n - 111
  return EXTRA_CATS[Math.min(EXTRA_CATS.length - 1, Math.max(0, Math.floor(idx / 7)))] ?? '其他'
}

const pool = fs
  .readdirSync(PHOTOS_DIR)
  .filter((n) => /^photo-\d+\.jpg$/.test(n) && !EXCLUDED.has(n))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

// 按类别分组（保持原序），每类最多保留 CAP 张，防止同一题材（如观音像 46 张）挤占池子
const CAP = 8
const groups = new Map()
for (const name of pool) {
  const cat = catOf(name)
  if (!groups.has(cat)) groups.set(cat, [])
  if (groups.get(cat).length < CAP) groups.get(cat).push(name)
}

// 类别交错（轮询）排序
const interleaved = []
const lists = [...groups.values()]
let more = true
let round = 0
while (more) {
  more = false
  for (const list of lists) {
    if (round < list.length) {
      interleaved.push(list[round])
      more = true
    }
  }
  round++
}

fs.writeFileSync(MANIFEST, JSON.stringify({ photos: interleaved }, null, 1), 'utf8')

const stats = {}
for (const name of interleaved) {
  const cat = catOf(name)
  stats[cat] = (stats[cat] ?? 0) + 1
}
console.log(`✔ 封面池 ${interleaved.length} 张，已按类别交错：`)
for (const [cat, n] of Object.entries(stats)) console.log(`  ${cat}: ${n}`)
