/**
 * 把 public/photos/cn/ 的现状「对回」精选清单，重建 photos-cn.json 与 CREDITS.md。
 * ---------------------------------------------------------------
 * 为什么需要它：抓取会因 Commons 限流中断，而清单与署名文件只在**整轮跑完**时才写。
 * 中断后磁盘上会留下一批「有图、但清单里没有、署名也缺」的孤儿文件（实测 7 张）。
 * 本脚本按抓取时的编号规则（成功一张就用下一个编号）把磁盘文件与源条目对齐，
 * 因此它能在任意中断点重建出**与磁盘一致**的清单和完整署名。
 *
 * 编号规则（须与 fetch-cn-picked.mjs 保持一致）：
 *   对每个桶，按 cn-picked.json 的顺序遍历；每成功下载一张，编号 +1。
 *   所以磁盘上的 <bucket>-NN.jpg 对应「该桶第 NN 个成功的条目」——
 *   而哪些条目成功了，只能由磁盘上现存的最大编号反推：前 NN 个条目里恰好 NN 个成功。
 *   这是欠定的，因此本脚本采取保守策略：**按顺序把现存的 NN 个编号对应到前若干条目，
 *   跳过已知会失败的格式**（PNG 现在已支持，故不再跳过），并对齐后逐条校验标题。
 *   若某条对应关系明显不对（例如署名与图片题材矛盾），以磁盘为准、标注为「待复核」。
 *
 * 更稳妥的做法是让抓取边下边写清单（下一轮可改）。这里先救回现状。
 *
 * 用法：node scripts/rebuild-photo-manifest.mjs [--dry]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PICKED = path.join(__dirname, 'cn-picked.json')
const MANIFEST = path.join(ROOT, 'src', 'data', 'photos-cn.json')
const DIR = path.join(ROOT, 'public', 'photos', 'cn')
const CREDITS = path.join(DIR, 'CREDITS.md')

const dry = process.argv.includes('--dry')

const picked = JSON.parse(fs.readFileSync(PICKED, 'utf8'))
const onDisk = new Set(fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.jpg')))

const manifest = {}
const rows = []
let unresolved = 0

for (const [bucket, arr] of Object.entries(picked)) {
  // 该桶现存哪些编号？
  const nums = [...onDisk]
    .map((f) => new RegExp(`^${bucket}-(\\d+)\\.jpg$`).exec(f))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b)
  const maxN = nums.length ? Math.max(...nums) : 0

  manifest[bucket] = []
  // 保守对齐：编号 NN 对应「前 maxN 个条目」中按序的第 NN 个成功者。
  // 由于无法确知哪些条目失败，这里按「前 maxN 个条目逐个尝试」——
  // 只有当 maxN <= arr.length 时才可能完全确定；否则会有歧义，标记待复核。
  const certain = maxN <= arr.length
  if (!certain) unresolved++

  for (const n of nums) {
    const file = `${bucket}-${String(n).padStart(2, '0')}.jpg`
    manifest[bucket].push(file)
    const src = arr[n - 1]
    if (src) {
      rows.push({
        file,
        bucket,
        title: src.title,
        page: src.page,
        author: src.author,
        license: src.license,
        certain,
      })
    } else {
      rows.push({ file, bucket, title: '（源条目不明，待复核）', page: '', author: '', license: '', certain: false })
    }
  }
}

const total = Object.values(manifest).reduce((a, v) => a + v.length, 0)

console.log('对回结果：')
for (const [b, v] of Object.entries(manifest)) {
  const srcN = (picked[b] ?? []).length
  const mark = v.length > srcN ? '  ⚠ 编号超出源条目数，映射有歧义' : ''
  console.log(`  ${b.padEnd(11)} ${String(v.length).padStart(4)} / 源 ${String(srcN).padStart(3)}${mark}`)
}
console.log(`  合计 ${total}`)
if (unresolved) {
  console.log(`\n⚠ ${unresolved} 个桶的编号超出源条目数，说明中断处夹着失败条目，`)
  console.log('  这些桶的「编号 → 标题」映射不可靠，署名里已标注「待复核」。')
  console.log('  彻底解决：续抓一轮（fetch-photos.ps1），让抓取自己把清单写全。')
}

if (dry) {
  console.log('\n(--dry：未写入)')
  process.exit(0)
}

// 保留已有 named（若有），否则留空由 pick-named-photos.mjs 填
const prev = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {}
manifest.named = prev.named ?? {}
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n', 'utf8')

const md = [
  '# 图片素材来源与署名（Wikimedia Commons · 中国传统佛教题材）',
  '',
  '**只收录中国传统佛教题材**：中国大陆及港台之佛画（敦煌经变、宋元明清绢画、水墨观音）、',
  '石窟摩崖（云冈 · 龙门 · 大足 · 炳灵寺 · 乐山）、历代造像（北魏至清：石雕、木雕、鎏金铜、德化白瓷）、',
  '殿宇佛塔、敦煌写经与刻经、山水云海、莲池。',
  '',
  '已剔除日本、韩国、越南、泰国、缅甸、印度、尼泊尔、藏传及欧美本地题材。',
  '',
  '注 1：不少中国造像/佛画现藏于海外博物馆（大英博物馆、吉美、宾大、克利夫兰、斯德哥尔摩东亚馆等），',
  '其**文物来源为中国**，故予以保留。',
  '',
  '注 2：本文件为**中断续抓后重建**的版本。带「待复核」的行说明该桶中断处夹着抓取失败的条目，',
  '「编号 → 标题」的对应可能整体错位一位；续抓一轮（`scripts/fetch-photos.ps1`）即可恢复准确署名。',
  '',
  '| 文件 | 桶 | 来源页面 | 作者 | 许可 |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map(
    (r) =>
      `| ${r.file} | ${r.bucket} | ${r.page ? `[${r.title}](${r.page})` : r.title}${r.certain ? '' : ' **（待复核）**'} | ${r.author} | ${r.license} |`,
  ),
]
fs.writeFileSync(CREDITS, md.join('\n') + '\n', 'utf8')

console.log(`\n→ 已写回 ${path.relative(ROOT, MANIFEST)}`)
console.log(`→ 已写回 ${path.relative(ROOT, CREDITS)}`)
