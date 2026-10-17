/**
 * 撞钟 → 读「按钮 / 画布」状态 + 截图（v3：3D 梵钟）。
 *
 * v2 的判据是读 DOM 里「嗡」字的 computed color；v3 把「嗡」改成 3D Sprite，
 * 这个断言已失效。现在改为验证可观测的产品状态：
 *   - 点击后按钮进入 ringing（文案变化 + disabled）；
 *   - 页面上出现「钟声回荡中…」提示；
 *   - canvas 仍在（说明 3D 场景已挂载）。
 * 仍然必须真的点一下，因为 ringing 只在交互后出现。
 *
 * 用法：node scripts/probe-bell.mjs [out.png] [url]
 * 前提：站点已跑起来（默认 http://127.0.0.1:5192/dharma）。
 */
import fs from 'node:fs'
import os from 'node:os'
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
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'hdc-bell-'))
fs.mkdirSync(path.dirname(OUT), { recursive: true })

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--use-gl=swiftshader',
    '--enable-unsafe-swiftshader',
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
      const btns = [...document.querySelectorAll('button')]
      const b = btns.find(x => (x.getAttribute('aria-label')||'').includes('钟'))
        || btns.find(x => (x.getAttribute('title')||'').includes('钟'))
      const hint = [...document.querySelectorAll('span')]
        .map(e => (e.textContent || '').trim())
        .find(t => t.includes('回荡') || t.includes('钟声'))
      return JSON.stringify({
        canvases: document.querySelectorAll('canvas').length,
        button: b ? { label: b.textContent.trim(), disabled: b.disabled } : null,
        ringingHint: hint || null,
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
