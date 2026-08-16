// 冒烟测试：验证 vite preview 服务的静态产物
const base = 'http://127.0.0.1:4173'
const results = []

async function check(path, tests) {
  try {
    const res = await fetch(base + path)
    const text = await res.text()
    for (const [name, fn] of tests) {
      const ok = fn(text)
      results.push(`${ok ? 'PASS' : 'FAIL'}  ${path}  ${name}`)
    }
  } catch (e) {
    results.push(`ERROR ${path} ${e.message}`)
  }
}

await check('/', [
  ['has root div', (t) => t.includes('id="root"')],
  ['loads js bundle', (t) => /src="\.\/assets\/[^"]+\.js"/.test(t)],
  ['loads css', (t) => /href="\.\/assets\/[^"]+\.css"/.test(t)],
])
await check('/favicon.svg', [['svg lotus', (t) => t.startsWith('<svg')]])

// 找到一个文章 chunk 并验证其可访问
const res = await fetch(base + '/')
const index = await res.text()
const m = index.match(/src="(\.\/assets\/[^"]+\.js)"/)
if (m) {
  const url = new URL(m[1], base + '/').href
  const r2 = await fetch(url)
  const js = await r2.text()
  results.push(`${js.includes('慧灯禅院') ? 'PASS' : 'FAIL'}  主 JS 包包含品牌文案`)
  results.push(`${js.length > 50000 ? 'PASS' : 'FAIL'}  主 JS 包体积正常 (${js.length} B)`)
  // 文章懒加载映射是否存在
  results.push(`${js.includes('content/articles/') ? 'PASS' : 'FAIL'}  文章懒加载映射 (import.meta.glob)`)
}

console.log(results.join('\n'))
