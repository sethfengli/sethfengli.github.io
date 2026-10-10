/**
 * Screenshot every top-level route after the code split, to eyeball the lazy
 * boundaries (the `RouteFallback` skeleton, the 3D placeholders, the /lots tabs).
 *
 * Usage: node build/shots-routes.mjs [--lang=zh|en]
 * Output: build/shots/route-<name>.png
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)
const BASE = 'http://127.0.0.1:5192'
const PORT = 9340
const LANG = (process.argv.find((a) => a.startsWith('--lang=')) ?? '--lang=zh').slice(7)

const ROUTES = [
  ['/', 'home'],
  ['/articles', 'articles'],
  ['/dharma', 'dharma'],
  ['/prayer', 'prayer'],
  ['/lots', 'lots'],
  ['/lots?tab=lingqi', 'lots-lingqi'],
  ['/about', 'about'],
]

const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p))
const OUT = ART('build/shots')
fs.mkdirSync(OUT, { recursive: true })
const profile = ART('build/chrome-routes')
fs.rmSync(profile, { recursive: true, force: true })

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

// Seed the language preference before the real navigation.
await send('Page.navigate', { url: `${BASE}/` }, sid)
await sleep(1500)
await send('Runtime.evaluate', { expression: `localStorage.setItem('hdc.lang', ${JSON.stringify(LANG)})` }, sid)

for (const [route, name] of ROUTES) {
  await send('Page.navigate', { url: `${BASE}${route}` }, sid)
  await sleep(3200)
  // scroll through the page so lazy images and the 3D gate both trigger
  await send(
    'Runtime.evaluate',
    {
      expression: `(async () => {
        const step = window.innerHeight * 0.8
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          window.scrollTo(0, y)
          await new Promise(r => setTimeout(r, 260))
        }
        window.scrollTo(0, 0)
      })()`,
      awaitPromise: true,
    },
    sid,
  )
  await sleep(900)
  const { result: shot } = await send('Page.captureScreenshot', { format: 'png' }, sid)
  const file = path.join(OUT, `route-${name}.png`)
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'))
  console.log(`→ ${path.relative(ROOT, file)}`)
}

ws.close()
chrome.kill()
