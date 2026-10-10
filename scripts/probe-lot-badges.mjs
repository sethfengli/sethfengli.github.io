/**
 * 种入历史（每档一支签）→ 读「我的签文」列表里六个徽章的 computed background。
 * 为什么：`levelClass()` 是 brass/mist 令牌在 DOM 上唯一定期渲染的地方，而抽签是随机的，
 * 靠抽签碰不到全部六档。种历史可以**一次**核对 上上/上吉/中吉/中平/中下/下下 六档配色。
 *
 * 判据：任一档若因令牌改名没跟上，Tailwind 不生成该工具类 → 徽章静默变成透明。
 * 用法：node scripts/probe-lot-badges.mjs [out.png]
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

// Resolve the repo root once so artifact paths work from any cwd.
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)


const OUT = path.resolve(process.argv[2] ?? ART('build/shots/lot-badges.png'))
const PORT = 9339
const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p))
const profile = path.resolve(ART('build/chrome-badges'))
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
    '--window-size=1280,1100',
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
const evalJs = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true }, sid)
  return r.result?.result?.value
}

const URL_ = 'http://127.0.0.1:5192/lots'
await send('Page.navigate', { url: URL_ }, sid)
await sleep(2500)

// 每档一支签（见 scripts/lot-levels.mjs 的推导）
const seed = [1, 4, 7, 13, 23, 29].map((lotId, i) => ({ lotId, drawnAt: Date.now() - i * 86400000 }))
await evalJs(`localStorage.setItem('hdc.lang','zh'); localStorage.setItem('hdc.savedLots', ${JSON.stringify(JSON.stringify(seed))}); 'ok'`)
await send('Page.navigate', { url: URL_ }, sid)
await sleep(4500)

const raw = await evalJs(`(() => {
  const spans = [...document.querySelectorAll('span')]
    .filter(e => /^(上上|上吉|中吉|中平|中下|下下)$/.test((e.textContent||'').trim()))
  const uniq = []
  const seen = new Set()
  for (const e of spans) {
    const k = e.textContent.trim()
    if (seen.has(k)) continue
    seen.add(k)
    const cs = getComputedStyle(e)
    uniq.push({ level: k, cls: e.className, bg: cs.backgroundColor, color: cs.color })
  }
  const root = getComputedStyle(document.documentElement)
  return JSON.stringify({
    badges: uniq,
    tokens: {
      'brass-500': root.getPropertyValue('--site-brass-500').trim(),
      'mist-200': root.getPropertyValue('--site-mist-200').trim(),
      'gold-500': root.getPropertyValue('--site-gold-500').trim() || '(unset)',
    },
  }, null, 1)
})()`)
console.log(raw)

// 滚到「我的签文」再截图
await evalJs(`(() => {
  const h = [...document.querySelectorAll('h2')].find(e => (e.textContent||'').includes('我的签文'))
  if (h) h.scrollIntoView({ block: 'start', behavior: 'instant' })
  return 'scrolled'
})()`)
await sleep(1500)
const { result: shot } = await send('Page.captureScreenshot', { format: 'png' }, sid)
fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'))
console.log('→', path.relative(process.cwd(), OUT))

ws.close()
chrome.kill()
