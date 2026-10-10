/**
 * 用 CDP 把页面切成中文、截图，并**实测**正文宋体子集是否真的被浏览器用上。
 * 为什么需要：只截图看不出「用的是内置字体还是系统回退字体」。
 * 这里读 document.fonts.check() 与元素实测宽度来判定。
 *
 * 用法：node scripts/shot-zh.mjs [url] [outfile]
 *   前置：已启动 node scripts/static-server.mjs dist --port=5192
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, spawn } from 'node:child_process'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)


const URL_ = process.argv[2] ?? 'http://127.0.0.1:5192/'
const OUT = path.resolve(process.argv[3] ?? ART('build/shots/zh.png'))
const PORT = 9333

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p))

const profile = path.resolve(ART('build/chrome-zh'))
fs.rmSync(profile, { recursive: true, force: true })
fs.mkdirSync(OUT.replace(/[^\\/]+$/, ''), { recursive: true })

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--no-first-run',
    '--disable-extensions',
    '--disk-cache-size=1',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1280,1400',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 等 CDP 起来
let wsUrl = null
for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/version`)
    if (r.ok) {
      wsUrl = (await r.json()).webSocketDebuggerUrl
      break
    }
  } catch {
    /* retry */
  }
  await sleep(300)
}
if (!wsUrl) {
  chrome.kill()
  throw new Error('CDP 未就绪')
}

const ws = new WebSocket(wsUrl)
await new Promise((res, rej) => {
  ws.onopen = res
  ws.onerror = rej
})

let id = 0
const pending = new Map()
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  }
}
const send = (method, params = {}, sessionId) =>
  new Promise((res) => {
    const mid = ++id
    pending.set(mid, res)
    ws.send(JSON.stringify({ id: mid, method, params, sessionId }))
  })

// 新建一个 page target 并 attach
const { result: target } = await send('Target.createTarget', { url: 'about:blank' })
const { result: attached } = await send('Target.attachToTarget', {
  targetId: target.targetId,
  flatten: true,
})
const sid = attached.sessionId

await send('Page.enable', {}, sid)
await send('Runtime.enable', {}, sid)
await send('Network.enable', {}, sid)

// 记录字体类请求，用来证明「子集文件真的被下载了」而不是靠系统字体蒙混
// ── 先只记录页面自身的字体请求（探针本身不要碰到字体，否则会误判成页面加载）──
const fontHits = []
let probing = false
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.method === 'Network.responseReceived' && !probing) {
    const u = m.params?.response?.url ?? ''
    if (/\.(woff2?|otf|ttf)(\?|$)/.test(u)) {
      fontHits.push({ url: u.replace(/^https?:\/\/[^/]+/, ''), status: m.params.response.status, mime: m.params.response.mimeType })
    }
  }
})

// 先访问同源，才能写 localStorage
await send('Page.navigate', { url: URL_ }, sid)
await sleep(2500)
await send('Runtime.evaluate', {
  expression: `localStorage.setItem('hdc.lang', ${JSON.stringify(process.env.LANG ?? 'zh')})`,
  returnByValue: true,
}, sid)
await send('Page.navigate', { url: URL_ }, sid)
await sleep(5000)

// 页面自身该加载的字体在上面 5 秒内已经请求完了；下面探针会碰字体，故先冻结记录
probing = true
console.log('页面自身请求的字体：')
for (const h of fontHits) console.log(`  ${h.status} ${h.mime.padEnd(18)} ${h.url}`)
if (!fontHits.length) console.log('  （无）')

const { result: probe } = await send(
  'Runtime.evaluate',
  {
    expression: `(() => {
      const out = {}
      out.htmlLang = document.documentElement.lang
      out.bodyFont = getComputedStyle(document.body).fontFamily
      const h1 = document.querySelector('h1')
      out.h1Font = h1 ? getComputedStyle(h1).fontFamily : null
      out.h1Text = h1 ? h1.textContent.slice(0, 30) : null
      // 正文段落
      const p = document.querySelector('main p') || document.querySelector('p')
      out.pFont = p ? getComputedStyle(p).fontFamily : null
      out.pText = p ? p.textContent.slice(0, 30) : null
      // 用 canvas 实测字形宽度：canvas 的字体本身与本机无关，
      // 若目标字体没加载，浏览器会用默认字体绘制，宽度会与另一族完全相同。
      const w = (ff, text) => {
        const c = document.createElement('canvas').getContext('2d')
        c.font = '40px ' + ff
        return Math.round(c.measureText(text).width)
      }
      out.brushCount = document.querySelectorAll('.font-brush').length
      out.brushLoaded = document.fonts.check("40px 'MaShanZhengSubset'")
      out.songLoaded = document.fonts.check("40px 'Noto Serif SC'")
      out.faces = [...document.fonts].map((f) => f.family + ':' + f.status + ':' + (f.unicodeRange || '').slice(0, 24))
      out.w_song = w("'Noto Serif SC'", '紅日一輪出海隅')
      out.w_mono = w('monospace', '紅日一輪出海隅')
      return JSON.stringify(out)
    })()`,
    returnByValue: true,
  },
  sid,
)
console.log('探针：', probe.result.value)

const { result: shot } = await send(
  'Page.captureScreenshot',
  { format: 'png', captureBeyondViewport: true },
  sid,
)
fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'))
console.log(`→ ${path.relative(process.cwd(), OUT)}`)

ws.close()
chrome.kill()
execFileSync('powershell', ['-NoProfile', '-Command', `Remove-Item -Recurse -Force '${profile}' -ErrorAction SilentlyContinue`], { stdio: 'ignore' })
