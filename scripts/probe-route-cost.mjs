/**
 * Measure the true first-screen cost of each route in the built site.
 *
 * Why a dedicated probe: the vite build log lists every chunk but says nothing
 * about which of them the first screen pulls, and `performance.getEntriesByType`
 * inside one browser session accumulates across navigations (a client-side route
 * change keeps the same document), so it over-reports. This probe therefore
 *
 *   - creates a DISPOSABLE BROWSER CONTEXT per route (fresh cache), and
 *   - counts the actual `Network.responseReceived` payloads via CDP,
 *
 * so "what does a first-time visitor to /lots download" has a real number, and
 * "what does navigating there from / cost on top" can be derived by diffing
 * against the `/` measurement.
 *
 * Usage:
 *   node scripts/probe-route-cost.mjs                     # default routes
 *   node scripts/probe-route-cost.mjs / /lots /articles
 *   node scripts/probe-route-cost.mjs --json > build/route-cost.json
 *   node scripts/probe-route-cost.mjs --url=http://127.0.0.1:5192
 *
 * Requires the built site to be served, e.g.
 *   node scripts/static-server.mjs dist --port=5192
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)

const argv = process.argv.slice(2)
const AS_JSON = argv.includes('--json')
const URL_ARG = argv.find((a) => a.startsWith('--url='))
const BASE = (URL_ARG ? URL_ARG.slice('--url='.length) : 'http://127.0.0.1:5192').replace(/\/$/, '')
const routes = argv.filter((a) => a.startsWith('/') && !a.startsWith('--'))
const ROUTES = routes.length ? routes : ['/', '/articles', '/dharma', '/prayer', '/lots', '/about']
const PORT = 9336

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p))
if (!CHROME) throw new Error('no Chrome/Edge found')

const profile = ART('build/chrome-routecost')
fs.rmSync(profile, { recursive: true, force: true })

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
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
const listeners = new Set()
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  }
  for (const fn of listeners) fn(m)
}
const send = (method, params = {}, sessionId) =>
  new Promise((res) => {
    const mid = ++id
    pending.set(mid, res)
    ws.send(JSON.stringify({ id: mid, method, params, sessionId }))
  })

const kb = (n) => (n / 1024).toFixed(1).padStart(8)

const RESOURCE_EXPR = `JSON.stringify({
  files: performance.getEntriesByType('resource')
    .filter(function (e) { return /[.](js|css)$/.test(e.name) })
    .map(function (e) {
      return {
        p: e.name.replace(location.origin, ''),
        s: e.decodedBodySize || e.encodedBodySize || 0,
        at: Math.round(e.startTime),
      }
    }),
  threeish: performance.getEntriesByType('resource')
    .map(function (e) { return e.name.replace(location.origin, '') })
    .filter(function (p) { return /three|[a-z]*3d|censer|stage|bell|tree|cylinder/i.test(p) }),
  viewport: window.innerHeight,
  docHeight: document.documentElement.scrollHeight,
  gates: document.querySelectorAll('div[style*="min-height"]').length,
  canvases: document.querySelectorAll('canvas').length,
})`

/**
 * Load a URL in a throwaway browser context (fresh cache, fresh document) and
 * return its resource breakdown for JS/CSS.
 *
 * Reading Resource Timing inside a disposable context avoids the trap that bit the
 * first version of this probe: in one long-lived session, client-side route
 * changes keep the same document, so entries from earlier routes leak in.
 */
async function measure(url) {
  const { result: ctx } = await send('Target.createBrowserContext', { disposeOnDetach: true })
  const { result: target } = await send('Target.createTarget', {
    url: 'about:blank',
    browserContextId: ctx.browserContextId,
  })
  const { result: attached } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true })
  const sid = attached.sessionId
  await send('Page.enable', {}, sid)
  await send('Runtime.enable', {}, sid)
  await send('Page.navigate', { url }, sid)
  await sleep(4000)
  const msg = await send('Runtime.evaluate', { expression: RESOURCE_EXPR, returnByValue: true }, sid)
  const value = msg?.result?.result?.value
  if (typeof value !== 'string') {
    throw new Error(`evaluate failed at ${url}: ${JSON.stringify(msg).slice(0, 200)}`)
  }
  const data = JSON.parse(value)
  const map = new Map()
  for (const r of data.files) map.set(r.p, Math.max(map.get(r.p) ?? 0, r.s))
  await send('Target.closeTarget', { targetId: target.targetId })
  await send('Target.disposeBrowserContext', { browserContextId: ctx.browserContextId })
  return { map, meta: data }
}

const results = {}
for (const route of ROUTES) {
  results[route] = await measure(`${BASE}${route}`)
}

const sum = (m) => [...m.values()].reduce((a, b) => a + b, 0)
const home = results['/']?.map ?? new Map()
const homeTotal = sum(home)

const out = {
  base: BASE,
  home: { files: home.size, bytes: homeTotal, chunks: Object.fromEntries(home), meta: results['/']?.meta },
  routes: {},
}

if (!AS_JSON) {
  const hm = results['/']?.meta
  console.log(`first screen  /   ${home.size} files  ${kb(homeTotal)} KB   (viewport ${hm?.viewport}px, doc ${hm?.docHeight}px)`)
  for (const [p, s] of [...home.entries()].sort((a, b) => b[1] - a[1])) console.log(`    ${kb(s)} KB  ${p}`)
  if (hm?.threeish.length) console.log(`    3D-ish loaded on first screen: ${hm.threeish.join(' ')}`)
  else console.log('    3D-ish loaded on first screen: none (the viewport gate held)')
  console.log('')
}

for (const route of ROUTES) {
  const { map: m, meta } = results[route]
  const extra = [...m.entries()].filter(([p]) => !home.has(p))
  const missing = [...home.keys()].filter((p) => !m.has(p))
  out.routes[route] = {
    files: m.size,
    bytes: sum(m),
    extraBytes: extra.reduce((a, [, s]) => a + s, 0),
    extraChunks: Object.fromEntries(extra.sort((a, b) => b[1] - a[1])),
    notUsedHere: missing,
    meta,
  }
  if (route === '/' || AS_JSON) continue
  console.log(
    `${route.padEnd(12)} first screen ${kb(sum(m))} KB (${m.size} files, ${meta.canvases} canvas)   vs / : ${extra.length} extra ${kb(extra.reduce((a, [, s]) => a + s, 0))} KB, ${missing.length} shared file(s) not used`,
  )
  for (const [p, s] of extra.sort((a, b) => b[1] - a[1]).slice(0, 6)) console.log(`    +${kb(s)} KB  ${p}`)
}

if (AS_JSON) console.log(JSON.stringify(out, null, 2))

ws.close()
chrome.kill()
