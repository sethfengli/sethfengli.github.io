// 产物资源检查：JS/CSS chunk 与 three 分包、字体资源
const base = 'http://127.0.0.1:4173'
const idx = await (await fetch(base + '/')).text()
const js = [...idx.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((x) => x[1])
const css = [...idx.matchAll(/href="(\/assets\/[^"]+\.css)"/g)].map((x) => x[1])
console.log('js chunks:', js.length, '| css:', css.length)
for (const u of js) {
  const r = await fetch(base + u)
  console.log('JS', r.status, u.split('/').pop().slice(0, 44))
}
for (const u of css) {
  const r = await fetch(base + u)
  console.log('CSS', r.status, u.split('/').pop().slice(0, 44))
}
// three 懒加载分包存在？
const three = js.some((u) => u.includes('three'))
console.log('three lazy chunk in initial HTML:', three)
const distJs = await import('node:fs').then((fs) => fs.readdirSync('dist/assets').filter((f) => f.includes('three')))
console.log('three assets in dist:', distJs.join(', '))
const fonts = await import('node:fs').then((fs) => fs.readdirSync('dist/assets').filter((f) => /wenkai|shan|long-cang/i.test(f)).slice(0, 8))
console.log('font assets sample:', fonts.length, fonts.join(', '))
