/**
 * 灵签页：抽一支签，读「签位分档」徽章的 computed background —— 这是
 * `bg-brass-500` / `bg-mist-200` 唯一在 DOM 上真正渲染的地方（另一处是梵钟「嗡」字，
 * 但那条路径只在无 WebGL 的 fallback 里出现；3D 钟一渲染，DOM 版就不挂载）。
 *
 * 判据：若 brass/mist 令牌有任一处没跟上改名，Tailwind 不会生成对应工具类，
 *      徽章会**静默变透明/继承**（构建与 tsc 全绿）。
 *
 * 用法：node scripts/probe-lots.mjs [out.png]
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)


const OUT = path.resolve(process.argv[2] ?? ART('build/shots/lots.png'))
const PORT = 9338
const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p))
const profile = path.resolve(ART('build/chrome-lots'))
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
const evalJs = async (expression) => {
  const { result } = await send('Runtime.evaluate', { expression, returnByValue: true }, sid)
  return result?.result?.value ?? result?.value
}

const { result: t } = await send('Target.createTarget', { url: 'about:blank' })
const { result: a } = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true })
const sid = a.sessionId
await send('Page.enable', {}, sid)
await send('Runtime.enable', {}, sid)

const URL_ = 'http://127.0.0.1:5192/lots'
await send('Page.navigate', { url: URL_ }, sid)
await sleep(2500)
await send('Runtime.evaluate', { expression: `localStorage.setItem('hdc.lang','zh')` }, sid)
await send('Page.navigate', { url: URL_ }, sid)
await sleep(4500)

// 抽签按钮：页面里唯一带 !px-10 的主按钮
const clicked = await evalJs(`(() => {
  const b = [...document.querySelectorAll('button.btn-primary')]
    .find(x => x.className.includes('px-10'))
  if (!b) return 'NO_DRAW_BUTTON'
  b.scrollIntoView({ block: 'center', behavior: 'instant' })
  b.click()
  return 'clicked:' + b.textContent.trim()
})()`)
console.log('抽签:', clicked)

// 轮询等待徽章出现（摇签有动画与时长）
const HEX = { brass500: '#ab8940', brass400: '#c2a25c', mist200: '#d3dde1', mist700: '#54707c' }
let found = null
for (let i = 0; i < 40; i++) {
  await sleep(1000)
  const raw = await evalJs(`(() => {
    const els = [...document.querySelectorAll('[class*="-brass-"],[class*="-mist-"]')]
    if (!els.length) return ''
    return JSON.stringify(els.map(e => ({
      cls: e.className,
      bg: getComputedStyle(e).backgroundColor,
      color: getComputedStyle(e).color,
      text: (e.textContent||'').trim().slice(0, 8),
    })))
  })()`)
  if (raw) {
    found = raw
    break
  }
}
console.log('徽章:', found ?? '(轮询 40s 未出现 — 该签位可能不是上吉/中下)')

const after = await evalJs(`(() => {
  const root = getComputedStyle(document.documentElement)
  const out = {}
  for (const n of ['brass-500','brass-400','mist-200','mist-700']) out[n] = root.getPropertyValue('--site-'+n).trim()
  out.gold500 = root.getPropertyValue('--site-gold-500').trim() || '(unset)'
  return JSON.stringify(out, null, 1)
})()`)
console.log('令牌:', after)
console.log('期望:', JSON.stringify(HEX))

const { result: shot } = await send('Page.captureScreenshot', { format: 'png' }, sid)
fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'))
console.log('→', path.relative(process.cwd(), OUT))

ws.close()
chrome.kill()
