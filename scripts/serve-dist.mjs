// 极简静态服务器：用于本地冒烟测试 dist/（无任何依赖、无子进程）
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..', 'dist')
const PORT = Number(process.env.PORT ?? 4173)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (p.endsWith('/')) p += 'index.html'
    const file = normalize(join(ROOT, p))
    if (!file.startsWith(ROOT)) {
      res.writeHead(403)
      res.end()
      return
    }
    const data = await readFile(file)
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' })
    res.end(data)
  } catch {
    // 回退到 index.html（HashRouter 应用）
    try {
      const data = await readFile(join(ROOT, 'index.html'))
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(data)
    } catch {
      res.writeHead(404)
      res.end('not found')
    }
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`serving dist at http://127.0.0.1:${PORT}`)
})
