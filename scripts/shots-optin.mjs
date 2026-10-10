/**
 * 第 10 轮：给三个「按需开启 3D」的路由截图，肉眼核对
 *   ① 「开启 3D」按钮有没有压住 DOM fallback 的可点区域；
 *   ② 页头/正文/卡片有没有因为多了按钮而错位。
 * 与 shots-routes.mjs 的区别：这里只截 3D 区块所在的**首屏**（含按钮），
 * 并额外报出按钮与 3D 容器的相对位置，便于判断遮挡。
 *
 * 用法：node scripts/shots-optin.mjs
 * 前提：node scripts/static-server.mjs dist --port=5192
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const BASE = 'http://127.0.0.1:5192'
const PORT = 9352
const ROUTES = [['/dharma', 'dharma'], ['/prayer', 'prayer'], ['/lots', 'lots']]
const OUT = path.join(ROOT, 'build', 'shots')

const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p))
if (!CHROME) throw new Error('no Chrome found')
const profile = path.join(ROOT, 'build', 'chrome-shots-optin')
fs.rmSync(profile, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

const chrome = spawn(
  CHROME,
  ['--headless=new', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars',
    '--no-first-run', '--disable-extensions', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`, '--window-size=1280,900', '--force-device-scale-factor=1', 'about:blank'],
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
const events = []
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  else events.push(m)
}
const send = (method, params = {}, sessionId) =>
  new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params, sessionId })) })

for (const [route, name] of ROUTES) {
  const { result: ctx } = await send('Target.createBrowserContext', { disposeOnDetach: true })
  const { result: t } = await send('Target.createTarget', { url: 'about:blank', browserContextId: ctx.browserContextId })
  const { result: a } = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true })
  const sid = a.sessionId
  await send('Page.enable', {}, sid)
  await send('Runtime.enable', {}, sid)
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, sid)
  await send('Page.navigate', { url: `${BASE}${route}` }, sid)
  await sleep(3500)

  // 几何关系：按钮是否落在 3D 容器内、是否压住可点元素
  const info = await send('Runtime.evaluate', {
    expression: `JSON.stringify((function(){
      var btn = Array.prototype.filter.call(document.querySelectorAll('button'), function(x){
        return /3D/i.test(x.getAttribute('aria-label') || '')
      })[0];
      var gate = document.querySelector('div[style*="min-height"]');
      var r = function(el){ if(!el) return null; var b = el.getBoundingClientRect(); return {top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right)}; };
      var btnR = r(btn), gateR = r(gate);
      // 视口内可点的其它按钮，检查是否与「开启 3D」重叠
      var overlaps = [];
      Array.prototype.forEach.call(document.querySelectorAll('button, a'), function(el){
        if (el === btn) return;
        var b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) return;
        if (b.bottom < 0 || b.top > window.innerHeight) return;
        var hit = !(btnR && (b.right < btnR.left || b.left > btnR.right || b.bottom < btnR.top || b.top > btnR.bottom));
        if (hit) overlaps.push((el.tagName.toLowerCase()) + ':' + (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24));
      });
      return { btn: btnR, gate: gateR, label: btn ? btn.textContent.trim() : null, overlaps: overlaps,
               canvases: document.querySelectorAll('canvas').length };
    })())`,
    returnByValue: true,
  }, sid)
  const d = JSON.parse(info.result.result.value)
  console.log(`\n${route}`)
  console.log(`  按钮「${d.label}」 @ ${JSON.stringify(d.btn)}`)
  console.log(`  3D 容器       @ ${JSON.stringify(d.gate)}   canvas=${d.canvases}`)
  console.log(`  与其它可点元素重叠: ${d.overlaps.length === 0 ? '无' : d.overlaps.join(' | ')}`)

  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sid)
  const file = path.join(OUT, `optin-${name}.png`)
  fs.writeFileSync(file, Buffer.from(shot.result.data, 'base64'))
  console.log(`  截图 -> ${path.relative(ROOT, file)}`)

  // 再滚到 3D 区块，拍一张「按钮在画面里」的图，用于肉眼核对按钮与图形的关系
  if (d.btn) {
    await send('Runtime.evaluate', {
      expression: `(function(){
        var b = Array.prototype.filter.call(document.querySelectorAll('button'), function(x){
          return /3D/i.test(x.getAttribute('aria-label') || '')
        })[0];
        if (b) b.scrollIntoView({ block: 'center' });
      })()`,
      returnByValue: true,
    }, sid)
    await sleep(900)
    const shot2 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sid)
    const file2 = path.join(OUT, `optin-${name}-focused.png`)
    fs.writeFileSync(file2, Buffer.from(shot2.result.data, 'base64'))
    console.log(`  截图（滚到按钮） -> ${path.relative(ROOT, file2)}`)
  }

  await send('Target.closeTarget', { targetId: t.targetId })
  await send('Target.disposeBrowserContext', { browserContextId: ctx.browserContextId })
}
ws.close()
chrome.kill()
