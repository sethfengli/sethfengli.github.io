/**
 * Verify the 3D scenes actually mount once their viewport gate opens.
 *
 * The route-cost probe skips them on purpose (that is the point of the gate), so
 * something still has to prove the gate is not a permanent "never show the 3D"
 * switch. This scrolls each route to the bottom, waits for the dynamic chunk, and
 * reports whether a <canvas> appeared.
 *
 * Usage: node build/verify-3d-gate.mjs [route ...]
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)
const BASE = 'http://127.0.0.1:5192'
const PORT = 9342
const LIST = process.argv.slice(2).filter((a) => a.startsWith('/'))
const ROUTES = LIST.length ? LIST : ['/', '/dharma', '/prayer', '/lots']

const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p))
const profile = ART('build/chrome-3d')
fs.rmSync(profile, { recursive: true, force: true })

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--use-gl=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
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
  throw new Error('CDP not ready')
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

let fails = 0
for (const route of ROUTES) {
  await send('Page.navigate', { url: `${BASE}${route}` }, sid)
  await sleep(2500)
  await send(
    'Runtime.evaluate',
    {
      expression: `(async () => {
        window.scrollTo(0, document.documentElement.scrollHeight)
        await new Promise(r => setTimeout(r, 1200))
        window.scrollTo(0, 0)
        await new Promise(r => setTimeout(r, 400))
      })()`,
      awaitPromise: true,
    },
    sid,
  )
  const msg = await send(
    'Runtime.evaluate',
    {
      expression: `JSON.stringify({
        canvases: document.querySelectorAll('canvas').length,
        three: performance.getEntriesByType('resource').some(e => /three-/.test(e.name)),
        gates: document.querySelectorAll('div[style*="min-height"]').length,
      })`,
      returnByValue: true,
    },
    sid,
  )
  const d = JSON.parse(msg.result.result.value)
  const ok = d.canvases >= 1 && d.three
  if (!ok) fails++
  console.log(`${route.padEnd(10)} canvas=${d.canvases}  three.js loaded=${d.three}  gates=${d.gates}  ${ok ? 'OK' : 'NOT MOUNTED'}`)
  await sleep(300)
}

ws.close()
chrome.kill()
console.log(fails === 0 ? '\nall 3D scenes mount after scrolling' : `\n${fails} route(s) did not mount`)
process.exit(fails === 0 ? 0 : 1)
