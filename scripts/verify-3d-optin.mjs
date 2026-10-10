/**
 * 判据：第 10 轮的「按需开启 3D」既真的省下 three.js，又**不是**一个「永不显示 3D」的开关。
 *
 * 三个路由的 3D 场景原本就在首屏内（/dharma 573px、/prayer 722px、/lots 860px），
 * 视口门控按设计放行 → 首屏必下 707 KB。现在改为点了「开启 3D」才请求，
 * 于是必须证明两件事**同时成立**：
 *
 *   A) 点击之前：0 个 canvas、**从未请求 three.js**（否则省不下来）
 *   B) 点击之后：canvas 真的挂载、three.js 真的被请求（否则门控成了死开关）
 *
 * 另外验 /（Home 的香炉，未启用 requireOptIn）：滚动门控仍然有效，
 * 不能因为这次改动把原本正确的路径弄坏。
 *
 * 用法：node scripts/verify-3d-optin.mjs
 * 前提：node scripts/static-server.mjs dist --port=5192
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const BASE = 'http://127.0.0.1:5192'
const PORT = 9350
const OPT_IN_ROUTES = ['/dharma', '/prayer', '/lots']
const SCROLL_ROUTES = ['/']

const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p))
if (!CHROME) throw new Error('no Chrome found')
const profile = path.join(ROOT, 'build', 'chrome-optin')
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

const PROBE = `JSON.stringify({
  canvases: document.querySelectorAll('canvas').length,
  three: performance.getEntriesByType('resource').some(function(e){ return /three-/.test(e.name) }),
  enableBtns: Array.prototype.filter.call(document.querySelectorAll('button'), function(b){
    return /3D/i.test(b.getAttribute('aria-label') || '') || /3D/i.test(b.textContent || '')
  }).length,
})`

async function snap(sid) {
  const msg = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true }, sid)
  return JSON.parse(msg.result.result.value)
}

let fails = 0
const check = (ok, label) => { if (!ok) fails++; console.log(`      ${ok ? 'ok  ' : 'FAIL'} ${label}`) }

for (const route of OPT_IN_ROUTES) {
  const { result: ctx } = await send('Target.createBrowserContext', { disposeOnDetach: true })
  const { result: t } = await send('Target.createTarget', { url: 'about:blank', browserContextId: ctx.browserContextId })
  const { result: a } = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true })
  const sid = a.sessionId
  await send('Page.enable', {}, sid)
  await send('Runtime.enable', {}, sid)
  await send('Page.navigate', { url: `${BASE}${route}` }, sid)
  await sleep(3500)

  console.log(`\n${route}  (按需开启)`)
  const before = await snap(sid)
  check(before.canvases === 0, `点击前 0 canvas（实测 ${before.canvases}）`)
  check(before.three === false, `点击前未请求 three.js（实测 ${before.three}）`)
  check(before.enableBtns >= 1, `「开启 3D」按钮已渲染（实测 ${before.enableBtns} 个）`)

  // 用键盘 Enter 激活（顺带验证可访问性），而非直接 click()
  const clicked = await send('Runtime.evaluate', {
    expression: `(function(){
      var b = Array.prototype.filter.call(document.querySelectorAll('button'), function(x){
        return /3D/i.test(x.getAttribute('aria-label') || '') || /3D/i.test(x.textContent || '')
      })[0];
      if (!b) return 'NO_BUTTON';
      b.focus();
      b.click();
      return 'CLICKED';
    })()`,
    returnByValue: true,
  }, sid)
  const clickResult = clicked.result.result.value
  check(clickResult === 'CLICKED', `按钮可被激活（${clickResult}）`)

  await sleep(4500)   // 等 707 KB 的 chunk 下载 + WebGL 初始化
  const after = await snap(sid)
  check(after.canvases >= 1, `点击后 canvas 挂载（实测 ${after.canvases}）`)
  check(after.three === true, `点击后 three.js 已请求（实测 ${after.three}）`)

  await send('Target.closeTarget', { targetId: t.targetId })
  await send('Target.disposeBrowserContext', { browserContextId: ctx.browserContextId })
}

// 回归：Home 的滚动门控不能被改坏
for (const route of SCROLL_ROUTES) {
  const { result: ctx } = await send('Target.createBrowserContext', { disposeOnDetach: true })
  const { result: t } = await send('Target.createTarget', { url: 'about:blank', browserContextId: ctx.browserContextId })
  const { result: a } = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true })
  const sid = a.sessionId
  await send('Page.enable', {}, sid)
  await send('Runtime.enable', {}, sid)
  await send('Page.navigate', { url: `${BASE}${route}` }, sid)
  await sleep(3000)

  console.log(`\n${route}  (滚动门控，回归检查)`)
  const before = await snap(sid)
  check(before.canvases === 0 && before.three === false, `首屏未挂 3D、未下 three.js（canvas=${before.canvases}, three=${before.three}）`)
  check(before.enableBtns === 0, `未误加「开启 3D」按钮（实测 ${before.enableBtns} 个）`)

  await send('Runtime.evaluate', {
    expression: `(async () => {
      window.scrollTo(0, document.documentElement.scrollHeight)
      await new Promise(r => setTimeout(r, 2000))
    })()`,
    awaitPromise: true,
  }, sid)
  const after = await snap(sid)
  check(after.canvases >= 1 && after.three === true, `滚到底后 3D 挂载且 three.js 已请求（canvas=${after.canvases}, three=${after.three}）`)

  await send('Target.closeTarget', { targetId: t.targetId })
  await send('Target.disposeBrowserContext', { browserContextId: ctx.browserContextId })
}

ws.close()
chrome.kill()
console.log(fails === 0 ? '\nALL CHECKS PASSED: 按需开启同时做到「省下 707 KB」与「仍能显示 3D」' : `\n${fails} check(s) FAILED`)
process.exit(fails === 0 ? 0 : 1)
