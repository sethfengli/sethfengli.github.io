/**
 * 3D 场景截图探针（无头 Chrome + SwiftShader 软件 WebGL）
 *
 * 为什么单独写：`shoot-preview.mjs` 只拍纯 SVG 预览工程，`shots-optin.mjs` 拍的是
 * 「按需开启」的按钮位；要给 3D 造型做**肉眼迭代**，需要能指定路由、等 canvas 真正
 * 出第一帧、还能把镜头拖几个角度各拍一张。
 *
 * 用法：
 *   node scripts/shot-3d.mjs --route=/dharma --out=build/shots/bell
 *   node scripts/shot-3d.mjs --route=/prayer --out=build/shots/tree --drag=140,0 --drag=0,40
 *
 * 参数：
 *   --route=/dharma      路由（相对 BASE）
 *   --out=build/shots/x  输出前缀；生成 <out>.png、<out>-full.png、<out>-2.png …
 *   --base=http://127.0.0.1:5193  站点地址（dev 或 static-server 均可）
 *   --sel=canvas         场景选择器（默认 canvas）
 *   --drag=dx,dy         可重复；每张额外角度前先拖拽 (dx,dy) 像素
 *   --wait=3000          canvas 出现后的等待毫秒（等动画/贴图就绪）
 *   --lang=zh            写 localStorage hdc.lang 后重载
 *   --w=1280 --h=900     视口
 *   --wishes=8           写入 8 条示例心愿（/prayer 的红绸才会出现）
 *   --click              在 canvas 中心点一下（测梵钟 / 签筒等点击交互）
 *   --page               额外拍整屏（默认只拍 canvas 裁切）
 *
 * 前提：站点已在本机跑起来（dev: `node node_modules/vite/bin/vite.js --port 5193`）。
 * 依赖：本机 Chrome。SwiftShader 下渲染约 1–3 fps，等待时间给足。
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
const argsAll = (name) =>
  process.argv.filter((a) => a.startsWith(`--${name}=`)).map((a) => a.slice(name.length + 3))

const ROUTE = arg('route', '/dharma')
const OUT = path.resolve(ROOT, arg('out', 'build/shots/scene'))
const BASE = arg('base', 'http://127.0.0.1:5193')
const SEL = arg('sel', 'canvas')
const WAIT = Number(arg('wait', '3000'))
const LANG = arg('lang', 'zh')
const W = Number(arg('w', '1280'))
const H = Number(arg('h', '900'))
const PAGE = process.argv.includes('--page')
const CLICK_SCENE = process.argv.includes('--click')
const DRAGS = argsAll('drag')
const WISHES = Number(arg('wishes', '0'))

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p))
if (!CHROME) throw new Error('no Chrome found')

const PORT = 9361
// ⚠ 临时 profile 不能放仓库里的 build/：vite dev 会 watch 整个工作区，
// Chrome 的 Cookies 文件被锁 → 触发 EBUSY，开发服务器直接崩（实测）。
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'hdc-shot3d-'))
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
    '--autoplay-policy=no-user-gesture-required',
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
    logs.push(
      `${m.params.type}: ` +
        m.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ').slice(0, 300),
    )
  } else if (m.method === 'Runtime.exceptionThrown') {
    logs.push('exception: ' + (m.params.exceptionDetails?.text || '') + ' ' +
      (m.params.exceptionDetails?.exception?.description || '').slice(0, 300))
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
await send('Runtime.evaluate', { expression: `localStorage.setItem('hdc.lang', ${JSON.stringify(LANG)})` }, sid)
if (WISHES > 0) {
  const texts = ['愿父母身体安康', '愿孩子平安长大', '愿此心常得清净', '愿所求皆如愿', '愿家人和顺', '愿工作顺遂', '愿众生离苦', '愿智慧增长']
  const list = Array.from({ length: WISHES }, (_, i) => ({
    id: `demo-${i}`,
    name: ['净心', '明月', '清风', '了尘'][i % 4],
    text: texts[i % texts.length],
    createdAt: Date.now() - i * 3600_000,
    owner: 'demo',
  }))
  await send('Runtime.evaluate', {
    expression: `localStorage.setItem('hdc.wishes', ${JSON.stringify(JSON.stringify(list))})`,
  }, sid)
}
await send('Page.navigate', { url: `${BASE}${ROUTE}` }, sid)
await sleep(3000)

// 等 canvas 出现
let canvas = null
for (let i = 0; i < 60; i++) {
  const { result: r } = await send('Runtime.evaluate', {
    expression: `(() => {
      const c = document.querySelector(${JSON.stringify(SEL)})
      if (!c) return null
      c.scrollIntoView({ block: 'center', behavior: 'instant' })
      const b = c.getBoundingClientRect()
      return JSON.stringify({ x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), sx: Math.round(window.scrollX), sy: Math.round(window.scrollY) })
    })()`,
    returnByValue: true,
  }, sid)
  const v = r.result.value
  if (v) {
    canvas = JSON.parse(v)
    if (canvas.w > 20 && canvas.h > 20) break
  }
  await sleep(400)
}
if (!canvas) {
  console.log('未找到场景 canvas')
  ws.close()
  chrome.kill()
  process.exit(1)
}
console.log('canvas:', JSON.stringify(canvas))
await sleep(WAIT)

// 点一下场景中心（钟身 / 签筒）：验证「点得到、有反应」
if (CLICK_SCENE) {
  const cx = canvas.x + canvas.w / 2
  const cy = canvas.y + canvas.h * 0.48
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 }, sid)
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 }, sid)
  await sleep(900)
}

// CDP 的 clip 用的是**文档坐标**（实测：传视口坐标会拍到页头），故加上滚动量。
const clipOf = (c) => ({
  x: Math.max(0, c.sx + c.x - 6),
  y: Math.max(0, c.sy + c.y - 6),
  width: c.w + 12,
  height: c.h + 12,
  scale: 1,
})

const shoot = async (suffix) => {
  const { result: s } = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { ...clipOf(canvas), scale: 1 },
    captureBeyondViewport: false,
  }, sid)
  const file = `${OUT}${suffix}.png`
  fs.writeFileSync(file, Buffer.from(s.data, 'base64'))
  console.log('→', path.relative(ROOT, file))
}

await shoot('')

// 拖拽换角度：用真实 Input 事件（stage 监听 pointerdown/move/up）
let shotIdx = 2
for (const d of DRAGS) {
  const [dx, dy] = d.split(',').map(Number)
  const cx = canvas.x + canvas.w / 2
  const cy = canvas.y + canvas.h / 2
  const steps = 8
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 }, sid)
  for (let i = 1; i <= steps; i++) {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: cx + (dx * i) / steps, y: cy + (dy * i) / steps, button: 'left', buttons: 1,
    }, sid)
    await sleep(60)
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx + dx, y: cy + dy, button: 'left', clickCount: 1 }, sid)
  await sleep(700)
  await shoot(`-${shotIdx++}`)
}

if (PAGE) {
  const { result: s } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sid)
  fs.writeFileSync(`${OUT}-full.png`, Buffer.from(s.data, 'base64'))
  console.log('→', path.relative(ROOT, `${OUT}-full.png`))
}

const { result: info } = await send('Runtime.evaluate', {
  expression: `(() => {
    const c = document.querySelector(${JSON.stringify(SEL)})
    let gl = null
    try { gl = c.getContext('webgl2') || c.getContext('webgl') } catch {}
    return JSON.stringify({
      canvases: document.querySelectorAll('canvas').length,
      webgl: !!gl,
      dpr: devicePixelRatio,
      renderer: gl ? gl.getParameter(gl.RENDERER) : null,
    })
  })()`,
  returnByValue: true,
}, sid)
console.log('页面:', info.result.value)
if (logs.length) console.log('控制台:\n' + logs.slice(-12).join('\n'))

ws.close()
chrome.kill()
await sleep(500)
try {
  fs.rmSync(profile, { recursive: true, force: true })
} catch {}
