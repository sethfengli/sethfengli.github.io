/**
 * Commons 分类探测：给定一批候选分类名，报告「是否存在 / 有多少文件 / 前若干文件名」。
 * 用于校正 fetch-cn-photos.mjs 的 BUCKETS（避免猜分类名）。
 *
 * 用法：node scripts/probe-cats.mjs "Category:A" "Category:B" ...
 *      node scripts/probe-cats.mjs --search "Buddhist sculpture China"
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UA = { 'User-Agent': 'HuidengChanlin/2.0 (Buddhist site curation)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA })
      const t = await r.text()
      if (r.status === 429 || t.includes('too many requests')) {
        await sleep((i + 1) * 8000)
        continue
      }
      return JSON.parse(t)
    } catch {
      await sleep((i + 1) * 2500)
    }
  }
  return null
}

const argv = process.argv.slice(2)
const out = []

if (argv[0] === '--search') {
  const term = argv[1]
  const j = await api(
    'https://commons.wikimedia.org/w/api.php?action=query&list=search' +
      `&srsearch=${encodeURIComponent(term)}&srnamespace=14&srlimit=40&format=json&maxlag=5`,
  )
  for (const r of j?.query?.search ?? []) out.push(r.title)
  console.log(out.join('\n'))
} else {
  for (const cat of argv) {
    const j = await api(
      'https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers' +
        `&gcmtitle=${encodeURIComponent(cat)}&gcmtype=file&gcmlimit=8` +
        '&prop=imageinfo&iiprop=size%7Cmediatype&format=json&maxlag=5',
    )
    const pages = j?.query?.pages ? Object.values(j.query.pages) : []
    const j2 = await api(
      'https://commons.wikimedia.org/w/api.php?action=query&prop=categoryinfo' +
        `&titles=${encodeURIComponent(cat)}&format=json&maxlag=5`,
    )
    const info = j2?.query?.pages ? Object.values(j2.query.pages)[0]?.categoryinfo : null
    const n = info?.files ?? pages.length
    console.log(`\n### ${cat}  → files=${n}${info?.subcats != null ? ` subcats=${info.subcats}` : ''}`)
    for (const p of pages.slice(0, 8)) {
      const ii = p.imageinfo?.[0]
      console.log(`    ${p.title.replace(/^File:/, '')}${ii ? `  [${ii.width}x${ii.height}]` : ''}`)
    }
    await sleep(900)
  }
}
