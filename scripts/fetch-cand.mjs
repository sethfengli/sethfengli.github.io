/**
 * 抓候选缩略图到 build/cand/（用池子里**自带的 url**，只把 /1920px- 换成 /420px-）。
 * 为什么要自带 url：第 8 轮实测用「Special:FilePath/<文件名>?width=」重建路径会大量 404
 * （文件名被 URL 编码过、或尺寸超限），而池里的 url 是抓取时记下的真实地址。
 * ⚠ 缩略图只用于**排序**，题材最终必须看全尺寸（§9.2 第 9 条）。
 *
 * 用法：node scripts/fetch-cand.mjs <bucket> <id...>
 */
import fs from 'node:fs'
import path from 'node:path'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)


const [, , bucket, ...ids] = process.argv
const pool = JSON.parse(fs.readFileSync('scripts/cn-pool.json', 'utf8'))
const OUT = ART('build/cand')
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

for (const id of ids) {
  const hit = (pool[bucket] ?? []).find((p) => p.id === id)
  if (!hit) {
    console.log(`✗ ${id} 池中不存在`)
    continue
  }
  // 池里的拇指路径形如 .../thumb/x/xy/Name.jpg/1920px-Name.jpg
  // ⚠ 第 8 轮实测：把 1920px 改成 420px 常返回 400（该尺寸未被缓存/被限流），
  //   而池里记下的原尺寸是 200。故缩略图失败就**回退到池里的原 url**。
  const orig = hit.url.split('?')[0]
  const m = orig.match(/^(.*\/thumb\/.*\/)(\d+)px-(.*)$/)
  const small = m ? `${m[1]}420px-${m[3]}` : orig
  const out = path.join(OUT, `${id}.img`)
  if (fs.existsSync(out)) {
    console.log(`· ${id} 已存在`)
    continue
  }
  try {
    let r = await fetch(small, {
      headers: { 'User-Agent': 'HuidengChanlin/2.0 (non-commercial Buddhist site curation)' },
      redirect: 'follow',
    })
    let via = '420px'
    if (!r.ok) {
      r = await fetch(orig, {
        headers: { 'User-Agent': 'HuidengChanlin/2.0 (non-commercial Buddhist site curation)' },
        redirect: 'follow',
      })
      via = 'orig'
    }
    if (!r.ok) {
      console.log(`✗ ${id} HTTP ${r.status}  ${hit.title}`)
      await sleep(8000)
      continue
    }
    const buf = Buffer.from(await r.arrayBuffer())
    const sig = buf.subarray(0, 4).toString('hex')
    const ext = sig.startsWith('89504e47') ? 'png' : sig.startsWith('ffd8ff') ? 'jpg' : 'bin'
    const dst = path.join(OUT, `${id}.${ext}`)
    fs.writeFileSync(dst, buf)
    console.log(`✓ ${id} [${via}] ${ext} ${(buf.length / 1024) | 0}KB  ${hit.title}`)
  } catch (e) {
    console.log(`✗ ${id} ${e.message}`)
  }
  await sleep(2500)
}
