/**
 * 人工精选清单：从 scripts/cn-pool.json 里按 ID 挑出「中国传统佛教题材」图片。
 * 复用 scripts/fetch-cn-photos.mjs 的下载/转码/去重管线。
 *
 * 用法：node scripts/curate-cn.mjs
 *   → 读取 cn-pool.json + 下面的 PICKS
 *   → 逐条再做一次「非中国题材」排雷（TITLE_REJECT）
 *   → 写出 scripts/cn-picked.json，并打印最终清单与桶分布
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const POOL = path.join(__dirname, 'cn-pool.json')
const PICKED = path.join(__dirname, 'cn-picked.json')

/* ============================================================
   人工精选：pool ID。分组即最终分池桶。
   ============================================================ */
const PICKS = {
  // —— 佛画 · 经变 · 绢画 · 水墨观音（已核对：与 pool 无漂移，原样保留）——
  paintings: [
    'paintings-016',
    'paintings-017',
    'paintings-018',
    'paintings-019',
    'paintings-020',
    'paintings-023',
    'paintings-026',
    'paintings-029',
    'paintings-053',
    'paintings-055',
    'paintings-059',
    'paintings-063',
    'paintings-064',
    'paintings-067',
    'paintings-069',
    'paintings-075',
    'paintings-076',
    'paintings-077',
    'paintings-078',
    'paintings-080',
    'paintings-083',
    'paintings-086',
    'paintings-092',
    'paintings-099',
    'paintings-100',
    'paintings-105',
    'paintings-106',
    'paintings-109',
    'paintings-112',
    'paintings-122',
    'paintings-123',
    'paintings-125',
    'paintings-135',
    'paintings-137',
    'paintings-138',
    'paintings-184',
    'paintings-185',
    'paintings-186',
    'paintings-188',
    'paintings-007',
    'paintings-008',
  ],

  // —— 石窟 · 摩崖造像（已核对：与 pool 无漂移，原样保留）——
  grottoes: [
    'grottoes-001',
    'grottoes-002',
    'grottoes-003',
    'grottoes-004',
    'grottoes-005',
    'grottoes-006',
    'grottoes-007',
    'grottoes-008',
    'grottoes-009',
    'grottoes-010',
    'grottoes-011',
    'grottoes-012',
    'grottoes-013',
    'grottoes-014',
    'grottoes-051',
    'grottoes-052',
    'grottoes-053',
    'grottoes-054',
    'grottoes-055',
    'grottoes-056',
    'grottoes-057',
    'grottoes-058',
    'grottoes-060',
    'grottoes-061',
    'grottoes-078',
    'grottoes-080',
    'grottoes-083',
    'grottoes-087',
    'grottoes-091',
    'grottoes-095',
    'grottoes-100',
    'grottoes-110',
    'grottoes-118',
    'grottoes-125',
    'grottoes-077',
    'grottoes-175',
    'grottoes-180',
    'grottoes-181',
    'grottoes-183',
    'grottoes-185',
    'grottoes-188',
    'grottoes-128',
    'grottoes-133',
    'grottoes-160',
    'grottoes-173',
    'grottoes-174',
  ],

  // —— 造像（基线 86，剔 4 条道教/后加彩：073 刘海 / 089 刘海 / 103 真武 / 092 后加彩）——
  statues: [
    'statues-001',
    'statues-015',
    'statues-020',
    'statues-021',
    'statues-016',
    'statues-017',
    'statues-018',
    'statues-019',
    'statues-022',
    'statues-023',
    'statues-024',
    'statues-025',
    'statues-026',
    'statues-027',
    'statues-028',
    'statues-035',
    'statues-036',
    'statues-037',
    'statues-038',
    'statues-039',
    'statues-041',
    'statues-043',
    'statues-045',
    'statues-046',
    'statues-047',
    'statues-049',
    'statues-051',
    'statues-052',
    'statues-053',
    'statues-054',
    'statues-055',
    'statues-056',
    'statues-057',
    'statues-060',
    'statues-063',
    'statues-066',
    'statues-076',
    'statues-077',
    'statues-083',
    'statues-091',
    'statues-093',
    'statues-094',
    'statues-101',
    'statues-104',
    'statues-105',
    'statues-107',
    'statues-108',
    'statues-111',
    'statues-113',
    'statues-114',
    'statues-116',
    'statues-117',
    'statues-118',
    'statues-119',
    'statues-123',
    'statues-124',
    'statues-125',
    'statues-136',
    'statues-137',
    'statues-142',
    'statues-143',
    'statues-156',
    'statues-157',
    'statues-169',
    'statues-170',
    'statues-171',
    'statues-172',
    'statues-174',
    'statues-175',
    'statues-184',
    'statues-188',
    'statues-189',
    'statues-190',
    'statues-194',
    'statues-195',
    'statues-197',
    'statues-198',
    'statues-199',
    'statues-200',
    'statues-201',
    'statues-202',
    'statues-203',
    'statues-208',
    'statues-209',
    'statues-210',
    'statues-211',
    'statues-167',
    'statues-179',
    'statues-204',
  ],

  // —— 殿宇 · 山门 · 塔 ——
  // ⚠ 旧 PICKS 引用的 halls-001..019 在 pool 里是韩国/蒙古寺院、清真寺、17 世纪荷兰铜版画，
  //   因此该桶一张都没下成（空桶）。这里改为逐条按标题重挑。
  halls: [
    'halls-001',
    'halls-006',
    'halls-011',
    'halls-012',
    'halls-013',
    'halls-014',
    'halls-016',
    'halls-019',
    'halls-020',
    'halls-023',
    'halls-024',
    'halls-026',
    'halls-053',
    'halls-054',
    'halls-055',
    'halls-058',
    'halls-059',
    'halls-060',
    'halls-062',
    'halls-063',
    'halls-064',
  ],

  // —— 经卷 · 写经 · 刻经 ——
  // ⚠ 旧 PICKS 的 sutras-001..015 在 pool 里是蒙古人物像、藏文/回鹘文/希伯来文写本，
  //   故空桶。这里只取**汉文佛教写经/刻经**。
  sutras: [
    'sutras-004',
    'sutras-005',
    'sutras-006',
    'sutras-008',
    'sutras-011',
    'sutras-012',
    'sutras-013',
    'sutras-015',
    'sutras-016',
    'sutras-017',
    'sutras-018',
    'sutras-019',
    'sutras-023',
    'sutras-028',
    'sutras-040',
  ],

  // —— 山水 · 云海 · 松林 ——
  // ⚠ 旧 PICKS 的 landscape-001..018 在 pool 里是藏地高原、地图、昆虫标本照，故空桶。
  //   这里只取水墨山水与名山云海。
  landscape: [
    'landscape-001',
    'landscape-002',
    'landscape-003',
    'landscape-004',
    'landscape-006',
    'landscape-008',
    'landscape-009',
    'landscape-011',
    'landscape-012',
    'landscape-013',
    'landscape-014',
    'landscape-018',
    'landscape-024',
    'landscape-025',
    'landscape-026',
    'landscape-035',
    'landscape-040',
    'landscape-042',
    'landscape-049',
    'landscape-050',
  ],

  // —— 莲 · 荷塘（净土意象，已核对：与 pool 无漂移，原样保留）——
  lotus: [
    'lotus-001',
    'lotus-002',
    'lotus-003',
    'lotus-004',
    'lotus-011',
    'lotus-035',
    'lotus-036',
  ],
}

/* ============================================================
   二次排雷：即使人工挑过，也对标题再跑一遍排除规则
   （防止看清单时漏掉韩日/藏传/印度/欧美陈设等）
   ============================================================ */
const TITLE_REJECT = [
  /korea/i, /seoul/i, /bulguk/i, /seokguram/i, /haeinsa/i,
  /japan/i, /japanese/i, /tokyo/i, /kyoto/i, /nara/i, /gyoda/i, /mizunomori/i,
  /seiryoji/i, /nantoy/i, /nan-tou/i, /sakya \(315\)/i,
  /vietnam/i, /vietnamese/i, /bàu sen/i, /chua\b/i, /hanoi/i,
  /thai(land)?/i, /burma/i, /myanmar/i, /cambodia/i, /angkor/i,
  /india/i, /indian/i, /gandhar/i, /calicut/i, /atchankulam/i, /kanniyakumari/i,
  /tibet/i, /tibetan/i, /thangka/i, /gyantse/i, /yamdrok/i, /tangut/i, /shanzuigou/i,
  /parnashavari/i, /ganzi/i, /kumbum/i, /tsongkhapa/i, /obaku/i, /koryo/i,
  /kucha/i, /kizil/i, /kyzyl/i, /kumtura/i, /duldur/i, /central asia/i, /turpan/i,
  /guimet 151107/i, /new delhi/i,
  /hallwyl/i, /rijksmuseum/i, /fontmerle/i, /tir bijan/i, /encinitas/i, /san diego bot/i,
  /matsouka/i, /matsuoka/i, /detroit/i, /sarasota/i, /ringling/i,
  /castle hill/i, /ipswich/i, /bada/i,
  /barcelona/i, /museu de cultures/i,
  // 注：博物馆所在地 ≠ 文物来源。
  // 中国历代造像/佛画常有欧美馆藏（大英、吉美、宾大、克利夫兰、斯德哥尔摩东亚馆等），
  // 只要「中国 + 佛教」即保留，因此不做博物馆地名排除。
  /british museum - room 24/i, /mochua/i, /krumlov/i, /czerna/i, /vartulėnai/i,
  /arowana/i, /quail valley/i, /nunez garro/i, /hooper bay/i,
  /himalayan/i, /darjeeling/i,
  // 非佛教神明 / 杂物
  /zhenwu/i, /liu hai/i, /xiongmu/i, /xiwangmu/i, /tianhou/i, /child-giving/i,
  /mosque/i, /muslim/i, /marie biscuit/i, /baby carrier/i, /chang e/i, /lei gong/i,
  /eight thousanders/i, /ochomiles/i, /zookeys/i, /chydaeus/i, /laughingthrush/i,
  /garbage bin/i, /love lock/i, /vehicle-ferry/i,
  /tomb/i, /grave/i, /idol foundry/i, /lamasery of tchortchi/i, /lamanesque/i,
  /military/i, /ivory/i, /sword/i,
]

const pool = JSON.parse(fs.readFileSync(POOL, 'utf8'))
const byId = new Map()
for (const arr of Object.values(pool)) for (const c of arr) byId.set(c.id, c)

const out = {}
const rejected = []
let missing = 0
for (const [bucket, ids] of Object.entries(PICKS)) {
  out[bucket] = []
  for (const id of ids) {
    const c = byId.get(id)
    if (!c) {
      console.warn(`  ! 清单里没有 ${id}`)
      missing++
      continue
    }
    if (TITLE_REJECT.some((re) => re.test(c.title))) {
      rejected.push(`${id}  ${c.title}`)
      continue
    }
    out[bucket].push(c)
  }
}

fs.writeFileSync(PICKED, JSON.stringify(out, null, 1), 'utf8')

let total = 0
console.log('\n=== 最终挑选 ===')
for (const [b, arr] of Object.entries(out)) {
  console.log(`  ${b.padEnd(10)} ${arr.length}`)
  total += arr.length
}
console.log(`  合计 ${total}（缺 ${missing}）`)
if (rejected.length) {
  console.log('\n=== 被排雷剔掉 ===')
  for (const r of rejected) console.log(`  ✗ ${r}`)
}
console.log(`\n→ ${path.relative(ROOT, PICKED)}`)
