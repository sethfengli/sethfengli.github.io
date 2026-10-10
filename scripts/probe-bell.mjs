/**
 * 撞钟 → 读「嗡」字的 computed color + 截图。
 * 为什么不能用静态探针：【嗡】只有 ringing 为真时才渲染，必须真的点一下钟。
 * 判据：改令牌名（gold→brass）后若有一处没跟上，该字会静默变成继承色（近黑），
 *      而构建与 tsc 全绿 —— 只有渲染后的颜色能证明。
 *
 * 用法：node scripts/probe-bell.mjs [out.png]
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)


const OUT = path.resolve(process.argv[2] ?? ART('build/shots/bell.png'))
const PORT = 9337
const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p))
const profile = path.resolve(ART('build/chrome-bell'))
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
    '--autoplay-policy=no-user-gesture-required',
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

const URL_ = process.argv[3] ?? 'http://127.0.0.1:5192/dharma'
await send('Page.navigate', { url: URL_ }, sid)
await sleep(3000)
await send('Runtime.evaluate', { expression: `localStorage.setItem('hdc.lang','zh')` }, sid)
await send('Page.navigate', { url: URL_ }, sid)
await sleep(4500)

// 找钟并按下去（用 aria-label 撞 钟 定位，避免依赖 DOM 结构）
const { result: clicked } = await send(
  'Runtime.evaluate',
  {
    expression: `(() => {
      const btns = [...document.querySelectorAll('button')]
      const b = btns.find(x => (x.getAttribute('aria-label')||'').includes('钟'))
        || btns.find(x => (x.getAttribute('title')||'').includes('钟'))
      if (!b) return 'NO_BELL_BUTTON:' + btns.length
      b.scrollIntoView({ block: 'center', behavior: 'instant' })
      b.click()
      return 'clicked:' + (b.getAttribute('aria-label') || b.getAttribute('title') || '?')
    })()`,
    returnByValue: true,
  },
  sid,
)
console.log('撞钟:', clicked.result.value)
await sleep(1200)

const { result: probe } = await send(
  'Runtime.evaluate',
  {
    expression: `(() => {
      const el = [...document.querySelectorAll('span')].find(e => (e.textContent||'').trim() === '嗡')
      if (!el) return JSON.stringify({ om: null, note: '嗡 未出现（ringing 未触发或已结束）' })
      const cs = getComputedStyle(el)
      const root = getComputedStyle(document.documentElement)
      return JSON.stringify({
        om: { text: el.textContent.trim(), color: cs.color, opacity: cs.opacity, fontSize: cs.fontSize, className: el.className },
        tokenBrass400: root.getPropertyValue('--site-brass-400').trim(),
        tokenGold400: root.getPropertyValue('--site-gold-400').trim() || '(unset)',
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
