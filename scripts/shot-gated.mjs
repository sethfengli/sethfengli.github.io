/**
 * 视口门控 3D 场景截图探针（无头 Chrome + SwiftShader）
 *
 * 为什么不用 shot-3d.mjs：那个脚本一上来就找 canvas，但首页「一炷心香」的 3D 香炉在
 * `Contained3D` 之后——DOM 里先是 2D 占位香炉，**滚到那一段**才会挂载 three 场景。
 * 于是它永远报「未找到场景 canvas」。本脚本先按文案滚到目标段，等 canvas 出现，
 * 再把它居中，最后拍 canvas 裁切 + 整屏两张。
 *
 * 用法：
 *   node scripts/shot-gated.mjs                       # 首页 3D 香炉
 *   node scripts/shot-gated.mjs --w=390 --h=844       # 移动端
 *   node scripts/shot-gated.mjs --route=/lots --anchor=我的签文 --out=build/shots/lots-cone
 *   node scripts/shot-gated.mjs --route=/prayer --anchor=许愿 --label= --out=build/shots/tree
 *
 * 参数：
 *   --route=/            路由
 *   --anchor=一炷心香      先滚到含这段文字的段落（触发视口门控）
 *   --label=香炉          canvas 的 aria-label 片段；默认只认香炉，`--label=` 取第一个 canvas
 *   --out=build/shots/x  输出前缀；生成 <out>.png（canvas 裁切）与 <out>-full.png（整屏）
 *   --base=http://127.0.0.1:5193  站点地址（dev 或 static-server 均可）
 *   --wait=5000          canvas 出现后再等的毫秒（SwiftShader 约 1–3 fps，给足）
 *   --w=1280 --h=900     视口
 *
 * 前提：站点已在本机跑起来（dev: `node node_modules/vite/bin/vite.js --port 5193`）。
 * 依赖：本机 Chrome / Edge。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const arg = (name, def) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : def
}
const ROUTE = arg('route', '/')
const ANCHOR = arg('anchor', '一炷心香')
const LABEL = arg('label', '香炉')
const OUT = path.resolve(ROOT, arg('out', 'build/shots/home-incense'))
const BASE = arg('base', 'http://127.0.0.1:5193')
const WAIT = Number(arg('wait', '5000'))
const W = Number(arg('w', '1280'))
const H = Number(arg('h', '900'))

/** 按 aria-label 找 canvas（香炉 / 许愿树各一处，避免选错同页的签筒） */
const CANVAS = `[...document.querySelectorAll('canvas')].find((c) => (c.getAttribute('aria-label') || '').includes(${JSON.stringify(LABEL)}))`

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p))
if (!CHROME) throw new Error('no Chrome found')

const PORT = 9371
// 临时 profile 必须放系统临时目录：放在仓库里会被 vite dev 的文件锁拖成 EBUSY
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'hdc-gated-'))
fs.mkdirSync(path.dirname(OUT), { recursive: true })

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
    `--window-size=${W},${H}`,
    '--force-device-scale-factor=1',
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
const logs = []
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  } else if (m.method === 'Runtime.consoleAPICalled') {
    logs.push(`${m.params.type}: ` + m.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ').slice(0, 300))
  } else if (m.method === 'Runtime.exceptionThrown') {
    logs.push('exception: ' + (m.params.exceptionDetails?.text || ''))
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
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sid)
await send('Page.navigate', { url: `${BASE}${ROUTE}` }, sid)
await sleep(2500)
await send('Runtime.evaluate', { expression: `localStorage.setItem('hdc.lang','zh')` }, sid)
await send('Page.navigate', { url: `${BASE}${ROUTE}` }, sid)
await sleep(2500)

// 先把目标段落滚进视口，视口门控才会挂载 3D 场景
await send('Runtime.evaluate', {
  expression: `(() => {
    const h = [...document.querySelectorAll('h2,h3,p')].find((el) => el.textContent.includes(${JSON.stringify(ANCHOR)}))
    if (!h) return 'no-heading'
    const sec = h.closest('section') || h
    sec.scrollIntoView({ block: 'center', behavior: 'instant' })
    return 'ok'
  })()`,
  returnByValue: true,
}, sid)

let canvas = null
for (let i = 0; i < 80; i++) {
  if (i === 25) {
    // 锚点没命中时兜底：一路滚到底，让所有 Contained3D 的 observer 都触发
    await send('Runtime.evaluate', {
      expression: `(() => {
        const y = window.scrollY
        const h = document.body.scrollHeight
        let step = 0
        const id = setInterval(() => {
          window.scrollBy(0, 600)
          if (++step > 40 || window.scrollY + innerHeight >= h) { clearInterval(id); window.scrollTo(0, y) }
        }, 40)
        return h
      })()`,
      returnByValue: true,
    }, sid)
  }
  const { result: r } = await send('Runtime.evaluate', {
    expression: `(() => {
      const c = (${CANVAS})
      if (!c) return null
      const b = c.getBoundingClientRect()
      if (b.width < 20 || b.height < 20) return null
      return JSON.stringify({ x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), sx: Math.round(window.scrollX), sy: Math.round(window.scrollY) })
    })()`,
    returnByValue: true,
  }, sid)
  if (r.result.value) {
    canvas = JSON.parse(r.result.value)
    break
  }
  await sleep(400)
}
if (!canvas) {
  console.log('未找到场景 canvas（检查 --label / --anchor，或 dev server 是否在跑）')
  if (logs.length) console.log('控制台:\n' + logs.slice(-12).join('\n'))
  ws.close()
  chrome.kill()
  process.exit(1)
}

// 锚点段可能只把 canvas 带到视口外，拍之前再居中一次并重新量
const recentered = await send('Runtime.evaluate', {
  expression: `(() => {
    const c = (${CANVAS})
    if (!c) return null
    const r = c.getBoundingClientRect()
    const docY = r.top + window.scrollY
    window.scrollTo(0, Math.max(0, docY - (window.innerHeight - r.height) / 2))
    const b = c.getBoundingClientRect()
    return JSON.stringify({ x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), sx: Math.round(window.scrollX), sy: Math.round(window.scrollY) })
  })()`,
  returnByValue: true,
}, sid)
if (recentered.result.value) canvas = JSON.parse(recentered.result.value)
console.log('canvas:', JSON.stringify(canvas))
await sleep(WAIT)

// CDP 的 clip 用文档坐标（加滚动量），否则会拍到页头
const clip = {
  x: Math.max(0, canvas.sx + canvas.x - 8),
  y: Math.max(0, canvas.sy + canvas.y - 8),
  width: canvas.w + 16,
  height: canvas.h + 16,
  scale: 1,
}
const shot = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false }, sid)
fs.writeFileSync(`${OUT}.png`, Buffer.from(shot.result.data, 'base64'))
console.log('→', path.relative(ROOT, `${OUT}.png`))

const page = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sid)
fs.writeFileSync(`${OUT}-full.png`, Buffer.from(page.result.data, 'base64'))
console.log('→', path.relative(ROOT, `${OUT}-full.png`))

const { result: info } = await send('Runtime.evaluate', {
  expression: `(() => {
    const c = (${CANVAS})
    let gl = null
    try { gl = c.getContext('webgl2') || c.getContext('webgl') } catch {}
    return JSON.stringify({ webgl: !!gl, renderer: gl ? gl.getParameter(gl.RENDERER) : null, dpr: devicePixelRatio, cw: c.width, ch: c.height })
  })()`,
  returnByValue: true,
}, sid)
console.log('页面:', info.result.value)

ws.close()
chrome.kill()
await sleep(400)
try {
  fs.rmSync(profile, { recursive: true, force: true })
} catch {}
