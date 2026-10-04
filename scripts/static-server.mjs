/**
 * 极简静态文件服务器（零依赖），供无头浏览器截图与构建产物冒烟测试使用。
 *
 * 用法：node scripts/static-server.mjs <dir> [--port=5188]
 *   → 打印 READY <url>，随后持续服务，直到进程被终止
 */
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'

const dir = path.resolve(process.argv[2] ?? '.')
const portArg = process.argv.find((a) => a.startsWith('--port='))
const port = Number(portArg?.split('=')[1] ?? 5188)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  let rel = decodeURIComponent(url.pathname)
  if (rel.endsWith('/')) rel += 'index.html'
  let file = path.join(dir, rel)

  // 目录穿越防护
  if (!file.startsWith(dir)) {
    res.writeHead(403).end('forbidden')
    return
  }
  // SPA 回退：未知路径给 index.html
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    const fallback = path.join(dir, 'index.html')
    if (fs.existsSync(fallback)) file = fallback
    else {
      res.writeHead(404).end('not found')
      return
    }
  }
  const ext = path.extname(file).toLowerCase()
  res.writeHead(200, {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  })
  fs.createReadStream(file).pipe(res)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`READY http://127.0.0.1:${port}/  (root: ${dir})`)
})
