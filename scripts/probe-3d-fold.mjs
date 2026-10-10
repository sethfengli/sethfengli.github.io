/**
 * 判据：三个 3D 路由里，3D 容器相对「折叠线」的实际位置。
 *
 * `probe-route-cost.mjs` 只告诉我们「three.js 被下了」，不告诉我们**为什么**。
 * 这个探针读每个路由上 3D 容器的 getBoundingClientRect().top 与视口高度，
 * 从而区分「场景本来就在首屏内（门控按设计放行）」与「场景在折叠线以下却被提前加载（真缺陷）」。
 *
 * 用法：node scripts/probe-3d-fold.mjs
 * 前提：node scripts/static-server.mjs dist --port=5192
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const BASE = 'http://127.0.0.1:5192'
const PORT = 9346
const ROUTES = ['/', '/dharma', '/prayer', '/lots']

const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p))
if (!CHROME) throw new Error('no Chrome found')
const profile = path.join(ROOT, 'build', 'chrome-fold')
fs.rmSync(profile, { recursive: true, force: true })

const chrome = spawn(
  CHROME,
  ['--headless=new', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars',
    '--no-first-run', '--disable-extensions', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`, '--window-size=1280,900', 'about:blank'],
  { stdio: 'ignore' },
)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let wsUrl = null
for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/version`)
    if (r.ok) { wsUrl = (await r.json()).webSocketDebuggerUrl; break }
  } catch {}
  await sleep(300)
}
if (!wsUrl) { chrome.kill(); throw new Error('CDP not ready') }

const ws = new WebSocket(wsUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
let id = 0
const pending = new Map()
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
}
const send = (method, params = {}, sessionId) =>
  new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params, sessionId })) })

// 找 3D 容器：Contained3D 渲染成 <div style="min-height:...">，其内要么是 canvas 要么是 DOM fallback
const EXPR = `JSON.stringify((function(){
  var out = [];
  var divs = document.querySelectorAll('div[style*="min-height"]');
  for (var i=0;i<divs.length;i++){
    var d = divs[i];
    var r = d.getBoundingClientRect();
    out.push({
      top: Math.round(r.top + window.scrollY),
      topInViewport: Math.round(r.top),
      h: Math.round(r.height),
      kind: d.querySelector('canvas') ? 'canvas' : 'dom-fallback',
      hasCanvas: !!d.querySelector('canvas'),
    });
  }
  return { viewport: window.innerHeight, scrollY: Math.round(window.scrollY), docHeight: document.documentElement.scrollHeight, gates: out };
})())`

console.log(`viewport height = 802px 时，「折叠线」= y 802\n`)
console.log('route      viewport  docH   gate#  top(vp)  top(abs)  height  content')
for (const route of ROUTES) {
  const { result: ctx } = await send('Target.createBrowserContext', { disposeOnDetach: true })
  const { result: target } = await send('Target.createTarget', { url: 'about:blank', browserContextId: ctx.browserContextId })
  const { result: attached } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true })
  const sid = attached.sessionId
  await send('Page.enable', {}, sid)
  await send('Runtime.enable', {}, sid)
  await send('Page.navigate', { url: `${BASE}${route}` }, sid)
  await sleep(3500)
  const msg = await send('Runtime.evaluate', { expression: EXPR, returnByValue: true }, sid)
  const v = msg?.result?.result?.value
  if (typeof v !== 'string') { console.log(`${route}  evaluate failed`); continue }
  const data = JSON.parse(v)
  if (!data.gates.length) { console.log(`${route.padEnd(10)} ${String(data.viewport).padEnd(9)} ${String(data.docHeight).padEnd(6)} (无 3D 容器)`); continue }
  data.gates.forEach((g, i) => {
    const above = g.topInViewport < data.viewport
    console.log(
      `${(i === 0 ? route : '').padEnd(10)} ${String(data.viewport).padEnd(9)} ${String(data.docHeight).padEnd(6)} ` +
      `${String(i + 1).padEnd(6)} ${String(g.topInViewport).padEnd(8)} ${String(g.top).padEnd(9)} ${String(g.h).padEnd(7)} ` +
      `${g.kind}  ${above ? '<-- 在首屏内(门控放行)' : '在折叠线以下'}`,
    )
  })
  await send('Target.closeTarget', { targetId: target.targetId })
  await send('Target.disposeBrowserContext', { browserContextId: ctx.browserContextId })
}
ws.close()
chrome.kill()
