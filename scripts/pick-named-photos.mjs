/**
 * 从各桶里挑出「具名专用图」，把选择结果写进 src/data/photos-cn.json 的 named 字段。
 * ---------------------------------------------------------------
 * 为什么要有这一步：`src/lib/content.ts` 原先按「桶内第 N 张」硬编码具名图，
 * 桶一增删（例如某桶还没抓满、或某张被限流跳过），具名图就整体漂移，
 * 而且第 N 张到底拍的是什么，读代码的人无从判断。
 *
 * 现在改为：本脚本按**文件名**（不是序号）挑选，并把结果写进清单；
 * content.ts 只读清单，挑不到就用该桶第一张兜底。
 *
 * 用法：node scripts/pick-named-photos.mjs [--dry]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const MANIFEST = path.join(ROOT, 'src', 'data', 'photos-cn.json')

const dry = process.argv.includes('--dry')
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
const buckets = Object.fromEntries(
  Object.entries(manifest).filter(([, v]) => Array.isArray(v)),
)

/**
 * 具名图：语义名 → 首选文件名列表（按优先级）。
 * 这里写的是**具体文件**，因为它们是逐张看过之后选定的；
 * 若首选不在清单里（还没抓到/被限流跳过），依次回退。
 */
const NAMED = {
  hero: {
    // 首页 Hero：云冈石窟横构浮雕（飞天与佛龛）。
    // 题头照片框是 16:10，横构图才不被裁掉大半；也不选怒目护法——首页第一眼应当安详。
    prefer: ['grottoes-13.jpg', 'grottoes-16.jpg', 'grottoes-15.jpg'],
    note: '石窟横构浮雕',
  },
  gate: { prefer: ['halls-01.jpg'], note: '山门 / 殿宇' },
  guanyin: {
    prefer: ['statues-31.jpg', 'statues-23.jpg', 'statues-22.jpg', 'statues-25.jpg'],
    note: '观音造像',
  },
  bell: { prefer: ['halls-07.jpg', 'halls-06.jpg', 'halls-01.jpg'], note: '梵钟 / 殿宇' },
  lantern: {
    prefer: ['paintings-37.jpg', 'paintings-03.jpg', 'paintings-02.jpg'],
    note: '供灯意象（绢本观音）',
  },
  garden: {
    prefer: ['landscape-04.jpg', 'landscape-09.jpg', 'grottoes-02.jpg'],
    note: '山水',
  },
  blossom: { prefer: ['paintings-26.jpg', 'paintings-11.jpg'], note: '绢本经变' },
  lotus: { prefer: ['lotus-03.jpg', 'lotus-04.jpg', 'lotus-01.jpg'], note: '莲池' },
  sutra: { prefer: ['sutras-06.jpg', 'sutras-02.jpg', 'paintings-22.jpg'], note: '写经' },
}

/** 这张图在哪个桶里？找不到返回 null */
function bucketOfFile(file) {
  for (const [b, arr] of Object.entries(buckets)) {
    if (arr.includes(file)) return b
  }
  return null
}

const named = {}
const report = []

for (const [key, spec] of Object.entries(NAMED)) {
  const hit = spec.prefer.find((f) => bucketOfFile(f))
  if (hit) {
    named[key] = hit
    report.push(`  ✓ ${key.padEnd(9)} → ${hit.padEnd(20)} (${bucketOfFile(hit)} · ${spec.note})`)
    continue
  }
  // 全都没抓到：退回到该桶当前最后一张，至少不是空
  const fallbackBucket = spec.prefer[0].split('-')[0]
  const arr = buckets[fallbackBucket] ?? []
  if (arr.length) {
    named[key] = arr[arr.length - 1]
    report.push(`  ~ ${key.padEnd(9)} → ${named[key].padEnd(20)} (回退：${fallbackBucket} 末张)`)
  } else {
    report.push(`  ✗ ${key.padEnd(9)} → 无可用图（${fallbackBucket} 桶为空）`)
  }
}

console.log('具名图选择：')
console.log(report.join('\n'))

if (dry) {
  console.log('\n(--dry：未写入)')
} else {
  manifest.named = named
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n', 'utf8')
  console.log(`\n→ 已写入 ${path.relative(ROOT, MANIFEST)} 的 named 字段`)
}

/* 同时报告各桶余量，便于判断该不该补抓 */
console.log('\n各桶余量：')
for (const [b, arr] of Object.entries(buckets)) {
  console.log(`  ${b.padEnd(10)} ${String(arr.length).padStart(3)} 张`)
}
