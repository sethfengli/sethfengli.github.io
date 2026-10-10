/**
 * 判据：三个 3D 路由的 **版面骨架** —— 每个直接子区块的 y 范围与高度，
 * 以及 3D 容器落在哪个区块里。用来判断「把场景挪到折叠线以下」是否可行、
 * 要挪多少像素、会不会把页面弄空。
 *
 * 折叠线 = 802px；IntersectionObserver 的 rootMargin=400px → **触发带下沿 = 1202px**。
 * 场景的 top 必须 > 1202 才不会被提前加载。
 *
 * 用法：node scripts/probe-fold-layout.mjs
 * 前提：node scripts/static-server.mjs dist --port=5192
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const BASE = 'http://127.0.0.1:5192'
const PORT = 9348
const ROUTES = ['/dharma', '/prayer', '/lots']
const FOLD = 802
const TRIGGER = FOLD + 400

const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p))
if (!CHROME) throw new Error('no Chrome found')
const profile = path.join(ROOT, 'build', 'chrome-foldlayout')
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

const EXPR = `JSON.stringify((function(){
  var abs = function(el){ var r = el.getBoundingClientRect(); return { top: Math.round(r.top + window.scrollY), h: Math.round(r.height) } };
  var root = document.getElementById('root');
  var out = [];
  var walk = function(el, depth, pathStr){
    for (var i=0;i<el.children.length;i++){
      var c = el.children[i];
      var a = abs(c);
      if (a.h < 40) continue;                       // 跳过装饰/换行
      var has3d = !!c.querySelector('div[style*="min-height"]');
      var hasCanvas = !!c.querySelector('canvas');
      out.push({
        depth: depth,
        path: pathStr + ' > ' + c.tagName.toLowerCase() + (c.className && typeof c.className === 'string' ? '.' + c.className.split(/\\s+/).slice(0,2).join('.') : ''),
        top: a.top, h: a.h, has3d: has3d, hasCanvas: hasCanvas,
        text: (c.innerText||'').replace(/\\s+/g,' ').trim().slice(0,42),
      });
      if (depth < 3) walk(c, depth+1, pathStr + ' > ' + c.tagName.toLowerCase());
    }
  };
  walk(root, 0, '#root');
  var gates = [];
  var divs = document.querySelectorAll('div[style*="min-height"]');
  for (var i=0;i<divs.length;i++){ var a = abs(divs[i]); gates.push({ top: a.top, h: a.h, canvas: !!divs[i].querySelector('canvas') }); }
  return { docHeight: document.documentElement.scrollHeight, gates: gates, blocks: out.filter(function(b){return b.top < 2600}) };
})())`

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
  if (typeof v !== 'string') { console.log(`${route}: evaluate failed`); continue }
  const d = JSON.parse(v)

  console.log(`\n================= ${route}   docHeight=${d.docHeight}   (折叠线 ${FOLD}, 触发带下沿 ${TRIGGER}) ================`)
  console.log('  3D 容器:')
  d.gates.forEach((g) => {
    const need = g.top > TRIGGER
    console.log(`    top=${String(g.top).padEnd(6)} h=${String(g.h).padEnd(5)} canvas=${String(g.canvas).padEnd(5)} ${need ? '✅ 已在触发带外' : `❌ 需再下移 ${TRIGGER - g.top + 1}px`}`)
  })
  console.log('  区块骨架 (top / height / 距触发行 / 文本前 42 字):')
  d.blocks.forEach((b) => {
    const margin = TRIGGER - b.top
    console.log(`    ${String(b.top).padStart(5)}  h=${String(b.h).padStart(5)}  ${(margin > 0 ? '触发带内 +' + margin : '带外   ' + margin).padEnd(14)} ${'  '.repeat(b.depth)}${b.has3d ? '[3D] ' : ''}${b.text}`)
  })
  await send('Target.closeTarget', { targetId: target.targetId })
  await send('Target.disposeBrowserContext', { browserContextId: ctx.browserContextId })
}
ws.close()
chrome.kill()
