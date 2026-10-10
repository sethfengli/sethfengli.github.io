/**
 * 把指定选择器滚进视口再截图 —— 用来验证 `loading="lazy"` 的图确实能加载。
 * 为什么需要：CDP 的 captureBeyondViewport 全页截图**不会**触发视口外的懒加载，
 * 于是全页图里会看到空白图片框。这不是缺陷，但会误导人；验证时要先滚动。
 *
 * 用法：node scripts/shot-scrolled.mjs <selector> <out.png> [url]
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)


const SELECTOR = process.argv[2] ?? '.card-media'
const OUT = path.resolve(process.argv[3] ?? ART('build/shots/scrolled.png'))
const URL_ = process.argv[4] ?? 'http://127.0.0.1:5192/'
const PORT = 9334

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p))

const profile = path.resolve(ART('build/chrome-scroll'))
fs.rmSync(profile, { recursive: true, force: true })
fs.mkdirSync(path.dirname(OUT), { recursive: true })

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--no-first-run',
    '--disable-extensions',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1280,900',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let wsUrl = null
for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/version`)
    if (r.ok) {
      wsUrl = (await r.json()).webSocketDebuggerUrl
      break
    }
  } catch {}
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
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  }
}
const send = (method, params = {}, sessionId) =>
  new Promise((res) => {
    const mid = ++id
    pending.set(mid, res)
    ws.send(JSON.stringify({ id: mid, method, params, sessionId }))
  })

const { result: t } = await send('Target.createTarget', { url: 'about:blank' })
const { result: a } = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true })
const sid = a.sessionId
await send('Page.enable', {}, sid)
await send('Runtime.enable', {}, sid)
await send('Page.navigate', { url: URL_ }, sid)
await sleep(2500)
await send(
  'Runtime.evaluate',
  {
    expression: `localStorage.setItem('hdc.lang', ${JSON.stringify(process.env.LANG ?? 'zh')})`,
  },
  sid,
)
await send('Page.navigate', { url: URL_ }, sid)
await sleep(4000)

// 滚到选择器位置，再等懒加载
const { result: scrolled } = await send(
  'Runtime.evaluate',
  {
    expression: `(() => {
      const el = document.querySelector(${JSON.stringify(SELECTOR)})
      if (!el) return 'NOT_FOUND'
      el.scrollIntoView({ block: 'center', behavior: 'instant' })
      return String(Math.round(window.scrollY))
    })()`,
    returnByValue: true,
  },
  sid,
)
console.log('滚动到:', scrolled.result.value)
await sleep(3500)

// 报告该区域所有 img 的加载状态
const { result: imgs } = await send(
  'Runtime.evaluate',
  {
    expression: `JSON.stringify([...document.querySelectorAll('img')].slice(0, 14).map(i => ({
      src: i.currentSrc.replace(location.origin,'') || i.getAttribute('src'),
      complete: i.complete, w: i.naturalWidth, h: i.naturalHeight, loading: i.loading
    })))`,
    returnByValue: true,
  },
  sid,
)
console.log('图片状态:', imgs.result.value)

const { result: shot } = await send('Page.captureScreenshot', { format: 'png' }, sid)
fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'))
console.log(`→ ${path.relative(process.cwd(), OUT)}`)

ws.close()
chrome.kill()
