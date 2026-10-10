/**
 * 截图 + 读取「本页与颜色令牌相关元素」的 computed color/background。
 * 为什么：令牌改名（gold→brass / moon→mist）只要有一个地方没跟上，Tailwind 就不生成
 * 对应工具类，元素会**静默变透明/继承** —— 构建、tsc 全绿。判据是渲染后的实际颜色。
 *
 * 用法：node scripts/probe-colors.mjs <out.png> [url]
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)


const OUT = path.resolve(process.argv[2] ?? ART('build/shots/colors.png'))
const URL_ = process.argv[3] ?? 'http://127.0.0.1:5192/'
const PORT = 9336

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p))

const profile = path.resolve(ART('build/chrome-colors'))
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

// 先记录「令牌是否真的定义了」——与元素无关的硬判据
await send('Page.navigate', { url: URL_ }, sid)
await sleep(3000)
await send(
  'Runtime.evaluate',
  { expression: `localStorage.setItem('hdc.lang','zh')` },
  sid,
)
await send('Page.navigate', { url: URL_ }, sid)
await sleep(4500)

const { result: probe } = await send(
  'Runtime.evaluate',
  {
    expression: `(() => {
      const cs = getComputedStyle(document.documentElement)
      const tok = (n) => cs.getPropertyValue('--site-' + n).trim() || '(unset)'
      // 「嗡」字：梵钟上的浮动字
      const om = [...document.querySelectorAll('*')].find(
        (e) => e.children.length === 0 && (e.textContent || '').trim() === '嗡'
      )
      const omCs = om ? getComputedStyle(om) : null
      return JSON.stringify({
        tokens: {
          'brass-500': tok('brass-500'),
          'brass-400': tok('brass-400'),
          'mist-200': tok('mist-200'),
          'mist-700': tok('mist-700'),
          'gold-500': tok('gold-500'),
        },
        om: om
          ? { text: om.textContent.trim(), color: omCs.color, cls: om.className }
          : null,
      }, null, 1)
    })()`,
    returnByValue: true,
  },
  sid,
)
console.log('探针:', probe.result.value)

const { result: shot } = await send('Page.captureScreenshot', { format: 'png' }, sid)
fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'))
console.log('→', path.relative(process.cwd(), OUT))

ws.close()
chrome.kill()
