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
  // —— 佛画 · 经变 · 绢画 · 水墨观音（中国佛教绘画，镇馆级公有领域）——
  paintings: [
    'paintings-016', // 8 世纪绢本佛像（大英博物馆）
    'paintings-017', // 药师如来像页
    'paintings-018', // 丁观鹏 莲座大士像轴
    'paintings-019', // 丁元公 佛像轴
    'paintings-020', // 达摩渡扬子江（吉美）
    'paintings-023', // 元 佚名 跋陀罗第六罗汉图轴（MET）
    'paintings-026', // 元 佚名 释迦三尊图轴（MET）
    'paintings-029', // 明 佚名 罗汉图轴 金刚手（MET）
    'paintings-053', // 罗汉（MET）
    'paintings-055', // 千佛窟（MET LC）
    'paintings-059', // 元/明 释迦三尊（克利夫兰）
    'paintings-063', // 元 福州 释迦三尊（克利夫兰）
    'paintings-064', // 明 菩提树下的释迦（克利夫兰）
    'paintings-067', // 明 文殊（克利夫兰）
    'paintings-069', // 唐/宋 说法佛像（克利夫兰）
    'paintings-075', // 树下说法图（敦煌）
    'paintings-076', // 引路菩萨（敦煌）
    'paintings-077', // 药师净土变（敦煌）
    'paintings-078', // 报恩经变（敦煌）
    'paintings-080', // 唐 日曜菩萨 敦煌幡画（大英博物馆）
    'paintings-083', // 唐 天王像
    'paintings-086', // 唐 刺绣释迦灵鹫山说法图（大英博物馆）
    'paintings-092', // 心经 写绘图卷
    'paintings-099', // 观世音（Google Art Project）
    'paintings-100', // 药师净土变（Google Art Project）
    'paintings-105', // 莫高窟 322 窟 药师经变
    'paintings-106', // 台北故宫 唐 范琼 大悲观音像轴（局部）
    'paintings-109', // 台北故宫 唐 范琼 大悲观音像轴
    'paintings-112', // 阿弥陀佛净土
    'paintings-122', // 丁云鹏 十八罗汉（檀香山）
    'paintings-123', // 陈洪绶 准提佛母法像图轴（MET）
    'paintings-125', // 药师佛（MET）
    'paintings-135', // 十八应真图卷局部
    'paintings-137', // 准提菩萨像轴 明 台北故宫
    'paintings-138', // 明人画 准提佛母像
    'paintings-184', // 敦煌绢画 白衣观音
    'paintings-185', // 方维仪 观音轴
    'paintings-186', // 盛弘景 柳瓶观音
    'paintings-188', // 水陆画 男相观音
    'paintings-007', // 唐 阿弥陀佛净土变
    'paintings-008', // 维摩诘经变
  ],

  // —— 石窟 · 摩崖造像 ——
  grottoes: [
    ...Array.from({ length: 14 }, (_, i) => `grottoes-${String(i + 1).padStart(3, '0')}`), // 云冈 01-14
    'grottoes-051', 'grottoes-052', 'grottoes-053', 'grottoes-054', 'grottoes-055',
    'grottoes-056', 'grottoes-057', 'grottoes-058', 'grottoes-060', 'grottoes-061', // 龙门
    'grottoes-078', 'grottoes-080', 'grottoes-083', 'grottoes-087', 'grottoes-091',
    'grottoes-095', 'grottoes-100', 'grottoes-110', 'grottoes-118', 'grottoes-125', // 炳灵寺
    'grottoes-077', // 大足 六师外道
    'grottoes-175', // 大足宝顶 塔
    'grottoes-180', // 大足宝顶山摩崖造像
    'grottoes-181', 'grottoes-183', 'grottoes-185', 'grottoes-188', // 大足石刻
    'grottoes-128', // 乐山大佛 全景
    'grottoes-133', // 乐山大佛 崖壁
    'grottoes-160', // 乐山大佛
    'grottoes-173', // 乐山大佛 头与躯干
    'grottoes-174', // 乐山大佛 头部
  ],

  // —— 造像 · 石雕 · 木雕 · 鎏金 · 白瓷 ——
  statues: [
    'statues-001', // 辽 鎏金铜佛冠像
    'statues-015', 'statues-020', 'statues-021', // 唐 石灰岩菩萨（宾大）
    'statues-016', 'statues-017', 'statues-018', 'statues-019', // 唐 天龙山 鎏金力士（宾大）
    'statues-022', 'statues-023', 'statues-024', // 辽 观音（宾大）
    'statues-025', 'statues-026', 'statues-027', // 宋 木雕观音
    'statues-028', // 明 铜罗汉
    'statues-035', // 北魏 铜佛禅定印
    'statues-036', // 北魏 莲花手菩萨
    'statues-037', // 东魏 弥勒菩萨
    'statues-038', // 西魏 佛头（陕西）
    'statues-039', // 晚唐/宋 石佛头
    'statues-041', // 隋 菩萨头
    'statues-043', // 菩萨头
    'statues-045', // 辽 彩绘木雕观音立像
    'statues-046', // 观音立像（阿姆斯特丹）
    'statues-047', // 罗汉（阿姆斯特丹）
    'statues-049', // 元 木雕观音 面部（皇家安大略）
    'statues-051', // 金华万佛塔 鎏金铜大势至
    'statues-052', // 克利夫兰 1962.213
    'statues-053', // 元 铜菩萨（大英博物馆）
    'statues-054', // 鎏金铜观音
    'statues-055', // 唐 鎏金铜观音
    'statues-056', // 观音（大英博物馆）
    'statues-057', // 何朝宗 德化瓷
    'statues-060', // 清 德化 观音
    'statues-063', // 观音（LACMA）
    'statues-066', // 清 地藏菩萨 景德镇瓷（皇家安大略）
    'statues-076', // 清乾隆 粉彩佛像（四川博物院）
    'statues-077', // 清 白衣观音 德化瓷
    'statues-083', // 明/清 南海观音（克利夫兰）
    'statues-091', // 清初 德化 达摩
    'statues-093', // 明 瓷菩萨
    'statues-094', // 清 瓷佛
    'statues-101', // 元 景德镇 釉瓷菩萨
    'statues-104', // 大势至菩萨
    'statues-105', // 辽 大理石文殊骑狮
    'statues-107', // 隋 大理石观音（斯德哥尔摩）
    'statues-108', // 隋 大理石僧（斯德哥尔摩）
    'statues-111', // 金 文殊游戏坐（大英博物馆）
    'statues-113', // 宋 白石佛
    'statues-114', // 辽 观音
    'statues-116', // 金 罗汉 跋陀罗（波士顿）
    'statues-117', // 佛头（LACMA）
    'statues-118', // 佛光寺东大殿 佛坛造像
    'statues-119', // 送子观音（四川丹山）
    'statues-123', 'statues-124', // 东林寺 观音
    'statues-125', // 法华寺 观音
    'statues-136', // 密印寺 千手千眼观音
    'statues-137', // 密印寺 观音/佛/观音
    'statues-142', // 明 观音坐像（克利夫兰）
    'statues-143', // 辽上京 铜观音
    'statues-156', // 上海静安寺 观音
    'statues-157', // 淮安府署? 造像
    'statues-169', 'statues-170', // 上海博物馆 造像
    'statues-171', 'statues-172', // 上海龙华寺
    'statues-174', // 东林寺 罗汉
    'statues-175', // 东林寺 三世佛
    'statues-184', // 北宋 彩塑菩萨像
    'statues-188', 'statues-189', 'statues-190', // 清 彩绘木雕佛半身像
    'statues-194', // 内蒙古博物院 鎏金铜菩萨
    'statues-195', // 内蒙古博物院 彩绘佛像
    'statues-197', // 上海宝山寺 韦驮
    'statues-198', 'statues-199', 'statues-200', 'statues-201', // 七塔寺 四大天王
    'statues-202', // 七塔寺 韦驮
    'statues-203', // 七塔寺 千手观音
    'statues-208', 'statues-209', 'statues-210', // 明 德化窑 观音（吉美）
    'statues-211', // 吉美 观音
  ],

  // —— 殿宇 · 山门 · 塔 · 廊庑 ——
  halls: [
    'halls-001', // 山门匾额
    'halls-006', // 四川 寺院
    'halls-011', // 上海玉佛寺 二十四诸天
    'halls-012', // 中国佛寺 罗汉像
    'halls-013', 'halls-014', // 山西福胜寺 元 明王像
    'halls-019', // 北少林寺
    'halls-020', // 佛像群
    'halls-026', // 山间古塔
    'halls-027', // 中国 塔刹
    'halls-053', 'halls-054', // Jimmy Chang（Unsplash）中国寺塔
    'halls-055', // 昆明东寺塔
    'halls-058', 'halls-059', // 开封铁塔
    'halls-060', // 边屯塔 明嘉靖
    'halls-062', // 奎光塔
    'halls-063', // 汇丰塔
    'halls-064', // 楚王塔
  ],

  // —— 经卷 · 写经 · 刻经 ——
  sutras: [
    'sutras-001', // 敦煌回鹘文文书
    'sutras-003', // 敦煌 棋经
    'sutras-004', // 敦煌写卷数字化
    'sutras-005', // 敦煌写卷数字化
    'sutras-006', // 伯希和汉文 4646
    'sutras-008', // 伯希和汉文 2778
    'sutras-012', // 欧阳询 敦煌拓本
    'sutras-013', // 六种佛经合卷
    'sutras-015', // 伯希和汉文 3349
    'sutras-016', // 伯希和汉文 3453v
    'sutras-017', // 伯希和汉文 3448v
    'sutras-018', // 敦煌写卷
    'sutras-019', // 金刚经
    'sutras-028', // 金刚经
    'sutras-040', // 金刚般若波罗蜜经
  ],

  // —— 山水 · 云海 · 松林 ——
  landscape: [
    'landscape-001', 'landscape-002', 'landscape-003', // 俯仰抱悟山水志
    'landscape-004', // 秋江帆影
    'landscape-006', // 陇南群山
    'landscape-008', // 陇南群山 2
    'landscape-009', // 沔阳幻景
    'landscape-011', // 黄山竹
    'landscape-013', // 安徽黄山
    'landscape-014', // 黄山
    'landscape-018', // 广德 安徽
    'landscape-024', // 青翠山峦
    'landscape-025', // 青云山
    'landscape-026', // 笔架山
    'landscape-040', // 云山
    'landscape-043', // 中国圣山
    'landscape-049', // 中国 云海
    'landscape-054', // 1974 长城
  ],

  // —— 莲 · 荷塘（净土意象）——
  lotus: [
    'lotus-001', 'lotus-002', // 荷花池
    'lotus-003', // 香港中文大学（深圳）莲池
    'lotus-004', // 紫竹院莲池
    'lotus-011', // 莲叶
    'lotus-035', 'lotus-036', // 北京 莲
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
